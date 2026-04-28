# Demos — "How it works, briefly"

Three short scripts. Each is one file. The terminal output *is* the agent loop.

```
demos/
  01-calculator.ts        ~30 lines — basic tool calls
  02-tool-discovery.ts    ~40 lines — agent discovers its own tools
  03-self-extending.ts    interactive — prompt to add a tool + a follow-up; registry persists across runs
  04-subagent.ts          ~50 lines — main agent talks to a sub-agent that owns a private tool
  registry.json           live registry for demo 03 (reset with `echo "{}" > demos/registry.json`)
```

## Setup (once)

```sh
cp demos/.env.template demos/.env
# then fill in OPENAI_API_KEY (and OPENAI_BASE_URL + OPENAI_MODEL if using Azure AI Foundry)
```

The provider lives in `demos/_model.ts` — one file, swap baseURL/key/model from `demos/.env`. Works with api.openai.com, Azure AI Foundry's OpenAI-compatible v1 endpoint, or any compatible proxy.

## Run

```sh
pnpm tsx demos/01-calculator.ts
pnpm tsx demos/02-tool-discovery.ts
pnpm tsx demos/03-self-extending.ts
pnpm tsx demos/04-subagent.ts
```

Reset demo 03 between takes:

```sh
echo "{}" > demos/registry.json
```

## Reading the output

```
-> tool_name({...args})    # model called a tool
   = result                # tool returned
>  text                    # model's reply text
```

## Notes for the live demo

- Split editor + terminal. Show the file (~30 lines), then run it.
- Demo 03 evals model-supplied code. Beat the audience to it: "yes, sandboxed dev loop — that's the pattern."
- Pre-record demo 03 as fallback in case of API hiccups.
