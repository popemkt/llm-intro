// The agent doesn't know what tools exist. It asks, then picks.
// Run:  pnpm tsx demos/02-tool-discovery.ts
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { model } from './_model.js'

const catalog = {
  weather: { description: 'Get the weather in a city',          run: ({ city }: any) => `14C and drizzle in ${city}.` },
  time:    { description: 'Current time in an IANA timezone',   run: ({ tz }: any)   => new Date().toLocaleString('en-GB', { timeZone: tz }) },
  joke:    { description: 'Tell a programmer joke',             run: ()              => 'There are 10 kinds of people: those who get binary and those who do not.' },
  flip:    { description: 'Flip a coin',                        run: ()              => Math.random() < 0.5 ? 'heads' : 'tails' },
}

const result = await generateText({
  model,
  stopWhen: stepCountIs(10),
  system: 'You can only use tools you have discovered via list_tools. Then call invoke to run one.',
  prompt: 'Surprise me. Pick something from your toolbox and use it.',
  tools: {
    list_tools: tool({
      description: 'List the tools available to you (besides this one and invoke).',
      inputSchema: z.object({}),
      execute: async () =>
        Object.fromEntries(Object.entries(catalog).map(([n, t]) => [n, t.description])),
    }),
    invoke: tool({
      description: 'Invoke a discovered tool by name, passing JSON args.',
      inputSchema: z.object({ name: z.string(), args: z.record(z.string(), z.any()).optional() }),
      execute: async ({ name, args }) => {
        const t = catalog[name as keyof typeof catalog]
        return t ? t.run(args ?? {}) : `Unknown tool: ${name}`
      },
    }),
  },
  onStepFinish: ({ toolCalls, toolResults, text }) => {
    for (const c of toolCalls)   console.log(`-> ${c.toolName}(${JSON.stringify(c.input)})`)
    for (const r of toolResults) console.log(`   = ${JSON.stringify(r.output)}`)
    if (text)                    console.log(`>  ${text}`)
  },
})

console.log(`\nFinal: ${result.text}`)
