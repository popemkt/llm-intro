---
name: slide-authoring
description: Use when creating, editing, or debugging code-backed slides in src/slides/. Enforces the 1000×562.5 logical canvas, safe unit choices, the registry pattern, and SlideProps contract so slides render identically across overview, presentation, and fullscreen modes.
---

# Slide authoring (code-backed slides)

This deck renders every code slide inside `SlideShell`, which hosts a fixed **1000×562.5 logical canvas** (16:9) and scales it to fill the parent via `transform: scale()`. Your slide is the content of that canvas. Because of this, every slide must be *resolution-independent relative to the canvas*, not the browser viewport.

## File + registration

1. Create `src/slides/NN-name.tsx` — pad `NN` to 2 digits; ordering is cosmetic, positioning comes from the DB.
2. Export default a `React.FC<SlideProps>` that accepts `{ isActive: boolean }`.
3. Import + add it to `src/slides/registry.ts`:
   ```ts
   import NewThing from './11-new-thing'
   export const codeSlideRegistry = {
     // ...
     '11-new-thing': NewThing,
   }
   ```
4. To make it appear in the seeded system deck, also add to `BUILT_IN_SLIDES` in `server/db.ts`. Otherwise it's available as a code slide users can pick from the editor.

## The canvas contract

- Your slide renders into a `1000 × 562.5` box. Author with that coordinate system in mind.
- Root element: `width: '100%', height: '100%'` — fills the canvas. **Don't** set a fixed width/height on the root.
- `position: relative` on the root if you need absolute children, so they're scoped to the canvas.

## Units — what's safe, what's not

| Unit | Inside canvas? | Why |
|---|---|---|
| `px` | ✅ Safe | Authored in logical px; the 1000×562.5 canvas is scaled uniformly. A 48px heading is always "48 canvas px". |
| `%` | ✅ Safe | Relative to parent element, which is already scoped inside the canvas. |
| `rem` | ⚠️ Works but *doesn't scale* with the canvas. Root font-size is window-relative, not canvas-relative, so `2rem` stays 32 real px at every canvas size. Use px inside slides for predictable scaling. |
| `em` | ✅ Safe | Relative to own/parent font-size, so it scales with whatever you set in px. |
| `flex` / `grid` / `fr` | ✅ Safe | Proportional to parent. Preferred for layout. |
| `vh` / `vw` / `vmin` / `vmax` | ❌ **DANGEROUS** | These refer to the **real browser viewport**, not the 1000×562.5 canvas. `100vh` ≠ `562.5px`. Using viewport units bypasses the scale transform and your slide will break differently in overview vs fullscreen. |
| `cqw` / `cqh` | ⚠️ Only if you explicitly set `container-type` on the slide root. Otherwise behaves like viewport units. Prefer `%` — simpler, same effect. |

## Pitfalls — hit list

### 1. Viewport units inside the canvas
`height: '100vh'` or `fontSize: '2vw'` anywhere in a code slide means it'll render at one size in the overview thumbnail, another in presentation mode, another in fullscreen. **Never use `vh`/`vw`/`vmin`/`vmax` inside a code slide.** Use `%` for fill, `px` for fixed sizes.

### 2. Assuming the window is the stage
Don't read `window.innerWidth`, `document.documentElement.clientHeight`, or use `useWindowSize`-style hooks. They report the browser viewport, not the canvas. If you need your own dimensions, measure the slide root with `ResizeObserver` on a ref — but you usually don't, because the canvas is always 1000×562.5.

### 3. Portals and fixed-position overlays
`position: fixed` elements escape the `transform: scale()` parent and render at real pixel sizes. Avoid `position: fixed` inside slides. Same for `ReactDOM.createPortal` to `document.body` — the content loses the canvas scale. Use `position: absolute` scoped to the slide root.

### 4. Framer Motion `layoutId` and shared layout
Shared-layout animations cross slide boundaries via `AnimatePresence`, and the source/target slides may be at different scales during a transition. If you need shared layout, keep both source and target inside the same canvas (same slide) or expect minor visual pops.

