// ============================================================
// HubSpot → platform prospect sync (one-way).
//
// syncProspectsFromHubSpot() pulls deals modified since the last run, maps each
// deal's stage onto a prospect row (matched by the associated contact's email),
// and mirrors the 3 self-assessment result links + pitch deck. HubSpot is the
// source of truth: a linked prospect's status is overwritten to match HubSpot.
//
// Idempotent: prospects are keyed on hubspot_deal_id, so re-running refreshes
// rows instead of duplicating them. A single in-process lock prevents overlapping
// runs (the boot scheduler + a manual trigger could otherwise collide).
// ============================================================

import crypto from "crypto";
import path from "path";
import { query } from "../../db.js";
import { supabase, STORAGE_BUCKET } from "../supabase.js";
import {
  isHubSpotConfigured,
  searchModifiedDeals,
  getDealPipelines,
  getDealPrimaryContactId,
  getContact,
} from "./client.js";
import { buildStageIdMap, isWonLabel, type ProspectStatus } from "./stageMap.js";

// Contact properties we read: identity + the 3 assessment result links + pitch deck.
const CONTACT_PROPS = [
  "email",
  "firstname",
  "lastname",
  "company",
  "fre_assessment",
  "discovery_intake",
  "six_cs_assessment",
  "pitch_deck",
];

export interface HubSpotSyncResult {
  ok: boolean;
  dealsScanned: number;
  prospectsCreated: number;
  prospectsUpdated: number;
  skipped: number;
  pitchDecksImported: number;
  error?: string;
}

let syncInFlight = false;

/** Resolve a default advisor to own HubSpot-originated prospects (first admin, else first advisor). */
async function resolveDefaultAdvisorId(): Promise<string | null> {
  const result = await query(
    `SELECT id FROM users
     WHERE role IN ('admin', 'advisor')
     ORDER BY (role = 'admin') DESC, created_at ASC NULLS LAST
     LIMIT 1`
  );
  return result.rows[0]?.id ?? null;
}

/**
 * Download the pitch deck PDF and store it in the prospect's data room as a
 * `documents` row. Replaces any prior pitch-deck doc for the prospect. Best-effort:
 * a failure here never aborts the prospect sync.
 */
async function importPitchDeck(
  prospectId: string,
  url: string
): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`HubSpot sync: pitch deck fetch ${res.status} for prospect ${prospectId}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(new URL(url).pathname) || ".pdf";
    const bucketPath = `prospects/${prospectId}/${crypto.randomUUID()}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(bucketPath, buffer, {
        contentType: res.headers.get("content-type") ?? "application/pdf",
      });
    if (uploadError) throw uploadError;

    // Remove any previous HubSpot pitch-deck doc so we don't pile up on re-import.
    await query(
      `DELETE FROM documents WHERE prospect_id = $1 AND category = 'Pitch Deck'`,
      [prospectId]
    );

    const fileName = decodeURIComponent(path.basename(new URL(url).pathname)) || "pitch-deck.pdf";
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    await query(
      `INSERT INTO documents
         (prospect_id, client_id, name, category, file_url, size, size_bytes, type, uploaded_by_role)
       VALUES ($1, NULL, $2, 'Pitch Deck', $3, $4, $5, 'pdf', 'advisor')`,
      [prospectId, fileName, bucketPath, `${sizeMb} MB`, buffer.length]
    );
    return true;
  } catch (err) {
    console.warn(`HubSpot sync: pitch deck import failed for prospect ${prospectId}:`, err);
    return false;
  }
}

