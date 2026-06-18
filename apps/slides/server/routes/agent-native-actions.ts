import { Router } from 'express'
import { AppError } from '../errors.js'

type ActionRunContext = {
  caller: 'frontend' | 'http'
  orgId: string | null
  userEmail?: string
}

type AppAction = {
  run: unknown
  http?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; path?: string } | false
}
type AppActions = Record<string, AppAction>

function actionPath(name: string, action: AppAction) {
  if (action.http === false) return null
  return action.http?.path ?? name
}

function actionMethod(action: AppAction) {
  return action.http === false ? null : action.http?.method ?? 'POST'
}

function isFrontendActionRequest(headers: { get(name: string): string | undefined }) {
  return headers.get('x-agent-native-frontend') === '1' || headers.get('x-request-source') === 'agent-native-frontend'
}

function parseActionParams(method: string, query: Record<string, unknown>, body: unknown) {
  if (method === 'GET') return query
  if (body && typeof body === 'object') return body
  return {}
}

function errorStatus(err: unknown) {
  if (err instanceof AppError) return err.status
  const message = err instanceof Error ? err.message : String(err)
  if (message.startsWith('Invalid action parameters')) return 400
  return 500
}

function errorMessage(err: unknown, status: number) {
  if (err instanceof AppError) return err.message
  const message = err instanceof Error ? err.message : String(err)
  if (status < 500) return message
  return 'Internal server error'
}

export function createAgentNativeActionsRouter(actions: AppActions) {
  const router = Router()
  const actionsByPath = new Map<string, { name: string; action: AppAction }>()

  Object.entries(actions).forEach(([name, action]) => {
    const path = actionPath(name, action)
    if (path) actionsByPath.set(path, { name, action })
  })

  router.all('/:name', async (req, res) => {
    const entry = actionsByPath.get(req.params.name)

    if (!entry) {
      res.status(404).json({ error: 'action not found' })
      return
    }

    const method = actionMethod(entry.action)
    if (method && req.method !== method) {
      res.set('Allow', method)
      res.status(405).json({ error: `method ${req.method} is not supported for ${entry.name}` })
      return
    }

    const ctx: ActionRunContext = {
      caller: isFrontendActionRequest(req) ? 'frontend' : 'http',
      orgId: null,
    }

    try {
      if (typeof entry.action.run !== 'function') {
        throw new AppError(500, 'action is not callable')
      }

      const run = entry.action.run as (args: unknown, ctx?: ActionRunContext) => unknown | Promise<unknown>
      const result = await run(parseActionParams(req.method, req.query, req.body), ctx)
      res.json(result)
    } catch (err) {
      const status = errorStatus(err)
      if (status >= 500) {
        console.error(`[agent-native] action '${entry.name}' failed:`, err)
      }
      res.status(status).json({ error: errorMessage(err, status) })
    }
  })

  return router
}
