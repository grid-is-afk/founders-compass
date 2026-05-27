# Stage 2 — Deliverable Card Redesign R2 (UC-07)

## A. Card Header Row — Three States

### State 1: Not Generated
```
┌────────────────────────────────────────────────────────────────┐
│ Q1 Review Prep                      [· Not Generated]          │
│ Acme Ventures · Not yet generated   [✏ Edit] [◎ Preview] [↓ Download—dim] │
└────────────────────────────────────────────────────────────────┘
```
- Status: static gray pill (no dropdown). Same `text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground` treatment as round 1.
- Download: `opacity-40 cursor-not-allowed pointer-events-none` (no content).
- Preview button: always visible — opens modal (empty-state body inside).

### State 2: Pending Review
```
┌────────────────────────────────────────────────────────────────┐
│ Q1 Review Prep                    [▾ Pending Review ▾]          │
│ Acme Ventures · Generated 2h ago  [✏ Edit] [◎ Preview] [↓ Download] │
└────────────────────────────────────────────────────────────────┘
```

### State 3: Approved
```
┌────────────────────────────────────────────────────────────────┐
│ Q1 Review Prep                       [▾ Approved ▾]            │
│ Acme Ventures · Generated 2h ago  [✏ Edit] [◎ Preview] [↓ Download] │
└────────────────────────────────────────────────────────────────┘
```

No Send button in any state.

---

## B. Dropdown Visual Treatment

### Scale
The Select trigger must match the replaced badge in height and weight — it is NOT a full-width form select.

| Property | Value |
|---|---|
| Height | `h-7` (28px — same as all action buttons) |
| Min-width | `min-w-[130px]` — just wide enough for "Pending Review" without wrapping |
| Font size | `text-[10px] font-medium` — matches the badge text size |
| Border radius | `rounded-full` — pill shape to read as a status indicator, not a form field |
| Padding | `px-3 py-0.5` |
| Chevron | shadcn `SelectTrigger` includes the default chevron; keep it (signals interactivity) |

### Color Tokens

**Pending Review (amber):**
Use the same amber token already live in the tier color system (`secondary` tier):
- Background: `bg-amber-50`
- Text: `text-amber-700`
- Border: `border border-amber-500/30`
- Trigger class: `bg-amber-50 text-amber-700 border-amber-500/30 hover:bg-amber-100`

**Approved (green/olive-adjacent):**
Use the confidence "high" green already in `CONFIDENCE_COLORS` (green-600 family):
- Background: `bg-green-50`
- Text: `text-green-700`
- Border: `border border-green-500/30`
- Trigger class: `bg-green-50 text-green-700 border-green-500/30 hover:bg-green-100`

### Trigger Styling States
- **At rest:** pill with color fill as above, chevron visible.
- **Hover:** one step darker fill (`amber-100` / `green-100`). No outline.
- **Open (active):** shadcn default ring (`focus:ring-1 focus:ring-ring`) — acceptable.
- Override shadcn SelectTrigger defaults with `[&>svg]:w-3 [&>svg]:h-3` to keep the chevron proportional to the compact size.

### SelectContent
- Standard shadcn `SelectContent` — no special sizing needed.
- Two items: "Pending Review", "Approved". No "Sent to Client" entry (dropped per plan).

---

## C. Modal Dialog Layout

### Sizing
- `DialogContent` class: `sm:max-w-3xl w-full max-h-[80vh] flex flex-col`
- Body scrolls; header and footer are sticky within the dialog.

### ASCII Mockup
```
┌─────────────────────────────────────────────────────────────────────┐
│  Q1 Review Prep — Acme Ventures                              [× Close X] │
│  Generated 2 hours ago                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  # Q1 Review Prep                                                   │
│  ...rendered markdown (scrollable)...                               │
│                                                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [× Close]                                           [↓ Download]   │
└─────────────────────────────────────────────────────────────────────┘
```

### Header (DialogHeader)
- `DialogTitle`: `del.title` — `font-display text-base font-semibold` (EB Garamond, matches modal pattern in MeetingRecapDialog).
- Subtitle line below title: `text-[10px] text-muted-foreground` — `Generated {timeAgo}` or `Not yet generated` when no timestamp.
- shadcn provides the `×` close button top-right automatically via `DialogContent` — keep it.

### Body
- `flex-1 overflow-y-auto px-6 py-4`
- Prose render: reuse the exact class string from lines 392-404 of DeliverablesTab.tsx (the `prose prose-sm` block). No changes to prose tokens.
- Outer wrapper: `rounded-md border border-border bg-muted/20 p-3` (same as inline preview — advisors get visual continuity).

### Footer (DialogFooter)
- `DialogFooter` default stacks buttons right-aligned on desktop. Override to `flex justify-between` so Close anchors left and Download anchors right.
- **Close** (left): `variant="outline" size="sm"` — secondary action, `<X className="w-3 h-3" /> Close`
- **Download** (right): `variant="default" size="sm"` — primary action (it's the most common follow-on). `<Download className="w-3 h-3" /> Download`. Disabled + `opacity-40` when `content === null`.

---

## D. Empty-State Modal (Preview on ungenerated card)

Same `DialogContent` shell. Body replaces the prose block with the round-1 empty state:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Onboarding Brief — Acme Ventures                        [× Close X] │
│  Not yet generated                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              [FileText icon w-10 h-10 text-muted-foreground/40]    │
│                                                                     │
│         This document hasn't been generated yet.                    │
│         Open the client dashboard and use the matching             │
│         generator to create it.                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [× Close]                                    [↓ Download — dim]   │
└─────────────────────────────────────────────────────────────────────┘
```

Empty-state container: `flex-1 flex flex-col items-center justify-center gap-3 py-12`

---

## E. Card Compactness Confirmation

The list card row is unchanged in height. The inline preview pane (lines 387-423) is entirely removed — the card collapses back to a single header row at `p-3`. Row height: ~56px at rest (same as round 1 in the not-editing state). The modal carries all the vertical real estate; the list stays tight.

---

## State-to-Component Mapping (vibecoder reference)

| Condition | Status area renders |
|---|---|
| `del.status !== 'ready'` | `<span className="...bg-muted text-muted-foreground...">Not Generated</span>` |
| `del.status === 'ready' && del.review_status === 'pending_review'` | `<Select>` with amber trigger, options [Pending Review, Approved] |
| `del.status === 'ready' && del.review_status === 'approved'` | `<Select>` with green trigger, options [Pending Review, Approved] |
| `del.status === 'ready' && del.review_status === null` | Treat as `pending_review` (defensive fallback) |

Single `<Dialog>` instance at component root. State: `previewingDeliverable: DbDeliverable | null` (replaces `previewIds: Set<string>`). Opens on Preview click, closes via the `×` or Close button.
