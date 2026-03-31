# Quarterback Copilot -- Design Specification

## Design Audit Summary

This spec is grounded in the existing Founders Office design system:
- **Palette**: Olive (`hsl(95 25% 28%)`) + Gold (`hsl(43 72% 52%)`) institutional palette
- **Fonts**: EB Garamond (display/headings), Inter (body/UI)
- **Component lib**: shadcn/ui (Radix primitives) + Tailwind + Framer Motion
- **Shadow tokens**: `shadow-card`, `shadow-card-hover` (custom utilities)
- **Gradient tokens**: `gradient-gold`, `gradient-olive` (custom utilities)
- **Border radius**: `--radius: 0.5rem` (lg=0.5rem, md=calc-2px, sm=calc-4px)
- **Existing copilot visual language**: Gold sparkles icon, `gradient-gold` badge, on/off Switch toggle in dashboard header

---

## Architecture Decision: Custom Sheet vs shadcn Sheet

**Recommendation: Use the existing shadcn `Sheet` component with custom overrides.**

The project already has `src/components/ui/sheet.tsx` built on `@radix-ui/react-dialog`. This gives us:
- Slide-in/out animation via `data-[state=open/closed]` attributes
- Portal rendering (z-50)
- Keyboard dismiss (Escape)
- Focus trapping
- Accessible `role="dialog"` + `aria-*` attributes

**Modifications needed to the Sheet:**
- Override `SheetOverlay` to use a lighter backdrop (`bg-black/20`) or no backdrop at all -- the panel should feel like a companion layer, not a modal interruption
- Override `SheetContent` width from the default `sm:max-w-sm` (~384px) to a fixed `w-[420px]` via className
- Remove the default `p-6` padding from `SheetContent` so the panel can have its own internal layout zones with differentiated padding

---

## Component Architecture

```
QuarterbackProvider (context -- global state for open/close + messages)
|
+-- QuarterbackTrigger (floating action button, rendered in AdvisorLayout)
|
+-- QuarterbackPanel (Sheet wrapper)
    |
    +-- QuarterbackHeader
    |
    +-- QuarterbackMessages (ScrollArea containing message list)
    |   |
    |   +-- UserMessage
    |   +-- AssistantMessage
    |   |   +-- MarkdownRenderer
    |   |   +-- ActionButton (inline)
    |   |   +-- ContextCard (inline)
    |   +-- TypingIndicator
    |
    +-- QuarterbackSuggestions (prompt chips)
    |
    +-- QuarterbackInput (textarea + send button)
```

File locations:
```
src/components/quarterback/
  QuarterbackProvider.tsx
  QuarterbackTrigger.tsx
  QuarterbackPanel.tsx
  QuarterbackHeader.tsx
  QuarterbackMessages.tsx
  QuarterbackInput.tsx
  QuarterbackSuggestions.tsx
  messages/
    UserMessage.tsx
    AssistantMessage.tsx
    TypingIndicator.tsx
    ContextCard.tsx
    ActionButton.tsx
    MarkdownRenderer.tsx
```

---

## ASCII Layout Mockup

### Panel Open State (right-aligned, 420px)

```
+--[Main App Content]----------------------------------+---[Quarterback Panel 420px]---+
|                                                       |                               |
| (existing page content continues behind)              | [HEADER]                      |
|                                                       | +---------------------------+ |
|                                                       | | * Quarterback       [X]   | |
|                                                       | | Client: Meridian v        | |
|                                                       | +---------------------------+ |
|                                                       |                               |
|                                                       | [MESSAGES - ScrollArea]       |
|                                                       | +---------------------------+ |
|                                                       | |                           | |
|                                                       | | [AI] Here's the summary   | |
|                                                       | | for Meridian Industries:   | |
|                                                       | | | Capital Readiness: 72%   | |
|                                                       | | | Stage: Structure         | |
|                                                       | |                           | |
|                                                       | |  [View Assessment]        | |
|                                                       | |                           | |
|                                                       | |          [USER] What are  | |
|                                                       | |          the top risks?   | |
|                                                       | |                           | |
|                                                       | | [AI] I've identified 3    | |
|                                                       | | key risks for Meridian... | |
|                                                       | | ...                       | |
|                                                       | | [*..] (typing)            | |
|                                                       | +---------------------------+ |
|                                                       |                               |
|                                                       | [SUGGESTIONS]                 |
|                                                       | [Summarize] [Top risks]       |
|                                                       | [Generate memo] [Missing?]    |
|                                                       |                               |
|                                                       | [INPUT]                       |
|                                                       | +---------------------------+ |
|                                                       | | Ask Quarterback...    [>] | |
|                                                       | +---------------------------+ |
|                                                       +-------------------------------+
+-------------------------------------------------------+
```

