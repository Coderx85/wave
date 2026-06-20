---
name: Wave
description: Real-time payment notification and transaction management platform
colors:
  primary: "oklch(0.58 0.18 165)"
  primary-hover: "oklch(0.48 0.18 165)"
  primary-subtle: "oklch(0.92 0.04 160)"
  paper: "oklch(0.98 0.002 160)"
  cloud: "oklch(0.96 0.005 160)"
  white: "oklch(1 0 0)"
  ink: "oklch(0.13 0.01 160)"
  steel: "oklch(0.48 0.012 160)"
  quiet-border: "oklch(0.9 0.005 160)"
  leaf: "oklch(0.55 0.18 150)"
  amber: "oklch(0.65 0.16 85)"
  signal-red: "oklch(0.55 0.2 30)"
  signal-red-subtle: "oklch(0.93 0.04 30)"
  dark-paper: "oklch(0.025 0.003 160)"
  dark-cloud: "oklch(0.12 0.008 160)"
  dark-card: "oklch(0.09 0.005 160)"
  dark-ink: "oklch(0.93 0.006 160)"
  dark-border: "oklch(0.18 0.008 160)"
  dark-primary-subtle: "oklch(0.14 0.04 160)"
  dark-steel: "oklch(0.55 0.012 160)"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.25
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.white}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    border: "1px solid {colors.quiet-border}"
  button-outline-hover:
    backgroundColor: "{colors.cloud}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
  card-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    border: "1px solid {colors.quiet-border}"
  nav-link:
    textColor: "{colors.steel}"
    typography: "{typography.body}"
  nav-link-active:
    textColor: "{colors.ink}"
    borderBottom: "2px solid {colors.primary}"
---

# Design System: Wave

## 1. Overview

**Creative North Star: "The Clear Ledger"**

Wave's interface is a financial ledger — but one that has been edited down to its most readable form. Every element exists because it communicates something material: a status, an amount, an action. Nothing decorates. The emerald accent carries the connotation of growth and transaction completion without tipping into "playful fintech." The design sits deliberately between traditional banking's institutional gray and the over-designed SaaS space: professional without coldness, warm without sentimentality.

The system's personality comes from contrast between the green-teal primary and an otherwise restrained neutral palette. Color is applied sparingly — the emerald appears on primary actions, active navigation, and success indicators — so when it does appear, it means something. The background is a faintly tinted near-white (not pure gray), giving the canvas a subtle warmth that supports the emerald without competing.

**Key Characteristics:**
- Information-dense but not cluttered. Tables, lists, and cards prioritize scannability over whitespace drama.
- One accent color with semantic extensions (success, warning, error). No secondary palette.
- Flat surfaces with tonal layering, not shadows. Borders mark container edges; background shifts mark hierarchy.
- Typography does the heavy lifting for hierarchy. Single sans-serif (Inter) with weight and size contrast.
- Monetary values always in mono type (JetBrains Mono) — instantly recognizable as numbers, not prose.
- Dark mode preserves the same visual logic: inverted luminance, same chroma, same hierarchy.

## 2. Colors

The palette is built around a single emerald primary with restrained neutrals. Chroma is kept tight — nothing outside 0.2 — so the interface stays calm even when information density is high.

### Primary
- **Clear Emerald** (`oklch(0.58 0.18 165)`): Primary actions, active navigation indicator, links, focus rings. Appears on ≤10% of any given screen. Its rarity is the point — when users see emerald, they know something is actionable or confirmed.
- **Deep Emerald** (`oklch(0.48 0.18 165)`): Primary button hover state. Moves slightly darker on the same chroma, never shifting hue.
- **Emerald Mist** (`oklch(0.92 0.04 160)`): Subtle background tint for highlighted rows, unread notifications, and active states on muted surfaces.

### Neutral
- **Paper** (`oklch(0.98 0.002 160)`): Page background. A near-white with the barest green-ward tint — imperceptible alone but cohesive next to the emerald primary. In dark mode, becomes **Dark Paper** (`oklch(0.025 0.003 160)`), a near-black with the same tint.
- **Cloud** (`oklch(0.96 0.005 160)`): Secondary surfaces, hover states on interactive elements, table row hover. One step darker than paper. Dark mode: **Dark Cloud** (`oklch(0.12 0.008 160)`).
- **White** (`oklch(1 0 0)`): Cards, elevated surfaces, modals. Pure white — no tint. Dark mode: **Dark Card** (`oklch(0.09 0.005 160)`).
- **Ink** (`oklch(0.13 0.01 160)`): Primary body text, headings. Near-black with a green-black tint. Dark mode: **Dark Ink** (`oklch(0.93 0.006 160)`).
- **Steel** (`oklch(0.48 0.012 160)`): Secondary text, metadata, placeholder text, table headers. The muted text color for low-emphasis information.
- **Quiet Border** (`oklch(0.9 0.005 160)`): Card borders, input strokes, dividers, table row separators. Thin and unobtrusive. Dark mode: **Dark Border** (`oklch(0.18 0.008 160)`).

