import { T } from "@/design/tokens";

/**
 * Brand mark — a deck of slides: a dim back slide behind a solid accent front
 * slide with a "present" triangle punched out of it. Reads as a slide deck at
 * 16px and scales cleanly. Replaces the generic sparkle chip.
 */
export function SlidesMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="Slides">
      {/* back slide — sits behind, offset up-right */}
      <rect x="8" y="3" width="13" height="10" rx="2.6" stroke={T.accentDim} strokeWidth="1.7" />
      {/* front slide — solid accent */}
      <rect x="3" y="8" width="13" height="10" rx="2.6" fill={T.accent} />
      {/* present triangle punched out of the front slide */}
      <path d="M7.6 10.4v5.2l4.6-2.6z" fill={T.bg} />
    </svg>
  );
}