### Floating Trigger Button (panel closed)

```
                                        +-------+
                                        |  [*]  |   <-- 48x48 circle, gradient-gold
                                        +-------+
                                      bottom-6 right-6
```

### Empty State (panel open, no messages)

```
+---------------------------+
| * Quarterback       [X]   |
| Client: Meridian v        |
+---------------------------+
|                           |
|                           |
|         [* icon]          |
|                           |
|    How can I help with    |
|      Meridian today?      |
|                           |
| +-------+ +-------------+|
| |Summarize| |Readiness    ||
| |Meridian | |assessment   ||
| +-------+ +-------------+|
| +-------+ +-------------+|
| |Top risks| |Generate     ||
| |today    | |memo         ||
| +-------+ +-------------+|
| +-------+ +-------------+|
| |Missing  | |Revenue      ||
| |data     | |analysis     ||
| +-------+ +-------------+|
|                           |
+---------------------------+
| Ask Quarterback...    [>] |
+---------------------------+
```

---

## 1. Floating Trigger Button -- `QuarterbackTrigger`

### Placement
- **Position**: `fixed bottom-6 right-6 z-40`
- Must sit below the Sheet z-index (z-50) so it hides behind the panel when open
- Rendered inside `AdvisorLayout.tsx`, after the `<main>` element

### Dimensions
- **Size**: `w-12 h-12` (48x48px)
- **Shape**: `rounded-full`
- **Background**: `gradient-gold` (the existing utility class)
- **Shadow**: `shadow-lg` at rest, `shadow-xl` on hover

### Icon
- **Component**: `Sparkles` from lucide-react (already used in the dashboard for Quarterback branding)
- **Size**: `w-5 h-5`
- **Color**: `text-charcoal` (dark text on gold background for contrast)

### States

| State | Visual Treatment |
|-------|-----------------|
| Default | `gradient-gold`, `shadow-lg`, `Sparkles` icon |
| Hover | `shadow-xl`, `scale-105` transform |
| Active/Pressed | `scale-95` transform |
| Panel Open | Hidden (`opacity-0 pointer-events-none` or conditional render) |
| Unread Insights | Pulse ring animation (see below) |

### Pulse Animation (unread insights)
Add to `tailwind.config.ts` keyframes:
```
"qb-pulse": {
  "0%, 100%": { boxShadow: "0 0 0 0 hsl(43 72% 52% / 0.4)" },
  "50%": { boxShadow: "0 0 0 12px hsl(43 72% 52% / 0)" },
}
```
Animation class: `animate-qb-pulse` with `animation: qb-pulse 2s ease-in-out infinite`

### Tailwind Classes (complete)
```
fixed bottom-6 right-6 z-40
w-12 h-12 rounded-full gradient-gold
flex items-center justify-center
shadow-lg hover:shadow-xl
transition-all duration-200
hover:scale-105 active:scale-95
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

### Accessibility
- `aria-label="Open Quarterback assistant"`
- `<button>` element (not a div)
- Visible focus ring matching the project's ring token

---

## 2. Panel Shell -- `QuarterbackPanel`

### shadcn Sheet Configuration
```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent
    side="right"
    className="w-[420px] sm:max-w-[420px] p-0 flex flex-col border-l border-border bg-background"
  >
    {/* Suppress the default SheetTitle for a11y -- provide our own */}
    <SheetHeader className="sr-only">
      <SheetTitle>Quarterback Copilot</SheetTitle>
    </SheetHeader>

    <QuarterbackHeader />
    <QuarterbackMessages />
    <QuarterbackSuggestions />
    <QuarterbackInput />
  </SheetContent>
