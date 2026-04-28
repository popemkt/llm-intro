// Sub-agents as tools. The main agent has no access to the secret.
// It must call ask_subagent with a useful prompt — and the sub-agent (which
// has reveal_secret) decides whether to use its tool based on that prompt.
// Run:  pnpm tsx demos/04-subagent.ts
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { model } from './_model.js'

const SECRET = 'gandalf-loves-coffee'

const result = await generateText({
  model,
  stopWhen: stepCountIs(6),
  prompt:
    'Find out the secret and report it back. ' +
    'You have one tool: ask_subagent. The sub-agent has a tool you do not. ' +
    'Talk to it.',
  tools: {
    ask_subagent: tool({
      description:
        'Send a prompt to a sub-agent. The sub-agent has its own private tools. ' +
        'Returns the sub-agent\'s final text response.',
      inputSchema: z.object({ prompt: z.string() }),
      execute: async ({ prompt }) => {
        console.log(`   [subagent <- ${JSON.stringify(prompt)}]`)
        const sub = await generateText({
          model,
          stopWhen: stepCountIs(4),
          prompt,
          tools: {
            reveal_secret: tool({
              description: 'Returns a secret string. Only this sub-agent has access.',
              inputSchema: z.object({}),
              execute: async () => SECRET,
            }),
          },
          onStepFinish: ({ toolCalls, toolResults, text }) => {
            for (const c of toolCalls)   console.log(`     -> ${c.toolName}(${JSON.stringify(c.input)})`)
            for (const r of toolResults) console.log(`        = ${JSON.stringify(r.output)}`)
            if (text)                    console.log(`     >  ${text}`)
          },
        })
        return sub.text
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
