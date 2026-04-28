# CLAUDE.md — Next.js + Recursiv starter

> **Read this file before writing any code in this project.**
> It tells you how to use the Recursiv SDK correctly so the app gets working auth, AI, storage, database, and chat without re-inventing infrastructure.
> For the full SDK reference (every resource, every method, every example), see `SDK.md` in this same folder.

## Golden rules

| Need | Use | Do **NOT** use |
|------|-----|----------------|
| User auth (sign up, sign in, sessions) | `r.auth.signUpAndCreateKey` / `signInAndCreateKey` (per-user API key in cookie) | NextAuth, Auth.js, Clerk, raw fetch to `/api/auth/*` |
| AI chat / agents | `r.agents.create` + `r.agents.chat` / `r.agents.chatStream` | OpenAI / Anthropic SDK directly, Vercel AI SDK with raw model calls |
| Structured app data (tables, records) | `r.databases.ensure` + `r.databases.query` | Prisma, Drizzle, raw `pg`, Supabase, Postgres-on-Vercel |
| File uploads / images | `r.storage.ensureBucket` + presigned URLs | UploadThing, S3 directly, Vercel Blob |
| Messaging between users | `r.chat` | Custom WebSocket layer, Pusher, Ably |
| Social feeds, reactions | `r.posts` + `r.communities` + `r.tags` | Custom social tables in `r.databases` |
| Multi-tenant (each customer = own workspace) | `r.organizations` + scoped per-user keys | Custom user-group tables, schema-per-tenant |
| Transactional email | `r.email.send` | Resend / SendGrid directly |
| Receive webhooks (Stripe, GitHub, etc.) | `r.webhooks.register` | Custom webhook server |
| Server-side cron / scheduled jobs | `r.jobs.create` | Vercel Cron, external cron services |
| Persistent agent memory | `r.memory` (facts, decisions, search) | Storing knowledge in `r.posts` or `r.databases` |

**The whole point**: one SDK, every backend service. If you reach for a non-Recursiv solution, stop and use the Recursiv resource above instead. The platform handles infra so the app can focus on product.

---

## Next.js patterns in this template

### 1. The SDK is per-user — no platform API key on the server

This template uses the **per-user API key** pattern (same as Kempt, Alua, Dibs, Minds):

- At **sign-up**, the app calls `r.auth.signUpAndCreateKey(...)` (via an "anonymous" SDK with no key). Recursiv creates the user AND a per-user API key scoped to your org.
- The per-user key goes into an **HTTP-only cookie**.
- Every subsequent SDK call reads the cookie, builds an SDK instance bound to the user's key, and acts as that user.

The deployed app **does not need `RECURSIV_API_KEY`**. There is no god platform key on the server. Each request is the user — Recursiv enforces ownership and access. You don't write `WHERE user_id = $1` to scope queries; the platform does it for you.

```typescript
// src/lib/recursiv.ts — already wired
import { Recursiv } from '@recursiv/sdk';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'recursiv_session';

export async function anonSdk() {
  return new Recursiv({ allowNoKey: true });
}

export async function createAuthedSdk(apiKey: string) {
  return new Recursiv({ apiKey });
}

export async function getAuthedSdk() {
  const apiKey = cookies().get(SESSION_COOKIE)?.value;
  if (!apiKey) throw new Error('Not signed in.');
  return createAuthedSdk(apiKey);
}
```

Every server-side file that needs the SDK calls `getAuthedSdk()`. The SDK must **never** be imported into a client component. Use it only from:
- Server Components (default in App Router)
- Server Actions (`'use server'`)
- Route handlers (`app/**/route.ts`)

### 2. Auth: signUpAndCreateKey + cookie

Sign-in/sign-up server actions call `auth.signUpAndCreateKey` / `signInAndCreateKey` (one round-trip: creates user + per-user API key) and write the per-user key to an HTTP-only cookie.

```typescript
// src/lib/auth.ts (already wired)
'use server';
import { cookies } from 'next/headers';
import { anonSdk, SESSION_COOKIE } from './recursiv';

const ORG_ID = process.env.RECURSIV_ORG_ID!;
const USER_KEY_SCOPES = [
  'users:read',
  'posts:read', 'posts:write',
  'agents:read', 'agents:write',
  'chat:read', 'chat:write',
  'databases:read', 'databases:write',
  'storage:read', 'storage:write',
  'organizations:read', 'organizations:write',
  // ...add scopes as you add features
];

export async function signUp(input: { name: string; email: string; password: string }) {
  const r = await anonSdk();
  const result = await r.auth.signUpAndCreateKey(input, {
    name: `app-session-${Date.now()}`,
    scopes: USER_KEY_SCOPES,
    organizationId: ORG_ID,
  });
  cookies().set(SESSION_COOKIE, result.apiKey, {
    httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return result.user;
}
```

When you add a new SDK surface, also add the scope to `USER_KEY_SCOPES`. Existing users will need to re-authenticate to get the new scope.

### 3. Server Actions are the default for mutations

Sign up, sign in, posting data, uploading files — all happen in Server Actions. Client components call them directly.

```typescript
// src/actions/notes.ts
'use server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function createNote(formData: FormData) {
  const user = await requireSession();
  await query('INSERT INTO notes (title, body, user_id) VALUES ($1, $2, $3)', [
    formData.get('title'), formData.get('body'), user.id,
  ]);
}
```

