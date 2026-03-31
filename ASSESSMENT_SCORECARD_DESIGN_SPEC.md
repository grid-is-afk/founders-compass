# Exit Planning Assessment Scorecards -- Design Specification

**Author:** Frontend Designer Agent
**Date:** 2026-03-27
**Status:** Ready for Implementation
**Target Route:** `/advisor/assessments`
**Replaces:** `AdvisorAssessments` placeholder in `AdvisorPlaceholders.tsx`

---

## Table of Contents

1. [Design System Alignment](#1-design-system-alignment)
2. [Color Mapping & Semantic Tokens](#2-color-mapping--semantic-tokens)
3. [Dashboard Integration Strategy](#3-dashboard-integration-strategy)
4. [Component 1: Assessment Summary Cards](#4-component-1-assessment-summary-cards)
5. [Component 2: Assessment Detail Page](#5-component-2-assessment-detail-page)
6. [Component 3: Factor Score Visualization](#6-component-3-factor-score-visualization)
7. [Component 4: 54 Value Factors Grid](#7-component-4-54-value-factors-grid)
8. [Component 5: Dashboard Zone Integration](#8-component-5-dashboard-zone-integration)
9. [File Structure & Component Hierarchy](#9-file-structure--component-hierarchy)
10. [shadcn/ui Components Required](#10-shadcnui-components-required)
11. [Responsive Considerations](#11-responsive-considerations)
12. [ASCII Layout Mockups](#12-ascii-layout-mockups)

---

## 1. Design System Alignment

### Existing Patterns to Follow

| Pattern | Source Component | How to Reuse |
|---------|-----------------|--------------|
| Page header | `AdvisorDashboard.tsx` line 29-34 | `h1` with `text-3xl font-display font-semibold` + subtitle `text-sm text-muted-foreground` |
| Stat row | `StatCard.tsx` | 4-col grid of stat cards at top of every engine page |
| Card container | Every panel | `bg-card rounded-lg border border-border p-5 shadow-card` |
| Section heading | `AdvisorDashboard.tsx` line 82 | `text-lg font-display font-semibold text-foreground mb-4` |
| Progress bar | `PerformanceEngine.tsx` line 44 | `w-N h-1.5 rounded-full bg-muted overflow-hidden` with inner `gradient-olive` or `gradient-gold` |
| Severity styling | `copilotStyles.tsx` | Reuse `urgencyStyle`, `severityStyle`, `severityIcon` patterns |
| Tabbed panels | `IntelligencePanel.tsx` | shadcn `Tabs` with `Badge` counts on triggers |
| Data rows | `PerformanceEngine.tsx` KPI rows | `divide-y divide-border` with `px-5 py-4` row padding |

### Typography

- **Display headings:** `font-display` (EB Garamond) -- used for h1, h2, h3, score numerals
- **Body/labels:** `font-body` (Inter) -- used for descriptions, metadata, factor names
- **Score numerals:** `font-display font-bold` at large sizes for hero scores
- **Micro labels:** `text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60`
- **Factor labels:** `text-sm font-medium text-foreground`

### Spacing Scale (follows existing patterns)

- Card internal padding: `p-5` (20px)
- Section gap: `space-y-6` or `space-y-8` (24px / 32px)
- Grid gap: `gap-4` (16px) for stat cards, `gap-6` (24px) for content columns
- Row internal padding: `px-5 py-4`
- Tight spacing between related elements: `gap-2` (8px)

---

## 2. Color Mapping & Semantic Tokens

### Score-Level Color System

This maps the 1-6 scoring scale and the Positive/Neutral/Improvement ratings to the existing palette.

| Score Range | Label | Background | Text | Border | CSS Classes |
|-------------|-------|------------|------|--------|-------------|
| 5-6 | Strong / Positive | `bg-primary/10` | `text-primary` | `border-primary/20` | `.score-strong` |
| 3-4 | Moderate / Neutral | `bg-accent/15` | `text-accent-foreground` | `border-accent/20` | `.score-moderate` |
| 1-2 | At Risk / For Improvement | `bg-destructive/10` | `text-destructive` | `border-destructive/20` | `.score-atrisk` |

Rationale: These map directly to the existing `urgencyStyle` in `copilotStyles.tsx` (high/medium/low). The olive-green primary = strong, gold accent = moderate, red destructive = at risk. This maintains palette consistency without introducing new colors.

### Assessment-Level Color Accents

Each of the 4 assessments gets a subtle identity within the palette:

| Assessment | Icon | Accent Treatment |
|------------|------|------------------|
| Business Attractiveness | `TrendingUp` | `gradient-gold` ring/accent |
| Business Readiness | `Shield` | `gradient-olive` ring/accent |
| Personal Readiness | `User` (or `Heart`) | `bg-primary/10` ring |
| 54 Value Factors | `LayoutGrid` | `bg-accent/15` ring |

These are subtle -- a small colored ring or icon background. The primary visual differentiator is the label text, not color.

### Overall Score Gauge Colors

For the circular/ring gauges showing overall percentages:

| Percentage | Ring Color | Token |
|------------|------------|-------|
| 75-100% | Olive gradient | `gradient-olive` stroke |
| 50-74% | Gold gradient | `hsl(var(--gold))` stroke |
| 25-49% | Amber | `text-amber-500` stroke |
| 0-24% | Destructive red | `hsl(var(--destructive))` stroke |

---

## 3. Dashboard Integration Strategy

### Decision: New "Assessments" Tab in IntelligencePanel + Dedicated Page

**Do NOT** replace the Six Keys section. The Six Keys of Capital is a proprietary framework that serves a different diagnostic purpose than exit planning assessments. They should coexist.

**Integration approach:**

1. **Intelligence Panel** -- Add a 6th tab called "Assessments" to the existing `IntelligencePanel.tsx` Tabs component. This tab shows a compact 4-card summary (one per assessment) with score, trend, and a "View Details" link to `/advisor/assessments`.

2. **Zone 4 sidebar** -- Add a compact "Assessment Health" card below the `EngineStatusPanel` in the right column. This shows 4 mini progress bars (one per assessment overall score) as a quick-glance diagnostic.

3. **Dedicated page** (`/advisor/assessments`) -- The full assessment detail view. This replaces the current placeholder.

This keeps the dashboard uncluttered while surfacing assessment data in two lightweight touchpoints.

---

## 4. Component 1: Assessment Summary Cards

### Where Used
- Intelligence Panel "Assessments" tab (compact variant)
- Top of `/advisor/assessments` page (full variant)

### Component: `AssessmentSummaryCard`

**Props interface:**
```
AssessmentSummaryCardProps {
  title: string                    // "Business Attractiveness"
  score: number                    // 0-100 (percentage)
  maxRawScore: number              // 150, 132, 66, or 54
  rawScore: number                 // actual total
  factorCount: number              // 25, 22, 11, or 54
  trend: "up" | "down" | "stable"  // vs. prior assessment
  trendDelta: number               // e.g., +3 or -2
  categories: {
    name: string
    score: number                  // category percentage
    factorCount: number
  }[]
  icon: LucideIcon
  accentClass: string              // "gradient-gold" | "gradient-olive" etc.
  variant: "full" | "compact"
}
```

### Full Variant Layout (Assessment Page)

```
.---------------------------------------------------------------.
| [icon-ring]  BUSINESS ATTRACTIVENESS SCORE                    |
|              25 factors across 4 categories                   |
|                                                               |
|    .---------.                                                |
|    |         |   108 / 150                                    |
|    |   72%   |   +3pts from last assessment  [arrow-up]       |
|    |         |                                                |
|    '---------'                                                |
|     SVG ring                                                  |
|                                                               |
|  Category Breakdown:                                          |
|  Business Factors (11)     =====[=======]========  68%        |
|  Forecast Factors (5)      =====[====]============ 74%        |
|  Market Factors (5)        =====[========]======== 80%        |
|  Investor Considerations(4)=====[====]============ 71%        |
'---------------------------------------------------------------'
```

**Structure:**
- Container: `bg-card rounded-lg border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow`
- Top row: Icon in a `w-10 h-10 rounded-lg [accentClass]` container + title as `text-xs font-semibold uppercase tracking-wide text-muted-foreground` + factor count as `text-[11px] text-muted-foreground`
- Score area: Flex row. Left: SVG ring gauge (80px diameter). Right: raw score in `text-2xl font-display font-bold`, fraction in `text-sm text-muted-foreground`, trend badge.
- Trend badge: `inline-flex items-center gap-1 text-xs font-medium` with conditional color (green up, red down, muted stable)
- Category breakdown: `space-y-2.5 mt-4 pt-4 border-t border-border`. Each row is a flex with label, progress bar (`h-1.5 rounded-full`), percentage.

### Compact Variant (Intelligence Panel Tab)

```
.------------------------------------.
| [icon] BUSINESS ATTRACTIVENESS     |
|        72%  [+3 up-arrow]          |
|  =====[===============]== 72%      |
'------------------------------------'
```

**Structure:**
- Container: `p-3 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer`
- Single line: icon (16px) + title `text-xs font-semibold` + score `text-sm font-display font-bold` + trend pill
- Below: single thin progress bar for overall score
- Click navigates to `/advisor/assessments`

### Grid Placement (Assessment Page Top)

Four cards in a `grid grid-cols-2 gap-4` layout (2x2). This is intentionally NOT 4-across because the cards have enough content (category breakdowns) that 4-across would compress them too much. Two columns gives each card room to breathe.

For the Intelligence Panel tab, use `grid grid-cols-2 gap-3` (the compact variants are shorter).

---

## 5. Component 2: Assessment Detail Page

### Route: `/advisor/assessments`

### Component: `AdvisorAssessmentsPage`

### Page Structure

```
ZONE A: Page Header
ZONE B: Assessment Summary Cards (2x2 grid)
ZONE C: Assessment Detail Tabs (one tab per assessment)
ZONE D: Active tab content -- category/factor detail
```

### Zone A: Page Header

Follow the exact same pattern as `CapitalArchitecture.tsx`:

```
<div>
  <h1 class="text-3xl font-display font-semibold text-foreground">
    Exit Planning Assessments
  </h1>
  <p class="text-muted-foreground mt-1 text-sm">
    Diagnostic scorecards across business attractiveness, readiness, personal preparedness, and value factors
  </p>
</div>
```

Optional: Add a client selector dropdown to the right of the header (same row, flex justify-between) so advisors can switch between client assessments. Use shadcn `Select` component.

### Zone B: Summary Cards

```html
<div class="grid grid-cols-2 gap-4">
  <AssessmentSummaryCard variant="full" ... /> <!-- Business Attractiveness -->
  <AssessmentSummaryCard variant="full" ... /> <!-- Business Readiness -->
  <AssessmentSummaryCard variant="full" ... /> <!-- Personal Readiness -->
  <AssessmentSummaryCard variant="full" ... /> <!-- 54 Value Factors -->
</div>
```

The 54 Value Factors card is a special case -- instead of a ring gauge showing percentage, it shows a stacked horizontal bar or donut with Positive/Neutral/Improvement counts. See Section 7 for details.

### Zone C: Assessment Detail Tabs

Use shadcn `Tabs` exactly as `IntelligencePanel.tsx` does:

```html
<Tabs defaultValue="attractiveness">
  <TabsList class="mb-4">
    <TabsTrigger value="attractiveness">
      Business Attractiveness
      <Badge variant="secondary" class="text-[10px] ml-1">25</Badge>
    </TabsTrigger>
    <TabsTrigger value="readiness">
      Business Readiness
      <Badge variant="secondary" class="text-[10px] ml-1">22</Badge>
    </TabsTrigger>
    <TabsTrigger value="personal">
      Personal Readiness
      <Badge variant="secondary" class="text-[10px] ml-1">11</Badge>
    </TabsTrigger>
    <TabsTrigger value="value-factors">
      54 Value Factors
      <Badge variant="secondary" class="text-[10px] ml-1">54</Badge>
    </TabsTrigger>
  </TabsList>

  <TabsContent value="attractiveness">
    <AssessmentDetailPanel assessment="attractiveness" />
  </TabsContent>
  <!-- ... other tabs ... -->
</Tabs>
```

### Zone D: Assessment Detail Panel Content

#### For Scored Assessments (Business Attractiveness, Business Readiness, Personal Readiness)

Component: `AssessmentDetailPanel`

Layout:
```
.---------------------------------------------------------------.
| BUSINESS FACTORS (11 factors)                    Avg: 4.2/6   |
|---------------------------------------------------------------|
| Factor Name                    | Considerations | Score       |
|---------------------------------------------------------------|
| Management Team Depth          | Strong bench   | [*][*][*][*][*][ ] 5/6 |
| Revenue Diversity              | Concentrated   | [*][*][ ][ ][ ][ ] 2/6 |
| Customer Contracts             | Recurring 80%  | [*][*][*][*][*][*] 6/6 |
| ...                            |                |                         |
|---------------------------------------------------------------|
|                                                               |
| FORECAST FACTORS (5 factors)                     Avg: 3.8/6   |
| ...                                                           |
'---------------------------------------------------------------'
```

**Category header row:**
- Container: `flex items-center justify-between px-5 py-3 bg-muted/50 rounded-t-md border border-border`
- Left: Category name as `text-sm font-semibold text-foreground` + factor count as `text-xs text-muted-foreground ml-2`
- Right: Category average as `text-sm font-display font-semibold` colored by score level

**Factor rows:**
- Container: `divide-y divide-border` within a `bg-card rounded-b-md border-x border-b border-border` wrapper
- Each row: `flex items-center px-5 py-3.5 gap-4`
  - Factor name: `text-sm font-medium text-foreground flex-1` (takes remaining space)
  - Considerations: `text-xs text-muted-foreground w-48 truncate` (fixed width, truncated with tooltip on hover)
  - Score visualization: `flex items-center gap-1.5 w-40` (fixed width, right-aligned)
  - Numeric score: `text-xs font-semibold w-8 text-right` colored by score level

The category + factor rows form a visual group. Add `space-y-6` between category groups so they read as distinct sections.

#### For 54 Value Factors

See Section 7 below for the specialized grid treatment.

---

## 6. Component 3: Factor Score Visualization

### Decision: Segmented Score Dots (6 segments)

For the 1-6 score scale, use **6 segmented dots** (not a progress bar, not a mini bar chart). Reasoning:

1. A progress bar implies a continuous range -- but 1-6 is discrete. Dots communicate "this is one of six possible levels."
2. Six dots at this scale (16px-18px total width per dot) fit comfortably in a table row.
3. The dot pattern is visually distinct from the progress bars already used for engine health and KPIs, avoiding visual confusion.

### Component: `ScoreSegments`

**Props:**
```
ScoreSegmentsProps {
  score: number       // 1-6
  maxScore?: number   // default 6
  size?: "sm" | "md"  // sm for table rows, md for standalone
}
```

**Visual specification:**

```
Score 5/6:  [*] [*] [*] [*] [*] [ ]
             ^                   ^
             filled              empty
```

- Each segment: `w-2.5 h-2.5 rounded-full` (10px circles)
- Gap between segments: `gap-1` (4px)
- Filled segments (up to score value): background colored by score level
  - Score 5-6: `bg-primary` (olive green)
  - Score 3-4: `bg-accent` (gold)
  - Score 1-2: `bg-destructive` (red)
- Empty segments: `bg-muted` (light gray)
- Container: `inline-flex items-center gap-1`

**Small variant (`size="sm"`):**
- Segments: `w-2 h-2 rounded-full`
- Gap: `gap-0.5`

### Category Aggregate Bar

For category-level scores in the summary cards:

- Use the existing progress bar pattern: `h-1.5 rounded-full bg-muted overflow-hidden`
- Inner fill: conditionally use `gradient-olive` (75%+), `bg-accent` (50-74%), `bg-amber-500` (25-49%), `bg-destructive` (0-24%)
- This reuses the exact same pattern as `PerformanceEngine.tsx` KPI bars

### Overall Assessment Ring Gauge

Component: `ScoreRing`

**Props:**
```
ScoreRingProps {
  percentage: number   // 0-100
  size?: number        // diameter in px, default 80
  strokeWidth?: number // default 6
  label?: string       // optional center label
}
```

**Visual specification:**
- SVG circle with `stroke-dasharray` / `stroke-dashoffset` for the percentage arc
- Background track: `stroke="hsl(var(--muted))"`
- Foreground arc: colored by percentage range (see gauge colors in Section 2)
- Center text: percentage as `font-display font-bold text-lg` + "%" as `text-xs text-muted-foreground`
- Rotation: Start from 12 o'clock (`transform="rotate(-90)"`)

This is a pure SVG component. Do NOT use a third-party charting library -- keep the dependency footprint minimal.

---

## 7. Component 4: 54 Value Factors Grid

The 54 Value Factors assessment is structurally different from the scored assessments. Instead of 1-6 numeric scores, each factor has a tri-state rating: Positive, Neutral, or For Improvement.

### Component: `ValueFactorsPanel`

### Summary Row (top of the panel)

```
.---------------------------------------------------------------.
| 54 VALUE FACTORS                                              |
|                                                               |
| [====POSITIVE====][==NEUTRAL==][=IMPROVEMENT=]                |
|  32 Positive       14 Neutral   8 For Improvement             |
|                                                               |
| Overall Distribution:  59% Positive | 26% Neutral | 15% Risk  |
'---------------------------------------------------------------'
```

**Stacked bar:** A horizontal bar composed of 3 segments, proportionally sized:
- Container: `w-full h-3 rounded-full overflow-hidden flex`
- Positive segment: `bg-primary` (olive)
- Neutral segment: `bg-accent` (gold)
- Improvement segment: `bg-destructive`

Below the bar: three counts with matching dot indicators, laid out as a `flex items-center gap-6`:
```
[dot-olive] 32 Positive    [dot-gold] 14 Neutral    [dot-red] 8 For Improvement
```
- Dot: `w-2 h-2 rounded-full` with matching bg color
- Count: `text-sm font-display font-semibold`
- Label: `text-xs text-muted-foreground`

### Category Sections (collapsible)

Use shadcn `Collapsible` (already available in `components/ui/collapsible.tsx`).

```
.---------------------------------------------------------------.
| [-] PERSONAL (5 factors)                  4P | 1N | 0I        |
|---------------------------------------------------------------|
| Factor Name                          [POSITIVE]               |
| Factor Name                          [NEUTRAL]                |
| Factor Name                          [FOR IMPROVEMENT]        |
| Factor Name                          [POSITIVE]               |
| Factor Name                          [POSITIVE]               |
|---------------------------------------------------------------|
|                                                               |
| [-] BUSINESS OPERATIONS (18 factors)     12P | 4N | 2I        |
| ...                                                           |
'---------------------------------------------------------------'
```

**Category header (Collapsible trigger):**
- Container: `flex items-center justify-between px-5 py-3 bg-muted/50 rounded-md border border-border cursor-pointer hover:bg-muted/70 transition-colors`
- Left: chevron icon (`ChevronDown` / `ChevronRight`, `w-4 h-4 text-muted-foreground`) + category name `text-sm font-semibold text-foreground` + factor count `text-xs text-muted-foreground ml-2`
- Right: compact status counts -- three mini badges inline:
  - `text-[10px] font-semibold` with `text-primary` for Positive count, `text-accent-foreground` for Neutral, `text-destructive` for Improvement
  - Separated by `text-muted-foreground/40` pipe characters: `|`

**Factor rows (Collapsible content):**
- Container: `divide-y divide-border bg-card border-x border-b border-border rounded-b-md`
- Each row: `flex items-center justify-between px-5 py-3`
  - Factor name: `text-sm text-foreground`
  - Status badge: Use shadcn `Badge` with conditional styling:

### Status Badge Component: `ValueFactorBadge`

| Status | Badge Variant | Classes |
|--------|--------------|---------|
| Positive | custom | `bg-primary/10 text-primary border-primary/20 text-xs font-medium` |
| Neutral | custom | `bg-accent/15 text-accent-foreground border-accent/20 text-xs font-medium` |
| For Improvement | custom | `bg-destructive/10 text-destructive border-destructive/20 text-xs font-medium` |

Each badge shows the status text with a small leading dot:
```
[* Positive]    [* Neutral]    [* For Improvement]
```

The dot is a `w-1.5 h-1.5 rounded-full` with matching background color, placed inline before the text.

### Category Order (top to bottom)

1. Personal (5 factors)
2. Business Operations (18 factors) -- largest, starts expanded
3. Industry / Market (7 factors)
4. Legal / Regulatory (8 factors)
5. Financial (12 factors) -- second largest
6. Economic / M&A (2 factors)

Default state: **Business Operations** and **Financial** categories start expanded (they're the largest and most actionable). Others start collapsed.

---

## 8. Component 5: Dashboard Zone Integration

### 8a. Intelligence Panel Tab Addition

Add an "Assessments" tab to `IntelligencePanel.tsx`:

```html
<TabsTrigger value="assessments" class="flex items-center gap-1.5">
  Assessments
  <Badge variant="secondary" class="text-[10px] ml-1">4</Badge>
</TabsTrigger>
```

Tab content: `AssessmentsSummaryTab` component

```
.---------------------------------------------------------------.
| .-----------------------------. .----------------------------. |
| | [ring] Attractiveness  72%  | | [ring] Readiness      68% | |
| |  +3 from last      [View]  | |  -2 from last     [View]  | |
| '-----------------------------' '----------------------------' |
| .-----------------------------. .----------------------------. |
| | [ring] Personal       81%  | | [bar] 54 Factors          | |
| |  stable             [View] | |  32P 14N 8I       [View]  | |
| '-----------------------------' '----------------------------' |
'---------------------------------------------------------------'
```

- 2x2 grid inside the `max-h-[400px] overflow-y-auto` container
- Each card is the compact variant of `AssessmentSummaryCard`
- "View" is a ghost button linking to `/advisor/assessments`
- Container: `grid grid-cols-2 gap-3`

### 8b. Sidebar Assessment Health Card

Add below `EngineStatusPanel` in the right column of Zone 4 on the AdvisorDashboard.

Component: `AssessmentHealthCard`

```
.-----------------------------------.
| [clipboard-check] Assessment Health|
|-----------------------------------|
| Attractiveness   =====[====] 72%  |
| Readiness        =====[====] 68%  |
| Personal         =====[=====] 81% |
| Value Factors    32/14/8          |
|                                   |
| [View Assessments ->]             |
'-----------------------------------'
```

**Structure:**
- Container: `bg-card rounded-lg border border-border p-5`
- Header: follows `EngineStatusPanel` exactly -- `h3` with icon + text
- Four rows: `space-y-3`
  - Each: `flex items-center justify-between` with label (text-sm), progress bar (w-20 h-1.5), percentage (text-xs)
  - Value Factors row: instead of progress bar, show three colored count pills inline
- Footer link: `text-xs text-primary font-medium hover:underline` linking to `/advisor/assessments`

**Placement in AdvisorDashboard.tsx:**

In Zone 4's right column (`col-span-1`), add after EngineStatusPanel and before Recent Activity:

```html
<div class="space-y-6">
  <EngineStatusPanel />
  <AssessmentHealthCard />   <!-- NEW -->
  <div> <!-- Recent Activity --> </div>
</div>
```

---

## 9. File Structure & Component Hierarchy

```
src/
  components/
    dashboard/
      copilot/
        AssessmentsSummaryTab.tsx     -- Tab content for IntelligencePanel
      assessments/
        AssessmentSummaryCard.tsx     -- Summary card (full + compact variants)
        AssessmentDetailPanel.tsx     -- Category/factor detail for scored assessments
        AssessmentHealthCard.tsx      -- Compact sidebar card for dashboard Zone 4
        ScoreSegments.tsx             -- 6-dot score visualization
        ScoreRing.tsx                 -- SVG circular gauge
        ValueFactorsPanel.tsx         -- 54 Value Factors specialized view
        ValueFactorBadge.tsx          -- Positive/Neutral/Improvement badge
        CategorySection.tsx           -- Collapsible category group (shared by all)
  pages/
    advisor/
      AdvisorAssessments.tsx          -- Full page (replaces placeholder)
  lib/
    assessmentData.ts                 -- Mock data for all 4 assessments
    assessmentStyles.ts               -- Score color maps, status configs
```

### Component Dependency Tree

```
AdvisorAssessments (page)
  +-- AssessmentSummaryCard (x4, full variant)
  |     +-- ScoreRing
  |     +-- category progress bars (native)
  +-- Tabs (shadcn)
       +-- AssessmentDetailPanel (x3 for scored assessments)
       |     +-- CategorySection (per category)
       |           +-- ScoreSegments (per factor row)
       +-- ValueFactorsPanel (for 54 Value Factors tab)
             +-- stacked bar (native)
             +-- CategorySection (x6 collapsible)
                   +-- ValueFactorBadge (per factor)

AdvisorDashboard (modified)
  +-- AssessmentHealthCard (Zone 4 sidebar)

IntelligencePanel (modified)
  +-- AssessmentsSummaryTab (new tab content)
        +-- AssessmentSummaryCard (x4, compact variant)
              +-- ScoreRing (small)
```

---

## 10. shadcn/ui Components Required

All of these are already installed in the project:

| Component | File | Usage |
|-----------|------|-------|
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `tabs.tsx` | Assessment detail tabs, Intelligence Panel tab |
| `Badge` | `badge.tsx` | Factor counts on tab triggers, status badges |
| `Progress` | `progress.tsx` | Category aggregate bars (optional -- could use raw div) |
| `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | `collapsible.tsx` | 54 Value Factors category sections |
| `Tooltip`, `TooltipTrigger`, `TooltipContent` | `tooltip.tsx` | Truncated consideration text hover, score explanations |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | `select.tsx` | Client selector in assessment page header |
| `Button` | `button.tsx` | "View Details" links, actions |
| `Separator` | `separator.tsx` | Visual dividers between sections |
| `ScrollArea` | `scroll-area.tsx` | Tab content overflow (following existing `max-h-[400px]` pattern) |

### Lucide Icons to Use

| Icon | Purpose |
|------|---------|
| `TrendingUp` | Business Attractiveness assessment |
| `Shield` | Business Readiness assessment |
| `User` or `UserCheck` | Personal Readiness assessment |
| `LayoutGrid` | 54 Value Factors assessment |
| `ArrowUpRight` | Positive trend indicator |
| `ArrowDownRight` | Negative trend indicator |
| `Minus` | Stable trend indicator |
| `ChevronDown` / `ChevronRight` | Collapsible toggle |
| `ClipboardCheck` | Assessment Health sidebar card header |
| `ExternalLink` | "View Details" navigation |

---

## 11. Responsive Considerations

The current app is designed for desktop advisor workstations. Maintain that priority, but ensure nothing breaks at narrower viewports:

| Breakpoint | Assessment Summary Grid | Factor Table |
|------------|------------------------|--------------|
| >= 1280px (xl) | `grid-cols-2` (2x2) | Full layout with all columns |
| 1024-1279px (lg) | `grid-cols-2` (2x2) | Considerations column hidden, score + name only |
| 768-1023px (md) | `grid-cols-1` | Full width cards stacked, factor table scrollable |
| < 768px | `grid-cols-1` | Compact everything, ring gauges shrink to 60px |

Use Tailwind responsive prefixes: `md:grid-cols-2`, `lg:w-48` for the considerations column, etc.

---

## 12. ASCII Layout Mockups

### Assessment Page -- Full Layout

```
+==================================================================+
| Exit Planning Assessments                    [Select Client v]   |
| Diagnostic scorecards across business...                         |
+==================================================================+

+---------------------------+  +---------------------------+
| [RING]  BUSINESS          |  | [RING]  BUSINESS          |
|  72%    ATTRACTIVENESS    |  |  68%    READINESS          |
|         25 factors        |  |         22 factors         |
|         +3pts up          |  |         -2pts down         |
|                           |  |                            |
| Business Factors   68%    |  | Operations       71%      |
| Forecast Factors   74%    |  | Management       65%      |
| Market Factors     80%    |  | Financial        68%      |
| Investor Consid.   71%    |  | ...                       |
+---------------------------+  +---------------------------+

+---------------------------+  +---------------------------+
| [RING]  PERSONAL          |  | [BAR]  54 VALUE           |
|  81%    READINESS         |  |        FACTORS            |
|         11 factors        |  |                            |
|         stable            |  | [====POSITIVE====][N][I]  |
|                           |  |  32 Pos  14 Neut  8 Imp   |
| Financial Planning  85%   |  |                            |
| Emotional Ready.    72%   |  | Personal       4|1|0      |
| Family Alignment    88%   |  | Biz Ops       12|4|2      |
| ...                       |  | Financial      8|3|1      |
+---------------------------+  +---------------------------+

+==================================================================+
| [Biz Attractiveness] [Biz Readiness] [Personal] [54 Factors]    |
+==================================================================+

+------------------------------------------------------------------+
| BUSINESS FACTORS (11 factors)                       Avg: 4.2/6   |
|------------------------------------------------------------------|
| Management Team Depth      Strong exec team   [*][*][*][*][*][ ] |
|                                                              5/6 |
|------------------------------------------------------------------|
| Revenue Diversity          Top 3 = 62%        [*][*][ ][ ][ ][ ] |
|                                                              2/6 |
|------------------------------------------------------------------|
| Customer Contracts         80% recurring      [*][*][*][*][*][*] |
|                                                              6/6 |
|------------------------------------------------------------------|
| Documented Processes       Partial SOPs       [*][*][*][ ][ ][ ] |
|                                                              3/6 |
+------------------------------------------------------------------+

                          (more factors...)

+------------------------------------------------------------------+
| FORECAST FACTORS (5 factors)                        Avg: 3.8/6   |
|------------------------------------------------------------------|
| Revenue Growth Trend       12% CAGR           [*][*][*][*][ ][ ] |
|                                                              4/6 |
| ...                                                              |
+------------------------------------------------------------------+
```

### Factor Row Detail -- Score Segments Close-Up

```
Score 6/6 (Strong):    [*] [*] [*] [*] [*] [*]     all olive-green
Score 4/6 (Moderate):  [*] [*] [*] [*] [ ] [ ]     all gold
Score 2/6 (At Risk):   [*] [*] [ ] [ ] [ ] [ ]     all red
Score 1/6 (At Risk):   [*] [ ] [ ] [ ] [ ] [ ]     all red
```

### 54 Value Factors -- Expanded Category

```
+------------------------------------------------------------------+
| [v] BUSINESS OPERATIONS (18 factors)          12P | 4N | 2I      |
|------------------------------------------------------------------|
| Documented Business Plan                     [* Positive]        |
| Quality Management System                    [* Positive]        |
| Standard Operating Procedures                [* Neutral]         |
| Scalable Business Model                      [* Positive]        |
| Technology Infrastructure                    [* For Improvement]  |
| Supply Chain Diversification                 [* Neutral]         |
| Employee Training Programs                   [* Positive]        |
| Succession Planning                          [* For Improvement]  |
| ...                                                              |
+------------------------------------------------------------------+

| [>] INDUSTRY / MARKET (7 factors)             5P | 2N | 0I       |
+------------------------------------------------------------------+
      ^ collapsed -- just shows header with counts
```

### Dashboard Zone 4 -- Assessment Health Card

```
+----------------------------------+
| [icon] Assessment Health         |
|----------------------------------|
| Attractiveness  [========] 72%   |
| Readiness       [======]   68%   |
| Personal        [=========] 81%  |
| Value Factors   32P 14N 8I       |
|                                  |
| View Assessments ->              |
+----------------------------------+
```

### Intelligence Panel -- Assessments Tab

```
+--------------------------------------------------------------+
| [Actions] [Risks] [Gaps] [Deliverables] [Insurance] [ASSESS] |
+--------------------------------------------------------------+
| +---------------------------+ +---------------------------+  |
| | [72%]  Attractiveness     | | [68%]  Readiness          |  |
| |  +3pts   [View ->]        | |  -2pts  [View ->]         |  |
| +---------------------------+ +---------------------------+  |
| +---------------------------+ +---------------------------+  |
| | [81%]  Personal           | | 32/14/8  Value Factors    |  |
| |  stable  [View ->]        | |          [View ->]        |  |
| +---------------------------+ +---------------------------+  |
+--------------------------------------------------------------+
```

---

## Implementation Priority Order

1. **`assessmentData.ts`** + **`assessmentStyles.ts`** -- Data layer and style maps
2. **`ScoreSegments.tsx`** + **`ScoreRing.tsx`** -- Atomic visualization primitives
3. **`ValueFactorBadge.tsx`** -- Atomic badge component
4. **`CategorySection.tsx`** -- Shared collapsible category wrapper
5. **`AssessmentSummaryCard.tsx`** -- Both variants
6. **`AssessmentDetailPanel.tsx`** -- Factor detail view for scored assessments
7. **`ValueFactorsPanel.tsx`** -- 54 Value Factors specialized panel
8. **`AdvisorAssessments.tsx`** -- Full page assembly (replaces placeholder)
9. **`AssessmentsSummaryTab.tsx`** -- Intelligence Panel tab content
10. **`AssessmentHealthCard.tsx`** -- Dashboard sidebar card
11. **Modify `IntelligencePanel.tsx`** -- Add Assessments tab
12. **Modify `AdvisorDashboard.tsx`** -- Add AssessmentHealthCard to Zone 4
13. **Modify `AdvisorPlaceholders.tsx`** -- Remove old `AdvisorAssessments` placeholder
14. **Modify `App.tsx`** -- Update import to point to new page component

---

## Mock Data Structure Guidance

### `assessmentData.ts` -- Shape Recommendations

```typescript
// For scored assessments (Attractiveness, Business Readiness, Personal Readiness)
interface AssessmentFactor {
  id: string;
  name: string;
  score: number;              // 1-6
  considerations: string;     // brief note
  category: string;
}

interface AssessmentCategory {
  name: string;
  factors: AssessmentFactor[];
}

interface ScoredAssessment {
  id: string;
  title: string;
  shortTitle: string;         // for tabs/badges
  maxScore: number;           // 150, 132, or 66
  scaleMax: number;           // 6
  categories: AssessmentCategory[];
  trend: { direction: "up" | "down" | "stable"; delta: number };
  lastAssessedDate: string;
}

// For 54 Value Factors
type ValueRating = "positive" | "neutral" | "improvement";

interface ValueFactor {
  id: string;
  name: string;
  rating: ValueRating;
  notes?: string;
  category: string;
}

interface ValueFactorCategory {
  name: string;
  factors: ValueFactor[];
}

interface ValueFactorsAssessment {
  id: string;
  title: string;
  categories: ValueFactorCategory[];
  lastAssessedDate: string;
}
```

### `assessmentStyles.ts` -- Style Map Recommendations

```typescript
// Score-level colors (reusable across all scored assessments)
export const scoreColor = {
  strong: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    fill: "bg-primary",
    gradient: "gradient-olive",
  },
  moderate: {
    bg: "bg-accent/15",
    text: "text-accent-foreground",
    border: "border-accent/20",
    fill: "bg-accent",
    gradient: "gradient-gold",
  },
  atrisk: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    fill: "bg-destructive",
    gradient: "",
  },
};

// Helper to get color tier from score
export function getScoreTier(score: number): "strong" | "moderate" | "atrisk" {
  if (score >= 5) return "strong";
  if (score >= 3) return "moderate";
  return "atrisk";
}

// Helper to get color tier from percentage
export function getPercentageTier(pct: number): "strong" | "moderate" | "atrisk" {
  if (pct >= 75) return "strong";
  if (pct >= 50) return "moderate";
  return "atrisk";
}

// Value factor badge styles
export const valueRatingStyle = {
  positive: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    dot: "bg-primary",
    label: "Positive",
  },
  neutral: {
    bg: "bg-accent/15",
    text: "text-accent-foreground",
    border: "border-accent/20",
    dot: "bg-accent",
    label: "Neutral",
  },
  improvement: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    dot: "bg-destructive",
    label: "For Improvement",
  },
};
```

---

## Design Rationale Summary

1. **Score dots over progress bars** -- Discrete scales deserve discrete visuals. Progress bars are already used heavily for engine health and KPIs; dots create a distinct visual language for assessments.

2. **Ring gauges for overall scores** -- Rings are compact and allow a large number to sit inside them. They visually communicate "completeness" which is appropriate for assessment scores where the goal is to maximize.

3. **2x2 summary grid, not 4-across** -- The summary cards contain category breakdowns. At 4-across on a typical 1280px content area (after sidebar), each card would only be ~280px wide -- too tight for progress bars and labels. At 2-across, each card gets ~560px, which is comfortable.

4. **Collapsible categories for 54 Value Factors** -- 54 rows is overwhelming. Collapsing lets advisors focus on the categories that need attention. Starting with the two largest categories expanded (Business Operations, Financial) gives immediate value without scroll fatigue.

5. **Three integration touchpoints** -- Intelligence Panel tab (for quick glance during workflow), sidebar health card (for ambient awareness), and dedicated page (for deep analysis). This follows the existing pattern where engine status appears both in the CommandBar, EngineStatusPanel sidebar, and dedicated engine pages.

6. **No new colors** -- Every color choice maps directly to existing CSS variables. The olive/gold/red triad is already established as the severity/quality spectrum. Assessment scores naturally map to this same spectrum.

7. **EB Garamond for scores, Inter for labels** -- Score numerals in the serif display font give them gravitas and institutional weight. Labels in the sans-serif body font keep them functional and scannable. This follows the existing `font-display` / `font-body` split used throughout the app.
