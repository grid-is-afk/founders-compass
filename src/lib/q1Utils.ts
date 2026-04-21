/**
 * Shared Q1 Discover utilities used across the advisor dashboard.
 * Extracted from ClientListPage and ClientWorkspace to avoid duplication (FIX-12).
 */

/**
 * Returns the number of days remaining in the 90-day Q1 engagement,
 * or null if no onboarding date is set.
 */
export function daysRemaining(onboardedAt: string | null): number | null {
  if (!onboardedAt) return null;
  const start = new Date(onboardedAt).getTime();
  const end = start + 90 * 24 * 60 * 60 * 1000;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Returns a Tailwind class string for the countdown chip based on
 * how many days are remaining. Includes border color for outlined chips.
 */
export function countdownChipClass(days: number | null): string {
  if (days === null) return "bg-muted/60 text-muted-foreground border-border/40";
  if (days < 10) return "bg-red-500/15 text-red-600 border-red-500/30";
  if (days < 30) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
}
