import { Router } from 'express'
import { db } from '../db.js'

export const presentationsRouter = Router()

presentationsRouter.get('/', (_req, res) => {
  // Exclude companion presentations (code_slug set) from the home page list
  const rows = db.prepare('SELECT * FROM presentations WHERE code_slug IS NULL ORDER BY created_at DESC').all()
  res.json(rows)
})

presentationsRouter.post('/', (req, res) => {
  const { name, theme = 'dark-green', code_slug } = req.body as { name: string; theme?: string; code_slug?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const result = db.prepare(
    'INSERT INTO presentations (name, theme, code_slug) VALUES (?, ?, ?)'
  ).run(name.trim(), theme, code_slug ?? null)
  const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(row)
})

// Get or create a companion presentation for a code slug
presentationsRouter.post('/by-slug', (req, res) => {
  const { slug, theme = 'dark-green' } = req.body as { slug: string; theme?: string }
  if (!slug?.trim()) { res.status(400).json({ error: 'slug is required' }); return }
  let row = db.prepare('SELECT * FROM presentations WHERE code_slug = ?').get(slug)
  if (!row) {
    const result = db.prepare(
      'INSERT INTO presentations (name, theme, code_slug) VALUES (?, ?, ?)'
    ).run(slug, theme, slug)
    row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(result.lastInsertRowid)
  }
  res.json(row)
})

presentationsRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id)
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  res.json(row)
})

presentationsRouter.patch('/:id', (req, res) => {
  const { name, theme } = req.body as { name?: string; theme?: string }
  const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id) as { id: number; name: string; theme: string } | undefined
  if (!row) { res.status(404).json({ error: 'not found' }); return }
  db.prepare(
    "UPDATE presentations SET name = ?, theme = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name ?? row.name, theme ?? row.theme, req.params.id)
  res.json(db.prepare('SELECT * FROM presentations WHERE id = ?').get(req.params.id))
})

presentationsRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM presentations WHERE id = ?').run(req.params.id)
  if (result.changes === 0) { res.status(404).json({ error: 'not found' }); return }
  res.status(204).send()
})
