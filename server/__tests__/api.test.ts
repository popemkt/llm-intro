import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import { bootstrapDatabase } from '../db.js'
import { buildRuntime } from '../runtime.js'

function createTestContext(options: { seedSystemPresentation?: boolean } = {}) {
  const db = new Database(':memory:')
  bootstrapDatabase(db, options)
  return {
    db,
    ...buildRuntime(db),
  }
}

describe('Presentations API', () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false })

  beforeEach(() => {
    db.exec('DELETE FROM slides; DELETE FROM presentations;')
  })

  it('GET / returns empty array when no user presentations exist', async () => {
    const res = await request(app).get('/api/presentations')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST / creates a presentation', async () => {
    const res = await request(app).post('/api/presentations').send({ name: 'Test', theme: 'dark-blue' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Test')
    expect(res.body.theme).toBe('dark-blue')
    expect(res.body.id).toBeDefined()
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

  it('DELETE /:id removes a user presentation', async () => {
    const { body: { id } } = await request(app).post('/api/presentations').send({ name: 'ToDelete' })
    expect((await request(app).delete(`/api/presentations/${id}`)).status).toBe(204)
    expect((await request(app).get(`/api/presentations/${id}`)).status).toBe(404)
  })
})

describe('Slides API', () => {
  const { db, app } = createTestContext({ seedSystemPresentation: false })
  let pid: number

  beforeEach(async () => {
    db.exec('DELETE FROM slides; DELETE FROM presentations;')
    pid = (await request(app).post('/api/presentations').send({ name: 'Pres' })).body.id
  })

  it('GET / returns empty array', async () => {
    expect((await request(app).get(`/api/presentations/${pid}/slides`)).body).toEqual([])
  })

  it('GET / returns 404 for an unknown presentation', async () => {
    expect((await request(app).get('/api/presentations/99999/slides')).status).toBe(404)
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
    const ids = await Promise.all(['A', 'B', 'C'].map(async (title) => {
      const response = await request(app).post(`/api/presentations/${pid}/slides`).send({ title })
      return response.body.id as number
    }))

    const res = await request(app).put(`/api/presentations/${pid}/slides/order`).send({ ids: ids.reverse() })
    expect(res.status).toBe(200)
    expect(res.body.map((slide: { title: string }) => slide.title)).toEqual(['C', 'B', 'A'])
  })

  it('PUT /order rejects incomplete payloads', async () => {
    const a = await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'A' })
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'B' })

    const res = await request(app).put(`/api/presentations/${pid}/slides/order`).send({ ids: [a.body.id] })
    expect(res.status).toBe(400)
  })

  it('cascade deletes slides when presentation is deleted', async () => {
    await request(app).post(`/api/presentations/${pid}/slides`).send({ title: 'Child' })
    await request(app).delete(`/api/presentations/${pid}`)
    expect((await request(app).get(`/api/presentations/${pid}/slides`)).status).toBe(404)
  })
})

describe('System presentation bootstrap', () => {
  it('keeps a renamed seed deck stable across re-bootstrap', () => {
    const db = new Database(':memory:')
    bootstrapDatabase(db)
    db.prepare("UPDATE presentations SET name='Renamed Built-in' WHERE system_key='llm-intro'").run()
    bootstrapDatabase(db)

    const rows = db.prepare('SELECT name, system_key FROM presentations').all() as Array<{ name: string; system_key: string | null }>
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ name: 'Renamed Built-in', system_key: 'llm-intro' })
  })

  it('allows reordering and renaming code slides but blocks deleting them', async () => {
    const { app } = createTestContext()

    const presentations = (await request(app).get('/api/presentations')).body as Array<{ id: number }>
    const pid = presentations[0].id

    const slides = (await request(app).get(`/api/presentations/${pid}/slides`)).body as Array<{ id: number; kind: string }>
    const codeSlide = slides.find(s => s.kind === 'code')!

    // Rename works
    expect((await request(app).patch(`/api/presentations/${pid}/slides/${codeSlide.id}`).send({ title: 'Renamed' })).status).toBe(200)
    // Delete blocked
    expect((await request(app).delete(`/api/presentations/${pid}/slides/${codeSlide.id}`)).status).toBe(403)
  })

  it('exports a filtered HTML deck', async () => {
    const { app } = createTestContext()

    const presentations = (await request(app).get('/api/presentations')).body as Array<{ id: number }>
    const pid = presentations[0].id
    const slides = (await request(app).get(`/api/presentations/${pid}/slides`)).body as Array<{ id: number }>
    const subsetIds = slides.slice(0, 2).map(slide => slide.id)

    const res = await request(app)
      .post(`/api/presentations/${pid}/export`)
      .send({ slideIds: subsetIds })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^text\/html/)
    expect(res.headers['content-disposition']).toContain('.html')
    expect(res.text).toContain('02-linear-regression')
    expect(res.text).not.toContain('03-context')
    expect(res.text).toContain('.absolute{position:absolute')
    expect(res.text).toContain('__EXPORT_META__')
    expect(res.text).toContain('exportMode:"player"')
    expect(res.text).toContain('__EXPORT_DATA__')
  })

  it('exports deck mode with overview shell metadata', async () => {
    const { app } = createTestContext()

    const presentations = (await request(app).get('/api/presentations')).body as Array<{ id: number }>
    const pid = presentations[0].id

    const res = await request(app)
      .post(`/api/presentations/${pid}/export`)
      .send({ mode: 'deck' })

    expect(res.status).toBe(200)
    expect(res.text).toContain('exportMode:"deck"')
    expect(res.text).toContain('artifactVersion:1')
    expect(res.text).toContain('export-deck-overview')
    expect(res.text).toContain('LLM & Agent Basics')
    expect(res.text).toContain('slideCount:9')
  })
})
