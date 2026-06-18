import { defineAction } from "@agent-native/core";
import { THEME_META, THEME_NAMES, type ThemeName } from "@llm-intro/api-contract";
import { z } from "zod";
import { writeApplicationState } from "../server/application-state-store.js";

const publicReadAction = { expose: true, readOnly: true, requiresAuth: false };
const publicWriteAction = {
  expose: true,
  readOnly: false,
  requiresAuth: false,
  isConsequential: true,
};

const themeSchema = z.enum(THEME_NAMES as [ThemeName, ...ThemeName[]]);

function themeCatalog() {
  return THEME_NAMES.map((name) => ({ name, ...THEME_META[name] }));
}

export function createThemeDesignActions() {
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
        const command = {
          theme,
          _writeId: `app-theme-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        writeApplicationState("app-theme-command", command);
        return { queued: true, command };
      },
    }),
  };
}
