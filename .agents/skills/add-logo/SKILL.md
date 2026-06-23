---
description: Add or fix a brand logo SVG for a Blinkbox node or trigger. Handles sourcing, crafting, and wiring it up correctly.
---

You are adding or fixing a brand logo for a node in Blinkbox.

## The "No Membrane" Rule

**Raw icon only. No backgrounds.**

Never generate SVGs with:
- `<rect>` elements serving as backgrounds
- `<circle>` elements serving as backgrounds  
- Any filled shape behind the logo mark

The SVG should be ONLY the logo mark/wordmark itself, transparent background.

## Logo Quality Standards

- **Colored**: Must use the brand's actual colors, not monochrome
- **Transparent background**: No white or dark fills
- **Vector only**: SVG preferred over PNG
- **Clean viewBox**: Use the natural size (e.g. `viewBox="0 0 24 24"`)
- **Visible on dark**: If the logo is dark/black, add `imgFilter: 'invert(1)'` in the registry entry

## Known Good Sources (MIT/Free)

1. **n8n nodes-base assets** (MIT licensed) — best source for SaaS app logos
   - Path pattern: `packages/nodes-base/nodes/AppName/AppName.svg` in the n8n repo
2. **Simple Icons** — monochrome only, not suitable for colored logos
3. **Hand-craft** — for unique logos, craft the SVG path manually

## Hand-Crafting SVG Guidelines

When crafting from scratch:
1. Start with `viewBox="0 0 40 40"` (40px canvas gives room for curves)
2. Use the brand's hex color directly in `fill=""`
3. For letter-mark logos (P, B, etc.): use `<text>` or explicit path — NOT a clipped `<circle>` that makes letters look wrong
4. Test mentally: does the path stay within the viewBox bounds?

Example — correct P lettermark:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <path fill="#FF6314" d="M8 6h14c5.5 0 9 3 9 8s-3.5 8-9 8H14v12H8V6zm6 5v6h7c2 0 3.5-1 3.5-3s-1.5-3-3.5-3H14z"/>
</svg>
```

## Steps to Add a Logo

1. **Save the SVG** to `apps/frontend/src/assets/appname.svg`
2. **Verify content**: Read the file — confirm no background rects, correct colors
3. **Import in nodeRegistry.js**: `import imgAppName from '../../assets/appname.svg'`
4. **Add to registry entry**:
   ```js
   myNode: {
     logoUrl: imgAppName,
     // imgFilter: 'invert(1)',  // only if logo is dark
   }
   ```
5. **Import in triggerVariants.js** if it's a trigger app too
6. **Commit both** the SVG and the registry change in one commit

## Fixing Broken Logos

If a logo appears white/invisible:
- Check: does the SVG have `fill="white"` or `fill="#fff"` paths? → It was accidentally whitewashed
- Fix: restore from git with `git checkout HEAD~N -- apps/frontend/src/assets/broken.svg`
- Or: rewrite the SVG with correct brand colors

If a logo appears as a dark box:
- Check: does the SVG have a `<rect>` background? → Violates "no membrane" rule
- Fix: delete the `<rect>` element, keep only the logo paths

## After Adding

Commit: `Add [AppName] logo — colored SVG, no background`
Push immediately.
