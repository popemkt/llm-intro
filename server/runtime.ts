import type Database from 'better-sqlite3'
import { createApp } from './app.js'
import { bootstrapDatabase, openDatabase } from './db.js'
import { createPresentationsRepository } from './repositories/presentations.js'
import { createSlidesRepository } from './repositories/slides.js'
import { createPresentationsService } from './services/presentations.js'
import { createSlidesService } from './services/slides.js'

export function buildRuntime(db: Database.Database) {
  const presentationsRepo = createPresentationsRepository(db)
  const slidesRepo = createSlidesRepository(db)

  return {
    app: createApp({
      presentationsService: createPresentationsService(presentationsRepo),
      slidesService: createSlidesService(presentationsRepo, slidesRepo),
    }),
  }
}

export function buildDefaultRuntime() {
  const db = openDatabase()
  bootstrapDatabase(db)

  return {
    db,
    ...buildRuntime(db),
  }
}