### 5. Images and raster assets
SVG scales perfectly. Raster images (PNG/JPG) can blur on fractional scale factors. Author them at 2× the authored px size (e.g. a 400px-wide slot gets an 800px-wide PNG) and let the browser downscale. Or use SVG.

### 6. Text selection and hit testing
`transform: scale()` preserves hit testing, but some CSS (e.g. `backdrop-filter`, `filter: blur`) can render subtly differently on fractional scales. Test your slide at non-integer scales (resize the browser) not just full-width.

### 7. Hard-coded line breaks
Don't hand-break text to fit a specific window size — the canvas is fixed, so once you've authored it at 1000 wide, breaks are stable. But if you later change the canvas size, hand-breaks stop working.

### 8. Canvas-breaking overflow
Content overflowing the 1000×562.5 box is clipped by `SlideShell`'s `overflow: hidden`. If you see your slide getting cut off, your content is outside the canvas. Don't chase it with negative margins — fix the root element size or the child layout.

### 9. Animation timing vs `isActive`
The `isActive` prop tells you whether the slide is currently the focused one in presentation mode. Drive heavy animations off this — don't run them in overview (thumbnail) to save CPU. Typical pattern:
```tsx
<motion.div animate={isActive ? { opacity: 1 } : { opacity: 0 }} />
```
Overview renders `isActive={false}`; presentation/fullscreen render `isActive={true}` for the focused slide only.

### 10. Skipping the registry
If you add a `.tsx` under `src/slides/` but forget `registry.ts`, it won't render — the export is by `code_id` key, not by file system scan.

### 11. `getBoundingClientRect` inside the scaled canvas
`getBoundingClientRect()` returns **post-transform** coordinates. Inside `SlideShell`'s `transform: scale(s)` canvas, every rect is already multiplied by `s`. If you feed those values back into CSS `left`/`top`/`width`/`height` in px, you double-scale (px values get scaled *again* by the canvas transform) and elements drift off their intended spots.

**Safe patterns:**
- **Percentages relative to the container.** Compute `(measured / containerMeasured) * 100%`. Scale cancels out numerator and denominator, so the ratio is logical-space. Assign as `left: ${pct}%`. Offsets like "center this 12px dot" go in a sibling `transform: translate(-6px,-6px)` which lives in the canvas's logical space.
- **SVG coordinates.** Position things as SVG children with a `viewBox` — the SVG element handles its own coordinate mapping regardless of outer scale.
- **`offsetLeft` / `offsetTop`** on HTML elements — these are pre-transform and can be used directly. (SVG elements don't have them.)

**Framer Motion `layoutId` / `layout` animations** internally use `getBoundingClientRect` deltas and have the same problem. `SlideShell` already compensates via `MotionConfig.transformPagePoint`, so shared-layout animations work as expected inside the canvas — but if you add your own manual layout math (e.g. FLIP animations, manual `animate` with measured positions), apply the same percentage/SVG trick.

**Rule of thumb:** if you're writing code that reads DOM measurements *and* writes them back as px, you have the bug. Switch to ratios, viewBox, or `offsetLeft`.

## Quick starter

```tsx
import type { SlideProps } from '@/types'
import { motion } from 'motion/react'
import { T } from '@/design/tokens'

export default function MySlide({ isActive }: SlideProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: T.bg,
        color: T.text,
        fontFamily: 'Inter, sans-serif',
        padding: 48,           // logical px inside the 1000×562.5 canvas
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.4 }}
        style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        Title here
      </motion.h1>
      <div style={{ fontSize: 20, color: T.textDim, lineHeight: 1.6 }}>
        Body copy. Everything is `px` relative to a 1000×562.5 canvas.
      </div>
    </div>
  )
}
```

## When in doubt

- Test the slide in **all three modes** (overview thumbnail, presentation, fullscreen). If it looks identical, you're good. If it shifts, you probably used `vh`/`vw` or `position: fixed`.
- Open DevTools and inspect `SlideShell`'s inner div — it should always be `1000 × 562.5` with a `scale(...)` transform. Your slide is its child.
