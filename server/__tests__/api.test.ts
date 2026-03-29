import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'

// In-memory DB matching current schema
const testDb = new Database(':memory:')
testDb.pragma('foreign_keys = ON')
testDb.exec(`
  CREATE TABLE presentations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'dark-green',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL DEFAULT 'db',
    code_id TEXT,
    title TEXT NOT NULL DEFAULT 'Untitled',
    blocks TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

vi.mock('../db.js', () => ({ db: testDb }))
const { app } = await import('../index.js')

describe('Presentations API', () => {
  beforeEach(() => { testDb.exec('DELETE FROM slides; DELETE FROM presentations;') })

  it('GET / returns empty array', async () => {
    const res = await request(app).get('/api/presentations')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST / creates a presentation', async () => {
    const res = await request(app).post('/api/presentations').send({ name: 'Test', theme: 'dark-blue' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Test')
    expect(res.body.theme).toBe('dark-blue')
  })

  it('POST / rejects missing name', async () => {
    expect((await request(app).post('/api/presentations').send({})).status).toBe(400)
  })

  it('GET /:id returns the presentation', async () => {
    const { body: { id } } = await request(app).post('/api/presentations').send({ name: 'Hello' })
    expect((await request(app).get(`/api/presentations/${id}`)).body.name).toBe('Hello')
  })

  it('GET /:id returns 404 for unknown id', async () => {
    expect((await request(app).get('/api/presentations/99999')).status).toBe(404)
  })

  it('PATCH /:id updates fields', async () => {
    const { body: { id } } = await request(app).post('/api/presentations').send({ name: 'Old' })
    const res = await request(app).patch(`/api/presentations/${id}`).send({ name: 'New', theme: 'neon' })
    expect(res.body.name).toBe('New')
    expect(res.body.theme).toBe('neon')
  })

  it('DELETE /:id removes it', async () => {
    const { body: { id } } = await request(app).post('/api/presentations').send({ name: 'ToDelete' })
    expect((await request(app).delete(`/api/presentations/${id}`)).status).toBe(204)
    expect((await request(app).get(`/api/presentations/${id}`)).status).toBe(404)
  })
})

describe('Slides API', () => {
  let pid: number

  beforeEach(async () => {
    testDb.exec('DELETE FROM slides; DELETE FROM presentations;')
    pid = (await request(app).post('/api/presentations').send({ name: 'Pres' })).body.id
  })

  it('GET / returns empty array', async () => {
    expect((await request(app).get(`/api/presentations/${pid}/slides`)).body).toEqual([])
  })

  it('POST / creates a db slide', async () => {
    const res = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'S1' })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('S1')
    expect(res.body.kind).toBe('db')
    expect(Array.isArray(res.body.blocks)).toBe(true)
  })

  it('PATCH /:sid updates a slide', async () => {
    const { body: { id: sid } } = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Old' })
    const res = await request(app).patch(`/api/presentations/${pid}/slides/${sid}`)
      .send({ title: 'New', blocks: [{ id: 'x', type: 'text', markdown: 'hi' }] })
    expect(res.body.title).toBe('New')
    expect(res.body.blocks[0].markdown).toBe('hi')
  })

  it('DELETE /:sid removes a slide', async () => {
    const { body: { id: sid } } = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Gone' })
    expect((await request(app).delete(`/api/presentations/${pid}/slides/${sid}`)).status).toBe(204)
  })

  it('PUT /order reorders slides', async () => {
    const ids = await Promise.all(['A', 'B', 'C'].map(t =>
      request(app).post(`/api/presentations/${pid}/slides`).send({ title: t }).then(r => r.body.id)
    ))
    const res = await request(app).put(`/api/presentations/${pid}/slides/order`).send({ ids: ids.reverse() })
    expect(res.status).toBe(200)
    expect(res.body[0].title).toBe('C')
    expect(res.body[2].title).toBe('A')
  })

  it('cascade deletes slides when presentation is deleted', async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Child' })
    await request(app).delete(`/api/presentations/${pid}`)
    expect((await request(app).get(`/api/presentations/${pid}/slides`)).body).toEqual([])
  })
})
