import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";

// Reuse the framework's own iframe host builder rather than reimplementing it,
// so the sandbox HTML + postMessage bridge match the client components
// (ExtensionViewer / EmbeddedExtension) exactly. html-shell.js has no imports,
// so loading it on the server pulls in no React/DOM code. It isn't an exported
// subpath, but it sits next to one that is (extensions/url-safety), so we
// resolve that and read the sibling — no hard-coded pnpm path.
const require = createRequire(import.meta.url);
const extensionsDistDir = path.dirname(require.resolve("@agent-native/core/extensions/url-safety"));
const htmlShellUrl = pathToFileURL(path.join(extensionsDistDir, "html-shell.js")).href;

type BuildExtensionHtml = (
  content: string,
  themeVars: string,
  isDark: boolean,
  extensionId: string,
  binding?: unknown,
) => string;

let cachedBuilder: BuildExtensionHtml | null = null;

async function getBuilder(): Promise<BuildExtensionHtml> {
  if (!cachedBuilder) {
    const mod = (await import(htmlShellUrl)) as { buildExtensionHtml: BuildExtensionHtml };
    cachedBuilder = mod.buildExtensionHtml;
  }
  return cachedBuilder;
}

export async function renderExtensionHostHtml(opts: {
  content: string;
  extensionId: string;
  isDark: boolean;
}): Promise<string> {
  const build = await getBuilder();
  // Local single-user server: the viewer is always the owner/author, so pass the
  // default owner binding (undefined → owner/isAuthor in the builder).
  return build(opts.content, "", opts.isDark, opts.extensionId, undefined);
}
