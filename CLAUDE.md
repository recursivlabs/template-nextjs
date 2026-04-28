# CLAUDE.md — Next.js + Recursiv starter

> **Read this file before writing any code in this project.**
> It tells you how to use the Recursiv SDK correctly so the app gets working auth, AI, storage, database, and chat without re-inventing infrastructure.
> For the full SDK reference (every resource, every method, every example), see `SDK.md` in this same folder.

## Golden rules

| Need | Use | Do **NOT** use |
|------|-----|----------------|
| User auth (sign up, sign in, sessions) | `r.auth.signUp` / `r.auth.signIn` / `r.auth.getSession` | NextAuth, Auth.js, Clerk, raw fetch to `/api/auth/*` |
| AI chat / agents | `r.agents.create` + `r.agents.chat` / `r.agents.chatStream` | OpenAI / Anthropic SDK directly, Vercel AI SDK with raw model calls |
| Structured app data (tables, records) | `r.databases.ensure` + `r.databases.query` | Prisma, Drizzle, raw `pg`, Supabase, Postgres-on-Vercel |
| File uploads / images | `r.storage.ensureBucket` + presigned URLs | UploadThing, S3 directly, Vercel Blob |
| Messaging between users | `r.chat` | Custom WebSocket layer, Pusher, Ably |
| Social feeds, reactions | `r.posts` + `r.communities` + `r.tags` | Custom social tables in `r.databases` |
| Multi-tenant (each customer = own workspace) | `r.organizations` + scoped API keys | Custom user-group tables, schema-per-tenant |
| Transactional email | `r.email.send` | Resend / SendGrid directly |
| Receive webhooks (Stripe, GitHub, etc.) | `r.webhooks.register` | Custom webhook server |
| Server-side cron / scheduled jobs | `r.jobs.create` | Vercel Cron, external cron services |
| Persistent agent memory | `r.memory` (facts, decisions, search) | Storing knowledge in `r.posts` or `r.databases` |

**The whole point**: one SDK, one API key. If you reach for a non-Recursiv solution, stop and use the Recursiv resource above instead. The platform handles infra so the app can focus on product.

---

## Next.js patterns in this template

### 1. The SDK lives server-side only

The Recursiv SDK uses your secret API key (`RECURSIV_API_KEY` in `.env.local`). It must **never** be imported into a client component. Use it from:

- Server Components (default in App Router)
- Server Actions (`'use server'`)
- Route handlers (`app/**/route.ts`)

```typescript
// src/lib/recursiv.ts — already wired
import { Recursiv } from '@recursiv/sdk';

let _client: Recursiv | null = null;

export function getRecursiv(): Recursiv {
  if (!_client) _client = new Recursiv(); // reads RECURSIV_API_KEY
  return _client;
}
```

Every server-side file that needs the SDK calls `getRecursiv()`.

### 2. Server Actions are the default for mutations

Sign up, sign in, posting data, uploading files — all happen in Server Actions. Client components call them directly.

```typescript
// src/actions/notes.ts
'use server';
import { getRecursiv } from '@/lib/recursiv';

export async function createNote(input: { title: string; body: string }) {
  const r = getRecursiv();
  await r.databases.query({
    project_id: process.env.RECURSIV_PROJECT_ID!,
    name: 'app-db',
    sql: 'INSERT INTO notes (title, body) VALUES ($1, $2)',
    params: [input.title, input.body],
  });
}
```

```tsx
// src/components/note-form.tsx
'use client';
import { createNote } from '@/actions/notes';

export function NoteForm() {
  return (
    <form action={async (fd) => {
      await createNote({ title: fd.get('title') as string, body: fd.get('body') as string });
    }}>
      <input name="title" /><textarea name="body" /><button>Save</button>
    </form>
  );
}
```

### 3. Auth uses HTTP-only cookies

Sign-in/sign-up server actions call `r.auth.signIn`/`signUp` and write the session token to an HTTP-only cookie via `next/headers`. No client-side token handling.

```typescript
// src/lib/auth.ts (already wired)
'use server';
import { cookies } from 'next/headers';
import { getRecursiv } from './recursiv';

const COOKIE = 'recursiv_session';

export async function signIn(email: string, password: string) {
  const r = getRecursiv();
  const session = await r.auth.signIn({ email, password });
  cookies().set(COOKIE, session.token, { httpOnly: true, sameSite: 'lax', secure: true });
  return session.user;
}

export async function getSession() {
  const r = getRecursiv();
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return r.auth.getSession(token);
}

export async function signOut() {
  const r = getRecursiv();
  const token = cookies().get(COOKIE)?.value;
  if (token) await r.auth.signOut(token);
  cookies().delete(COOKIE);
}
```

### 4. Streaming responses use Route Handlers

Agent chat streams come back via a Route Handler that pipes the SDK's SSE stream to the client.

