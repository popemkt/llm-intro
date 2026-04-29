import type Database from 'better-sqlite3'
import type { ApiSlide, Block, LayoutInput } from '../../shared/api.js'

type SlideRow = {
  id: number
  presentation_id: number
  position: number
  group_id: number | null
  kind: 'code' | 'db'
  code_id: string | null
  title: string
  blocks: string
  created_at: string
  updated_at: string
}

function mapSlide(row: SlideRow): ApiSlide {
  const { blocks, ...rest } = row
  return {
    ...rest,
    blocks: JSON.parse(blocks) as Block[],
  }
}

export function createSlidesRepository(db: Database.Database) {
  // Ordering: ungrouped bucket first (group_id IS NULL), then each group by
  // its group.position, then slides by slide.position within each bucket.
  const listStmt = db.prepare(`
    SELECT s.* FROM slides s
    LEFT JOIN slide_groups g ON g.id = s.group_id
    WHERE s.presentation_id=?
    ORDER BY
      CASE WHEN s.group_id IS NULL THEN 0 ELSE 1 END,
      COALESCE(g.position, 0),
      s.position,
      s.id
  `)
  const getByIdStmt = db.prepare('SELECT * FROM slides WHERE id=? AND presentation_id=?')
  const maxUngroupedPositionStmt = db.prepare(
    'SELECT MAX(position) as max_position FROM slides WHERE presentation_id=? AND group_id IS NULL',
  )
  const insertStmt = db.prepare(
    "INSERT INTO slides (presentation_id, position, kind, title, blocks) VALUES (?, ?, 'db', ?, ?)",
  )
  const updateStmt = db.prepare(
    "UPDATE slides SET title=?, blocks=?, updated_at=datetime('now') WHERE id=?",
  )
  const deleteStmt = db.prepare('DELETE FROM slides WHERE id=? AND presentation_id=?')
  const setPositionAndGroupStmt = db.prepare(
    "UPDATE slides SET position=?, group_id=?, updated_at=datetime('now') WHERE id=? AND presentation_id=?",
  )
  const setGroupPositionStmt = db.prepare(
    "UPDATE slide_groups SET position=?, updated_at=datetime('now') WHERE id=? AND presentation_id=?",
  )
  const listIdsStmt = db.prepare('SELECT id FROM slides WHERE presentation_id=?')
  const listGroupIdsStmt = db.prepare('SELECT id FROM slide_groups WHERE presentation_id=?')

  return {
    listByPresentationId(presentationId: number): ApiSlide[] {
      return (listStmt.all(presentationId) as SlideRow[]).map(mapSlide)
    },

    getById(presentationId: number, slideId: number): ApiSlide | null {
      const row = getByIdStmt.get(slideId, presentationId) as SlideRow | undefined
      return row ? mapSlide(row) : null
    },

    create(presentationId: number, input: { title: string; blocks: Block[] }): ApiSlide {
      const row = maxUngroupedPositionStmt.get(presentationId) as { max_position: number | null }
      const position = (row.max_position ?? -1) + 1
      const { lastInsertRowid } = insertStmt.run(presentationId, position, input.title, JSON.stringify(input.blocks))
      return this.getById(presentationId, Number(lastInsertRowid))!
    },

    update(presentationId: number, slideId: number, input: { title: string; blocks: Block[] }): ApiSlide {
      updateStmt.run(input.title, JSON.stringify(input.blocks), slideId)
      return this.getById(presentationId, slideId)!
    },

    delete(presentationId: number, slideId: number): boolean {
      return deleteStmt.run(slideId, presentationId).changes > 0
    },

    applyLayout(presentationId: number, layout: LayoutInput): ApiSlide[] {
      const existingSlideIds = new Set(
        (listIdsStmt.all(presentationId) as Array<{ id: number }>).map((r) => r.id),
      )
      const existingGroupIds = new Set(
        (listGroupIdsStmt.all(presentationId) as Array<{ id: number }>).map((r) => r.id),
      )

      const seenSlides = new Set<number>()
      const seenGroups = new Set<number>()

      const validate = () => {
        for (const id of layout.ungrouped) {
          if (!existingSlideIds.has(id)) throw new Error(`slide ${id} does not belong to presentation`)
          if (seenSlides.has(id)) throw new Error(`slide ${id} appears twice in layout`)
          seenSlides.add(id)
        }
        for (const group of layout.groups) {
          if (!existingGroupIds.has(group.id)) throw new Error(`group ${group.id} does not belong to presentation`)
          if (seenGroups.has(group.id)) throw new Error(`group ${group.id} appears twice in layout`)
          seenGroups.add(group.id)
          for (const id of group.slideIds) {
            if (!existingSlideIds.has(id)) throw new Error(`slide ${id} does not belong to presentation`)
            if (seenSlides.has(id)) throw new Error(`slide ${id} appears twice in layout`)
            seenSlides.add(id)
          }
        }
        if (seenSlides.size !== existingSlideIds.size) {
          throw new Error('layout must include every slide exactly once')
        }
        if (seenGroups.size !== existingGroupIds.size) {
          throw new Error('layout must include every group exactly once')
        }
      }

      validate()

      db.transaction(() => {
        layout.ungrouped.forEach((slideId, index) => {
          setPositionAndGroupStmt.run(index, null, slideId, presentationId)
        })
        layout.groups.forEach((group, groupIndex) => {
          setGroupPositionStmt.run(groupIndex, group.id, presentationId)
          group.slideIds.forEach((slideId, index) => {
            setPositionAndGroupStmt.run(index, group.id, slideId, presentationId)
          })
        })
      })()

      return this.listByPresentationId(presentationId)
    },
  }
}
