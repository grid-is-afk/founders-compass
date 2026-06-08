import { describe, it, expect } from "vitest";
import { computeDueDates, addDaysUTC } from "../../server/lib/kickoffSchedule";
import { getPhaseForQuarter } from "../../server/methodology/tfo-methodology";

// Canonical Chapter-1 section windows (mirror of q1_phase_config seed).
const SECTION_DAY_ENDS: Record<string, number> = {
  kickoff: 7,
  prove: 28,
  diagnose: 49,
  design_tfo: 70,
  design_outside: 87,
  review: 90,
};
const TOTAL = 90;

const discover = getPhaseForQuarter(1)!;
const activities = discover.activities.map((a) => ({ id: a.id, section: a.section }));

describe("computeDueDates — section-based Discover scheduling", () => {
  it("orders Prove < Diagnose < Design TFO across a 90-day window", () => {
    const start = "2026-01-01";
    const due = computeDueDates(activities, SECTION_DAY_ENDS, TOTAL, start, 90);

    // Every activity got a date.
    for (const a of activities) expect(due[a.id]).toBeTruthy();

    const prove = [due["discover-master-intake"], due["discover-six-cs"]];
    const diagnose = [
      due["discover-fei"],
      due["discover-founder-matrix"],
      due["discover-founder-snapshot"],
      due["discover-six-keys-baseline"],
    ];
    const designTfo = [due["discover-wealth-gap"], due["discover-csa"]];

    // Section ordering: every Prove date < every Diagnose date < every Design TFO date.
    for (const p of prove) for (const d of diagnose) expect(p < d).toBe(true);
    for (const d of diagnose) for (const dt of designTfo) expect(d < dt).toBe(true);

    // Founder Exposure Index is no longer first — it sits in Diagnose, after Prove.
    expect(due["discover-master-intake"] < due["discover-fei"]).toBe(true);
    expect(due["discover-six-cs"] < due["discover-fei"]).toBe(true);

    // Same-section activities share the section's target date.
    expect(due["discover-master-intake"]).toBe(due["discover-six-cs"]);
    expect(due["discover-fei"]).toBe(due["discover-founder-matrix"]);
  });

  it("scales the section timeline to a shorter window while preserving order", () => {
    const start = "2026-01-01";
    const due = computeDueDates(activities, SECTION_DAY_ENDS, TOTAL, start, 30);
    expect(due["discover-master-intake"] < due["discover-fei"]).toBe(true);
    expect(due["discover-fei"] < due["discover-csa"]).toBe(true);
  });

  it("falls back to the window end for an unknown/missing section", () => {
    const start = "2026-01-01";
    const due = computeDueDates(
      [{ id: "x", section: "nope" }, { id: "y" }],
      SECTION_DAY_ENDS,
      TOTAL,
      start,
      40
    );
    expect(due["x"]).toBe(addDaysUTC(start, 40));
    expect(due["y"]).toBe(addDaysUTC(start, 40));
  });

  it("places known sections at their scaled day_end", () => {
    const start = "2026-01-01";
    const due = computeDueDates([{ id: "p", section: "prove" }], SECTION_DAY_ENDS, TOTAL, start, 90);
    expect(due["p"]).toBe(addDaysUTC(start, 28)); // prove day_end = 28 of 90
  });
});

describe("addDaysUTC", () => {
  it("adds calendar days without timezone drift", () => {
    expect(addDaysUTC("2026-01-01", 90)).toBe("2026-04-01");
    expect(addDaysUTC("2026-02-28", 1)).toBe("2026-03-01");
  });
});
