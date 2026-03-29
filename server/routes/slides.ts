import { Router } from 'express'
import { db } from '../db.js'

export const slidesRouter = Router({ mergeParams: true })

slidesRouter.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY position ASC'
  ).all(req.params.pid)
  res.json(rows)
})

slidesRouter.post('/', (req, res) => {
  const pid = Number(req.params.pid)
  const pres = db.prepare('SELECT id FROM presentations WHERE id = ?').get(pid)
  if (!pres) { res.status(404).json({ error: 'presentation not found' }); return }

  const { title = 'Untitled', blocks = [] } = req.body as { title?: string; blocks?: unknown[] }
  const maxPos = (db.prepare('SELECT MAX(position) as m FROM slides WHERE presentation_id = ?').get(pid) as { m: number | null }).m ?? -1
  const result = db.prepare(
    'INSERT INTO slides (presentation_id, position, title, blocks) VALUES (?, ?, ?, ?)'
  ).run(pid, maxPos + 1, title, JSON.stringify(blocks))
  const row = db.prepare('SELECT * FROM slides WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(row)
})

slidesRouter.get('/:sid', (req, res) => {
  const row = db.prepare('SELECT * FROM slides WHERE id = ? AND presentation_id = ?').get(req.params.sid, req.params.pid)
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  res.json(row)
})

slidesRouter.patch('/:sid', (req, res) => {
  const row = db.prepare('SELECT * FROM slides WHERE id = ? AND presentation_id = ?').get(req.params.sid, req.params.pid) as { id: number; title: string; blocks: string } | undefined
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  const { title, blocks } = req.body as { title?: string; blocks?: unknown[] }
  db.prepare(
    "UPDATE slides SET title = ?, blocks = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(title ?? row.title, blocks !== undefined ? JSON.stringify(blocks) : row.blocks, req.params.sid)
  res.json(db.prepare('SELECT * FROM slides WHERE id = ?').get(req.params.sid))
})

slidesRouter.delete('/:sid', (req, res) => {
  const result = db.prepare('DELETE FROM slides WHERE id = ? AND presentation_id = ?').run(req.params.sid, req.params.pid)
  if (result.changes === 0) { res.status(404).json({ error: 'not found' }); return }
  res.status(204).send()
})

slidesRouter.put('/order', (req, res) => {
  const pid = Number(req.params.pid)
  const { ids } = req.body as { ids: number[] }
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids must be an array' }); return }
  const update = db.prepare('UPDATE slides SET position = ? WHERE id = ? AND presentation_id = ?')
  const updateAll = db.transaction((list: number[]) => {
    list.forEach((id, i) => update.run(i, id, pid))
  })
  updateAll(ids)
  const rows = db.prepare('SELECT * FROM slides WHERE presentation_id = ? ORDER BY position ASC').all(pid)
  res.json(rows)
})
