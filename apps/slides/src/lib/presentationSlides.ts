import { codeSlideRegistry } from "@/slides/registry";
import type { ApiPresentation, ApiSlide, UnifiedSlide } from "@/types";

export function toUnifiedSlide(slide: ApiSlide, theme: ApiPresentation["theme"]): UnifiedSlide {
  const groupId = slide.group_id ?? null;
  if (slide.kind === "code") {
    const component = codeSlideRegistry[slide.code_id ?? ""];
    if (!component) {
      console.warn(`Unknown code_id: ${slide.code_id}`);
      return {
        kind: "db",
        id: slide.id,
        groupId,
        title: slide.title,
        notes: slide.notes,
        blocks: [],
        theme,
      };
    }
    return {
      kind: "code",
      id: slide.id,
      groupId,
      title: slide.title,
      notes: slide.notes,
      component,
    };
  }
  return {
    kind: "db",
    id: slide.id,
    groupId,
    title: slide.title,
    notes: slide.notes,
    blocks: slide.blocks,
    theme,
  };
}