</Sheet>
```

### Overlay Modification
Override the default `SheetOverlay` with a lighter treatment. Two options:

**Option A -- Light Scrim (recommended):**
Override className on SheetOverlay: `bg-charcoal/10 backdrop-blur-[1px]`
This gives a subtle depth cue without feeling like a blocking modal.

**Option B -- No overlay at all:**
Render the Sheet without the overlay component. The panel simply slides over content with its own `border-l` and `shadow-2xl` providing separation.

For a Bloomberg-terminal-meets-advisor feel, **Option A** is recommended. It signals "this is a focused context" while keeping the main content visible.

### Panel Dimensions
- **Width**: `420px` fixed (not responsive -- this is a desktop advisor tool)
- **Height**: Full viewport height (`h-full` via Sheet defaults -- `inset-y-0`)
- **Internal layout**: `flex flex-col` so header is pinned top, input pinned bottom, messages fill the middle

### Panel Shadow
Add a left-side shadow for depth separation from the main content:
`shadow-[-8px_0_24px_-4px_hsl(var(--charcoal)/0.08)]`

### Entry/Exit Animation
The existing Sheet component uses these via `tailwindcss-animate`:
- **Enter**: `slide-in-from-right` + `duration-500`
- **Exit**: `slide-out-to-right` + `duration-300`

These are already configured and appropriate. The asymmetric timing (faster exit) feels correct -- quick to dismiss, slightly more dramatic reveal.

---

## 3. Panel Header -- `QuarterbackHeader`

### Layout
```
+----------------------------------------------------------+
| [Gold dot] Quarterback                          [X btn]  |
| [Client selector dropdown]                               |
+----------------------------------------------------------+
```

### Structure
- **Container**: `px-5 py-4 border-b border-border bg-card flex flex-col gap-2`
- **Top row**: `flex items-center justify-between`
- **Title section**: `flex items-center gap-2.5`

### Quarterback Branding Element
- **Icon container**: `w-7 h-7 rounded-md gradient-gold flex items-center justify-center`
- **Icon**: `Sparkles` from lucide-react, `w-3.5 h-3.5 text-charcoal`
- **Title text**: `"Quarterback"` in `font-display text-base font-semibold text-foreground`
- **Subtitle/badge** (optional): A small `text-[10px] uppercase tracking-[0.15em] text-gold font-semibold` label reading "AI COPILOT" -- placed inline after the title, separated by a `px-1.5 py-0.5 rounded bg-gold/10` badge

### Close Button
- `p-1.5 rounded-md hover:bg-muted transition-colors`
- `X` icon from lucide-react, `w-4 h-4 text-muted-foreground`
- This replaces the default SheetClose (hide the default one via `SheetContent` customization or remove it)

### Client Context Selector (optional row)
- Rendered below the title row
- Uses a shadcn `Select` component (already available in the project)
- Trigger styled as: `h-8 text-xs bg-muted/50 border-0 rounded-md text-muted-foreground hover:bg-muted`
- Populated from the clients mock data
- Placeholder: "All clients"
- When a client is selected, the empty state and suggestions contextualize to that client

### Tailwind Classes (header container)
```
px-5 py-4 border-b border-border bg-card flex-shrink-0
```

---

## 4. Chat Messages Area -- `QuarterbackMessages`

### Container
- Wraps all messages in a shadcn `ScrollArea` (already available)
- **Tailwind**: `flex-1 overflow-hidden` (the ScrollArea handles internal scrolling)
- **Inner padding**: `px-5 py-4 space-y-4`
- Auto-scrolls to bottom when new messages arrive (via `useRef` + `scrollIntoView`)

### 4a. User Messages -- `UserMessage`

**Alignment**: Right-aligned
**Layout**: `flex justify-end`

**Message bubble**:
```
max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md
bg-primary/10 text-foreground text-sm leading-relaxed
font-body
```

Key decisions:
- `bg-primary/10` -- uses the olive primary at 10% opacity. This is intentionally subtle. On the existing cream/warm background, this produces a warm sage tint that reads as "user" without competing with the AI messages.
- `rounded-2xl rounded-br-md` -- fully rounded except bottom-right corner, which creates the conventional "tail" towards the sender
- `max-w-[85%]` -- prevents messages from spanning the full 420px width, maintaining readable line lengths (~45-55 characters at text-sm)

**Timestamp** (below bubble):
```
text-[10px] text-muted-foreground/60 mt-1 text-right
```
Format: "2:34 PM" -- short, no date unless it's a different day.

### 4b. Assistant Messages -- `AssistantMessage`

**Alignment**: Left-aligned
**Layout**: `flex justify-start`

**Message card**:
```
max-w-[90%] bg-card border border-border rounded-2xl rounded-bl-md
px-4 py-3 text-sm leading-relaxed text-foreground font-body
border-l-2 border-l-primary
shadow-card
```

Key decisions:
- `bg-card` + `border border-border` -- card treatment matches the existing pattern used in IntelligencePanel, CommandBar, etc.
- `border-l-2 border-l-primary` -- a 2px olive accent on the left edge. This is the signature "institutional AI" treatment. It mirrors how Bloomberg highlights AI-generated content with an accent bar.
- `rounded-2xl rounded-bl-md` -- mirrored tail direction from user messages
- `shadow-card` -- uses the project's existing custom shadow utility for subtle elevation
- `max-w-[90%]` -- slightly wider than user messages because AI responses tend to be longer and may contain structured content

**Timestamp** (below card):
```
text-[10px] text-muted-foreground/60 mt-1 text-left
```

### 4c. Markdown Rendering

AI messages must support rich content. Use `react-markdown` (needs to be added as dependency) with the `@tailwindcss/typography` plugin (already in devDependencies).

**Prose container classes on the markdown wrapper**:
```
prose prose-sm prose-olive max-w-none
prose-headings:font-display prose-headings:text-foreground prose-headings:font-semibold
prose-p:text-foreground prose-p:leading-relaxed
prose-strong:text-foreground prose-strong:font-semibold
prose-ul:text-foreground prose-ol:text-foreground
prose-li:text-foreground prose-li:marker:text-muted-foreground
prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
prose-a:text-primary prose-a:no-underline hover:prose-a:underline
```

This ensures markdown output respects the Founders Office design tokens rather than defaulting to Tailwind Typography's gray palette.

### 4d. Inline Action Buttons -- `ActionButton`

These appear inside AI messages when the AI references actionable items.

**Layout**: Rendered below the markdown content, inside the message card.
**Container**: `flex flex-wrap gap-2 mt-3 pt-3 border-t border-border`

**Button spec**:
```
inline-flex items-center gap-1.5
px-3 py-1.5 rounded-md
text-xs font-medium
bg-primary/10 text-primary
hover:bg-primary/15
transition-colors
border border-primary/20
```

This creates a ghost-style button in olive that reads as "clickable but secondary." It deliberately avoids `gradient-gold` to prevent every AI message from screaming for attention.

**Icon in button**: `w-3 h-3` lucide icon matching the action (e.g., `ClipboardCheck` for "View Assessment", `FileText` for "Generate Report")

### 4e. Context Cards -- `ContextCard`

When the AI references a client or metric, render a mini data card inline.

**Layout**: Full width of the message card, below relevant text.
**Container**:
```
mt-3 p-3 rounded-lg bg-muted/50 border border-border
```

**Content structure**:
```
+----------------------------------------------+
| [Icon] Client Name              Stage Badge  |
| Metric Label: Value   Metric Label: Value    |
+----------------------------------------------+
```

**Title row**: `flex items-center justify-between`
- Client name: `text-xs font-semibold text-foreground`
- Stage badge: existing `Badge` component, `variant="secondary"`, `text-[10px]`
- Icon: relevant lucide icon, `w-3.5 h-3.5 text-muted-foreground`

**Metrics row**: `grid grid-cols-2 gap-2 mt-2`
- Label: `text-[10px] uppercase tracking-wider text-muted-foreground`
- Value: `text-sm font-semibold text-foreground`

This mirrors the data density and styling of the existing `StatCard` and `ScoreCard` components.

### 4f. Typing Indicator -- `TypingIndicator`

**Placement**: Appears as the last item in the message list during streaming.
**Layout**: Left-aligned, same position as an AI message.

**Container**:
```
flex items-center gap-1.5
px-4 py-3
max-w-[90px]
bg-card border border-border rounded-2xl rounded-bl-md
border-l-2 border-l-primary
shadow-card
```

**Dots**: Three `span` elements:
```
w-1.5 h-1.5 rounded-full bg-muted-foreground/40
```

**Animation**: Staggered bounce using Framer Motion:
```tsx
// Each dot gets a different delay
animate={{ y: [0, -4, 0] }}
transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
```

This is smoother than a CSS-only approach and consistent with the project's existing use of Framer Motion for all animations.

---

## 5. Suggested Prompts -- `QuarterbackSuggestions`

### Two contexts where suggestions appear:

**A. Empty state** (no messages yet) -- larger card layout
**B. Active chat** (above the input) -- compact pill/chip layout

### 5a. Empty State Suggestions

**Container**: Centered vertically in the messages area.

**Branding block**:
```
flex flex-col items-center text-center mb-8
```
- Icon: `Sparkles`, `w-10 h-10 text-gold` (larger, prominent)
- Title: `"How can I help?"` in `font-display text-xl font-semibold text-foreground mt-4`
- Subtitle: Client-contextualized if a client is selected (e.g., "Ask me about Meridian Industries") in `text-sm text-muted-foreground mt-1`

**Suggestion cards** (6 items, 2-column grid):
```
grid grid-cols-2 gap-2.5 px-5
```

Each card:
```
p-3 rounded-lg bg-card border border-border
hover:border-primary/30 hover:shadow-card
transition-all duration-200 cursor-pointer
text-left group
```

Card content:
- **Label**: `text-xs font-medium text-foreground group-hover:text-primary transition-colors`
- **Description**: `text-[10px] text-muted-foreground mt-0.5 leading-relaxed`

**Default suggestions** (when no client selected):
1. "Summarize portfolio" / "Overview of all active clients"
2. "Top risks today" / "Critical alerts across portfolio"
3. "Generate readiness memo" / "Draft an investor-ready report"
4. "What data is missing?" / "Identify gaps in client profiles"
5. "Sprint priorities" / "Next actions by urgency"
6. "Revenue analysis" / "Portfolio revenue breakdown"

**Client-contextualized suggestions** (when client selected, e.g., Meridian):
1. "Summarize Meridian" / "Current status and key metrics"
2. "Meridian risks" / "Outstanding alerts and concerns"
3. "Readiness assessment" / "Capital readiness deep dive"
4. "Generate memo" / "Draft Meridian investor memo"
5. "Missing data" / "Incomplete data points for Meridian"
6. "Customer capital" / "Customer concentration analysis"

### 5b. Active Chat Suggestions (above input)

**Container**: `px-5 py-2 flex flex-wrap gap-1.5 border-t border-border bg-card/50`

Each chip:
```
px-2.5 py-1 rounded-full
text-[11px] font-medium
bg-muted text-muted-foreground
hover:bg-primary/10 hover:text-primary
transition-colors cursor-pointer
border border-transparent hover:border-primary/20
```

Contextual chips change based on the last AI response. For example, if the AI just summarized a client, the suggestions might be:
- "Dig deeper"
- "Generate report"
- "Compare to portfolio"
- "Risk factors"

Maximum 4 chips shown at a time to avoid clutter.

---

## 6. Input Area -- `QuarterbackInput`

### Layout
```
+----------------------------------------------------------+
| [Suggestion chips row]                                    |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | Ask Quarterback...                            [Send] | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### Container
```
px-5 py-4 border-t border-border bg-card flex-shrink-0
```

