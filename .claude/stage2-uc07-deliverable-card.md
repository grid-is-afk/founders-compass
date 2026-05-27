# Stage 2 — Deliverable Card Redesign (UC-07)

## Three States — ASCII Mockups

### State A: Not yet generated
```
┌─────────────────────────────────────────────────────────────┐
│ Capital Readiness Memo                 [· Not generated]    │
│ Acme Ventures  ·  Not yet generated                         │
│                          [✏ Edit]  [↓ Download ─ disabled] │
└─────────────────────────────────────────────────────────────┘
  [▼ preview pane — expanded or collapsed, shown below]
  ┌───────────────────────────────────────────────────────────┐
  │  ○  This document hasn't been generated yet.              │
  │     Generate it from the Quarterly Review panel above.    │
  └───────────────────────────────────────────────────────────┘
```

### State B: Generating (in-progress)
```
┌─────────────────────────────────────────────────────────────┐
│ Capital Readiness Memo                 [◌ Generating…]      │
│ Acme Ventures  ·  Generating…                               │
│                          [✏ Edit]  [↓ Download ─ disabled] │
└─────────────────────────────────────────────────────────────┘
```

### State C: Generated / Ready
```
┌─────────────────────────────────────────────────────────────┐
│ Capital Readiness Memo                   [✓ Ready]          │
│ Acme Ventures  ·  Generated 2 hours ago                     │
│         [✏ Edit]  [◎ Preview]  [↓ Download]  [→ Send]      │
└─────────────────────────────────────────────────────────────┘
  [▼ preview pane when toggled open]
  ┌───────────────────────────────────────────────────────────┐
  │  # Capital Readiness Memo                                 │
  │  ...rendered markdown...                                  │
  └───────────────────────────────────────────────────────────┘
```

---

## Header Row Structure

Two rows inside the left column, actions flush right.

**Left column (stacked):**
1. `del.title` — primary title, `text-sm font-medium text-foreground font-body`
2. Subtitle row — client name + separator dot + timestamp, `text-[10px] text-muted-foreground`
   - Format: `{del.client} · Generated {timeAgo}` or `{del.client} · Not yet generated`
   - `timeAgo` is a relative string passed by the vibecoder (e.g. "2 hours ago", "3 days ago")

**Right column (flex row, items-center, gap-1.5):**
Status badge → Edit → Preview → Download → Send

---

## Button Order + Label Table

| Order | Icon (lucide) | Label | Variant | Size | When visible |
|-------|--------------|-------|---------|------|--------------|
| 1 | `Pencil` w-3 h-3 | Edit | ghost | sm | Always (not while editing) |
| 2 | `Eye` / `EyeOff` w-3 h-3 | Preview / Source | ghost | sm | Only when `hasContent` |
| 3 | `Download` w-3 h-3 | Download | ghost | sm | Always (not while editing) |
| 4 | `Send` w-3 h-3 | Send | ghost | sm | Only when `status === "ready"` |

- All buttons: `text-xs h-7 gap-1` — matches existing Edit/Send button treatment exactly
- No icon-only buttons. Every button renders icon + label text, no exceptions.

---

## Status Badge

Unchanged from current `deliverableStatusLabel` token lookup. Position: leftmost in the right column, before all action buttons.

Badge class: `text-[10px] font-medium px-2 py-0.5 rounded-full` + status style from `st.style`.

---

## Spacing + Typography Tokens

| Element | Token |
|---------|-------|
| Card padding | `p-3` (existing — keep) |
| Title | `text-sm font-medium text-foreground` |
| Subtitle / timestamp | `text-[10px] text-muted-foreground` |
| Button gap | `gap-1` inside each button, `gap-1.5` between buttons |
| Preview pane inner | `px-3 pb-3` (existing — keep) |
| Empty state icon | `w-8 h-8 text-muted-foreground/40` |

---

## Download Button — Disabled State

When `content === null`:
- Render the Download button at all times (do not hide it).
- Apply: `opacity-40 cursor-not-allowed pointer-events-none`
- Add `title="Not yet generated"` as the tooltip (native HTML tooltip — no extra component needed, consistent with the compact card constraint).
- Do NOT use a shadcn `Tooltip` wrapper here; the card is too dense and the native title is sufficient for this advisory context.

When `content` exists:
- Button is fully interactive, normal ghost variant.

---

## Preview Pane — Empty State (content === null)

Shown when the advisor explicitly opens the pane on a not-yet-generated card (currently impossible, but the empty state must exist defensively).

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│         [FileText icon — w-8 h-8 muted/40]               │
│                                                           │
│    This document hasn't been generated yet.               │
│    Use the Generate button above to create it.            │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

- Container: `rounded-md border border-border bg-muted/20 p-4 flex flex-col items-center gap-2`
- Icon: `FileText` from lucide, `w-8 h-8 text-muted-foreground/40`
- Primary message: `text-xs font-medium text-muted-foreground text-center`
- Secondary hint: `text-[10px] text-muted-foreground/60 text-center`
- No CTA button in the empty state — the Generate action lives in the QuarterlyReview panel above; duplicating it here would create two code paths.

---

## Hover + Focus States

- Card hover: existing `hover:bg-muted/30 transition-colors` — keep unchanged.
- Button hover: shadcn ghost variant handles this natively (`hover:bg-accent hover:text-accent-foreground`).
- Button focus: shadcn focus ring via `focus-visible:ring-2 focus-visible:ring-ring` — already on Button component, no additions needed.
- Disabled Download: `pointer-events-none` means hover/focus do not apply — correct.

---

## Preserved Logic

No functional logic changes. The timestamp string (`timeAgo`) is a new data field — its derivation (from `del.updated_at` or `del.created_at`) is left to the vibecoder. The spec only dictates where it renders and how it looks.
