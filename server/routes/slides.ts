import { Router } from 'express'
import { db } from '../db.js'

export const slidesRouter = Router({ mergeParams: true })

type SlideRow = {
  id: number; presentation_id: number; position: number
  kind: 'code' | 'db'; code_id: string | null
  title: string; blocks: string
  created_at: string; updated_at: string
}

const fmt = (r: SlideRow) => ({ ...r, blocks: JSON.parse(r.blocks) })

slidesRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM slides WHERE presentation_id=? ORDER BY position').all(req.params.pid) as SlideRow[]
  res.json(rows.map(fmt))
})

slidesRouter.post('/', (req, res) => {
  const pid = Number(req.params.pid)
  if (!db.prepare('SELECT id FROM presentations WHERE id=?').get(pid)) {
    res.status(404).json({ error: 'presentation not found' }); return
  }
  const { title = 'New slide', blocks = [] } = req.body as { title?: string; blocks?: unknown[] }
  const { m } = db.prepare('SELECT MAX(position) as m FROM slides WHERE presentation_id=?').get(pid) as { m: number | null }
  const { lastInsertRowid } = db.prepare(
    "INSERT INTO slides (presentation_id, position, kind, title, blocks) VALUES (?, ?, 'db', ?, ?)"
  ).run(pid, (m ?? -1) + 1, title, JSON.stringify(blocks))
  res.status(201).json(fmt(db.prepare('SELECT * FROM slides WHERE id=?').get(lastInsertRowid) as SlideRow))
})

slidesRouter.patch('/:sid', (req, res) => {
  const row = db.prepare('SELECT * FROM slides WHERE id=? AND presentation_id=?')
    .get(req.params.sid, req.params.pid) as SlideRow | undefined
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  const { title, blocks } = req.body as { title?: string; blocks?: unknown[] }
  db.prepare("UPDATE slides SET title=?, blocks=?, updated_at=datetime('now') WHERE id=?")
    .run(title ?? row.title, blocks !== undefined ? JSON.stringify(blocks) : row.blocks, req.params.sid)
  res.json(fmt(db.prepare('SELECT * FROM slides WHERE id=?').get(req.params.sid) as SlideRow))
})

slidesRouter.delete('/:sid', (req, res) => {
  const { changes } = db.prepare('DELETE FROM slides WHERE id=? AND presentation_id=?').run(req.params.sid, req.params.pid)
  if (!changes) { res.status(404).json({ error: 'not found' }); return }
  res.status(204).send()
})

slidesRouter.put('/order', (req, res) => {
  const pid = Number(req.params.pid)
  const { ids } = req.body as { ids: number[] }
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids must be array' }); return }
  const upd = db.prepare('UPDATE slides SET position=? WHERE id=? AND presentation_id=?')
  db.transaction((list: number[]) => list.forEach((id, i) => upd.run(i, id, pid)))(ids)
  const rows = db.prepare('SELECT * FROM slides WHERE presentation_id=? ORDER BY position').all(pid) as SlideRow[]
  res.json(rows.map(fmt))
})
