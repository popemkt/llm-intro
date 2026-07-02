---
name: motion-react
description: Use when animating React slides with motion/react (Framer Motion). The reliable subset, the potholes (layoutId, AnimatePresence, resize replays), and copy-paste recipes for staged reveals, accordions, list stagger, shared-element morphs, and SVG particle bursts.
---

# motion/react for slides — reliable patterns

Motion is powerful but the failure modes are predictable. Stick to the reliable
subset below; reach for `layoutId` only for a true morph, and always with
`AnimatePresence`.

There is **no official Motion `llms.txt`/skill** (motion.dev does not publish one).
This file is the distilled house knowledge — keep it current when you learn a new
pothole.

## The reliable subset (agents handle these well)

- **Staged reveal by state** — a `step`/`phase` number; gate each element with
  `animate={visible ? {opacity:1,y:0} : {opacity:0,y:12}}`. Deterministic, debuggable.
- **`variants` + `staggerChildren`** — for "appear one by one" lists.
- **`AnimatePresence`** — for mount/unmount (lists, accordions, swaps). Required
  for `exit` AND for `layoutId` morphs.
- **Plain `animate` of `opacity` / `x` / `y` / `scale` / `rotate`** — cheap, robust.
- **`height: 0 → "auto"`** inside `AnimatePresence` + `overflow:hidden` — accordions.

## Potholes (these bit us — avoid)

1. **`layoutId` morph with no `AnimatePresence` = teleport.** A shared-element
   morph needs both the old and new node alive in the same commit so Motion can
   measure. Conditionally swapping `cond ? <A layoutId/> : <B layoutId/>` without
   `AnimatePresence` makes the element **jump**. Wrap the swap in
   `<AnimatePresence mode="popLayout">` and keep the SAME `layoutId`.
2. **`layout` AND `layoutId` re-animate on ANY resize.** Any layout-tracked
   element (the `layout` prop OR `layoutId` — `layoutId` implies layout tracking)
   re-projects whenever its box changes. In a scaled canvas (`SlideShell` sets
   `transform: scale()`), the box changes on EVERY rescale — preview bottom bar
   autohiding, window resize — so the element re-animates and "the slide replays."
   This is state-independent: persisting React state will NOT fix it. If a slide's
   intro replays on resize, hunt for a `layout`/`layoutId` wrapper and remove it.
   When the two morph endpoints sit at the same logical coords, a plain `<div>` +
   the deck's fade transition match-cuts just as well with no replay. Use `layout`
   only for a self layout change you actually want animated (e.g. center→top on
   click) — and know it will also fire on resize.
3. **Element-type swap remounts → entrance replays.** Switching
   `entering ? <motion.g/> : <g/>` changes the element type → React remounts →
   the intro animation fires again on every re-render. Keep it **always**
   `motion.g` and set `initial={entering ? {...} : false}` instead.
4. **Entrance tied to `isActive` replays.** If `isActive` toggles (focus, preview
   chrome), an `initial→animate` keyed off it re-fires. Drive one-time intros off a
   **one-shot flag** set once (e.g. on first reveal), not `isActive`.
5. **Animating `fontSize` across a `layoutId` morph snaps.** Layout morph tweens
   the box, not CSS `font-size`. Keep the font-size the SAME on both sides so the
   morph only *moves* the element.
6. **`Math.random()` / `Date.now()` are fine in slide components** (browser
   runtime) — only Workflow scripts forbid them.

## Recipes

### Shared-element morph (word flies to a new place), done right
```tsx
<LayoutGroup>
  <AnimatePresence mode="popLayout">
    {!moved ? (
      <motion.div key="a" exit={{ opacity: 0 }}>
        …<motion.span layoutId="kw" layout transition={{ layout:{ duration:1, ease } }}>AI</motion.span>…
      </motion.div>
    ) : (
      <motion.div key="b">
        …<motion.span layoutId="kw" layout transition={{ layout:{ duration:1, ease } }}>AI</motion.span>…
      </motion.div>
    )}
  </AnimatePresence>
</LayoutGroup>
```
Sequence the rest with a phase machine: fade others → (timeout) mount target so
the keyword morphs alone → (timeout) reveal the new context. One thing fully in
place before the next.

### Accordion / expandable
```tsx
<AnimatePresence initial={false}>
  {open && (
    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
      exit={{ height:0, opacity:0 }} transition={{ duration:0.35, ease }} style={{ overflow:"hidden" }}>
      …
    </motion.div>
  )}
</AnimatePresence>
```

### One-shot entrance (no replay on resize)
```tsx
const [building, setBuilding] = useState(false);
const reveal = () => { setRevealed(true); setBuilding(true); };
useEffect(() => { if(!building) return; const t=setTimeout(()=>setBuilding(false), 2800); return ()=>clearTimeout(t); }, [building]);
// pass entrance={building}; inside, always render motion.g with initial={entrance ? {...} : false}
```

### SVG particle burst ("poof"), shaped to the object
A spoke = a fixed-length dash sliding outward via `stroke-dasharray` + animated
`stroke-dashoffset` (both ends travel; no grow-from-center, no lingering dot —
make the gap > line length so only one dash exists, and slide past the end:
`offset: L → -(len+L)`). Pass `pts` of `{x,y,a}` sampled along an outline (normal
angle `a`) to wrap an arbitrary shape; default is a radial ring. See
`apps/slides/src/slides/harness/_frame.tsx` `BurstLines`.

## Gate heavy work
Pause loops/intervals/expensive motion when `isActive` is false. Clean up timers
in `useEffect` returns.

## When NOT to use motion/react
If a sequence is fully deterministic and **non-interactive** (a cinematic that
would be exported to video), motion/react is fine but a video pipeline
(HyperFrames) is an alternative. Interactivity (click/hover/expand/drag) ⇒ stay in
motion/react; video can't do it.