### Input Field
Use a `textarea` (not `input`) to support multi-line messages, but start as single line and grow.

**Wrapper** (to create the input + button composition):
```
flex items-end gap-2
```

**Textarea**:
```
flex-1 resize-none
min-h-[40px] max-h-[120px]
px-3 py-2.5
rounded-lg
bg-muted/50 border border-border
text-sm text-foreground placeholder:text-muted-foreground/50
focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/40
transition-colors
font-body
```

Key decisions:
- `bg-muted/50` rather than pure `bg-background` -- this gives the input a subtle inset appearance against the `bg-card` footer
- `focus-visible:ring-1` instead of the default `ring-2` -- lighter focus treatment appropriate for a chat input that the user will interact with constantly
- `max-h-[120px]` with `overflow-y-auto` -- prevents the input from consuming too much vertical space
- Auto-resize behavior: grows with content up to max-height (implemented via JS `scrollHeight` tracking)

**Placeholder text**: `"Ask Quarterback..."` -- uses the product name, not generic "Type a message"

### Send Button
```
w-9 h-9 rounded-lg
flex items-center justify-center flex-shrink-0
gradient-gold
text-charcoal
hover:shadow-md
transition-all duration-200
disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
```

- **Icon**: `Send` from lucide-react (already imported in AdvisorSidebar), `w-4 h-4`
- **Disabled state**: when input is empty or AI is currently responding
- **Hover**: `hover:shadow-md` adds a glow effect on the gold gradient

