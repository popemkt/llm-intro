import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalApi, ApiError } from './client'
import { createDatabaseRuntime } from '@/db/runtime'
import { presentations } from '@/db/schema'

describe('local api', () => {
  describe('memory database', () => {
    it('bootstraps the built-in deck and supports CRUD for user decks', async () => {
      const api = createLocalApi({ databasePath: ':memory:' })

      const initialPresentations = await api.presentations.list()
      expect(initialPresentations).toHaveLength(1)
      expect(initialPresentations[0].is_system).toBe(true)

      const deck = await api.presentations.create('Local deck', 'neon')
      expect(deck.name).toBe('Local deck')
      expect(deck.theme).toBe('neon')

      const slide = await api.slides.create(deck.id, 'Intro')
      expect(slide.title).toBe('Intro')

      const updatedSlide = await api.slides.update(deck.id, slide.id, {
        title: 'Intro updated',
        blocks: [{ id: 't1', type: 'text', markdown: 'Hello **SQLocal**' }],
      })
      expect(updatedSlide.title).toBe('Intro updated')
      expect(updatedSlide.blocks).toHaveLength(1)

      const reordered = await api.slides.reorder(deck.id, [slide.id])
      expect(reordered.map((entry) => entry.id)).toEqual([slide.id])

      const savedDeck = await api.presentations.update(deck.id, { name: 'Renamed deck', theme: 'warm' })
      expect(savedDeck.name).toBe('Renamed deck')
      expect(savedDeck.theme).toBe('warm')

      await api.slides.delete(deck.id, slide.id)
      expect(await api.slides.list(deck.id)).toEqual([])

      await api.presentations.delete(deck.id)
      const decksAfterDelete = await api.presentations.list()
      expect(decksAfterDelete).toHaveLength(1)
      expect(decksAfterDelete[0].is_system).toBe(true)
    })

    it('keeps the built-in deck read-only', async () => {
      const api = createLocalApi({ databasePath: ':memory:' })
      const [builtIn] = await api.presentations.list()

      await expect(api.presentations.delete(builtIn.id)).rejects.toMatchObject({
        status: 403,
        message: 'built-in presentations cannot be deleted',
      } satisfies Partial<ApiError>)

      await expect(api.slides.create(builtIn.id)).rejects.toMatchObject({
        status: 403,
        message: 'built-in presentations are read-only',
      } satisfies Partial<ApiError>)

      const builtInSlides = await api.slides.list(builtIn.id)
      await expect(api.slides.update(builtIn.id, builtInSlides[0].id, { title: 'Nope' })).rejects.toMatchObject({
        status: 403,
        message: 'code slides are read-only',
      } satisfies Partial<ApiError>)
    })
  })

  describe('persistent bootstrap', () => {
    beforeEach(async () => {
      const runtime = await createDatabaseRuntime({ databasePath: 'local' })
      await runtime.client.deleteDatabaseFile()
      await runtime.client.destroy()
    })

    it('does not duplicate the built-in deck when the database reconnects', async () => {
      const api = createLocalApi({ databasePath: 'local' })
      const [builtIn] = await api.presentations.list()

      await api.presentations.update(builtIn.id, { name: 'Renamed built-in' })

      const runtime = await createDatabaseRuntime({ databasePath: 'local' })
      const rows = await runtime.db.select().from(presentations)

      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('Renamed built-in')
      expect(rows[0].systemKey).toBe('llm-intro')

      await runtime.client.destroy()
    })
  })
})
