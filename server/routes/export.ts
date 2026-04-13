import type express from 'express'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { createPresentationsService } from '../services/presentations.js'
import type { createSlidesService } from '../services/slides.js'
import type { createGroupsService } from '../services/groups.js'

type PresentationsService = ReturnType<typeof createPresentationsService>
type SlidesService = ReturnType<typeof createSlidesService>
type GroupsService = ReturnType<typeof createGroupsService>
type ExportMode = 'player' | 'deck'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const EXPORT_ARTIFACT_VERSION = 1
const EXPORT_DATA_VERSION = 1

let cachedSourceCommit: string | null = null

function toVarName(codeId: string): string {
  return 'S' + codeId.replace(/-/g, '_')
}

function getSourceCommit(): string {
  if (cachedSourceCommit) return cachedSourceCommit

  try {
    cachedSourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      stdio: 'pipe',
    }).toString().trim()
  } catch {
    cachedSourceCommit = 'unknown'
  }

  return cachedSourceCommit
}

function parseExportMode(input: unknown): ExportMode {
  return input === 'deck' ? 'deck' : 'player'
}

function generateEntryFile(codeIds: string[], exportDataJson: string, exportMetaJson: string): string {
  const imports = codeIds.map(id => `import ${toVarName(id)} from '@/slides/${id}'`).join('\n')
  const entries = codeIds.map(id => `  '${id}': ${toVarName(id)},`).join('\n')

  return `\
import '@/index.css'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import type { SlideProps, ApiPresentation, ApiSlide, ApiSlideGroup } from '@/types'
import ExportViewer from '@/export-viewer'
${imports}

const __EXPORT_REGISTRY__: Record<string, ComponentType<SlideProps>> = {
${entries}
}
const __EXPORT_DATA__: { version: number; presentation: ApiPresentation; slides: ApiSlide[]; groups: ApiSlideGroup[] } = ${exportDataJson}
const __EXPORT_META__ = ${exportMetaJson}

Object.assign(window, { __EXPORT_REGISTRY__, __EXPORT_DATA__, __EXPORT_META__ })
createRoot(document.getElementById('root')!).render(<ExportViewer />)
`
}

function generateViteConfig(tempDir: string): string {
  return `\
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { '@': ${JSON.stringify(path.join(ROOT, 'src'))} } },
  build: {
    outDir: ${JSON.stringify(path.join(tempDir, 'dist'))},
    emptyOutDir: true,
    rollupOptions: { input: ${JSON.stringify(path.join(tempDir, 'index.html'))} },
  },
})
`
}

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Presentation</title>
<style>*{margin:0;padding:0;box-sizing:border-box}</style></head>
<body><div id="root"></div><script type="module" src="./entry.tsx"></script></body>
</html>`

function createExportWorkspace() {
  const tempDir = fs.mkdtempSync(path.join(ROOT, '.export-tmp-'))
  const configPath = path.join(tempDir, 'vite.config.export.ts')
  const entryPath = path.join(tempDir, 'entry.tsx')
  const indexPath = path.join(tempDir, 'index.html')
  const distHtmlPath = path.join(tempDir, 'dist', 'index.html')
  const nestedDistHtmlPath = path.join(tempDir, 'dist', path.relative(ROOT, indexPath))

  return { tempDir, configPath, entryPath, indexPath, distHtmlPath, nestedDistHtmlPath }
}

function cleanup(tempDir: string) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // Best-effort cleanup for ephemeral export workspaces.
  }
}

export function createExportHandler(
  presentationsService: PresentationsService,
  slidesService: SlidesService,
  groupsService: GroupsService,
): express.RequestHandler {
  return async (req, res, next) => {
    const pid = Number(req.params.pid)
    let tempDir: string | null = null

    try {
      const presentation = presentationsService.get(pid)
      let slides = slidesService.list(pid)
      let groups = groupsService.list(pid)
      const slideIds: number[] | undefined = req.body?.slideIds
      const exportMode = parseExportMode(req.body?.mode)
      if (Array.isArray(slideIds) && slideIds.length > 0) {
        const idSet = new Set(slideIds)
        slides = slides.filter(s => idSet.has(s.id))
        const retainedGroupIds = new Set(slides.map(s => s.group_id).filter((id): id is number => id != null))
        groups = groups.filter(g => retainedGroupIds.has(g.id))
      }
      const codeIds = slides.filter(s => s.kind === 'code' && s.code_id).map(s => s.code_id as string)
      const exportData = {
        version: EXPORT_DATA_VERSION,
        presentation,
        slides,
        groups,
      }
      const exportMeta = {
        artifactVersion: EXPORT_ARTIFACT_VERSION,
        dataVersion: EXPORT_DATA_VERSION,
        exportMode,
        exportedAt: new Date().toISOString(),
        sourceCommit: getSourceCommit(),
        sourcePresentationId: presentation.id,
        slideCount: slides.length,
      }
      const workspace = createExportWorkspace()
      tempDir = workspace.tempDir

      fs.writeFileSync(
        workspace.entryPath,
        generateEntryFile(codeIds, JSON.stringify(exportData), JSON.stringify(exportMeta)),
      )
      fs.writeFileSync(workspace.indexPath, HTML_TEMPLATE)
      fs.writeFileSync(workspace.configPath, generateViteConfig(workspace.tempDir))

      try {
        execFileSync('pnpm', ['exec', 'vite', 'build', '--config', workspace.configPath], {
          cwd: ROOT,
          stdio: 'pipe',
          timeout: 60_000,
        })
      } catch (buildErr: any) {
        const msg = buildErr?.stderr?.toString() || buildErr?.stdout?.toString() || 'unknown error'
        throw new Error(`Export build failed: ${msg}`)
      }

      const builtHtmlPath =
        fs.existsSync(workspace.distHtmlPath) ? workspace.distHtmlPath :
        fs.existsSync(workspace.nestedDistHtmlPath) ? workspace.nestedDistHtmlPath :
        null
      if (!builtHtmlPath) throw new Error('Export build produced no output')

      const html = fs.readFileSync(builtHtmlPath, 'utf-8')
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="${presentation.name}.html"`)
      res.send(html)
      cleanup(workspace.tempDir)
      tempDir = null
    } catch (err) {
      if (tempDir) cleanup(tempDir)
      next(err)
    }
  }
}
