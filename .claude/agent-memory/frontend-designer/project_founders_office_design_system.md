---
name: Founders Office Design System
description: Core design tokens, component patterns, and visual language for The Founders Office advisor platform
type: project
---

The Founders Office is a capital advisory platform using an Olive + Gold institutional palette.

**Why:** The platform targets private wealth advisors and institutional clients -- every visual decision must feel premium, not SaaS-generic. The palette and typography choices (EB Garamond serif for headings, Inter for body) deliberately evoke trust and authority.

**How to apply:**
- Palette: Olive primary (`hsl(95 25% 28%)`), Gold accent (`hsl(43 72% 52%)`), Cream background, Charcoal text
- Custom utility classes: `gradient-gold`, `gradient-olive`, `shadow-card`, `shadow-card-hover`
- Component library: shadcn/ui (Radix primitives) + Tailwind CSS + Framer Motion for animations
- Sidebar: Dark theme (`hsl(160 15% 10%)` bg), gold active indicators
- Cards: `bg-card` + `border border-border` + `rounded-lg` is the standard card treatment
- Copilot/Quarterback branding: `Sparkles` icon from lucide-react + `gradient-gold` badge
- All headings use `font-display` (EB Garamond), all body/UI text uses `font-body` (Inter)
- Existing label pattern: `text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold`
- The `@tailwindcss/typography` plugin is in devDependencies but NOT yet added to plugins array in tailwind.config.ts
- StakeholderCard action buttons: icon-only `<button>` with `p-1 rounded` + `aria-label`; group-hover reveal (`opacity-0 group-hover:opacity-100 transition-opacity`)
- Tier color tokens (StakeholdersPanel): primary=`border-primary/30 text-primary bg-primary/5`; secondary=`border-amber-500/30 text-amber-700 bg-amber-50`; peripheral=`text-muted-foreground border-border`
- ProposedChangeRow action buttons: `flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors border` — toggle pattern with sentiment-matched active colors
- Blockquote source excerpt pattern: `pl-2 border-l-2 border-muted text-xs text-muted-foreground italic` (used in CapturePanel, AgendaPanel)
- Confidence badge pattern (CapturePanel): `text-[10px] font-semibold uppercase` colored via `CONFIDENCE_COLORS` (high=green-600, medium=amber-600, low=orange-600) — these are legacy Tailwind color names, preserve for consistency
- Section sub-label pattern: `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`
- UC-05 locked sentiment-to-color mapping: positive=olive, neutral=warm-gray, negative=gold/amber, at_risk=destructive (mirrors score-to-color convention)
