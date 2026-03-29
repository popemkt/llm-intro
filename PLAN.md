# LLM Intro — Slide App Plan

Interactive slide presentation for introducing LLM/agent concepts to non-technical audiences (economics background). Goal: audience leaves knowing enough to build Claude skills for browser-based automation (e.g. uploading files to a site via Playwright).

---

## Architecture

Two modes in a single React app:
- **Overview** — PowerPoint-style thumbnail grid; click a slide to enter presentation mode
- **Presentation** — full-screen, arrow-key navigation (←→ or ↑↓), ESC to return to overview

Each slide is a self-contained React component in `src/slides/XX-name.tsx`. Registering a new slide = one import + one line in `src/slides/index.ts`.

---

## Tech Stack

| Tool | Role |
|------|------|
| Vite 6 + `@vitejs/plugin-react` | Build + dev server |
| React 19 + TypeScript | UI |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Styling — no `tailwind.config.js`, just `@theme` in CSS |
| `motion` v12 (`motion/react`) | Animations — formerly framer-motion |
| `lucide-react` | Icons |
| Custom design system (`src/design/`) | No shadcn/tweakcn |

---

## Design Tokens (dark terminal × signal green)

```
bg:           #0d0f0e
surface:      #141a17
border:       #1f2d27
muted:        #3a4d42
text:         #e8f0eb
text-dim:     #7a9985
accent:       #25d366   ← WhatsApp / Claude green
accent-dim:   #1a9448
highlight:    #00ffa3
```

---

## File Structure

```
src/
  main.tsx
  App.tsx                      ← mode state, keyboard handler
  index.css                    ← @import tailwindcss + @theme tokens
  types.ts                     ← SlideDefinition, SlideProps
  design/
    tokens.ts                  ← JS constants for inline SVG colours
    Card.tsx
    Badge.tsx
    AnimBox.tsx                ← motion.div entrance wrapper
    FlowNode.tsx               ← SVG rect+text for diagrams
    FlowArrow.tsx              ← animated SVG path connector
  lib/
    regression.ts              ← OLS computation
    utils.ts                   ← cn()
  components/
    SlideShell.tsx             ← 16:9 aspect-ratio wrapper
    OverviewGrid.tsx           ← thumbnail grid (ResizeObserver scale)
    PresentationView.tsx       ← full-screen + directional transitions
  slides/
    index.ts                   ← registry
    01-opener.tsx
    02-linear-regression.tsx
    03-tool-use.tsx
    04-claude-desktop.tsx
    05-browser-control.tsx
    06-workspace-setup.tsx
    07-workspace-concepts.tsx
    08-appendix.tsx
```

---

## Slide Content

| # | Title | Key visual |
|---|-------|------------|
| 1 | What is an LLM? | Animated conic-gradient BG, floating particles, staggered question text |
| 2 | Linear Regression → LLM | **Interactive** SVG scatter plot with OLS line (drag/add/remove points) → token prediction loop animation |
| 3 | Tool Use / Agent Loop | Animated SVG flow diagram: User → LLM → Output → Pattern Match → Tool Executor → back to LLM |
| 4 | Claude Desktop | "Package" box that opens to reveal inner components; click chips for tooltips |
| 5 | Browser Control | Two-col: loop diagram (Claude↔Playwright↔Browser) + step-by-step upload animation |
| 6 | Workspace Setup | Animated file-tree building `~/.claude/` folder structure |
| 7 | Workspace Concepts | 2×2 card grid: Prompts / Skills / Plugins (MCP) / Memories; hover shows snippet |
| 8 | Appendix | Decision-flow: Skill dev → stable → n8n automation pipeline |

---

## Slide Registry Contract

```ts
// src/types.ts
interface SlideProps {
  isActive: boolean  // gates entrance animations; false in overview thumbnails
}
interface SlideDefinition {
  id: number
  title: string
  component: React.ComponentType<SlideProps>
}
```

**To add a new slide:**
1. Create `src/slides/NN-name.tsx` exporting a `React.FC<SlideProps>`
2. Add one import + one object to `src/slides/index.ts`

---

## Key Implementation Notes

- **Thumbnail scaling**: each slide authored at 1000×562.5px logical size; `ResizeObserver` computes `scale = containerWidth / 1000`; inner div is `position:absolute; width:1000px; transform:scale(N); transformOrigin:top left; pointer-events:none`
- **Directional transitions**: `direction` ref (1 / -1) + `custom` prop on `AnimatePresence` motion.div
- **Anti-stutter**: `isTransitioning` ref; keydown no-ops while true; cleared in `onAnimationComplete`
- **SVG drag**: `svg.setPointerCapture(e.pointerId)` keeps events even when cursor leaves SVG
- **No Tailwind dynamic class concatenation**: use `style={}` for computed values (depth indentation etc.)
- **No `layout` prop inside scaled thumbnails**: breaks `getBoundingClientRect`
- **OLS null guard**: `computeOLS` returns `null` for <2 points; all renderers must check

---

## OLS Formula

```
m = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
b = (Σy − m·Σx) / n
R² = 1 − SSres / SStot
```