### Semantic
- **Leaf** (`oklch(0.55 0.18 150)`): Positive indicators — incoming money, success badges, "completed" status. Green but distinctly more yellow-green than the primary, so it reads as "success" not "action."
- **Amber** (`oklch(0.65 0.16 85)`): Warning indicators, pending status, attention-required states. Muted enough to not alarm.
- **Signal Red** (`oklch(0.55 0.2 30)`): Destructive actions, error states, failed transactions. Used for both buttons and status indicators, with a lighter companion **Signal Red Subtle** (`oklch(0.93 0.04 30)`) for alert backgrounds.

### Named Rules

**The One Voice Rule.** The Clear Emerald primary is used on ≤10% of any given screen. Its rarity is the point — when users see emerald, they know something is actionable or confirmed. If an element is informational, it uses neutral tokens instead.

**The Semantic Consistency Rule.** Green means "success/positive" (Leaf), not "action." The emerald primary means "clickable/interactive," not "growth." Red means "error/destructive." Amber means "attention." These are never swapped.

**The Tint-Not-Shade Rule.** Neutral surfaces are tinted toward the brand's hue (160 on the oklch hue wheel), not shaded with gray. The tint is barely perceptible (0.002–0.005 chroma) but produces a cohesive canvas that gray neutrals cannot match.

## 3. Typography

**Display & Body Font:** Inter (300–700 weights), with system-ui and sans-serif fallback
**Mono Font:** JetBrains Mono (400–700 weights), monospace fallback

**Character:** A single sans-serif family across the entire interface. No serif, no display face — the product does the work, not the typeface. Inter brings a large x-height and open counters that keep financial data legible at small sizes. JetBrains Mono is reserved exclusively for monetary values, giving numbers a distinct visual rhythm that separates them from narrative text at a glance.

### Hierarchy
- **Headline** (Inter 600, 1.5rem/24px, 1.0 line-height, -0.01em letter-spacing): Card titles and section headings. The largest text in the system, used sparingly.
- **Title** (Inter 600, 1.25rem/20px, 1.2 line-height, -0.01em letter-spacing): Page titles, modal headings. The structural label for each screen.
- **Body** (Inter 400, 0.875rem/14px, 1.5 line-height): Primary reading size — transaction descriptions, notification messages, form labels, table cell text. Max line length 65–75ch for prose paragraphs; financial data in tables is intentionally denser.
- **Label** (Inter 500, 0.75rem/12px, 1.25 line-height): Table column headers, badges, button text in small variants, metadata. The smallest intentional text; never goes below 12px.
- **Mono** (JetBrains Mono 500, 0.875rem/14px): All monetary amounts — balances, transaction values, account numbers. Always font-mono with font-semibold weight. Provides instant visual differentiation from non-numeric data.

### Named Rules

**The Mono Rule.** Every monetary amount on screen uses JetBrains Mono at 500 weight. If it's money, it's mono. This applies at every size — from the 2.25rem balance on the wallet card down to the 0.875rem amounts in transaction tables.

**The No-Hero Scale Rule.** The system has no display scale larger than 1.5rem. This is a product interface, not a marketing page. Hierarchy comes from weight and placement, not type size.

**The Ceiling Rule.** Body text never goes below 0.875rem (14px). Label text never goes below 0.75rem (12px). Financial data is already dense; shrinking type does not help.

## 4. Elevation

Flat by default, with deliberate shadow exceptions. Standard cards, inputs, and surfaces are distinguished from one another by **tonal layering** — background lightness shifts (Paper → Cloud → White) and 1px borders (Quiet Border) — not by dropshadow. This keeps the interface calm and legible: the user reads financial information through the hierarchy of the type and layout, not through decorative depth.

Shadows are reserved for exactly two contexts, both modal:
- **Processing overlays** — the full-screen backdrop during deposits and transfers uses `box-shadow: 0 8px 32px rgba(0,0,0,0.12)` on its content card, plus `backdrop-filter: blur(8px)` on the scrim. These are brief (2–5s) transitional elements.
- **Wallet cards** — the premium branded account card uses `box-shadow: 0 8px 32px rgba(0,0,0,0.25)` to create a physical card metaphor distinct from the UI around it. This is the one intentional break from the flat system.

### Named Rules

**The Flat-By-Default Rule.** Standard surfaces have no shadow. Depth is conveyed through tonal layering: Paper → Cloud → White. If you're about to add a `box-shadow` to a card or container, ask whether a lighter background or a border would achieve the same separation.

