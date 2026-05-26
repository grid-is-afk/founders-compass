import type { AgendaSectionInput } from "./agendaDocx.js";

/**
 * Parse a meetings.agenda TEXT column (JSON-serialized sections).
 *
 * Tolerates the legacy item shape (plain string) and the current shape
 * ({ text, source }). Returns an empty array on any parse failure — callers
 * should treat an empty result as "no agenda available" and decide whether
 * that's an error or a normal state.
 */
export function parseAgendaSections(raw: string | null | undefined): AgendaSectionInput[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const sections: AgendaSectionInput[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title : "";
    const rawItems = Array.isArray(rec.items) ? rec.items : [];
    const items = rawItems.map((item) => {
      if (typeof item === "string") return { text: item };
      if (item && typeof item === "object") {
        const it = item as Record<string, unknown>;
        return {
          text: typeof it.text === "string" ? it.text : "",
          source: typeof it.source === "string" ? it.source : undefined,
        };
      }
      return { text: "" };
    });
    sections.push({ title, items });
  }
  return sections;
}
