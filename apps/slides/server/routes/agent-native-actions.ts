import { Router, type Router as ExpressRouter } from 'express'
import { AppError } from '../errors.js'

type ActionRunContext = {
  caller: 'frontend' | 'http' | 'tool' | 'mcp' | 'a2a' | 'cli'
  orgId: string | null
  userEmail?: string
}

type AppAction = {
  run: unknown
  tool?: {
    description?: string
    parameters?: unknown
  }
  http?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; path?: string } | false
  requiresAuth?: boolean
  agentTool?: boolean
  readOnly?: boolean
  parallelSafe?: boolean
  toolCallable?: boolean
  publicAgent?: {
    expose: boolean
    readOnly: boolean
    requiresAuth?: boolean
    isConsequential?: boolean
    title?: string
    description?: string
  }
}
type AppActions = Record<string, AppAction>
type ActionEntry = { name: string; action: AppAction }
type ActionCaller = ActionRunContext['caller']

const appName = 'LLM Intro Slides'
const appDescription = 'Create, inspect, edit, theme, group, and present LLM introduction slide decks.'

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

function callerFromRequest(headers: { get(name: string): string | undefined }, fallback: ActionCaller): ActionCaller {
  if (isFrontendActionRequest(headers)) return 'frontend'
  if (headers.get('x-agent-native-mcp') === '1') return 'mcp'
  if (headers.get('x-agent-native-a2a') === '1') return 'a2a'
  if (headers.get('x-agent-native-tool') === '1') return 'tool'
  return fallback
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

function actionDescription(action: AppAction) {
  return action.publicAgent?.description ?? action.tool?.description ?? ''
}

function actionInputSchema(action: AppAction) {
  return action.tool?.parameters ?? { type: 'object', properties: {} }
}

function isPublicAgentAction(action: AppAction) {
  return action.publicAgent?.expose !== false && action.agentTool !== false
}

function isReadOnlyAction(action: AppAction, method: string | null) {
  return action.readOnly ?? method === 'GET'
}

function requiresAuth(action: AppAction) {
  return action.publicAgent?.requiresAuth ?? action.requiresAuth ?? true
}

function createActionManifestItem(name: string, action: AppAction) {
  const path = actionPath(name, action)
  const method = actionMethod(action)
  const readOnly = isReadOnlyAction(action, method)

  return {
    name,
    title: action.publicAgent?.title ?? name,
    description: actionDescription(action),
    inputSchema: actionInputSchema(action),
    http: path && method ? { method, path: `/_agent-native/actions/${path}` } : null,
    exposure: {
      http: Boolean(path && method),
      agentTool: action.agentTool !== false,
      mcp: isPublicAgentAction(action),
      a2a: isPublicAgentAction(action),
      toolIframe: action.toolCallable !== false,
    },
    readOnly,
    parallelSafe: action.parallelSafe ?? false,
    requiresAuth: requiresAuth(action),
    isConsequential: action.publicAgent?.isConsequential ?? !readOnly,
  }
}

function exposedAgentEntries(actions: AppActions) {
  return Object.entries(actions).filter(([, action]) => action.agentTool !== false && action.publicAgent?.expose !== false)
}

function createActionManifest(actions: AppActions) {
  return {
    app: {
      name: appName,
      description: appDescription,
    },
    protocols: {
      http: '/_agent-native/actions/:name',
      invoke: '/_agent-native/actions/invoke/:name',
      mcp: '/_agent-native/actions/mcp',
      a2aCard: '/_agent-native/a2a/agent-card',
      openapi: '/_agent-native/openapi.json',
    },
    actions: Object.fromEntries(Object.entries(actions).map(([name, action]) => [name, createActionManifestItem(name, action)])),
  }
}

async function runAction(entry: ActionEntry, args: unknown, caller: ActionCaller) {
  if (typeof entry.action.run !== 'function') {
    throw new AppError(500, 'action is not callable')
  }

  const ctx: ActionRunContext = { caller, orgId: null }
  const run = entry.action.run as (args: unknown, ctx?: ActionRunContext) => unknown | Promise<unknown>
  return run(args, ctx)
}

function getBodyRecord(body: unknown) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

function mcpResponse(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function mcpError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function mcpToolResult(result: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
  }
}

function createMcpToolList(actions: AppActions) {
  return exposedAgentEntries(actions).map(([name, action]) => ({
    name,
    description: actionDescription(action),
    inputSchema: actionInputSchema(action),
  }))
}

function getActionByName(actions: AppActions, name: string) {
  return actions[name] ? { name, action: actions[name] } : null
}

function registerManifestRoutes(router: ExpressRouter, actions: AppActions) {
  router.get('/', (_req, res) => {
    res.json(createActionManifest(actions))
  })

  router.get('/mcp/tools', (_req, res) => {
    res.json({ tools: createMcpToolList(actions) })
  })
}

function registerMcpRoutes(router: ExpressRouter, actions: AppActions) {
  router.post('/mcp', async (req, res) => {
    const rpc = getBodyRecord(req.body)
    const method = typeof rpc.method === 'string' ? rpc.method : ''
    const id = rpc.id ?? null

    if (method === 'initialize') {
      res.json(mcpResponse(id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'llm-intro-slides', version: '0.1.0' },
      }))
      return
    }

    if (method === 'tools/list') {
      res.json(mcpResponse(id, { tools: createMcpToolList(actions) }))
      return
    }

    if (method === 'tools/call') {
      await handleMcpToolCall(actions, id, rpc.params, res)
      return
    }

    res.json(mcpError(id, -32601, `method '${method}' is not supported`))
  })
}