## 5. Components

### Buttons

- **Shape:** Gently curved (6px radius). Not pill-shaped except badges.
- **Primary (`bg-primary text-primary-foreground hover:bg-primary/90`):** Clear Emerald background, white text, 10px vertical / 16px horizontal padding. Hover darkens the emerald. Used for the single most important action on screen.
- **Outline (`border border-input bg-background hover:bg-accent hover:text-accent-foreground`):** Transparent background, Quiet Border stroke, Ink text. Hover gains a Cloud background. Used for secondary actions parallel to a primary button.
- **Ghost (`hover:bg-accent hover:text-accent-foreground`):** No border, no background at rest. Hover reveals a Cloud background. Used for low-emphasis actions (dismiss, cancel, close) and toolbar items.
- **Destructive (`bg-destructive text-destructive-foreground hover:bg-destructive/90`):** Signal Red background, white text. Identical structural shape to primary. Used only for irreversible actions (delete account, dismiss permanently).
- **Sizes:** Default (40px height), sm (36px height), xs (28px height), lg (44px height). The same radius applies at every size.
- **Transitions:** 150ms `transition-colors` for background changes. No transform, no scale.

### Cards

- **Corner Style:** Generously rounded (12px). Distinct from the 6px rounding on buttons and inputs — cards are the most "contained" shape in the system.
- **Background:** Pure White (`oklch(1 0 0)`), resting on Paper (`oklch(0.98 0.002 160)`) or Cloud (`oklch(0.96 0.005 160)`) page backgrounds.
- **Border:** 1px Quiet Border (`oklch(0.9 0.005 160)`). No shadow.
- **Internal Padding:** 24px (`p-6`). CardHeader uses `pb-4` for headings; CardContent uses `p-6 pt-0`.
- **Stacking:** Never nest cards. A card is a terminal container.

### Inputs & Fields

- **Style:** 1px Quiet Border stroke, transparent background, 6px radius, 40px default height (36px for sm).
- **Focus:** The Quiet Border stroke is replaced by a 2px Clear Emerald ring via `focus-visible:ring-2 focus-visible:ring-ring`. No glow, no shadow — just a solid color shift.
- **Padding:** 10px vertical, 12px horizontal. Label sits above at Label size (12px, 500 weight), 6px gap.
- **Placeholder:** Steel (`oklch(0.48 0.012 160)`) at 14px/400 weight — the same as regular Body text but in the muted color. Meets 4.5:1 contrast against White background.
- **Select:** Native `<select>` styled to match Input dimensions and border. Chevron is the default browser indicator.

### Navigation

- **Style:** Top bar, 56px height, full width, bottom border (1px Quiet Border). Contains brand mark on the left, nav links on the right.
- **Links:** 14px/500 weight, Steel color. Inactive: `text-muted-foreground`. Hover: `text-foreground`. Active: Ink color with a 2px Clear Emerald bottom underline (absolute-positioned pseudo-element).
- **Mobile:** No hamburger menu — the nav items fit inline within `max-w-6xl` on tablet and above. On narrow viewports, the nav collapses to essential links (brand + account). No off-canvas drawer.

### Badges / Chips

- **Style:** `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold`. Pill shape (full radius).
- **Variants:** `default` (Clear Emerald bg, white text) for success/positive; `secondary` (Cloud bg, Ink text) for neutral/pending; `destructive` (Signal Red bg, white text) for error/failure; `outline` (transparent, Quiet Border, Ink text) for filters.
- **Use:** Status labels only. Not used for counts, navigation, or interactive filters.

### Data Tables

- **Headers:** 12px/500/Label weight, Steel color, left-aligned. Sortable columns show sort direction via small triangles on hover. Padding: 12px vertical, 16px horizontal.
- **Rows:** 14px/400 Body text. Hover: Cloud background (`bg-surface-hover`). Clickable rows (transaction detail navigation) show a pointer cursor and hover effect. Bottom border per row: 1px Quiet Border at 30% opacity.
- **Monetary cells:** Same row height, JetBrains Mono 500 at 14px. Positive amounts in Leaf green (`text-success`), negative in Ink (no red — direction is conveyed by the `←`/`→` indicator and sign).
- **Direction indicators:** 32px circular avatar containing `←` / `→` / `↔` at Cloud depth. Semantically meaningful but visually unobtrusive.

## 6. Interactive Patterns

### 6.1 Loading States

The system uses a consistent three-state rendering pattern (`loading` / `error` / `data`) across every data-fetching component. Loading always uses skeleton placeholders; spinners are reserved for button-level submission feedback and overlay processing states.

