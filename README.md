# Next.js + Recursiv starter

A Next.js 14 (App Router) app pre-wired to use the Recursiv SDK for **auth, database, storage, AI agents, chat, social posts,** and **deploys**. Clone it, drop in your API key, and ship.

This template is what apps like **Ticker** and **SparkAI** are built on.

## What's wired

| Surface | Files | Demo route |
|---|---|---|
| **Auth** — sign up / sign in / session / sign out | [`src/lib/auth.ts`](src/lib/auth.ts), [`src/app/(auth)`](src/app/(auth)) | `/sign-in`, `/sign-up` |
| **Database** — Postgres via `r.databases` | [`src/lib/db.ts`](src/lib/db.ts), [`src/actions/notes.ts`](src/actions/notes.ts) | `/notes` |
| **Storage** — file uploads via `r.storage` | [`src/lib/storage.ts`](src/lib/storage.ts), [`src/actions/upload.ts`](src/actions/upload.ts) | `/upload` |
| **AI Agents** — chat + streaming via `r.agents` | [`src/actions/agents.ts`](src/actions/agents.ts), [`src/app/api/agents/[id]/stream/route.ts`](src/app/api/agents/[id]/stream/route.ts) | `/agents` |
| **Chat** — DMs and groups via `r.chat` | [`src/lib/chat.ts`](src/lib/chat.ts), [`src/actions/chat.ts`](src/actions/chat.ts) | `/messages` |
| **Social posts** — feed + composer via `r.posts` | [`src/actions/posts.ts`](src/actions/posts.ts) | `/feed` |
| **Sandbox** — run code remotely via `r.projects.executeCode` | [`src/actions/sandbox.ts`](src/actions/sandbox.ts) | `/sandbox` |

## For AI coding assistants

Read [`CLAUDE.md`](CLAUDE.md) **before** writing any code. It covers Next.js-specific patterns (Server Actions, the `getRecursiv()` singleton, cookie auth, streaming route handlers) and the decision rules for which SDK resource to reach for. The full reference is in [`SDK.md`](SDK.md).

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in RECURSIV_API_KEY, RECURSIV_PROJECT_ID, RECURSIV_ORG_ID
# (use the Recursiv MCP from Claude Desktop to provision project + org in one step)

# 3. Run
npm run dev
```

Open http://localhost:3000.

## Deploy

```bash
# From Claude Desktop with the Recursiv MCP, just say:
#   "Deploy this project."
# Claude calls the deploy_project MCP tool and you get a live URL.
```

See [`DEPLOY.md`](DEPLOY.md) for manual deploy options.

## Architecture

See [`DESIGN.md`](DESIGN.md) for the architectural decisions and how the pieces fit together.

## License

MIT
