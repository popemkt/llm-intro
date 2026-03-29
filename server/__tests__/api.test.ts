import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { vi } from 'vitest'

// Use an in-memory DB for tests by mocking the db module
const testDb = new Database(':memory:')
testDb.pragma('foreign_keys = ON')
testDb.exec(`
  CREATE TABLE IF NOT EXISTS presentations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'dark-green',
    code_slug TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT 'Untitled',
    blocks TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

vi.mock('../db.js', () => ({ db: testDb }))

const { app } = await import('../index.js')

describe('Presentations API', () => {
  beforeEach(() => {
    testDb.exec('DELETE FROM slides; DELETE FROM presentations;')
  })

  it('GET /api/presentations returns empty array', async () => {
    const res = await request(app).get('/api/presentations')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /api/presentations creates a presentation', async () => {
    const res = await request(app)
      .post('/api/presentations')
      .send({ name: 'Test Pres', theme: 'dark-blue' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Test Pres')
    expect(res.body.theme).toBe('dark-blue')
    expect(res.body.id).toBeDefined()
  })

  it('POST /api/presentations rejects missing name', async () => {
    const res = await request(app).post('/api/presentations').send({})
    expect(res.status).toBe(400)
  })

  it('GET /api/presentations/:id returns the presentation', async () => {
    const create = await request(app).post('/api/presentations').send({ name: 'Hello' })
    const res = await request(app).get(`/api/presentations/${create.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Hello')
  })

  it('GET /api/presentations/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/presentations/99999')
    expect(res.status).toBe(404)
  })

  it('PATCH /api/presentations/:id updates fields', async () => {
    const create = await request(app).post('/api/presentations').send({ name: 'Old' })
    const res = await request(app)
      .patch(`/api/presentations/${create.body.id}`)
      .send({ name: 'New', theme: 'neon' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New')
    expect(res.body.theme).toBe('neon')
  })

  it('DELETE /api/presentations/:id removes it', async () => {
    const create = await request(app).post('/api/presentations').send({ name: 'ToDelete' })
    const del = await request(app).delete(`/api/presentations/${create.body.id}`)
    expect(del.status).toBe(204)
    const get = await request(app).get(`/api/presentations/${create.body.id}`)
    expect(get.status).toBe(404)
  })
})

describe('Slides API', () => {
  let pid: number

  beforeEach(async () => {
    testDb.exec('DELETE FROM slides; DELETE FROM presentations;')
    const res = await request(app).post('/api/presentations').send({ name: 'Pres' })
    pid = res.body.id
  })

  it('GET /api/presentations/:pid/slides returns empty array', async () => {
    const res = await request(app).get(`/api/presentations/${pid}/slides`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST creates a slide', async () => {
    const res = await request(app)
      .post(`/api/presentations/${pid}/slides`)
      .send({ title: 'Slide 1', blocks: [] })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Slide 1')
    expect(res.body.presentation_id).toBe(pid)
  })

  it('PATCH updates a slide', async () => {
    const create = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Old' })
    const sid = create.body.id
    const res = await request(app)
      .patch(`/api/presentations/${pid}/slides/${sid}`)
      .send({ title: 'New', blocks: [{ id: 'x', type: 'text', markdown: 'hi' }] })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('New')
    expect(JSON.parse(res.body.blocks)[0].markdown).toBe('hi')
  })

  it('DELETE removes a slide', async () => {
    const create = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Gone' })
    const sid = create.body.id
    const del = await request(app).delete(`/api/presentations/${pid}/slides/${sid}`)
    expect(del.status).toBe(204)
  })

  it('PUT /order reorders slides', async () => {
    const s1 = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'A' })
    const s2 = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'B' })
    const s3 = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'C' })

    const ids = [s3.body.id, s1.body.id, s2.body.id]
    const res = await request(app)
      .put(`/api/presentations/${pid}/slides/order`)
      .send({ ids })
    expect(res.status).toBe(200)
    expect(res.body[0].title).toBe('C')
    expect(res.body[1].title).toBe('A')
    expect(res.body[2].title).toBe('B')
  })

  it('cascades delete when presentation is deleted', async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Child' })
    await request(app).delete(`/api/presentations/${pid}`)
    const res = await request(app).get(`/api/presentations/${pid}/slides`)
    expect(res.body).toEqual([])
  })
})