**Skeleton placeholders** — the standard loading pattern for page content, tables, and cards. Every skeleton is a `<div>` with `animate-pulse rounded-md bg-muted` (no content, no text). Skeletons mimic the shape of the final content: table loading shows 5 equal-height rows, card loading shows label + value + info lines, list loading shows full-width items. No spinner is shown alongside skeletons — the pulse animation is the loading signal.

**Processing overlays** — used exclusively for money-moving operations (deposit, transfer). A `fixed inset-0 z-50` overlay with `animate-fade-in` (200ms ease-out), `bg-background/80 backdrop-blur-sm` scrim, and a centered card containing a `animate-a-spin` spinner (0.6s linear infinite rotation), the monetary amount in mono, and "Processing deposit" / "Processing transfer" text. The overlay blocks all interaction underneath. It is only shown while a transaction is in flight (2–5s). After success, the overlay is replaced by an inline success card within the form. It is never used for non-financial loading (data fetches use skeletons).

**Button loading state** — during submission, buttons display either a small inline spinner (`h-4 w-4 rounded-full border-2 border-[color]/30 border-t-[color] animate-a-spin`) replacing the icon, or a text change (e.g., "Creating..." / "Processing..."). The button is `disabled` with `opacity-50 pointer-events-none` in both cases. The button's width is preserved (no layout shift when label changes).