export async function syncProspectsFromHubSpot(): Promise<HubSpotSyncResult> {
  const empty: HubSpotSyncResult = {
    ok: false,
    dealsScanned: 0,
    prospectsCreated: 0,
    prospectsUpdated: 0,
    skipped: 0,
    pitchDecksImported: 0,
  };

  if (!isHubSpotConfigured()) {
    return { ...empty, error: "HUBSPOT_PAT not configured" };
  }
  if (syncInFlight) {
    return { ...empty, error: "A sync is already running" };
  }
  syncInFlight = true;

  // Watermark for the NEXT run is captured at the start, so deals modified during
  // this run aren't missed next time.
  const runStartedAt = new Date().toISOString();

  const result: HubSpotSyncResult = { ...empty, ok: true };

  try {
    const advisorId = await resolveDefaultAdvisorId();
    if (!advisorId) {
      throw new Error("No admin/advisor user to own synced prospects");
    }

    const stateRow = await query(
      `SELECT last_sync_at FROM hubspot_sync_state WHERE id = 1`
    );
    const lastSyncAt: string | undefined =
      stateRow.rows[0]?.last_sync_at?.toISOString?.() ?? stateRow.rows[0]?.last_sync_at ?? undefined;

    const [pipelines, deals] = await Promise.all([
      getDealPipelines(),
      searchModifiedDeals(lastSyncAt),
    ]);
    const stageIdMap = buildStageIdMap(pipelines);
    result.dealsScanned = deals.length;

    for (const deal of deals) {
      try {
        const stageId = deal.properties.dealstage;
        const mapped = stageId ? stageIdMap[stageId] : undefined;
        if (!mapped) {
          result.skipped += 1;
          continue;
        }
        const status: ProspectStatus = mapped.status;
        const stageLabel = mapped.label;

        // Resolve the deal's primary contact to get the email (our match key) +
        // assessment links. A deal with no contact can't be matched/created.
        const contactId = await getDealPrimaryContactId(deal.id);
        if (!contactId) {
          result.skipped += 1;
          continue;
        }
        const contact = await getContact(contactId, CONTACT_PROPS);
        const p = contact.properties;
        const email = p.email?.trim().toLowerCase();
        if (!email) {
          result.skipped += 1;
          continue;
        }

        const fullName = [p.firstname, p.lastname].filter(Boolean).join(" ").trim();
        const name = fullName || deal.properties.dealname || email;
        const company = p.company || deal.properties.dealname || null;
        const revenue = deal.properties.amount || null;
        const freUrl = p.fre_assessment || null;
        const discoveryUrl = p.discovery_intake || null;
        const sixcsUrl = p.six_cs_assessment || null;
        const pitchUrl = p.pitch_deck || null;

        // Find an existing prospect: first by deal id, then by contact email.
        const existing = await query(
          `SELECT id, hubspot_pitch_deck_url FROM prospects
           WHERE hubspot_deal_id = $1
              OR (LOWER(contact) = $2)
           ORDER BY (hubspot_deal_id = $1) DESC
           LIMIT 1`,
          [deal.id, email]
        );

        let prospectId: string;
        let priorPitchUrl: string | null = null;

        if (existing.rows.length > 0) {
          prospectId = existing.rows[0].id;
          priorPitchUrl = existing.rows[0].hubspot_pitch_deck_url ?? null;
          await query(
            `UPDATE prospects SET
               name = $2,
               contact = $3,
               company = COALESCE($4, company),
               revenue = COALESCE($5, revenue),
               status = $6,
               hubspot_deal_id = $7,
               hubspot_stage = $8,
               synced_from_hubspot = true,
               assessment_fre_url = $9,
               assessment_discovery_url = $10,
               assessment_sixcs_url = $11,
               hubspot_pitch_deck_url = $12,
               hubspot_synced_at = NOW(),
               updated_at = NOW()
             WHERE id = $1`,
            [
              prospectId, name, email, company, revenue, status, deal.id,
              stageLabel, freUrl, discoveryUrl, sixcsUrl, pitchUrl,
            ]
          );
          result.prospectsUpdated += 1;
        } else {
          const inserted = await query(
            `INSERT INTO prospects
               (advisor_id, name, contact, company, revenue, source, status,
                hubspot_deal_id, hubspot_stage, synced_from_hubspot,
                assessment_fre_url, assessment_discovery_url, assessment_sixcs_url,
                hubspot_pitch_deck_url, hubspot_synced_at)
             VALUES ($1, $2, $3, $4, $5, 'HubSpot', $6, $7, $8, true, $9, $10, $11, $12, NOW())
             RETURNING id`,
            [
              advisorId, name, email, company, revenue, status, deal.id,
              stageLabel, freUrl, discoveryUrl, sixcsUrl, pitchUrl,
            ]
          );
          prospectId = inserted.rows[0].id;
          result.prospectsCreated += 1;
        }

        // Import the pitch deck only when its URL is new/changed (avoids
        // re-downloading the same PDF every 15-minute cycle).
        if (pitchUrl && pitchUrl !== priorPitchUrl) {
          const imported = await importPitchDeck(prospectId, pitchUrl);
          if (imported) result.pitchDecksImported += 1;
        }

        // "Won" deals are surfaced but NOT auto-enrolled in v1 — TFO still clicks
        // "Win — Enroll as Client". (Mapped status is already 'onboarding'.)
        void isWonLabel;
      } catch (dealErr) {
        // One bad deal must not sink the whole run.
        console.error(`HubSpot sync: deal ${deal.id} failed:`, dealErr);
        result.skipped += 1;
      }
    }

    await query(
      `UPDATE hubspot_sync_state
       SET last_sync_at = $1, last_status = 'ok', last_error = NULL, updated_at = NOW()
       WHERE id = 1`,
      [runStartedAt]
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("HubSpot sync failed:", message);
    await query(
      `UPDATE hubspot_sync_state
       SET last_status = 'error', last_error = $1, updated_at = NOW()
       WHERE id = 1`,
      [message]
    ).catch(() => {});
    return { ...result, ok: false, error: message };
  } finally {
    syncInFlight = false;
  }
}
