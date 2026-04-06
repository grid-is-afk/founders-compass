import { query } from "./db.js";

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
        ctx += `- ${p.name} — ${p.contact_name ?? "No contact"} — ${p.revenue ?? "Revenue unknown"} — Status: ${p.status ?? "intake"}`;
        if (p.fit_score != null) ctx += ` — Fit Score: ${p.fit_score}`;
        if (p.fit_decision) ctx += ` — ${p.fit_decision.toUpperCase()}`;
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
