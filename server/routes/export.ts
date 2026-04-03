import type express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { execSync } from 'child_process'
import type { createPresentationsService } from '../services/presentations.js'
import type { createSlidesService } from '../services/slides.js'

type PresentationsService = ReturnType<typeof createPresentationsService>
type SlidesService = ReturnType<typeof createSlidesService>

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const EXPORT_TMP = path.join(ROOT, '.export-tmp')

function toVarName(codeId: string): string {
  return 'S' + codeId.replace(/-/g, '_')
}

function generateEntryFile(codeIds: string[], presJson: string, slidesJson: string): string {
  const imports = codeIds.map(id => `import ${toVarName(id)} from '@/slides/${id}'`).join('\n')
  const entries = codeIds.map(id => `  '${id}': ${toVarName(id)},`).join('\n')

  return `\
import '@/index.css'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import type { SlideProps, ApiPresentation, ApiSlide } from '@/types'
import ExportViewer from '@/export-viewer'
${imports}

const __EXPORT_REGISTRY__: Record<string, ComponentType<SlideProps>> = {
${entries}
}
const __EXPORT_PRESENTATION__: ApiPresentation = ${presJson}
const __EXPORT_SLIDES__: ApiSlide[] = ${slidesJson}

Object.assign(window, { __EXPORT_REGISTRY__, __EXPORT_PRESENTATION__, __EXPORT_SLIDES__ })
createRoot(document.getElementById('root')!).render(<ExportViewer />)
`
}

function generateViteConfig(): string {
  return `\
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: '.export-tmp/dist',
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, '.export-tmp/index.html') },
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

function cleanup() {
  try { fs.rmSync(EXPORT_TMP, { recursive: true, force: true }) } catch {}
  try { fs.unlinkSync(path.join(ROOT, 'vite.config.export.ts')) } catch {}
}

export function createExportHandler(
  presentationsService: PresentationsService,
  slidesService: SlidesService,
): express.RequestHandler {
  return async (req, res, next) => {
    const pid = Number(req.params.pid)

    try {
      const presentation = presentationsService.get(pid)
      let slides = slidesService.list(pid)
      const slideIds: number[] | undefined = req.body?.slideIds
      if (Array.isArray(slideIds) && slideIds.length > 0) {
        const idSet = new Set(slideIds)
        slides = slides.filter(s => idSet.has(s.id))
      }
      const codeIds = slides.filter(s => s.kind === 'code' && s.code_id).map(s => s.code_id as string)

      // Generate temp files
      fs.mkdirSync(EXPORT_TMP, { recursive: true })
      fs.writeFileSync(path.join(EXPORT_TMP, 'entry.tsx'), generateEntryFile(codeIds, JSON.stringify(presentation), JSON.stringify(slides)))
      fs.writeFileSync(path.join(EXPORT_TMP, 'index.html'), HTML_TEMPLATE)
      fs.writeFileSync(path.join(ROOT, 'vite.config.export.ts'), generateViteConfig())

      // Run vite build
      try {
        execSync('npx vite build --config vite.config.export.ts', { cwd: ROOT, stdio: 'pipe', timeout: 60_000 })
      } catch (buildErr: any) {
        const msg = buildErr?.stderr?.toString() || buildErr?.stdout?.toString() || 'unknown error'
        throw new Error(`Export build failed: ${msg}`)
      }

      // Read + send
      // Vite preserves input directory structure, so output is nested
      const distHtml = path.join(EXPORT_TMP, 'dist', '.export-tmp', 'index.html')
      if (!fs.existsSync(distHtml)) throw new Error('Export build produced no output')

      const html = fs.readFileSync(distHtml, 'utf-8')
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="${presentation.name}.html"`)
      res.send(html)
      cleanup()
    } catch (err) {
      cleanup()
      next(err)
    }
  }
}
