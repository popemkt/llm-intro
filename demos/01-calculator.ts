// The whole agent loop, in one file.
// Run:  pnpm tsx demos/01-calculator.ts
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { model } from './_model.js'

const result = await generateText({
  model,
  stopWhen: stepCountIs(10),
  prompt: 'What is 47 * 38 + 12? Use the tools.',
  tools: {
    add: tool({
      description: 'Add two numbers',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      execute: async ({ a, b }) => a + b,
    }),
    multiply: tool({
      description: 'Multiply two numbers',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      execute: async ({ a, b }) => a * b,
    }),
  },
  onStepFinish: ({ toolCalls, toolResults, text }) => {
    for (const c of toolCalls)   console.log(`-> ${c.toolName}(${JSON.stringify(c.input)})`)
    for (const r of toolResults) console.log(`   = ${JSON.stringify(r.output)}`)
    if (text)                    console.log(`>  ${text}`)
  },
})

console.log(`\nFinal: ${result.text}`)
