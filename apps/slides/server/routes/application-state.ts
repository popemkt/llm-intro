import { Router } from 'express'

const state = new Map<string, unknown>()

function isSafeKey(key: string) {
  return /^[A-Za-z0-9_:.@/-]{1,160}$/.test(key)
}

export function createApplicationStateRouter() {
  const router = Router()

  router.get('/:key', (req, res) => {
    const { key } = req.params
    if (!isSafeKey(key)) {
      res.status(400).json({ error: 'invalid state key' })
      return
    }

    if (!state.has(key)) {
      res.status(204).send()
      return
    }

    res.json(state.get(key))
  })

  router.put('/:key', (req, res) => {
    const { key } = req.params
    if (!isSafeKey(key)) {
      res.status(400).json({ error: 'invalid state key' })
      return
    }

    state.set(key, req.body && typeof req.body === 'object' ? req.body : {})
    res.json({ ok: true })
  })

  router.delete('/:key', (req, res) => {
    const { key } = req.params
    if (!isSafeKey(key)) {
      res.status(400).json({ error: 'invalid state key' })
      return
    }

    state.delete(key)
    res.json({ ok: true })
  })

  return router
}
