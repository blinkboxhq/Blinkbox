# Frontend UI/UX Standards

Apply these rules whenever modifying or creating components in `apps/frontend/`.

---

## Aesthetic

- **Dark-mode first, always.** Background palette: `neutral-950` / `zinc-950` for surfaces, `neutral-900` / `zinc-900` for cards, `[#333]` for borders.
- **High-contrast accents** for active states: white, violet, rose, amber, cyan — pick the category color.
- **Glassmorphism** only for modals, dropdowns, and floating panels: `bg-black/60 backdrop-blur-[2px]` or `bg-neutral-900/80 backdrop-blur-md`.
- Never use light backgrounds. Never use default browser styles.

## Spacing & Typography

- Text scale: `text-[10px]` labels, `text-[11px]` descriptions, `text-[12px]` secondary, `text-[13px]` body, `text-[15px]` headings, `text-[18px]` page titles.
- Font weights: `font-medium` for nav items, `font-semibold` for labels, `font-bold` for section headers.
- Letter spacing: `tracking-wider` or `tracking-widest` for uppercase micro-labels.
- Use `uppercase tracking-wider` for section headers and field labels.

## Component Patterns

### Config Panels (Node Configuration)
- Each node gets its own `MyNode.jsx` in `components/nodes/`
- Always start with a header block: icon (color-matched) + node title + subtitle
- Use `SmartVariableInput` for any field accepting dynamic values (`{{ $json.field }}` syntax)
- Group related fields with `<div className="flex flex-col gap-4 p-4">`
- Toggle switches: `w-10 h-5 rounded-full` with sliding white knob — never use `<input type="checkbox">`
- Option pickers: horizontal pill buttons, not `<select>` dropdowns when ≤ 5 options
- Field labels: `text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block`
- Input fields: `bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500`
- Warning banners: `bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-3 py-2 rounded-lg`
- Info banners (output preview): `bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px] px-3 py-2 rounded-lg`

### Node Cards (Canvas)
- Square: `w-[120px] h-[120px]` — logo centered, label below
- Shape driven by `CATEGORIES[category].shape`: sharp/pill/rounded/default
- Active border color matches category accent
- Logo: 32×32px image OR 28×28px Lucide icon, centered
- Label: `text-[11px] font-semibold text-zinc-100 text-center` below the card

### Node Library Cards (Dashboard)
- Horizontal card: icon (40×40) + label + description + category badge
- `bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4`
- Category badge: `text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border`
- Color-coded per category using `CATEGORY_COLORS` map

### Sidebar Navigation
- Width: `w-[220px]` expanded, `w-[56px]` collapsed
- Background: `bg-neutral-950 border-r border-[#333]`
- Active item: `bg-white/[0.07] text-white`
- Inactive: `text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]`
- Icons: `w-[18px] h-[18px]`, `strokeWidth={1.5}` inactive, `strokeWidth={2}` active

### Modals & Dialogs
- Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]`
- Card: `bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-[340px] p-5 mx-4`
- Entry animation: `dbFadeIn 0.12s ease-out` + `dbScaleIn 0.12s ease-out` (defined in component `<style>`)
- Cancel: plain text button. Confirm/Destructive: filled with accent border.

## "No Membrane" Icon Rule

**NEVER wrap an icon in a colored background div.** Raw icon only.

The ONLY exception: node header icons in config panels get a small accent-colored container:
`w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center`

This is ONLY inside config panel headers, nowhere else.

## Styling Rules

- **Tailwind CSS exclusively.** No custom CSS files. Inline `style={{}}` only for computed values (e.g., dynamic widths from state) that can't be expressed in Tailwind.
- No hardcoded `px` in className strings if Tailwind has the equivalent.
- Use `transition-all duration-150` for hover states, `transition-all duration-200` for layout transitions.
- Prefer `gap-*` over individual margins for flex/grid spacing.
- `shrink-0` on all fixed-size elements inside flex containers.

## Structure Rules

- Keep components functional — no class components.
- Separate complex logic into custom hooks (`useMyFeature.js` in `hooks/`).
- No prop drilling more than 2 levels deep — use Zustand store slices.
- Co-locate component-specific sub-components (NavBtn, NodeCard) as inner functions or in the same file when they're only used there.
- Export one primary component per file as the default export.
