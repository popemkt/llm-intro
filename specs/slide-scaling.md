# Slide scaling approaches

Problem: code-backed slides shift between overview, presentation, and fullscreen modes because they render directly into their container without a fixed coordinate system. DB slides already use a canvas, so they're stable. We need the same guarantee for code slides.

## Approach A — fixed logical canvas + `transform: scale()`

Render every slide (code + db) into a 1000×562.5 box. The viewport wrapper computes `scale = containerWidth / 1000` and applies `transform: scale(s)` to the 1000×562.5 inner div.

```tsx
<div ref={outer} style={{ position: 'relative', paddingBottom: '56.25%' }}>
  <div style={{
    position: 'absolute', top: 0, left: 0,
    width: 1000, height: 562.5,
    transform: `scale(${scale})`, transformOrigin: 'top left',
  }}>
    <Slide />
  </div>
</div>
```

- **Drop-in.** Existing slides are already authored at ~1000-wide (OverviewGrid already scales them at 1000×562.5). Presentation/fullscreen would just need the same wrapper.
- Author slides in plain `px`. Third-party components (lucide, motion, etc.) work unchanged.
- Everything inside the canvas is invariant to viewport size — layout, fonts, gaps, animations all scale uniformly.
- Minor caveat: fractional scale factors can blur raster content. Modern browsers handle this well; SVG and vector text stay crisp.

**Why 1000×562.5?** Arbitrary — 1000 is a round width, `562.5 = 1000 × 9/16` for 16:9. Could equally be 1920×1080 (reveal.js default) or 1280×720. The number only affects the px values you type inside slides. Keeping 1000 avoids rewriting existing code slides.

**Used by:** reveal.js, impress.js, Google Slides web, Keynote web. This is the canonical fix for slide decks and every fixed-aspect web artifact.

## Approach B — container query units (`cqw`/`cqh`)

Author every dimension inside a slide in container-relative units. `1cqw = 1% of container width`. An element with `font-size: 2cqw` is always 2% of the container's width regardless of how the container itself is sized.

```css
.slide-container { container-type: inline-size; aspect-ratio: 16/9; }
.title { font-size: 4cqw; padding: 2cqw 3cqw; }
```

- **Invasive.** Every `px`, `rem`, `font-size`, `gap`, `padding` in every slide (and every third-party component inside) must be in `cqw`/`cqh`. Anything that ships in `px` (lucide icons, motion default durations, inline SVG strokes) breaks the illusion.
- Fonts stay crisp at every size (no transform blur).
- Native text selection/cursor positioning remain accurate — no scaled bounding boxes.
- Works best when you're authoring from scratch and own every component.

**Also in this family:** `aspect-ratio: 16/9` + `cqw`, SVG `viewBox` (perfect scaling but SVG-only).

## Recommendation

Start with **Approach A**. It's drop-in (wrap existing slides, done), industry-standard, and solves the immediate problem without touching slide code. If we later want crisper text at large sizes or run into transform-scale quirks (hover hitboxes, focus rings on fractional scales), revisit Approach B for specific slides.
