import { describe, it, expect } from "vitest";
import { computeDueDates, addDaysUTC } from "../../server/lib/kickoffSchedule";
import { getPhaseForQuarter } from "../../server/methodology/tfo-methodology";

const discover = getPhaseForQuarter(1)!;
const activities = discover.activities.map((a) => ({ id: a.id, prerequisites: a.prerequisites }));

describe("computeDueDates — Discover DAG", () => {
  it("orders Master Intake before diagnostics before Wealth Gap before CSA (90-day window)", () => {
    const start = "2026-01-01";
    const due = computeDueDates(activities, start, 90);

    const intake = due["discover-master-intake"];
    const csa = due["discover-csa"];
    const wealthGap = due["discover-wealth-gap"];
    const diagnostics = [
      "discover-fei",
      "discover-six-cs",
      "discover-founder-matrix",
      "discover-founder-snapshot",
      "discover-six-keys-baseline",
    ];

    // Every activity got a date.
    for (const a of activities) expect(due[a.id]).toBeTruthy();

    // Master Intake is the earliest level; CSA is the latest.
    for (const d of diagnostics) {
      if (d !== "discover-fei") {
        // fei is a depth-0 root alongside intake, so it may share intake's date.
        expect(intake < due[d]).toBe(true);
      }
      expect(due[d] < csa).toBe(true);
    }
    expect(intake < wealthGap).toBe(true);
    expect(wealthGap < csa).toBe(true);
    // CSA lands on the window end.
    expect(csa).toBe(addDaysUTC(start, 90));
  });

  it("keeps prerequisites strictly earlier than dependents even in a tiny window", () => {
    const start = "2026-01-01";
    const due = computeDueDates(activities, start, 3);
    for (const a of discover.activities) {
      for (const p of a.prerequisites ?? []) {
        expect(due[p] < due[a.id]).toBe(true);
      }
    }
  });

  it("throws on a cyclic graph", () => {
    expect(() =>
      computeDueDates(
        [
          { id: "a", prerequisites: ["b"] },
          { id: "b", prerequisites: ["a"] },
        ],
        "2026-01-01",
        30
      )
    ).toThrow(/cycle/i);
  });

  it("puts a single flat level at the window end", () => {
    const due = computeDueDates(
      [{ id: "a" }, { id: "b" }],
      "2026-01-01",
      30
    );
    expect(due["a"]).toBe("2026-01-31");
    expect(due["b"]).toBe("2026-01-31");
  });
});

describe("addDaysUTC", () => {
  it("adds calendar days without timezone drift", () => {
    expect(addDaysUTC("2026-01-01", 90)).toBe("2026-04-01");
    expect(addDaysUTC("2026-02-28", 1)).toBe("2026-03-01");
  });
});