**Keyboard shortcut**: `Enter` sends, `Shift+Enter` creates a new line. Display a subtle hint:
```
text-[10px] text-muted-foreground/40 mt-1.5 text-right
```
Content: "Enter to send, Shift+Enter for new line"

---

## 7. Visual Hierarchy Summary

### Z-Index Layers
| Layer | Z-Index | Element |
|-------|---------|---------|
| Sidebar | (static, not positioned) | AdvisorSidebar |
| Main content | (static) | `<main>` in AdvisorLayout |
| Floating trigger | z-40 | QuarterbackTrigger |
| Sheet overlay | z-50 | SheetOverlay (from Sheet) |
| Sheet panel | z-50 | SheetContent (from Sheet) |
| Tooltips/popovers | z-50 | (existing behavior) |

### Color Assignment (Quarterback-specific)

| Element | Background | Text | Border |
|---------|-----------|------|--------|
| Trigger button | `gradient-gold` | `text-charcoal` | none |
| Panel background | `bg-background` | -- | `border-l border-border` |
| Header | `bg-card` | -- | `border-b border-border` |
| User message | `bg-primary/10` | `text-foreground` | none |
| AI message | `bg-card` | `text-foreground` | `border border-border` + `border-l-2 border-l-primary` |
| Context card | `bg-muted/50` | -- | `border border-border` |
| Action button | `bg-primary/10` | `text-primary` | `border border-primary/20` |
| Input area | `bg-card` | -- | `border-t border-border` |
| Input field | `bg-muted/50` | `text-foreground` | `border border-border` |
| Send button | `gradient-gold` | `text-charcoal` | none |
| Suggestion chip | `bg-muted` | `text-muted-foreground` | transparent |
| Suggestion chip hover | `bg-primary/10` | `text-primary` | `border-primary/20` |
| Empty state card | `bg-card` | -- | `border border-border` |