async function handleMcpToolCall(actions: AppActions, id: unknown, paramsBody: unknown, res: Parameters<Parameters<ExpressRouter['post']>[1]>[1]) {
  const params = getBodyRecord(paramsBody)
  const name = typeof params.name === 'string' ? params.name : ''
  const entry = getActionByName(actions, name)

  if (!entry || entry.action.agentTool === false || entry.action.publicAgent?.expose === false) {
    res.json(mcpError(id, -32602, `tool '${name}' is not available`))
    return
  }

  try {
    const result = await runAction(entry, params.arguments ?? {}, 'mcp')
    res.json(mcpResponse(id, mcpToolResult(result)))
  } catch (err) {
    const status = errorStatus(err)
    res.json(mcpError(id, status >= 500 ? -32603 : -32602, errorMessage(err, status)))
  }
}

function registerInvokeRoutes(router: ExpressRouter, actions: AppActions) {
  router.post('/invoke', async (req, res) => {
    const body = getBodyRecord(req.body)
    const name = typeof body.name === 'string' ? body.name : ''
    await handleInvoke(getActionByName(actions, name), body.args ?? {}, callerFromRequest(req, 'tool'), res)
  })

  router.post('/invoke/:name', async (req, res) => {
    await handleInvoke(getActionByName(actions, req.params.name), req.body ?? {}, callerFromRequest(req, 'tool'), res)
  })
}

async function handleInvoke(entry: ActionEntry | null, args: unknown, caller: ActionCaller, res: Parameters<Parameters<ExpressRouter['post']>[1]>[1]) {
  if (!entry) {
    res.status(404).json({ error: 'action not found' })
    return
  }

  try {
    res.json(await runAction(entry, args, caller))
  } catch (err) {
    const status = errorStatus(err)
    if (status >= 500) console.error(`[agent-native] invoke '${entry.name}' failed:`, err)
    res.status(status).json({ error: errorMessage(err, status) })
  }
}

function registerHttpActionRoutes(router: ExpressRouter, actionsByPath: Map<string, ActionEntry>) {
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

    try {
      const result = await runAction(entry, parseActionParams(req.method, req.query, req.body), callerFromRequest(req, 'http'))
      res.json(result)
    } catch (err) {
      const status = errorStatus(err)
      if (status >= 500) console.error(`[agent-native] action '${entry.name}' failed:`, err)
      res.status(status).json({ error: errorMessage(err, status) })
    }
  })
}

export function createAgentNativeActionsRouter(actions: AppActions) {
  const router = Router()
  const actionsByPath = new Map<string, ActionEntry>()

  Object.entries(actions).forEach(([name, action]) => {
    const path = actionPath(name, action)
    if (path) actionsByPath.set(path, { name, action })
  })

  registerManifestRoutes(router, actions)
  registerMcpRoutes(router, actions)
  registerInvokeRoutes(router, actions)
  registerHttpActionRoutes(router, actionsByPath)

  return router
}

export function createAgentNativeDiscoveryRouter(actions: AppActions) {
  const router = Router()

  router.get('/openapi.json', (req, res) => {
    const origin = `${req.protocol}://${req.get('host') ?? 'localhost:3001'}`
    const paths = Object.fromEntries(Object.entries(actions).flatMap(([name, action]) => {
      const item = createActionManifestItem(name, action)
      if (!item.http) return []
      return [[item.http.path, {
        [item.http.method.toLowerCase()]: {
          operationId: name,
          summary: item.title,
          description: item.description,
          responses: { 200: { description: 'Action result' } },
          ...(item.http.method === 'GET'
            ? { parameters: [] }
            : { requestBody: { required: true, content: { 'application/json': { schema: item.inputSchema } } } }),
        },
      }]]
    }))

    res.json({
      openapi: '3.1.0',
      info: { title: appName, version: '0.1.0', description: appDescription },
      servers: [{ url: origin }],
      paths,
    })
  })

  router.get('/a2a/agent-card', (req, res) => {
    const origin = `${req.protocol}://${req.get('host') ?? 'localhost:3001'}`

    res.json({
      name: appName,
      description: appDescription,
      url: `${origin}/_agent-native/actions/invoke`,
      version: '0.1.0',
      protocolVersion: '0.3',
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      skills: exposedAgentEntries(actions).map(([name, action]) => ({
        id: name,
        name: action.publicAgent?.title ?? name,
        description: action.publicAgent?.description ?? action.tool?.description ?? '',
        tags: action.readOnly ? ['slides', 'read'] : ['slides', 'write'],
      })),
    })
  })

  return router
}
