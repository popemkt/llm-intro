import { Router } from 'express'
import { db } from '../db.js'

export const presentationsRouter = Router()

presentationsRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM presentations ORDER BY created_at DESC').all())
})

presentationsRouter.post('/', (req, res) => {
  const { name, theme = 'dark-green' } = req.body as { name: string; theme?: string }
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return }
  const { lastInsertRowid } = db.prepare('INSERT INTO presentations (name, theme) VALUES (?, ?)').run(name.trim(), theme)
  res.status(201).json(db.prepare('SELECT * FROM presentations WHERE id = ?').get(lastInsertRowid))
})

presentationsRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id)
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  res.json(row)
})

presentationsRouter.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id) as { name: string; theme: string } | undefined
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  const { name, theme } = req.body as { name?: string; theme?: string }
  db.prepare("UPDATE presentations SET name=?, theme=?, updated_at=datetime('now') WHERE id=?")
    .run(name ?? row.name, theme ?? row.theme, req.params.id)
  res.json(db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id))
})

presentationsRouter.delete('/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM presentations WHERE id = ?').run(req.params.id)
  if (!changes) { res.status(404).json({ error: 'not found' }); return }
  res.status(204).send()
})
