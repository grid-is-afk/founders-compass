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