### Typography Scale (within panel)

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Header title "Quarterback" | `font-display` | `text-base` (16px) | `font-semibold` (600) | `text-foreground` |
| "AI COPILOT" badge | `font-body` | `text-[10px]` | `font-semibold` | `text-gold` |
| Client selector | `font-body` | `text-xs` (12px) | `font-normal` | `text-muted-foreground` |
| Message body | `font-body` | `text-sm` (14px) | `font-normal` (400) | `text-foreground` |
| Message timestamp | `font-body` | `text-[10px]` | `font-normal` | `text-muted-foreground/60` |
| Markdown h3 in AI msg | `font-display` | `text-sm` | `font-semibold` | `text-foreground` |
| Context card label | `font-body` | `text-[10px]` | `font-semibold` | `text-muted-foreground` |
| Context card value | `font-body` | `text-sm` | `font-semibold` | `text-foreground` |
| Action button label | `font-body` | `text-xs` | `font-medium` (500) | `text-primary` |
| Suggestion chip | `font-body` | `text-[11px]` | `font-medium` | `text-muted-foreground` |
| Empty state title | `font-display` | `text-xl` (20px) | `font-semibold` | `text-foreground` |
| Empty state subtitle | `font-body` | `text-sm` | `font-normal` | `text-muted-foreground` |
| Empty state card label | `font-body` | `text-xs` | `font-medium` | `text-foreground` |
| Empty state card desc | `font-body` | `text-[10px]` | `font-normal` | `text-muted-foreground` |
| Input placeholder | `font-body` | `text-sm` | `font-normal` | `text-muted-foreground/50` |
| Keyboard hint | `font-body` | `text-[10px]` | `font-normal` | `text-muted-foreground/40` |

