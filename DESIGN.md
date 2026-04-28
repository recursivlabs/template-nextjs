# DESIGN

How this template is put together. Optimized for Claude (or any AI coding assistant) to extend without rebuilding the foundation.

## Principles

1. **One platform, one SDK.** Auth, database, storage, AI, chat, deploys all go through `@recursiv/sdk`. The template never reaches for a second auth provider, a separate database, or an external LLM SDK. If you find yourself wanting one, check [`CLAUDE.md`](CLAUDE.md) for the Recursiv equivalent.
2. **SDK lives server-side only.** The Recursiv API key is secret. It must never be imported into a client component. Server Components, Server Actions, and Route Handlers are the only places that touch the SDK.
3. **Server Actions are the default for mutations.** No REST routes, no `/api/*` for ordinary CRUD — just import a function and call it from a client component.
4. **Cookies for sessions.** The auth flow writes an HTTP-only cookie with the Recursiv session token. No client-side token storage. No JWT handling.
5. **Idempotent provisioning.** `ensureDb` and `ensureBucket` are safe to call on every request — they short-circuit after first call and re-provisioning is a no-op server-side.

## Layers

```
┌─────────────────────────────────────────┐
│ Client components (src/components/*)    │  use client; forms, lists, streaming UIs
└────────────┬────────────────────────────┘
             │ form action / fetch
┌────────────▼────────────────────────────┐
│ Server actions (src/actions/*.ts)       │  'use server'; thin orchestration
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│ Server libs (src/lib/*.ts)              │  auth, db, storage, chat helpers
└────────────┬────────────────────────────┘
             │ getRecursiv()
┌────────────▼────────────────────────────┐
│ @recursiv/sdk                           │  one SDK, every resource
└─────────────────────────────────────────┘
```

## Where each surface lives

| Surface | Server lib | Server actions | Routes |
|---|---|---|---|
| Auth | [`src/lib/auth.ts`](src/lib/auth.ts) | [`src/actions/auth.ts`](src/actions/auth.ts) | `/sign-in`, `/sign-up` (under `src/app/(auth)/`) |
| Database | [`src/lib/db.ts`](src/lib/db.ts) | [`src/actions/notes.ts`](src/actions/notes.ts) | `/notes` |
| Storage | [`src/lib/storage.ts`](src/lib/storage.ts) | [`src/actions/upload.ts`](src/actions/upload.ts) | `/upload` |
| Agents | [`src/lib/recursiv.ts`](src/lib/recursiv.ts) | [`src/actions/agents.ts`](src/actions/agents.ts) | `/agents` + `src/app/api/agents/[id]/stream/route.ts` |
| Chat | [`src/lib/chat.ts`](src/lib/chat.ts) | [`src/actions/chat.ts`](src/actions/chat.ts) | `/messages`, `/messages/[id]` |
| Posts | — | [`src/actions/posts.ts`](src/actions/posts.ts) | `/feed` |
| Sandbox | — | [`src/actions/sandbox.ts`](src/actions/sandbox.ts) | `/sandbox` |

## Conventions

- **Pages** are async Server Components. They call server actions or libs directly.
- **Forms** are client components that call a server action via `<form action={...}>`. No fetch boilerplate.
- **Auth-required pages** call `requireSession()` which redirects to `/sign-in` if not signed in.
- **Database migrations** live inline in the action that needs them (see `notes.ts`'s `ensureSchema`). Idempotent CREATE TABLE IF NOT EXISTS.
- **Per-user scoping** is done via `WHERE user_id = $1` in SQL or `users/${user.id}/` prefix in storage keys.
- **Optimistic UI** updates in client components; revalidatePath after the server action returns to reconcile.

## Adding a new surface

1. Find the right Recursiv resource in [`CLAUDE.md`](CLAUDE.md)'s decision-rules table.
2. Create `src/lib/<surface>.ts` with idempotent provisioning + thin SDK wrappers.
3. Create `src/actions/<surface>.ts` with `'use server'` and `requireSession()` at the top of each action.
4. Create `src/app/<surface>/page.tsx` (Server Component) and `src/components/<surface>-*.tsx` (client components for forms/interactivity).
5. Add a link to [`src/components/nav.tsx`](src/components/nav.tsx).

## Multi-tenant notes

Drew's CRM is single-tenant. Rob's law-firm consultancy is multi-tenant. The pattern:

- **Single-tenant**: One Recursiv organization owns everything. All users belong to that org. Scoping by `user_id` is enough.
- **Multi-tenant**: Each customer gets their own org. Use `r.organizations.create` per customer. Scope every query by `org_id`. Use `r.organizations.invite` to add users to a customer's org. Per-customer API keys via `r.auth.createApiKey({ scopes: [...] })` with org-scoped permissions.

The SDK handles tenancy at the org boundary — your code does not need to write a tenancy layer.