```typescript
// src/app/api/agents/[id]/stream/route.ts (already wired)
import { getRecursiv } from '@/lib/recursiv';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { message } = await req.json();
  const r = getRecursiv();
  const stream = r.agents.chatStream(params.id, { message });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}
```

### 5. Project + database provisioning happens at app startup

A Recursiv project owns one Postgres database. Provision it once (idempotent) and reuse:

```typescript
// src/lib/db.ts — already wired
'use server';
import { getRecursiv } from './recursiv';

const PROJECT_ID = process.env.RECURSIV_PROJECT_ID!;
const DB_NAME = 'app-db';

let _ensured = false;
export async function ensureDb() {
  if (_ensured) return;
  const r = getRecursiv();
  await r.databases.ensure({ project_id: PROJECT_ID, name: DB_NAME });
  _ensured = true;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  await ensureDb();
  const r = getRecursiv();
  const { data } = await r.databases.query({ project_id: PROJECT_ID, name: DB_NAME, sql, params });
  return (data as any).rows as T[];
}
```

---

## What's already wired in this template

| Surface | Files | Demo route |
|---------|-------|------------|
| **Auth** (sign up / sign in / session / sign out) | `src/lib/auth.ts`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx` | `/sign-in`, `/sign-up` |
| **Database** (Postgres via `r.databases`) | `src/lib/db.ts`, `src/actions/notes.ts`, `src/app/notes/page.tsx` | `/notes` |
| **Storage** (file uploads via `r.storage`) | `src/lib/storage.ts`, `src/actions/upload.ts`, `src/app/upload/page.tsx` | `/upload` |
| **Agents** (AI chat with streaming) | `src/lib/recursiv.ts`, `src/actions/agents.ts`, `src/app/api/agents/[id]/stream/route.ts`, `src/app/agents/page.tsx` | `/agents` |
| **Chat** (user-to-user messaging) | `src/actions/chat.ts`, `src/app/messages/page.tsx` | `/messages` |
| **Social posts** (feeds + composer) | `src/actions/posts.ts`, `src/app/feed/page.tsx` | `/feed` |
| **Sandbox** (run code remotely) | `src/actions/sandbox.ts`, `src/app/sandbox/page.tsx` | `/sandbox` |

Every page works out of the box once `.env.local` is set with `RECURSIV_API_KEY`, `RECURSIV_PROJECT_ID`, and `RECURSIV_ORG_ID`.

---

## Adding a new feature — the recipe

When the user asks for something this template doesn't cover (e.g. "add Stripe checkout," "add transactional email," "make it multi-tenant"):

1. **Find the right Recursiv resource** in the golden-rules table at the top of this file. If it's not there, open `SDK.md` and search.
2. **Add a server action** under `src/actions/<feature>.ts`. Mark with `'use server'` and call the SDK from `getRecursiv()`.
3. **Add a UI route** under `src/app/<feature>/page.tsx` — Server Component for reads, client form components for writes.
4. **Add a nav link** to `src/components/nav.tsx` so it's discoverable.
5. **Update this file** with the new row in the "What's already wired" table.

### Common asks and what they map to

| User asks for | Recursiv resource | Recipe |
|---------------|-------------------|--------|
| "Add Google sign-in" | `r.auth` (OAuth flow via Recursiv) | Replace email/password forms with redirect to `r.auth` OAuth route |
| "Add a Stripe checkout" | `r.webhooks` + `r.email` for receipts | Register webhook for `checkout.session.completed`, send confirmation email via `r.email.send` |
| "Make it multi-tenant" | `r.organizations` | Each user creates an org via `r.organizations.create`, all queries scope to `org_id` |
| "Send a daily summary email" | `r.jobs.create` + `r.email.send` | Server-side cron job that queries the DB and sends email |
| "Remember user preferences across sessions" | `r.memory.facts.add` | Persist facts scoped to `project_id` and user |
| "Receive incoming Stripe webhooks" | `r.webhooks.register` | Handler runs in Recursiv sandbox, no extra infra |

---

## Environment variables

```bash
# .env.local — required
RECURSIV_API_KEY=sk_live_...      # from https://recursiv.io → Org Settings → API Keys
RECURSIV_PROJECT_ID=proj_...      # set by `r.projects.create` or via Recursiv MCP
RECURSIV_ORG_ID=org_...           # set when you create your org

# optional
RECURSIV_API_BASE_URL=            # only set when running against staging/self-host
```

Use the Recursiv MCP from Claude Desktop to provision the project and database in one step rather than copy-pasting IDs by hand.

---

## When you're stuck

- **`SDK.md`** in this folder is the full reference — every resource, every method, every working example. Search it first.
- **`https://docs.recursiv.io`** has tutorials and platform deep-dives.
- The MCP tools (200+) cover most platform operations: `list_tools` will show what's available.

If a Recursiv resource doesn't exist for what you need, that's a signal to ask the user — don't reach for a non-Recursiv alternative without flagging it explicitly.