---

## 8. Animation Specifications

### Panel Open/Close
Already handled by Sheet's `tailwindcss-animate` integration:
- Enter: `slide-in-from-right`, `duration-500`, `ease-in-out`
- Exit: `slide-out-to-right`, `duration-300`, `ease-in-out`

### Floating Trigger Button
- **Appear** (on page load): `animate-fade-in` (existing utility in tailwind config) -- 0.5s ease-out
- **Hover**: `transition-all duration-200`, `hover:scale-105`
- **Click**: `active:scale-95`
- **Pulse** (unread): custom `animate-qb-pulse` keyframe (defined in Section 1)
- **Hide when panel opens**: `transition-opacity duration-200`, toggle `opacity-0 pointer-events-none`

### Messages
- **New message appear**: Framer Motion `initial={{ opacity: 0, y: 8 }}` -> `animate={{ opacity: 1, y: 0 }}` with `duration: 0.3`
- **Typing indicator dots**: Framer Motion staggered bounce (defined in Section 4f)

### Suggestion Chips (active chat)
- **Enter**: Framer Motion `initial={{ opacity: 0, scale: 0.95 }}` -> `animate={{ opacity: 1, scale: 1 }}` with stagger `delay: i * 0.05`
- This creates a subtle "cascade" effect when new suggestions appear

### Context Cards
- **Expand into view**: Framer Motion `initial={{ opacity: 0, height: 0 }}` -> `animate={{ opacity: 1, height: "auto" }}` with `duration: 0.3`

---

## 9. Integration with AdvisorLayout

### Modified Layout Structure
The trigger and panel provider wrap the entire layout:

```tsx
// AdvisorLayout.tsx (modified)
import { QuarterbackProvider } from "@/components/quarterback/QuarterbackProvider";
import { QuarterbackTrigger } from "@/components/quarterback/QuarterbackTrigger";
import { QuarterbackPanel } from "@/components/quarterback/QuarterbackPanel";

const AdvisorLayout = () => {
  return (
    <QuarterbackProvider>
      <div className="flex min-h-screen bg-background">
        <AdvisorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <QuarterbackTrigger />
      <QuarterbackPanel />
    </QuarterbackProvider>
  );
};
```

### QuarterbackProvider State Shape
```ts
interface QuarterbackState {
  isOpen: boolean;
  messages: QuarterbackMessage[];
  isStreaming: boolean;
  selectedClientId: string | null;
  hasUnreadInsights: boolean;
}

interface QuarterbackMessage {
  id: string;
  role: "user" | "assistant";
  content: string;  // raw text or markdown
  timestamp: Date;
  actions?: ActionItem[];       // optional inline actions
  contextCards?: ContextCard[]; // optional data cards
}
```

