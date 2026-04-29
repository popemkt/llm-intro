// Every registered tool is shape (input: string) => string.
// The registry persists across runs — capabilities accumulate.
// Run the script. Type a tool to register, or Enter to skip. Then a follow-up, or Enter.
//   pnpm tsx demos/03-self-extending.ts
import * as readline from 'readline'
import { stdin as input, stdout as output } from 'process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { model } from './_model.js'

const REGISTRY = './demos/registry.json'
if (!existsSync(REGISTRY)) writeFileSync(REGISTRY, '{}')

type Spec = { description: string; code: string }
const load = (): Record<string, Spec> => JSON.parse(readFileSync(REGISTRY, 'utf-8'))

function buildTools() {
  const tools: Record<string, any> = {
    add_tool: tool({
      description:
        'Register a new tool. `code` must be a JS arrow expression of shape `(input: string) => string`. ' +
        'Encode the input format in `description` so future calls know how to use it.',
      inputSchema: z.object({
        name: z.string(),
        description: z.string(),
        code: z.string(),
      }),
      execute: async ({ name, description, code }) => {
        const r = load()
        r[name] = { description, code }
        writeFileSync(REGISTRY, JSON.stringify(r, null, 2))
        return `Registered '${name}'. Available on the next call.`
      },
    }),
  }
  for (const [name, spec] of Object.entries(load())) {
    tools[name] = tool({
      description: spec.description,
      inputSchema: z.object({ input: z.string() }),
      execute: async ({ input }) => {
        // DEMO ONLY: eval-ing model-supplied code. Sandbox in real use.
        const fn = eval(spec.code) as (s: string) => string
        return String(fn(input))
      },
    })
  }
  return tools
}

const rl = readline.createInterface({ input, output })
const lines = rl[Symbol.asyncIterator]()
async function ask(q: string): Promise<string> {
  output.write(q)
  const { value, done } = await lines.next()
  return done ? '' : value
}

console.log(`current tools: [${Object.keys(buildTools()).join(', ')}]\n`)

const addInput    = (await ask('add tool?  > ')).trim()
const followInput = (await ask('follow-up? > ')).trim()
rl.close()

const parts = [
  addInput    && `Use add_tool to register a new tool: ${addInput}`,
  followInput,
].filter(Boolean) as string[]

if (parts.length === 0) {
  console.log('\nnothing to do.')
  process.exit(0)
}

const prompt = parts.join('\n\n')
console.log(`\nprompt: ${prompt}\n`)

await generateText({
  model,
  stopWhen: stepCountIs(8),
  prompt,
  tools: buildTools(),
  onStepFinish: ({ toolCalls, toolResults, text }) => {
    for (const c of toolCalls)   console.log(`-> ${c.toolName}(${JSON.stringify(c.input)})`)
    for (const r of toolResults) console.log(`   = ${JSON.stringify(r.output)}`)
    if (text)                    console.log(`>  ${text}`)
  },
})
