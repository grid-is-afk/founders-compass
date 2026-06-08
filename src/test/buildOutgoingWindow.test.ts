import { describe, it, expect } from "vitest";
import { buildOutgoingWindow } from "../lib/copilotApi";

type Msg = { role: "user" | "assistant"; content: string };

// Rough UTF-8 byte size of the content, matching the helper's measure.
const bytes = (s: string) => new TextEncoder().encode(s).length;

describe("buildOutgoingWindow", () => {
  it("returns small histories unchanged and user-first", () => {
    const history: Msg[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
      { role: "user", content: "another question" },
    ];
    const out = buildOutgoingWindow(history);
    expect(out).toEqual(history);
    expect(out[0].role).toBe("user");
  });

  it("drops the oldest messages when a big mid-history report blows the budget", () => {
    const bigReport = "X".repeat(5 * 1024 * 1024); // 5MB report
    const history: Msg[] = [
      { role: "user", content: "old question 1" },
      { role: "assistant", content: bigReport }, // first big report
      { role: "user", content: "old question 2" },
      { role: "assistant", content: bigReport }, // second big report
      { role: "user", content: "newest question" },
    ];
    // Budget 6MB can hold the newest report + small turns, but not both reports.
    const out = buildOutgoingWindow(history, 6 * 1024 * 1024);

    // Newest message is always retained.
    expect(out[out.length - 1].content).toBe("newest question");
    // The older big report (and everything before it) is dropped.
    const totalBytes = out.reduce((n, m) => n + bytes(m.content), 0);
    expect(totalBytes).toBeLessThanOrEqual(6 * 1024 * 1024);
    // Only one big report survives.
    expect(out.filter((m) => m.content === bigReport).length).toBe(1);
    // Result still starts with a user message.
    expect(out[0].role).toBe("user");
  });

  it("trims leading assistant messages so the window starts with a user turn", () => {
    // A window selection that would otherwise start mid-exchange on an assistant.
    const big = "Y".repeat(4 * 1024 * 1024);
    const history: Msg[] = [
      { role: "user", content: "q1" },
      { role: "assistant", content: big }, // would be the oldest retained → assistant
      { role: "user", content: "q2" },
      { role: "assistant", content: "short answer" },
      { role: "user", content: "q3" },
    ];
    const out = buildOutgoingWindow(history, 4 * 1024 * 1024 + 1000);
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1].content).toBe("q3");
  });

  it("truncates a single message that alone exceeds the budget", () => {
    const huge = "Z".repeat(8 * 1024 * 1024); // 8MB single message > 6MB budget
    const history: Msg[] = [{ role: "user", content: huge }];
    const out = buildOutgoingWindow(history, 6 * 1024 * 1024);

    expect(out.length).toBe(1);
    expect(out[0].role).toBe("user");
    expect(bytes(out[0].content)).toBeLessThanOrEqual(6 * 1024 * 1024);
    expect(out[0].content).toContain("truncated");
  });

  it("measures UTF-8 bytes, not string length (multi-byte content)", () => {
    // Each "🚀" is 4 UTF-8 bytes; ".length" would undercount by ~4x.
    const emoji = "🚀".repeat(2 * 1024 * 1024); // ~8MB UTF-8, ~4M chars
    const history: Msg[] = [
      { role: "user", content: "early" },
      { role: "assistant", content: emoji },
      { role: "user", content: "latest" },
    ];
    const out = buildOutgoingWindow(history, 6 * 1024 * 1024);
    const totalBytes = out.reduce((n, m) => n + bytes(m.content), 0);
    expect(totalBytes).toBeLessThanOrEqual(6 * 1024 * 1024);
    expect(out[out.length - 1].content).toBe("latest");
  });

  it("handles an empty history", () => {
    expect(buildOutgoingWindow([])).toEqual([]);
  });
});