---

## 10. Responsive / Edge Case Considerations

### Viewport width < 1200px
At narrow viewports (sidebar collapsed + main content), the 420px panel may feel too dominant. Consider:
- Reducing panel width to `w-[380px]` below 1200px viewport
- Or: make the panel full-width on very narrow screens (`w-full sm:w-[420px]`)

### Long messages
- AI messages with very long markdown content should remain contained within `max-w-[90%]` of the 420px panel
- Code blocks should have `overflow-x-auto` to handle wide lines
- Images (if ever supported) should be `max-w-full rounded-lg`

### Empty input prevention
- Send button disabled when `input.trim().length === 0`
- Send button disabled when `isStreaming === true`
- While streaming, show a "Stop generating" button in place of the send button (square stop icon, same gold treatment)

### Keyboard navigation
- `Escape` closes the panel (handled by Sheet/Radix)
- `Ctrl+K` or `Cmd+K` could be an optional keyboard shortcut to open (if not conflicting with the search palette)
- Tab order: Header close button -> Client selector -> Messages (scroll) -> Suggestion chips -> Input -> Send button

---

## 11. New Dependencies Required

| Package | Purpose | Install Command |
|---------|---------|----------------|
| `react-markdown` | Render AI markdown responses | `npm install react-markdown` |
| `remark-gfm` | GitHub-flavored markdown (tables, strikethrough) | `npm install remark-gfm` |

Note: `@tailwindcss/typography` is already in devDependencies but needs to be added to the `plugins` array in `tailwind.config.ts` alongside `tailwindcss-animate`.

---

## 12. Tailwind Config Additions

Add to `tailwind.config.ts`:

### Keyframes
```ts
"qb-pulse": {
  "0%, 100%": { boxShadow: "0 0 0 0 hsl(43 72% 52% / 0.4)" },
  "50%": { boxShadow: "0 0 0 12px hsl(43 72% 52% / 0)" },
},
```

### Animations
```ts
"qb-pulse": "qb-pulse 2s ease-in-out infinite",
```

### Plugins
```ts
plugins: [
  require("tailwindcss-animate"),
  require("@tailwindcss/typography"),
],
```

---

## 13. Recommended Shadcn Components to Use

| Component | Usage | Already Installed |
|-----------|-------|:-:|
| `Sheet` / `SheetContent` / `SheetOverlay` | Panel container + slide animation | Yes |
| `ScrollArea` | Messages scrollable area | Yes |
| `Button` | Send button, action buttons | Yes |
| `Badge` | Severity badges, status badges in context cards | Yes |
| `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` | Client context selector | Yes |
| `Tooltip` / `TooltipContent` / `TooltipTrigger` | Send button tooltip, keyboard shortcut hints | Yes |
| `Separator` | Visual dividers in messages | Yes |

No new shadcn components need to be installed. The existing set covers all needs.

---

## 14. Quality Checklist (Pre-Implementation)

- [x] Visual hierarchy is clear -- gold trigger draws the eye, panel header establishes context, messages have clear sender differentiation, input is always discoverable at the bottom
- [x] Spacing is consistent -- 4px/8px/12px/16px/20px scale throughout, all derived from the existing Tailwind spacing scale
- [x] Typography scale is applied -- EB Garamond for titles, Inter for all UI text, clear size differentiation from 10px labels to 20px empty state title
- [x] Components are consistent -- cards, buttons, badges all reuse existing variants and tokens
- [x] Semantic HTML specified -- `<aside>` for panel conceptually (Sheet renders as `dialog`), `<header>` for panel header, `<button>` for all clickable elements
- [x] CTA (send button) is prominent -- gold gradient, always visible, clear disabled state
- [x] Color palette maps 100% to existing tokens -- no new colors introduced, only opacity variants of existing tokens
- [x] Animations use the project's existing Framer Motion + tailwindcss-animate approach
- [x] No business logic specified -- this is purely visual structure
- [x] Output is ready for a developer to implement immediately