**The loading contract:**
- Every data-fetching component implements `loading → error → data` triage.
- On initial load, show skeletons (never a spinner alone as the page's primary loading state).
- On subsequent data refreshes (pull-to-refresh, refetch), dim or stale-show; do not flash skeletons.
- Loading state must persist until data or error is confirmed — no double-flash.

### 6.2 Empty States

Every list or data container must handle the case where data exists but the filtered/sorted result is empty. Wave uses a layered approach:

- **No data at all**: "No transactions yet." / "No accounts yet. Create one below." / "No notifications" with secondary text "New notifications will appear here in real time." All use `py-10 text-center text-muted-foreground`.
- **Filtered empty**: When filters eliminate all results and data exists, show a contextual message: "No <filter> transactions found." This distinguishes "nothing exists yet" from "nothing matches your search."
- **Page-level not-found**: For resources that fail to load by ID (e.g., `/accounts/999`), show "Account not found." with a primary-action button linking back to the list.

All empty states are static text only — no illustrations, no icons, no illustration-style SVG placeholders. The text is the state. It sits centered in the available space at Body size in Steel color.

### 6.3 Error States

Errors surface in two tiers depending on scope:

**Inline form errors** (`<p className="text-sm text-destructive">`) — appear directly below the form's submit button. Content is the `error.message` string from the API response. The form controls remain interactive so the user can correct and retry. The error clears on successful resubmission. Never use toast, modal, or banner for form validation errors.

**Page-level error with retry** — when a data fetch fails entirely (network error, server 500, session error), show a centered error card containing:
- A muted destructive icon container (Signal Red ring at 30% opacity)
- The error message as body text
- A "Retry" button (secondary/outline style) that re-triggers the data fetch
- A "Back" link or button if navigating away is more appropriate

The error replaces the content area entirely (it does not stack below a partial rendering). `py-10` vertical spacing, `text-center`.

**Error contract:**
- Every error message must be a concrete description, not a code: "Failed to load transactions" not "Error code 500."
- No `alert()` or `confirm()` dialogs are ever used.
- Error states must not flash loading skeletons before appearing (check `!loading && error`).
- Network-idempotent errors can auto-retry once; non-idempotent errors (submission failures) require user action.

### 6.4 Form Interactions

All forms follow a consistent lifecycle: **resting → validating → submitting → success/error**.

**Resting:** The form shows default state with empty or pre-filled inputs. Submit button is `disabled` if required inputs are empty.

**Validating:** HTML5 validation is used for client-side checks (`required`, `type`, `min`, `step`, `minLength`). No custom validation library. Submit button disables until all required fields pass basic emptiness checks. The submit button itself is the primary validation trigger: while inputs are incomplete, it remains disabled — no inline "field required" messages appear until submission attempt.

**Submitting:** The form's submit button disables and shows a loading state (spinner or text change). All inputs remain visible but are are not editable (no explicit `disabled` on inputs — the disabled submit button signals that the form is in flight). Processing overlays handle the visual blocking for payments; all other forms use button-only loading.

**Success:** The form content is replaced by a success card containing: the primary result (amount, account name), a confirmation message in body text, and an action button ("Deposit again" / "Send another"). The success card is not auto-dismissed; the user must explicitly click to return to the form. No success toast.

**Error:** The form remains visible with an inline error message below the submit button. Input values are preserved. The submit button re-enables.

**Button disable logic:** Every form's submit button disables based on well-known conditions. The disabled state uses `opacity-50 pointer-events-none` with no cursor change. The button's width is fixed to prevent layout shift when text changes between "Submit" and "Processing...".

**Debounced lookups:** The receiver account lookup in the Send Money form uses a 400ms debounce via `useEffect` with `setTimeout` cleanup. While looking up, a "Looking up..." label appears below the input in Steel color. On success, the found account name appears in Ink. On failure, "No account found" appears in Steel. The submit button remains disabled until the lookup resolves successfully.

### 6.5 Notifications

Notifications are a page-level view, not overlay toasts. The system uses SSE (Server-Sent Events) for real-time delivery.

**Connection status:** A small inline badge in the page header shows the SSE connection state. Three states: "connected" (green dot), "connecting" (pulsing green dot with `animate-a-spin`), "disconnected" (gray dot). The badge uses label size (12px) and sits in the page header metadata area.

**Notification cards:** Each notification renders as a full-width card with: a type indicator dot (Clear Emerald for info, Amber for warning, Signal Red for error), a bold title, a monospace timestamp, and a message clamped to 2 lines with `line-clamp-2`.

**Read state:** Unread notifications use `bg-accent-subtle` (Emerald Mist) background and bold title. Read notifications use `bg-surface` at reduced opacity (`opacity-70`), restored to full opacity on hover (`hover:opacity-100`). The state toggle is instant — no animation on read/unread transition.

**Hover actions:** "Mark read" and "Dismiss" buttons appear on card hover with `opacity-0 group-hover:opacity-100 transition-opacity` (150ms). The buttons use the ghost button variant. Dismiss removes the card from the DOM immediately — no exit animation.

**SSE reconnection:** Uses exponential backoff: `Math.min(1000 * 2^retry, 30000)` ms. Reconnection is silent — no notification to the user. A connecting state badge in the header is the only indicator.

**Notification limits:** Client caps at 50 notifications (newest first, prepended, deduplicated by ID).

### 6.6 Transitions and Animation

Wave uses a restrained animation vocabulary. No animation library — all effects use Tailwind CSS utilities and custom keyframes.

**Approved keyframes:**
- `fade-in` — opacity 0→1 at 200ms `ease-out`. Used only for processing overlay entrance. Not used for page transitions, card entrance, or list appearance.
- `pulse` — opacity pulse at 50% midpoint. 2s `cubic-bezier(0.4,0,0.6,1)`. Used exclusively for skeleton loading placeholders.
- `a-spin` — full rotation at 0.6s `linear infinite`. Used exclusively for loading spinners and the SSE connecting indicator.
- `slide-in-right` / `slide-in-left` — slide translateX(16px) + fade, 250ms `ease-out`. Reserved for content transitions (dropdown entrance, panel reveals).
- `enter` keyframe (Tailwind) — combination scale+fade for dropdown-menu entrance at 95% zoom. Only for dropdown menus.

**Transition durations:**
- Background color changes (`transition-colors`): 150ms `ease` — button hover, link hover, table row hover, navigation active/inactive, badge hover.
- Opacity changes (`transition-opacity`): 150ms default — notification hover actions, chart tooltip. 700ms for WalletCard shine overlay.
- Transform changes (`transition-transform`): 300ms `ease-out` — carousel slide. 500ms `ease-out` — WalletCard 3D hover tilt.
- All properties (`transition-all`): 300ms — balance blur reveal/hide. Used sparingly; prefer specific properties.

**Wallet card specific:**
- 3D perspective tilt: `hover:[transform:perspective(1200px)_rotateY(-3deg)_rotateX(1deg)]` at 500ms `ease-out`.
- Shine overlay: a white gradient at 40% opacity, revealed to 15% on hover at 700ms `transition-opacity`.
- Respects `motion-reduce:transition-none` and `motion-reduce:hover:transform-none`.

**Reduced motion:**
A global `@media (prefers-reduced-motion: reduce)` reset sets all animation and transition durations to `0.01ms` with `animation-iteration-count: 1`. This applies to all `*` elements. Additionally, the WalletCard and carousel use a `motion-reduce:` Tailwind variant to explicitly disable their transform transitions. Do not rely on CSS custom properties for motion reduction — the global reset handles all cases.

### 6.7 Processing Overlay Pattern

The processing overlay is the only modal-like pattern in the system. There are no generic modals, dialog boxes, confirmations, or toasts.

**Structure:**
```html
<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
  <div className="rounded-xl bg-card p-6 border shadow-lg max-w-sm w-full mx-4 text-center space-y-3">
    <div className="flex justify-center">
      <span className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-a-spin" />
    </div>
    <p className="font-mono font-semibold text-lg">$amount</p>
    <p className="text-sm text-muted-foreground">Processing deposit...</p>
  </div>
</div>
```

- Scrim: `bg-background/80` (resolves to correct light/dark value) + `backdrop-blur-sm`.
- Card: Standard card styling (12px radius, 1px border, no shadow in light mode, shadow in dark mode).
- Spinner: 32px, `border-primary/30` with `border-t-primary` — a ring spinner using the Clear Emerald accent.
- Content: Mono amount, secondary label.
- Appearance: `animate-fade-in` at 200ms. No scale entrance.
- Dismissal: Not user-dismissible. Replaced by success card on completion.

### 6.8 Dropdown Menu Pattern

The system has exactly one menu: the user account dropdown (top-right navigation). It is fully custom — no Radix UI, no headless library.

**Behavior:**
- Toggle: Click trigger button to open/close. Click outside to close (document `mousedown` listener). Press Escape to close.
- Positioning: `absolute right-0 top-full mt-1`.
- Entrance: `animate-in fade-in-0 zoom-in-95` (scales in from 95% with fade).
- Items: `transition-colors` on hover (150ms). Menu closes on item click via state setter.
- States: `focus-visible` ring on keyboard-navigated items. `disabled` styling on non-applicable items.

**Accessibility:**
- Click-outside-to-close uses a `mousedown` listener (not `click` — captures earlier in event cycle).
- Escape key closes via `keydown` listener on `document`. Both listeners clean up on `open=false` or unmount.
- No focus trapping (menu has no focusable content beyond items; natural tab order is acceptable).

### 6.9 Accessibility and Keyboard Interaction

**Focus-visible ring:** Every interactive element (buttons, inputs, links, dropdown triggers, badges, select) implements `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. The ring uses Clear Emerald (`var(--ring)`) at 2px width with 2px offset. This is applied at the component level, not globally — the global `:focus-visible` in `styles.css` is a fallback for un-styled elements.

**Screen reader support:**
- Icon-only buttons and links carry `aria-label` with a verb phrase: `aria-label="Back to Transactions"`, `aria-label="Show balance"`, `aria-label="Next account"`.
- Balance visibility toggles use `aria-hidden={!showBalance}` on the amount element — hidden text is not read, not `display: none`.
- Notification preference toggles use `role="switch"` with `aria-checked={enabled}` — native `<button>` element, not a checkbox polyfill.
- Custom select dropdowns use `aria-expanded` where applicable. Native `<select>` elements do not require additional ARIA.

**Disabled states:**
- `disabled` attribute on all disabled buttons, inputs, selects, toggles.
- Visual: `opacity-50` + `pointer-events-none` for mouse and touch. `disabled` property handles keyboard/focus prevention natively.
- Disabled buttons do not show `cursor: not-allowed` — the reduced opacity is sufficient signal.

**Missing patterns (not yet implemented, deferred):**
- Page-level keyboard shortcuts (e.g., `g t` to go to Transactions, `g d` for Dashboard) — not in scope for v1.
- Focus trapping in the processing overlay (not needed — overlay is brief and non-interactive beyond the spinner).
- Announcement of dynamic content changes to screen readers (e.g., "New notification received" via `aria-live="polite"`) — future enhancement.
- Skip-to-content link for keyboard users — future enhancement.

## 7. Do's and Don'ts

### Do:
- **Do** use the Clear Emerald on ≤10% of the screen. It carries meaning precisely because it's rare.
- **Do** use JetBrains Mono for every monetary amount, at every size.
- **Do** use tonal layering (Paper → Cloud → White) instead of shadows for standard surfaces.
- **Do** use Signal Red for destructive actions and failed status. Never use emerald for "cancel" or "delete."
- **Do** use Leaf green for positive/success indicators and incoming money. This is distinct from the emerald primary.
- **Do** make every notification, status, and amount scannable in under two seconds. If a user has to parse, the design failed.
- **Do** use `text-wrap: balance` on headings and `text-wrap: pretty` on long paragraphs to reduce orphans.
- **Do** respect `prefers-reduced-motion` — all animations should degrade gracefully to instant transitions or hidden states.
- **Do** follow the three-state rendering contract (loading → error → data) for every data-fetching component.
- **Do** use skeleton placeholders for content loading and inline spinners for button/action loading — never confuse the two.
- **Do** show empty states as centered text only — no illustrations, no icons, no decorative placeholders.

### Don't:
- **Don't** use gradient text anywhere. `background-clip: text` combined with a gradient is forbidden. Emphasis comes from weight and size.
- **Don't** use glassmorphism (blurred backgrounds on card surfaces). The one exception is the processing overlay scrim.
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe on cards or callouts.
- **Don't** use the hero-metric template (big number, small label, gradient accent). This is a product, not a marketing site.
- **Don't** put tiny uppercase tracked eyebrow text (`ABOUT` / `PROCESS` / `PRICING`) above every section. One deliberate kicker is voice; repetitive eyebrows are AI scaffolding.
- **Don't** pair border + shadow on the same element. Pick one: 1px Quiet Border, or no border with tonal background. Never both.
- **Don't** use radii larger than 12px on cards or 6px on buttons/inputs. Pill shapes are only for badges.
- **Don't** obscure money amounts behind decorative flourishes. Every monetary value must meet WCAG AA contrast (≥4.5:1 for body text).
- **Don't** say "seamless," "empower," "supercharge," "leverage," "game-changer," or "world-class" in the UI. Describe what the product does in concrete terms.
- **Don't** use "Successfully" in success messages. "Deposit completed" beats "Successfully deposited funds." The emerald badge already signals success.
- **Don't** override `prefers-color-scheme` — follow the OS dark mode preference. No manual theme toggle.
- **Don't** use toast notifications (neither browser-native nor custom) — the notification page is the notification system. Inline form errors and success cards handle feedback.
- **Don't** animate elements on initial page load (no entrance animations for cards, tables, or page titles). Animation is reserved for state transitions, not first render.
- **Don't** use framer-motion, react-spring, or any animation library — all animation is CSS-only via Tailwind utilities and custom keyframes.

## 8. Dark Mode

Dark mode in Wave is not a separate theme — it is the light mode design inverted along the lightness axis while preserving every other dimension: chroma, hue, spacing, typography, elevation logic. The same visual hierarchy, the same accent distribution (≤10% emerald), the same flat-with-exceptions elevation. Everything that makes the light mode "The Clear Ledger" carries over directly. The only change is luminance.

### Surface Mapping

Every light mode token has a defined dark counterpart. All are CSS custom properties toggled via `@media (prefers-color-scheme: dark)` — no `dark:` Tailwind classes, no manual toggle, no `class`-based switching.

| Light Token | Light Value | Dark Token | Dark Value |
|---|---|---|---|
| Paper | `oklch(0.98 0.002 160)` | Dark Paper | `oklch(0.025 0.003 160)` |
| Cloud | `oklch(0.96 0.005 160)` | Dark Cloud | `oklch(0.12 0.008 160)` |
| White | `oklch(1 0 0)` | Dark Card | `oklch(0.09 0.005 160)` |
| Elevated | `oklch(1 0 0)` | Dark Elevated | `oklch(0.14 0.008 160)` |
| Ink | `oklch(0.13 0.01 160)` | Dark Ink | `oklch(0.93 0.006 160)` |
| Steel | `oklch(0.48 0.012 160)` | Dark Steel | `oklch(0.55 0.012 160)` |
| Quiet Border | `oklch(0.9 0.005 160)` | Dark Border | `oklch(0.18 0.008 160)` |
| Emerald Mist | `oklch(0.92 0.04 160)` | Dark Emerald Subtle | `oklch(0.14 0.04 160)` |

### Colors That Stay Unchanged

The semantic palette does not shift between modes. These tokens share the same value in light and dark:

- **Clear Emerald** — slightly brightens from `oklch(0.58 0.18 165)` to `oklch(0.6 0.18 165)` to maintain punch against the dark canvas. Chroma and hue are identical; only lightness adjusts by +0.02.
- **Deep Emerald** (`oklch(0.48 0.18 165)`): Hover state — already dark enough for both modes.
- **Leaf** (`oklch(0.55 0.18 150)`): Success green. Contrast against Dark Card (~5.5:1) and Dark Paper (~11:1) both pass AA.
- **Amber** (`oklch(0.65 0.16 85)`): Warning. Contrast against Dark Card (~4.8:1) — a close call but passes AA for 14px+ text. If used as a background fill, its subtle companion `oklch(0.14 0.05 85)` should be used instead.
- **Signal Red** (`oklch(0.55 0.2 30)`): Destructive. Contrast against Dark Card (~6:1), against Dark Paper (~9:1). The subtle companion for background fills is `oklch(0.14 0.04 30)`.
- **Accent Hover** (`oklch(0.48 0.18 165)`): Same in both modes — the hover is already dark enough.

Semantic colors remain unchanged because they are already weighted at moderate lightness (0.55–0.65) with sufficient chroma to read against both near-white and near-black backgrounds. Attempting to adjust them for dark mode would either over-saturate (making them garish) or under-saturate (losing their semantic signal).

### Contrast Verification

All text/background pairs in dark mode exceed WCAG AA (≥4.5:1 for normal text):

| Pair | Contrast Ratio | Passes |
|---|---|---|
| Dark Ink on Dark Paper | ~15:1 | AAA |
| Dark Ink on Dark Card | ~13:1 | AAA |
| Dark Ink on Dark Elevated | ~10:1 | AAA |
| Dark Steel on Dark Card | ~6.5:1 | AA+ |
| Dark Steel on Dark Paper | ~9:1 | AAA |
| Clear Emerald on Dark Paper | ~11:1 | AAA |
| Clear Emerald on Dark Card | ~8:1 | AAA |
| Signal Red on Dark Card | ~6:1 | AA |
| Leaf on Dark Card | ~5.5:1 | AA |
| Amber on Dark Card | ~4.8:1 | AA |
| Quiet Border on Dark Card | ~2:1 | — (border, not text) |

### Component Behavior

Every component resolves to its dark counterpart through CSS variables automatically. Key specifics:

- **Primary buttons:** Clear Emerald background (`var(--primary)`), Dark Ink text (`var(--primary-foreground)`). Hover: Deep Emerald (`var(--accent-hover)`).
- **Outline buttons:** Transparent background, Dark Border stroke, Dark Ink text. Hover: Dark Cloud background.
- **Ghost buttons:** No background at rest. Hover: Dark Cloud.
- **Destructive buttons:** Signal Red background, Dark Ink text (not white — too much contrast between Signal Red and white on a dark page).
- **Cards:** Dark Card background, Dark Border stroke, Dark Ink text. Equal padding to light mode.
- **Inputs:** Transparent background, Dark Border stroke, Dark Ink text. Focus: Clear Emerald ring (`var(--ring)`). Placeholder: Dark Steel.
- **Navigation bar:** Dark Card background with Dark Border bottom stroke. Active link: Clear Emerald underline. Labels: Dark Steel, hover to Dark Ink.
- **Badges:** Default (emerald bg, Dark Card text). Secondary (Dark Cloud bg, Dark Ink text). Destructive (Signal Red bg, Dark Card text). Outline (Dark Border stroke, Dark Ink text).
- **Data tables:** Headers in Dark Steel. Row hover in Dark Cloud. Row borders: Dark Border at 30% opacity. Direction indicators: Dark Cloud background circles.
- **Processing overlay:** Scrim: backdrop-filter blur with `rgba(0,0,0,0.6)`. Content card: Dark Elevated with shadow.
- **Wallet card:** Dark Card background, elevated shadow `rgba(0,0,0,0.4)`.

### Implementation Strategy

The system uses CSS custom properties exclusively — no `dark:` Tailwind prefix, no JavaScript theme toggle, no `class` on `<html>`. The switch is entirely declarative:

```css
:root {
  --background: oklch(0.98 0.002 160);
  /* ... all light tokens ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.025 0.003 160);
    /* ... all dark tokens ... */
  }
}
```

Every component references `var(--token)` rather than literal values. This means:
- Adding a new component automatically supports dark mode — no additional work.
- No `dark:` variants to maintain in Tailwind.
- No FOUC (Flash of Unstyled Content) — the media query resolves before first paint.
- No transition on `--*` properties — transitions between modes are instant. Adding `transition: background-color 0.3s` to `body` would create a multi-second luminance fade between modes; this is disorienting and adds no value. Instant switch is the correct behavior.

### Dark Mode Do's and Don'ts

**Do:**
- **Do** trust the token mapping. Every light token has a dark counterpart. If a new surface is needed, create both tokens — never hardcode a dark value.
- **Do** test contrast for every text/background pair against both Dark Paper and Dark Card (the two most common background surfaces).
- **Do** use Dark Ink (`oklch(0.93 0.006 160)`) for all prominent text — not pure white (`oklch(1 0 0)`). The 0.07 lightness reduction prevents the "glowing text" effect on dark backgrounds and preserves the green-black tint coherence.
- **Do** use Dark Steel for muted text, icons, and labels. The 0.55 lightness is readable but clearly secondary.
- **Do** verify that SVG icons inherit `currentColor` and resolve against their container's foreground token.

**Don't:**
- **Don't** desaturate the emerald in dark mode. Chroma stays at 0.18 in both modes. A desaturated emerald on a dark background looks muddy, not subtle.
- **Don't** add glow effects, neon borders, or luminous drop shadows in dark mode. Dark mode is not "cyberpunk mode." The flat surface treatment (tonal layering + 1px borders) applies identically in both modes.
- **Don't** brighten borders in dark mode. Dark Border `oklch(0.18 0.008 160)` should appear as a subtle structural line, not an illuminated edge.
- **Don't** use `filter: invert()` or `mix-blend-mode` as a dark mode shortcut. Every token is explicitly authored.
- **Don't** apply different border radii, padding, or typography in dark mode. Dark mode changes luminance only.
- **Don't** darken semantic colors. Signal Red, Leaf, and Amber keep their exact light-mode values. If they need a background container in dark mode, use their subtle companions (e.g., `oklch(0.14 0.04 30)` for a red alert background).
- **Don't** use all-caps for body copy. Reserve uppercase for short labels (≤4 words) and badges.
