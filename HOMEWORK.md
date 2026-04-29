# Homework — Session 1: How LLMs Work (Visible Standpoint)

Covers slides in group **"How it works from a visible standpoint"**:
What is an LLM · Linear Regression → LLM · Context Window · How Words Become Numbers · Tool Use / Agent Loop

Goal: build enough foundation that advanced topics later (RAG, MCP, agents, long-running workflows) land as "oh, that makes sense" instead of "wait, what?"

---

## Part 1 — Theory Questions

### Tier 1 — From the lecture

Answers come directly from slide material. Write 2–5 sentences per question.

#### A. Foundations
1. In your own words, what does an LLM do at each step when generating text?
2. Linear regression fits a line by minimizing error. An LLM does something analogous at huge scale. What plays the role of "the points" and what plays the role of "the line"?
3. Why does the same prompt give different answers on repeat runs? Name one situation you'd want that, and one you wouldn't.

#### B. Sources of knowledge
4. There are only two places an LLM can pull information from when answering. What are they?
5. You ask about a fact the model was never trained on, and you didn't include it in your message. What happens, and what should you do instead?
6. When a model "hallucinates," what has gone wrong? Why doesn't telling it "don't hallucinate" fix the problem?

#### C. Context window
7. What kinds of things take up space in the context window during a conversation? List as many as you can.
8. You paste a 100-page PDF and ask one question. Name two things that can go wrong.
9. "Tokens are not words." Why does this matter for cost and for hitting limits? Why might the same sentence in Vietnamese cost more than in English?

#### D. Words as numbers
10. Why turn words into vectors of numbers instead of leaving them as plain strings? What does that enable?
11. Describe a task from your own work where "find things similar in meaning" would beat keyword search.

#### E. Tool use / agent loop
12. When a model "calls a tool," who or what actually executes the tool?
13. Sketch the agent loop as a sequence of steps, from initial prompt to final answer.
14. Where does the tool's result end up after the tool runs? What does that imply for agents that run many steps?
15. True or false: a model can directly delete files on your computer. Explain.
16. In an agent loop, what makes the model decide to stop calling more tools?
17. Why does the *description* you write for a tool matter so much for whether the agent uses it correctly?
18. Combine two ideas from the lecture: tool use is really a mechanism for doing *what* with respect to the model's sources of knowledge?

---

### Tier 2 — Beyond the lecture (stretch)

Not covered directly. Preview of later sessions. Try them — partial answers welcome.

#### F. Going deeper
19. If you set temperature to 0, is the output fully deterministic? Why or why not?
20. Even models with very large context windows can miss facts buried in the middle of a long document. Why might that happen?
21. RAG, stuffing everything into a long context, and fine-tuning are three different strategies. For each, give a situation where it's the right choice.
22. You've heard "MCP" mentioned. In one sentence, what problem is it trying to solve?
23. Why is asking for "structured output / JSON mode" more reliable than just writing "please return JSON" in your prompt?

#### G. Agent loop, harder
24. An agent requests three tool calls in a single step instead of one at a time. Why can that make the whole run much faster?
25. An agent has been running for 50 steps and the context is filling up. What strategies can keep it going?
26. A tool call fails (network error, file not found). What should you send back to the model, and why does hiding the error make things worse?
27. Your agent keeps picking the wrong tool for the job. Where would you look first to debug this?
28. Some tools require human approval before running, others don't. How would you decide which is which?

#### H. Cost and operations
29. What is "prompt caching," and which parts of a prompt benefit from it most?
30. A 10-step agent run often costs far more than 10 single calls. Why?

---

## Part 2 — Practical Assignment

Pick **A + C** (required, ~1 hour). **B** optional if you want a bigger challenge.

### A — Prompt Lab (required)

Pick one real, annoying task from your own work. Examples:
- Turn a messy meeting note into action items with owners and due dates
- Summarize a long email thread into "what was decided / what's next"
- Categorize 20 customer messages into themes

Write **three** versions of the prompt in Claude.ai or ChatGPT:
- **v1 — lazy:** one short sentence, no context
- **v2 — add structure:** add a role ("You are a..."), specify output format
- **v3 — add an example:** include one input → output example so the model sees the pattern

