import { defineAction } from "@agent-native/core";
import {
  THEME_NAMES,
  type ApiSlideTransition,
  type Block,
  type ThemeName,
} from "@llm-intro/api-contract";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import type { createSlidesService } from "../server/services/slides.js";
import type { createGroupsService } from "../server/services/groups.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;
type SlidesService = ReturnType<typeof createSlidesService>;
type GroupsService = ReturnType<typeof createGroupsService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

const blockInput = z.record(z.string(), z.unknown());
const transitionInput = z.record(z.string(), z.unknown()).nullable();
const portableThemeSchema = z.enum(THEME_NAMES as [ThemeName, ...ThemeName[]]);

const importDeckSchema = z.object({
  name: z.string().optional(),
  deck: z.object({
    name: z.string().optional(),
    theme: portableThemeSchema.optional(),
  }),
  groups: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        title: z.string(),
        position: z.coerce.number().int().nonnegative().optional(),
        collapsed: z.boolean().optional(),
      }),
    )
    .default([]),
  slides: z.array(
    z.object({
      id: z.coerce.number().int().positive().optional(),
      title: z.string(),
      kind: z.enum(["db", "code", "html"]).default("db"),
      codeId: z.string().nullable().optional(),
      groupId: z.coerce.number().int().positive().nullable().optional(),
      position: z.coerce.number().int().nonnegative().optional(),
      blocks: z.array(blockInput).default([]),
      html: z.string().optional(),
      notes: z.string().optional(),
      transition: transitionInput.optional(),
    }),
  ),
});

type ImportDeckInput = z.infer<typeof importDeckSchema>;
type DeckJsonServices = {
  presentationsService: PresentationsService;
  slidesService: SlidesService;
  groupsService: GroupsService;
};

function sortedByPosition<T extends { position?: number; id?: number }>(items: T[]) {
  return [...items].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.id ?? 0) - (b.id ?? 0),
  );
}

function exportDeckJson(services: DeckJsonServices, id: number) {
  const deck = services.presentationsService.get(id);
  const groups = services.groupsService.list(id);
  const slides = services.slidesService.list(id);
  return {
    version: 1,
    deck: { name: deck.name, theme: deck.theme },
    groups: groups.map((group) => ({
      id: group.id,
      title: group.title,
      position: group.position,
      collapsed: group.collapsed,
    })),
    slides: slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      kind: slide.kind,
      codeId: slide.code_id,
      groupId: slide.group_id,
      position: slide.position,
      blocks: slide.blocks,
      html: slide.html,
      notes: slide.notes,
      transition: slide.transition,
    })),
  };
}

function importDeckGroups(services: DeckJsonServices, deckId: number, source: ImportDeckInput) {
  const groupIdMap = new Map<number, number>();
  const groups = sortedByPosition(source.groups).map((group) => {
    const created = services.groupsService.create(deckId, group.title);
    groupIdMap.set(group.id, created.id);
    return group.collapsed === undefined
      ? created
      : services.groupsService.update(deckId, created.id, { collapsed: group.collapsed });
  });
  return { groupIdMap, groups };
}

function importDeckSlides(services: DeckJsonServices, deckId: number, source: ImportDeckInput) {
  const skippedCodeSlides: Array<{ title: string; codeId: string | null | undefined }> = [];
  const importedSlides = sortedByPosition(source.slides)
    .map((slide) => {
      if (slide.kind === "code") {
        skippedCodeSlides.push({ title: slide.title, codeId: slide.codeId });
        return null;
      }
      if (slide.kind === "html") {
        return {
          source: slide,
          created: services.slidesService.create(deckId, {
            kind: "html",
            title: slide.title,
            html: slide.html ?? "",
            notes: slide.notes ?? "",
            transition: slide.transition as ApiSlideTransition | null | undefined,
          }),
        };
      }
      return {
        source: slide,
        created: services.slidesService.create(deckId, {
          title: slide.title,
          blocks: slide.blocks as Block[],
          notes: slide.notes ?? "",
          transition: slide.transition as ApiSlideTransition | null | undefined,
        }),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return { importedSlides, skippedCodeSlides };
}

function importDeckJson(services: DeckJsonServices, input: unknown) {
  const source = importDeckSchema.parse(input);
  const deck = services.presentationsService.create({
    name: source.name?.trim() || source.deck.name?.trim() || "Imported deck",
    theme: source.deck.theme ?? "dark-green",
  });
  const { groupIdMap, groups } = importDeckGroups(services, deck.id, source);
  const { importedSlides, skippedCodeSlides } = importDeckSlides(services, deck.id, source);
  const ungrouped = importedSlides
    .filter(({ source: slide }) => !slide.groupId || !groupIdMap.has(slide.groupId))
    .map(({ created }) => created.id);
  const layoutGroups = sortedByPosition(source.groups).map((group) => ({
    id: groupIdMap.get(group.id)!,
    slideIds: importedSlides
      .filter(({ source: slide }) => slide.groupId === group.id)
      .map(({ created }) => created.id),
  }));

  if (importedSlides.length > 0 || groups.length > 0) {
    services.slidesService.applyLayout(deck.id, { ungrouped, groups: layoutGroups });
  }

  return {
    deck,
    groups: services.groupsService.list(deck.id),
    slides: services.slidesService.list(deck.id),
    skippedCodeSlides,
  };
}

export function createDeckJsonActions(services: DeckJsonServices) {
  return {
    "export-deck-json": defineAction({
      description: "Export a deck as portable typed JSON for import into this app.",
      schema: z.object({
        id: z.coerce.number().int().positive(),
      }),
      http: { method: "GET", path: "export-deck-json" },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Export deck JSON",
        description: "Export a deck as portable typed JSON for import into this app.",
      },
      run: ({ id }) => exportDeckJson(services, id),
    }),

    "import-deck-json": defineAction({
      description: "Import portable typed deck JSON as a new deck.",
      schema: importDeckSchema,
      http: { method: "POST", path: "import-deck-json" },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Import deck JSON",
        description: "Import portable typed deck JSON as a new deck.",
      },
      run: (input) => importDeckJson(services, input),
    }),
  };
}
