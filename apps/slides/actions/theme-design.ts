import { defineAction } from "@agent-native/core";
import { THEME_META, THEME_NAMES, type ThemeName } from "@llm-intro/api-contract";
import { z } from "zod";
import type { createPresentationsService } from "../server/services/presentations.js";
import { writeApplicationState } from "../server/application-state-store.js";
import { AppError } from "../server/errors.js";

type PresentationsService = ReturnType<typeof createPresentationsService>;

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

const themeSchema = z.enum(THEME_NAMES as [ThemeName, ...ThemeName[]]);
const applyTargetSchema = z.enum(["deck", "app", "both"]);

const DESIGN_SYSTEMS = [
  {
    id: "signal-console",
    name: "Signal Console",
    theme: "dark-green",
    description: "Dark terminal-green deck styling for technical walkthroughs.",
  },
  {
    id: "midnight-workbench",
    name: "Midnight Workbench",
    theme: "dark-blue",
    description: "Cool dark-blue interface styling for operational demos.",
  },
  {
    id: "clean-briefing",
    name: "Clean Briefing",
    theme: "light",
    description: "Minimal light briefing style for dense slide reviews.",
  },
  {
    id: "neon-lab",
    name: "Neon Lab",
    theme: "neon",
    description: "High-contrast neon styling for expressive concept slides.",
  },
  {
    id: "warm-studio",
    name: "Warm Studio",
    theme: "warm",
    description: "Warm dark styling for narrative presentations.",
  },
  {
    id: "ocean-system",
    name: "Ocean System",
    theme: "ocean",
    description: "Deep teal styling for calm product and architecture decks.",
  },
] as const satisfies Array<{
  id: string;
  name: string;
  theme: ThemeName;
  description: string;
}>;

type DesignSystemId = (typeof DESIGN_SYSTEMS)[number]["id"];

const designSystemSchema = z.enum(
  DESIGN_SYSTEMS.map((system) => system.id) as [DesignSystemId, ...DesignSystemId[]],
);

function themeCatalog() {
  return THEME_NAMES.map((name) => ({ name, ...THEME_META[name] }));
}

function designSystemCatalog() {
  return DESIGN_SYSTEMS.map((system) => ({
    ...system,
    themeMeta: THEME_META[system.theme],
    storage: "built-in",
  }));
}

function queueAppTheme(theme: ThemeName) {
  const command = {
    theme,
    _writeId: `app-theme-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  writeApplicationState("app-theme-command", command);
  return command;
}

function getDesignSystem(systemId: DesignSystemId) {
  const system = DESIGN_SYSTEMS.find((item) => item.id === systemId);
  if (!system) throw new AppError(400, "design system is invalid");
  return system;
}

export function createThemeDesignActions(presentationsService: PresentationsService) {
  return {
    "get-theme-catalog": defineAction({
      description:
        "List the app's supported theme names, labels, and descriptions for shell and slide theming.",
      schema: z.object({}),
      http: {
        method: "GET",
        path: "get-theme-catalog",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "Get theme catalog",
        description:
          "List the app's supported theme names, labels, and descriptions for shell and slide theming.",
      },
      run: () => ({
        themes: themeCatalog(),
        defaultTheme: "dark-green" satisfies ThemeName,
        notes: [
          "App shell theme is stored in the browser and applied through data-app-theme.",
          "Slide deck theme is stored per deck and applied through the deck theme field.",
        ],
      }),
    }),

    "list-design-systems": defineAction({
      description:
        "List built-in design systems that map Agent-Native-style design choices to this app's theme model.",
      schema: z.object({}),
      http: {
        method: "GET",
        path: "list-design-systems",
      },
      requiresAuth: false,
      readOnly: true,
      publicAgent: {
        ...publicReadAction,
        title: "List design systems",
        description:
          "List built-in design systems that map Agent-Native-style design choices to this app's theme model.",
      },
      run: () => ({
        designSystems: designSystemCatalog(),
        notes: [
          "Design systems are stored as built-in theme mappings for now.",
          "Applying a design system updates the deck theme and can queue the app shell theme.",
        ],
      }),
    }),

    "apply-design-system": defineAction({
      description:
        "Apply a built-in design system to a deck theme, the open app shell theme, or both.",
      schema: z.object({
        systemId: designSystemSchema,
        deckId: z.coerce.number().int().positive().optional(),
        target: applyTargetSchema.optional(),
      }),
      http: {
        method: "POST",
        path: "apply-design-system",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Apply design system",
        description:
          "Apply a built-in design system to a deck theme, the open app shell theme, or both.",
      },
      run: ({ systemId, deckId, target = "deck" }) => {
        const system = getDesignSystem(systemId);
        const shouldApplyDeck = target === "deck" || target === "both";
        const shouldApplyApp = target === "app" || target === "both";

        if (shouldApplyDeck && !deckId) {
          throw new AppError(400, "deckId is required when applying a design system to a deck");
        }

        const deck = shouldApplyDeck
          ? presentationsService.update(deckId as number, { theme: system.theme })
          : null;
        const appThemeCommand = shouldApplyApp ? queueAppTheme(system.theme) : null;

        return {
          designSystem: {
            ...system,
            themeMeta: THEME_META[system.theme],
          },
          target,
          deck,
          appThemeCommand,
        };
      },
    }),

    "set-app-theme": defineAction({
      description: "Apply an app shell theme in the open browser session.",
      schema: z.object({
        theme: themeSchema,
      }),
      http: {
        method: "POST",
        path: "set-app-theme",
      },
      requiresAuth: false,
      publicAgent: {
        ...publicWriteAction,
        title: "Set app theme",
        description: "Apply an app shell theme in the open browser session.",
      },
      run: ({ theme }) => {
        const command = queueAppTheme(theme);
        return { queued: true, command };
      },
    }),
  };
}