**Deliver:**
- All 3 prompts + the 3 outputs (paste into a doc)
- 3 sentences: what changed between versions, and why you think it changed

---

### C — "Where Does It Break?" Hunt (required)

Give an LLM tasks it *should* fail on. Find and document **three** failures. For each, explain *which lecture concept* predicts the failure.

Ideas to try:
- Count the letter "r" in a long made-up word
- Multiply two 7-digit numbers
- Ask about something that happened last week
- Ask for a citation to a specific real paper
- Ask what's in a file on your computer

**Deliver:** for each of the 3 failures:
- The prompt you used
- The (wrong) output
- Which concept from the slides explains it (tokenizer? no tools? training cutoff? no filesystem access? one of the 2 sources?)

Goal of this exercise: feel *in your bones* why advanced techniques (tools, RAG, MCP, web search) exist. You're building the "why we need this" intuition before we introduce the "how."

---

### B — Build a Tiny Automation (optional stretch)

Pick one repeating annoyance in your work. Build an automation using a no-code tool with an LLM node:
- **Claude Projects** or **Custom GPT** — for "smart assistant with files" style
- **n8n / Zapier / Make** — for trigger → LLM → action pipelines
- **Google Apps Script + Claude API** — if you're comfortable pasting scripts

Examples:
- Inbox: new email → classify → draft reply
- Meeting notes (Notion / Google Doc) → action items → row in a tracker
- Weekly raw data dump → formatted report

**Deliver:**
- Screenshot of the flow / setup
- One sample input and its output
- One failure case you found while testing, and how you fixed (or would fix) it

---

Practical (pick 1, ~2-4h):

  Option A — Embedding playground (beginner):
  Use text-embedding-3-small. Embed 20 sentences (mix topics: food, code, sports). Compute cosine similarity
  matrix. Cluster + visualize 2D (PCA/UMAP). Deliver: notebook + 1 insight.

  Option B — Mini agent loop (intermediate, recommended):
  Build CLI agent from scratch using Claude API with 2 tools: read_file, list_dir. No framework. Loop until
  stop_reason != "tool_use". Task: "summarize this repo." Deliver: ~100 LOC script + transcript log showing
  tool calls.

  Option C — Context window experiment (advanced):
  Take long doc (~50k tokens). Insert secret fact at positions 10%, 50%, 90%. Ask model to retrieve. Measure
  accuracy. Show "lost in middle." Deliver: script + chart + writeup.

  Recommend B — forces understanding of agent loop, tool schema, stop reasons. Maps to Claude Code material
  coming in group 3. Want me draft assignment doc?

Practical — no code, pick 1:

  A — Prompt lab (everyone does this, baseline):
  Same task, 3 prompt versions in Claude.ai or ChatGPT. Task example: "turn this messy meeting note into
  action items with owners + due dates." Show v1 (lazy), v2 (add role + format), v3 (add example). Paste all 3
   outputs. Write 3 sentences: what changed, why.

  B — Build tiny automation (recommended, tech-adjacent):
  Use Claude Projects or Custom GPT or n8n/Zapier + LLM node. No code.
  Pick one real annoyance from own work:
  - Inbox triage → categorize + draft reply
  - Meeting notes → action items → Notion/Sheets row
  - Weekly report from raw data dump
  Deliver: screenshot of flow + 1 sample input/output + 1 failure case found + how fix.

  C — "Where does it break" hunt:
  Give LLM task it should fail: count letters in word, do 7-digit multiply, cite real paper, answer about
  yesterday's news. Document 3 failures. Explain each using slide concepts (tokenizer, no tools, training
  cutoff, no calculator). This one cement foundations hardest.

  Suggested mix: everyone does A + C (~1h total, guarantees concepts stick). Ambitious ones add B.

  Why this work for your audience: A build prompt-craft muscle. C show why advanced techniques (tools, RAG,
  MCP) exist — so when you introduce them later, answer "why we need this" already in their head. B optional
  bridge to automation promise.

## Submission

Paste answers + practical deliverables in a single doc. Due before next session.

If stuck on any Tier 1 question for more than 10 minutes, flag it — that's the signal a slide didn't land, and worth revisiting together.