```tsx
// src/components/note-form.tsx
'use client';
import { createNote } from '@/actions/notes';

export function NoteForm() {
  return (
    <form action={createNote}>
      <input name="title" /><textarea name="body" /><button>Save</button>
    </form>
  );
}
```

### 4. Pages that hit the SDK must opt out of static prerender

Next.js tries to statically prerender Server Components at build time. Pages that call the SDK at render time will fail because the build environment has no auth state. Add `export const dynamic = 'force-dynamic'` to every page that touches the SDK:

```tsx
// src/app/notes/page.tsx
import { listNotes } from '@/actions/notes';

export const dynamic = 'force-dynamic'; // ← required

export default async function NotesPage() {
  const notes = await listNotes();
  return <NoteList notes={notes} />;
}
```

### 5. Streaming responses use Route Handlers

Agent chat streams come back via a Route Handler that pipes the SDK's SSE stream to the client.

```typescript
// src/app/api/agents/[id]/stream/route.ts (already wired)
import { getAuthedSdk } from '@/lib/recursiv';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { message } = await req.json();
  const sdk = await getAuthedSdk();
  const stream = sdk.agents.chatStream(params.id, { message });

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

### 6. Project + database provisioning happens at app startup

A Recursiv project owns one Postgres database. Provision it once (idempotent) and reuse:

```typescript
// src/lib/db.ts — already wired
'use server';
import { getAuthedSdk } from './recursiv';

const PROJECT_ID = process.env.RECURSIV_PROJECT_ID!;
const DB_NAME = 'app-db';

let _ensured = false;
export async function ensureDb() {
  if (_ensured) return;
  const sdk = await getAuthedSdk();
  await sdk.databases.ensure({ project_id: PROJECT_ID, name: DB_NAME });
  _ensured = true;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  await ensureDb();
  const sdk = await getAuthedSdk();
  const { data } = await sdk.databases.query({
    project_id: PROJECT_ID, database_name: DB_NAME, sql, params,
  });
  return data.rows as T[];
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
| **Chat** (user-to-user messaging) | `src/lib/chat.ts`, `src/actions/chat.ts`, `src/app/messages/page.tsx` | `/messages` |
| **Social posts** (feeds + composer) | `src/actions/posts.ts`, `src/app/feed/page.tsx` | `/feed` |
| **Sandbox** (run code remotely) | `src/actions/sandbox.ts`, `src/app/sandbox/page.tsx` | `/sandbox` |

Every page works out of the box once `.env.local` is set with `RECURSIV_ORG_ID` + `RECURSIV_PROJECT_ID`. **No `RECURSIV_API_KEY` needed** — each user's per-user key is created at sign-up and stored in their cookie.

---

## Adding a new feature — the recipe

When the user asks for something this template doesn't cover (e.g. "add Stripe checkout," "add transactional email," "make it multi-tenant"):

1. **Find the right Recursiv resource** in the golden-rules table at the top of this file. If it's not there, open `SDK.md` and search.
2. **Add the scope** to `USER_KEY_SCOPES` in `src/lib/auth.ts` (and document that existing users need to re-auth).
3. **Add a server action** under `src/actions/<feature>.ts`. Mark with `'use server'`, call `getAuthedSdk()` to get the user-scoped SDK, and `requireSession()` if the user must be signed in.
4. **Add a UI route** under `src/app/<feature>/page.tsx` with `export const dynamic = 'force-dynamic'`. Server Component for reads, client form components for writes.
5. **Add a nav link** to `src/components/nav.tsx` so it's discoverable.
6. **Update this file** with the new row in the "What's already wired" table.

### Common asks and what they map to

| User asks for | Recursiv resource | Recipe |
|---------------|-------------------|--------|
| "Add Google sign-in" | `r.auth` (OAuth via Recursiv) | Add OAuth provider in Recursiv org settings, add a redirect button to the sign-in page |
| "Add a Stripe checkout" | `r.webhooks` + `r.email` for receipts | Register webhook for `checkout.session.completed`, send confirmation email via `r.email.send` |
| "Make it multi-tenant" | `r.organizations` | Each customer creates an org via `r.organizations.create`. The per-user key's `organizationId` scopes data per customer. |
| "Send a daily summary email" | `r.jobs.create` + `r.email.send` | Server-side cron job that queries the DB and sends email |
| "Remember user preferences" | `r.memory.facts.add` | Persist facts scoped to `project_id` and user |
| "Receive incoming Stripe webhooks" | `r.webhooks.register` | Handler runs in Recursiv sandbox, no extra infra |

---

## Environment variables

```bash
# .env.local — required
RECURSIV_ORG_ID=org_...        # all per-user API keys are scoped to this org
RECURSIV_PROJECT_ID=proj_...   # owns your Postgres + storage buckets

# optional
RECURSIV_API_BASE_URL=         # only for staging / self-host
```

There is intentionally **no `RECURSIV_API_KEY`** — this template uses the per-user API key pattern. Use the Recursiv MCP from Claude Desktop to provision the org + project rather than copy-pasting IDs by hand.

---

## When you're stuck

- **`SDK.md`** in this folder is the full reference — every resource, every method, every working example. Search it first.
- **`https://docs.recursiv.io`** has tutorials and platform deep-dives.
- The Recursiv MCP (200+ tools) covers most platform operations.

If a Recursiv resource doesn't exist for what you need, that's a signal to ask the user — don't reach for a non-Recursiv alternative without flagging it explicitly.
