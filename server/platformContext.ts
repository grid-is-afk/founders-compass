import { query } from "./db.js";

// Deep per-client structured context injected alongside RAG results.
// Covers compact DB records — tasks, meetings, scores, risk alerts.
export async function buildClientStructuredContext(
  clientId: string,
  advisorId: string
): Promise<string> {
  // Authorization: confirm this client belongs to this advisor
  const clientResult = await query(
    `SELECT id, name, stage, revenue, entity_type, contact_name, contact_email,
            current_quarter, current_year, onboarded_at
     FROM clients WHERE id = $1 AND advisor_id = $2`,
    [clientId, advisorId]
  );
  if (clientResult.rows.length === 0) return "";

  const client = clientResult.rows[0];
  let ctx = `## ACTIVE CLIENT: ${client.name}\n\n`;
  ctx += `- Stage: ${client.stage ?? "Unknown"}\n`;
  if (client.revenue) ctx += `- Revenue: ${client.revenue}\n`;
  if (client.entity_type) ctx += `- Entity Type: ${client.entity_type}\n`;
  if (client.contact_name) ctx += `- Primary Contact: ${client.contact_name}`;
  if (client.contact_email) ctx += ` (${client.contact_email})`;
  if (client.contact_name || client.contact_email) ctx += "\n";
  if (client.current_quarter && client.current_year)
    ctx += `- Current Quarter: Q${client.current_quarter} ${client.current_year}\n`;

  // Assessment scores
  const [sixKeysRes, capitalRes, ipdRes, sixCsRes, eiRes, multiplesRes] =
    await Promise.all([
      query(
        `SELECT clarity, alignment, structure, stewardship, velocity, legacy, notes
         FROM client_six_keys WHERE client_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT minority_recap_pct, minority_recap_label,
                strategic_acq_pct, strategic_acq_label,
                esop_pct, esop_label, full_exit_pct, full_exit_label, notes
         FROM client_capital_optionality WHERE client_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT persuasiveness_of_problem, confidence_in_solution,
                combined_index, probability_label
         FROM client_ipd_metrics WHERE client_id = $1 ORDER BY last_generated_at DESC LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT total_score, scores FROM client_six_cs
         WHERE client_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT category_scores FROM client_exposure_index
         WHERE client_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [clientId]
      ),
      query(
        `SELECT initial_multiple, current_multiple, best_in_class, goal_multiple
         FROM client_multiples WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 1`,
        [clientId]
      ),
    ]);

  ctx += "\n### Assessment Scores\n";

  const sk = sixKeysRes.rows[0];
  if (sk) {
    ctx += `Six Keys of Capital: Clarity ${sk.clarity ?? "—"}, Alignment ${sk.alignment ?? "—"}, Structure ${sk.structure ?? "—"}, Stewardship ${sk.stewardship ?? "—"}, Velocity ${sk.velocity ?? "—"}, Legacy ${sk.legacy ?? "—"} (all /100)\n`;
    if (sk.notes) ctx += `  Notes: ${sk.notes}\n`;
  }

  const co = capitalRes.rows[0];
  if (co) {
    ctx += `Capital Optionality: Minority Recap ${co.minority_recap_pct ?? "—"}% (${co.minority_recap_label ?? "—"}), Strategic Acquisition ${co.strategic_acq_pct ?? "—"}% (${co.strategic_acq_label ?? "—"}), ESOP ${co.esop_pct ?? "—"}% (${co.esop_label ?? "—"}), Full Exit ${co.full_exit_pct ?? "—"}% (${co.full_exit_label ?? "—"})\n`;
  }

  const ipd = ipdRes.rows[0];
  if (ipd) {
    ctx += `Investment Probability: Problem Persuasiveness ${ipd.persuasiveness_of_problem ?? "—"}/100, Solution Confidence ${ipd.confidence_in_solution ?? "—"}/100, Combined Index ${ipd.combined_index ?? "—"}/100 (${ipd.probability_label ?? "—"})\n`;
  }

  const sc = sixCsRes.rows[0];
  if (sc) ctx += `Six C's Score: ${sc.total_score ?? "—"}/18\n`;

  const ei = eiRes.rows[0];
  if (ei?.category_scores) {
    const total = Object.values(ei.category_scores as Record<string, number>).reduce(
      (a: number, b) => a + (b as number),
      0
    );
    const level = total >= 43 ? "Low Exposure" : total >= 27 ? "Moderate Exposure" : "High Exposure";
    ctx += `Exposure Index: ${total}/54 (${level})\n`;
  }

  const mult = multiplesRes.rows[0];
  if (mult) {
    ctx += `Multiples: Initial ${mult.initial_multiple ?? "—"}x, Current ${mult.current_multiple ?? "—"}x, Best-in-Class ${mult.best_in_class ?? "—"}x, Goal ${mult.goal_multiple ?? "—"}x\n`;
  }

  // Tasks
  const tasksRes = await query(
    `SELECT title, status, assignee, due_date, priority, phase
     FROM tasks WHERE client_id = $1 ORDER BY created_at DESC`,
    [clientId]
  );
  if (tasksRes.rows.length > 0) {
    ctx += "\n### Tasks\n";
    for (const t of tasksRes.rows) {
      ctx += `- [${(t.status as string).toUpperCase()}] ${t.title}`;
      if (t.assignee) ctx += ` — ${t.assignee}`;
      if (t.due_date) ctx += ` — due ${t.due_date}`;
      if (t.priority) ctx += ` — ${t.priority} priority`;
      if (t.phase) ctx += ` (${t.phase})`;
      ctx += "\n";
    }
  }

  // Meetings (last 10 with full notes)
  const meetingsRes = await query(
    `SELECT type, date, status, notes
     FROM meetings WHERE client_id = $1
     ORDER BY date DESC LIMIT 10`,
    [clientId]
  );
  if (meetingsRes.rows.length > 0) {
    ctx += "\n### Recent Meetings\n";
    for (const m of meetingsRes.rows) {
      ctx += `- ${m.type ?? "Meeting"} on ${m.date} [${m.status ?? "unknown"}]`;
      if (m.notes) ctx += `\n  Notes: ${m.notes}`;
      ctx += "\n";
    }
  }

  // Risk alerts
  const risksRes = await query(
    `SELECT title, detail, severity FROM risk_alerts
     WHERE client_id = $1 AND resolved = false
     ORDER BY severity DESC`,
    [clientId]
  );
  if (risksRes.rows.length > 0) {
    ctx += "\n### Open Risk Alerts\n";
    for (const r of risksRes.rows) {
      ctx += `- [${(r.severity as string).toUpperCase()}] ${r.title}`;
      if (r.detail) ctx += `: ${r.detail}`;
      ctx += "\n";
    }
  }

  // Quarterly plan
  const planRes = await query(
    `SELECT qp.quarter, qp.year, qp.label, qp.status,
            json_agg(json_build_object(
              'phase', ph.phase,
              'label', ph.label,
              'status', ph.status,
              'completed_tasks', ph.completed_tasks,
              'total_tasks', ph.total_tasks
            ) ORDER BY ph.sort_order) AS phases
     FROM quarterly_plans qp
     LEFT JOIN quarterly_phases ph ON ph.plan_id = qp.id
     WHERE qp.client_id = $1
     GROUP BY qp.id
     ORDER BY qp.year DESC, qp.quarter DESC
     LIMIT 2`,
    [clientId]
  );
  if (planRes.rows.length > 0) {
    ctx += "\n### Quarterly Plans\n";
    for (const plan of planRes.rows) {
      ctx += `Q${plan.quarter} ${plan.year} — ${plan.label ?? ""} [${plan.status}]\n`;
      if (Array.isArray(plan.phases)) {
        for (const ph of plan.phases) {
          if (!ph.phase) continue;
          ctx += `  ${ph.label ?? ph.phase}: ${ph.status} (${ph.completed_tasks ?? 0}/${ph.total_tasks ?? 0} tasks)\n`;
        }
      }
    }
  }

  return ctx;
}

// Serialize the requesting advisor's live platform data into a context string
// for the Quarterback Copilot system prompt.
export async function buildPlatformContext(advisorId: string): Promise<string> {
  try {
    // Fetch clients belonging to this advisor
    const clientsResult = await query(
      "SELECT * FROM clients WHERE advisor_id = $1 ORDER BY name",
      [advisorId]
    );
    const clients = clientsResult.rows;

    if (clients.length === 0) {
      return "## CLIENT PORTFOLIO\nNo clients found for this advisor.\n";
    }

    const clientIds = clients.map((c) => c.id);

    // Fetch risk alerts for all clients
    const riskResult = await query(
      "SELECT * FROM risk_alerts WHERE client_id = ANY($1::uuid[]) ORDER BY severity DESC, created_at DESC",
      [clientIds]
    );
    const riskAlerts = riskResult.rows;

    // Fetch tasks for all clients
    const tasksResult = await query(
      "SELECT * FROM tasks WHERE client_id = ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 50",
      [clientIds]
    );
    const tasks = tasksResult.rows;

    // Fetch deliverables for all clients
    const delResult = await query(
      "SELECT * FROM deliverables WHERE client_id = ANY($1::uuid[]) ORDER BY created_at DESC",
      [clientIds]
    );
    const deliverables = delResult.rows;

    // Fetch instruments for all clients
    const instrResult = await query(
      "SELECT * FROM instruments WHERE client_id = ANY($1::uuid[]) ORDER BY created_at DESC",
      [clientIds]
    );
    const instruments = instrResult.rows;

    // Fetch prospects for this advisor
    const prospectsResult = await query(
      "SELECT * FROM prospects WHERE advisor_id = $1 ORDER BY created_at DESC",
      [advisorId]
    );
    const prospects = prospectsResult.rows;

    // Fetch diagnostic results for all clients
    const [
      clientEiResult,
      clientMatrixResult,
      clientSnapshotResult,
      clientSixCsResult,
      diagnoseTasksResult,
    ] = await Promise.all([
      query(
        `SELECT DISTINCT ON (client_id) client_id, category_scores, completed_at
         FROM client_exposure_index
         WHERE client_id = ANY($1::uuid[])
         ORDER BY client_id, completed_at DESC`,
        [clientIds]
      ),
      query(
        `SELECT DISTINCT ON (client_id) client_id, entity_type, completed_at
         FROM client_founder_matrix
         WHERE client_id = ANY($1::uuid[])
         ORDER BY client_id, completed_at DESC`,
        [clientIds]
      ),
      query(
        `SELECT DISTINCT ON (client_id) client_id, responses, completed_at
         FROM client_founder_snapshot
         WHERE client_id = ANY($1::uuid[])
         ORDER BY client_id, completed_at DESC`,
        [clientIds]
      ),
      query(
        `SELECT DISTINCT ON (client_id) client_id, total_score, scores, completed_at
         FROM client_six_cs
         WHERE client_id = ANY($1::uuid[])
         ORDER BY client_id, completed_at DESC`,
        [clientIds]
      ),
      query(
        `SELECT client_id,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'done') AS done
         FROM tasks
         WHERE client_id = ANY($1::uuid[]) AND phase = 'diagnose'
         GROUP BY client_id`,
        [clientIds]
      ),
    ]);

    // Build diagnostic maps
    const clientEiMap = new Map(
      clientEiResult.rows.map((r) => [String(r.client_id), r])
    );
    const clientMatrixMap = new Map(
      clientMatrixResult.rows.map((r) => [String(r.client_id), r])
    );
    const clientSnapshotMap = new Map(
      clientSnapshotResult.rows.map((r) => [String(r.client_id), r])
    );
    const clientSixCsMap = new Map(
      clientSixCsResult.rows.map((r) => [String(r.client_id), r])
    );
    const diagnoseTasksMap = new Map(
      diagnoseTasksResult.rows.map((r) => [String(r.client_id), r])
    );

    // Fetch exposure index data for all prospects that have completed it
    const exposureResult = await query(
      `SELECT DISTINCT ON (pei.prospect_id)
         pei.prospect_id, pei.category_scores, pei.completed_at
       FROM prospect_exposure_index pei
       INNER JOIN prospects p ON p.id = pei.prospect_id
       WHERE p.advisor_id = $1
       ORDER BY pei.prospect_id, pei.completed_at DESC`,
      [advisorId]
    );
    const exposureMap = new Map<string, Record<string, number>>();
    for (const row of exposureResult.rows) {
      if (row.category_scores) {
        exposureMap.set(String(row.prospect_id), row.category_scores as Record<string, number>);
      }
    }

    // --- Build context string ---

    let ctx = "## CLIENT PORTFOLIO\n\n";

    for (const client of clients) {
      ctx += `### ${client.name} (ID: ${client.id})\n`;
      if (client.contact_name) ctx += `- Contact: ${client.contact_name}\n`;
      if (client.stage) ctx += `- Stage: ${client.stage}\n`;
      if (client.capital_readiness != null)
        ctx += `- Capital Readiness: ${client.capital_readiness}%\n`;
      if (client.customer_capital != null)
        ctx += `- Customer Capital Index: ${client.customer_capital}%\n`;
      if (client.performance_score != null)
        ctx += `- Performance Score: ${client.performance_score}%\n`;
      if (client.revenue) ctx += `- Revenue: ${client.revenue}\n`;
      if (client.updated_at) {
        const mins = Math.floor(
          (Date.now() - new Date(client.updated_at).getTime()) / 60000
        );
        const display =
          mins < 60
            ? `${mins}m ago`
            : mins < 1440
            ? `${Math.floor(mins / 60)}h ago`
            : `${Math.floor(mins / 1440)}d ago`;
        ctx += `- Last Activity: ${display}\n`;
      }

      // Append diagnostic results if any exist for this client
      const eiRecord = clientEiMap.get(String(client.id));
      const matrixRecord = clientMatrixMap.get(String(client.id));
      const snapshotRecord = clientSnapshotMap.get(String(client.id));
      const sixCsRecord = clientSixCsMap.get(String(client.id));
      const diTasks = diagnoseTasksMap.get(String(client.id));

      if (
        eiRecord?.category_scores ||
        matrixRecord ||
        snapshotRecord ||
        sixCsRecord
      ) {
        ctx += "  Diagnostics:\n";
        if (sixCsRecord?.scores) {
          ctx += `    Six C's: ${sixCsRecord.total_score}/18\n`;
        }
        if (eiRecord?.category_scores) {
          const total = Object.values(
            eiRecord.category_scores as Record<string, number>
          ).reduce((a, b) => a + b, 0);
          const level =
            total >= 43
              ? "Low Exposure"
              : total >= 27
              ? "Moderate Exposure"
              : "High Exposure";
          ctx += `    Exposure Index: ${total}/54 · ${level}\n`;
        }
        if (matrixRecord?.completed_at) {
          ctx += `    Founder Matrix: ${
            (matrixRecord.entity_type as string | undefined)?.toUpperCase() ??
            "Unknown"
          } — Complete\n`;
        }
        if (snapshotRecord?.responses) {
          const dims = Object.values(
            snapshotRecord.responses as Record<string, { signal: string }>
          );
          const urgent = dims.filter((d) => d.signal === "urgent").length;
          const weakening = dims.filter(
            (d) => d.signal === "weakening"
          ).length;
          const strong = dims.filter((d) => d.signal === "strong").length;
          ctx += `    Founder Snapshot: ${dims.length}/5 — ${urgent} urgent, ${weakening} weakening, ${strong} strong\n`;
        }
        if (diTasks) {
          ctx += `    Diagnose Action Items: ${diTasks.done}/${diTasks.total} complete\n`;
        }
      }

      ctx += "\n";
    }

    // Risk alerts
    if (riskAlerts.length > 0) {
      ctx += "## RISK ALERTS\n";
      riskAlerts.forEach((a, i) => {
        const clientName =
          clients.find((c) => c.id === a.client_id)?.name ?? a.client_id;
        ctx += `${i + 1}. ${a.severity.toUpperCase()}: ${a.title} — ${clientName}.`;
        if (a.detail) ctx += ` ${a.detail}`;
        ctx += "\n";
      });
      ctx += "\n";
    }

    // Sprint tasks (most recent 20)
    if (tasks.length > 0) {
      ctx += "## SPRINT TASKS (Recent)\n";
      tasks.slice(0, 20).forEach((t, i) => {
        const clientName =
          clients.find((c) => c.id === t.client_id)?.name ?? t.client_id;
        ctx += `${i + 1}. ${t.status.toUpperCase()}: ${t.title} (${clientName}, ${t.assignee ?? "Advisor"}, ${t.due_date ?? "no due date"}, ${t.priority ?? "medium"} priority)\n`;
      });
      ctx += "\n";
    }

    // Deliverables
    if (deliverables.length > 0) {
      ctx += "## DELIVERABLES STATUS\n";
      deliverables.forEach((d) => {
        const clientName =
          clients.find((c) => c.id === d.client_id)?.name ?? d.client_id;
        ctx += `- ${d.title} — ${clientName}: ${d.status?.toUpperCase() ?? "UNKNOWN"}\n`;
      });
      ctx += "\n";
    }

    // Instruments
    if (instruments.length > 0) {
      ctx += "## INSTRUMENTS STATUS\n";
      for (const client of clients) {
        const clientInstr = instruments.filter((i) => i.client_id === client.id);
        if (clientInstr.length === 0) continue;
        ctx += `\n### ${client.name}\n`;
        clientInstr.forEach((inst) => {
          ctx += `- ${inst.name}: ${inst.status?.toUpperCase() ?? "UNKNOWN"}`;
          if (inst.linked_phase) ctx += ` (Phase: ${inst.linked_phase})`;
          if (inst.completed_date) ctx += ` — completed ${inst.completed_date}`;
          ctx += "\n";
        });
      }
      ctx += "\n";
    }

    // Prospects
    if (prospects.length > 0) {
      ctx += "## PRE-CLIENT PIPELINE (Prospects)\n";
      ctx += `Total: ${prospects.length} prospects\n\n`;
      prospects.forEach((p) => {
        ctx += `- ${p.name} — ${p.contact ?? "No contact"} — ${p.revenue ?? "Revenue unknown"} — Status: ${p.status ?? "intake"}`;
        if (p.fit_score != null) ctx += ` — Fit Score: ${p.fit_score}`;
        if (p.fit_decision) ctx += ` — ${p.fit_decision.toUpperCase()}`;

        // Attach Founder Exposure Index summary if available
        const exposure = exposureMap.get(String(p.id));
        if (exposure) {
          const exposureLevels = Object.entries(exposure)
            .map(([cat, score]) => {
              const level = (score as number) >= 7 ? "Low" : (score as number) >= 4 ? "Medium" : "High";
              return `${cat}:${score}/9(${level})`;
            })
            .join(", ");
          ctx += ` — Exposure Index: [${exposureLevels}]`;
        }

        ctx += "\n";
      });
      ctx += "\n";
    }

    return ctx;
  } catch (err) {
    console.error("buildPlatformContext error:", err);
    // Return minimal context so the copilot still works even on DB errors
    return "## CLIENT PORTFOLIO\nUnable to load client data at this time.\n";
  }
}
