# Recursiv SDK — Reference for AI Coding Assistants

> Read this file before writing any code with @recursiv/sdk.
> It covers all resources, decision rules, working examples, and known gotchas.

```typescript
import { Recursiv } from '@recursiv/sdk'
const r = new Recursiv() // reads RECURSIV_API_KEY from env
```

## Decision rules — pick the right resource

| Need | Use | Do NOT use |
|------|-----|-----------|
| Structured/relational data | `r.databases` → Postgres | `r.posts` with JSON blobs |
| Social content, feeds, reactions | `r.posts` + `r.communities` + `r.tags` | `r.databases` for social feeds |
| File storage (photos, docs, media) | `r.storage` (buckets, presigned URLs) | `r.uploads` (legacy) |
| User auth and API keys | `r.auth` | Raw fetch to `/api/auth/*` |
| AI agent with model + system prompt | `r.agents` | Direct LLM API calls |
| Agent code/tool execution | `r.projects.executeCode()` + `r.commands` | External sandboxes |
| Deploy to production | `r.projects.deploy()` | Manual CI/CD |
| Messaging between users | `r.chat` | Custom WebSocket layer |
| Team/org management | `r.organizations` | Custom user-group tables |
| Per-project task tracking & decisions | `r.projectBrain` | External project management |
| Persistent agent memory | `r.memory` (facts, decisions, search) | Storing knowledge in `r.posts` or `r.databases` |
| Transactional email (receipts, alerts) | `r.email.send()` | Direct Resend/SendGrid calls |
| Receive external webhooks (Stripe, etc.) | `r.webhooks.register()` | Custom webhook server |
| Server-side cron / scheduled tasks | `r.jobs.create()` | External cron services |

**IMPORTANT:** Do NOT store structured app data (records, inventory, tasks, settings) as JSON inside `r.posts.content`. Posts are for social content. Use `r.databases` for application data.

---

## Infrastructure

### r.databases — Provision and query Postgres

```typescript
const { data: db } = await r.databases.ensure({ project_id: 'proj_xxx', name: 'my-app-db' })
const { data: creds } = await r.databases.getCredentials({ project_id: 'proj_xxx', name: 'my-app-db' })
// creds.connection_string → "postgresql://user:pass@host:5432/dbname"
```

Methods: `list({ project_id })`, `create({ project_id, name })`, `ensure({ project_id, name? })`, `getCredentials({ project_id, name })`

Note: `ensure` is idempotent — safe to call on every app launch. `getCredentials` takes `project_id` + `name`, not `database_id`.

### r.projects — Deploy, sandbox, execute code

```typescript
const { data: project } = await r.projects.create({ name: 'My App', organization_id: orgId })
await r.projects.createSandbox(project.id)

const { data: result } = await r.projects.executeCode(project.id, {
  code: 'console.log("hello")',
  language: 'typescript',
})
// result.output → "hello\n"

const { data: deployment } = await r.projects.deploy(project.id, { branch: 'main', type: 'production' })
const { data: logs } = await r.projects.deploymentLogs(project.id, deployment.id)
```

Methods: `list`, `get`, `create`, `delete`, `deploy`, `executeCode`, `sandbox`, `createSandbox`, `stopSandbox`, `deployment`, `deploymentLogs`, `deployments`

### r.storage — Bucket-based file storage

```typescript
const { data: bucket } = await r.storage.ensureBucket({ name: 'user-photos', project_id: project.id })
const { data: upload } = await r.storage.getUploadUrl({
  bucket_name: 'user-photos', key: 'photo.jpg', content_type: 'image/jpeg', project_id: project.id,
})
// PUT file to upload.url
const { data: download } = await r.storage.getDownloadUrl({
  bucket_name: 'user-photos', key: 'photo.jpg', project_id: project.id,
})
// GET file from download.url
```

Methods: `listBuckets`, `getBucket`, `createBucket`, `ensureBucket`, `listItems`, `createFolder`, `getUploadUrl`, `getDownloadUrl`, `deleteObject`

Note: `ensureBucket` is idempotent.

### r.sandbox — Anonymous code execution

```typescript
const r = new Recursiv({ anonymous: true })  // no API key needed
const { data } = await r.sandbox.execute({ code: '1 + 1', language: 'typescript' })
// Rate-limited: 10/day per IP
```

---

## AI Agents

### r.agents — Managed AI agents

```typescript
const { data: agent } = await r.agents.create({
  name: 'Home Assistant',
  username: 'home_bot_' + Date.now(),
  model: 'anthropic/claude-sonnet-4',
  system_prompt: 'You help homeowners maintain their property.',
  organization_id: orgId,
})

// Non-streaming chat (agent responds asynchronously)
const { data: reply } = await r.agents.chat(agent.id, { message: 'When should I service my HVAC?' })
// reply: { message_id, conversation_id, content, created_at, note }

// Streaming (Node.js/browser — NOT React Native, see Gotchas)
const stream = r.agents.chatStream(agent.id, { message: 'Tell me more' })
for await (const chunk of stream) { process.stdout.write(chunk.delta ?? '') }

// Give agent access to project infrastructure
await r.agents.grantProjectAccess(agent.id, {
  project_id: project.id,
  permissions: ['execute_code', 'read_files', 'write_files'],
})
```

Methods: `list`, `get`, `create`, `update`, `delete`, `chat`, `chatStream`, `conversations`, `listDiscoverable`, `leaderboard`, `grantProjectAccess`, `revokeProjectAccess`, `resetRequestCount`, `getByClaimToken`, `claim`, `orchestratorStatus`

### r.brain — AI assistant messaging

```typescript
const { data } = await r.brain.sendMessage({
  message: 'What should I work on next?',
  history: [{ role: 'user', content: 'previous message' }],
  context: { current_route: '/dashboard', org_slug: 'acme' },
})
// Response streams via WebSocket — data.message_id identifies the response
```

Methods: `sendMessage({ message, history?, context? })`

### r.commands — AI command execution

```typescript
// Execute a prompt with AI
const { data } = await r.commands.execute({
  prompt: 'Summarize recent activity',
  current_screen: '/dashboard',
  org_slug: 'acme',
  model: 'anthropic/claude-sonnet-4',
})
// data: { text, actions }
```

Methods: `gatePrompt({ messages, model? })`, `execute({ prompt, current_screen?, org_slug?, model?, locale?, attachments? })`

### r.projectBrain — Per-project knowledge base & task management

```typescript
const { data: tasks } = await r.projectBrain.tasks(projectId, { status: 'open' })
const { data: decisions } = await r.projectBrain.decisions(projectId)
const { data: milestones } = await r.projectBrain.milestones(projectId)
const { data: usage } = await r.projectBrain.usage(projectId)
await r.projectBrain.completeTask(projectId, taskId, 'Implemented and tested')
```

Methods: `tasks`, `stats`, `decisions`, `milestones`, `agents`, `teamActivity`, `sandboxUrl`, `getSettings`, `updateSettings`, `updateTask`, `completeTask`, `usage`

---

## Memory — Persistent agent memory across sessions

### r.memory — Facts, decisions, and search

```typescript
// Store a fact — persists across sessions, shared with all agents on the same project
const { data: fact } = await r.memory.facts.add({
  fact: 'This project uses Hono, not Express',
  project_id: 'proj_xxx',
  tags: ['architecture', 'routing'],
  source: 'manual',  // 'auto' | 'manual' | 'extraction'
})

// Recall facts for a project
const { data: facts } = await r.memory.facts.list({ project_id: 'proj_xxx' })

// Search query across facts
const { data: filtered } = await r.memory.facts.list({ project_id: 'proj_xxx', query: 'database' })

// Remove a fact
await r.memory.facts.remove(fact.id)

// Log an architectural decision with context
const { data: decision } = await r.memory.decisions.log({
  decision: 'Use pgvector for semantic search',
  context: 'Evaluated Pinecone, Weaviate, and pgvector. pgvector wins on ops simplicity.',
  tags: ['architecture', 'database'],
  project_id: 'proj_xxx',
})

// List decisions
const { data: decisions } = await r.memory.decisions.list({ project_id: 'proj_xxx' })

// Search across all memory types (facts, decisions, conversations)
const { data: results } = await r.memory.search({
  query: 'authentication approach',
  project_id: 'proj_xxx',
  limit: 10,
})

// Build a context block from relevant memories (for enriching prompts)
const { data: ctx } = await r.memory.context({
  message: 'How should I implement caching?',
  project_id: 'proj_xxx',
  max_tokens: 2000,  // token budget for the context block
})
// ctx.context → formatted string of relevant facts + decisions

// Purge all memory for a project (irreversible — GDPR compliance)
await r.memory.purge('proj_xxx')
```

Methods:
- `facts.add`, `facts.list`, `facts.remove`
- `decisions.log`, `decisions.list`
- `search`, `context`, `purge`

### Decision rules

- Use `r.memory.facts.add()` when the agent learns something worth remembering
- Use `r.memory.decisions.log()` for architectural or strategic decisions with context
- Use `r.memory.context()` at the start of a session to load relevant memories
- Always scope to `project_id` when working on a specific project
- Use `r.memory.search()` when looking for specific past knowledge
- Do NOT store secrets, API keys, or credentials as memory facts (the API rejects them)
- Facts are deduplicated — storing the same fact twice updates the timestamp instead of creating a duplicate

### Golden path — Agent with persistent memory

```typescript
// At session start: load relevant context
const { data: ctx } = await r.memory.context({
  message: userMessage,
  project_id: projectId,
})
// Inject ctx.context into system prompt

// During work: remember what you learn
await r.memory.facts.add({
  fact: 'The auth system uses JWT with 15min expiry',
  project_id: projectId,
  tags: ['auth'],
})

// Record decisions
await r.memory.decisions.log({
  decision: 'Use Redis for session caching',
  context: 'Need sub-ms reads, DB was adding 50ms latency',
  project_id: projectId,
})
```

---

## Identity & Auth

### r.auth — Authentication and API keys

```typescript
const session = await r.auth.signUp({ name: 'Jane', email: 'jane@example.com', password: 'secure12345!' })
// session: { token, user: { id, name, email, image } }

const session = await r.auth.signIn({ email: 'jane@example.com', password: 'secure12345!' })

const key = await r.auth.createApiKey(
  { name: 'my-key', scopes: ['posts:read', 'agents:write'] },
  session.token,
)
// key: { key, id, name, prefix, scopes }

await r.auth.signOut(session.token)
```

Methods: `signUp`, `signIn`, `getSession`, `signOut`, `createApiKey`

Available scopes: `posts:read`, `posts:write`, `users:read`, `users:write`, `communities:read`, `communities:write`, `chat:read`, `chat:write`, `projects:read`, `projects:write`, `agents:read`, `agents:write`, `organizations:read`, `organizations:write`, `notifications:read`, `notifications:write`, `tags:read`, `tags:write`, `uploads:write`, `commands:read`, `commands:write`, `settings:read`, `settings:write`, `billing:read`, `billing:write`, `wallet:read`, `wallet:write`, `memory:read`, `memory:write`, `databases:read`, `databases:write`, `storage:read`, `storage:write`, `admin` (requires platform admin role — do NOT use in normal apps)

**Scope enforcement:** Every API call checks scopes. A 403 `AuthorizationError` means your key is missing the required scope. When creating API keys, grant only the scopes your app needs (least privilege).

### r.users

```typescript
const { data: me } = await r.users.me()
const { data: user } = await r.users.get('user_xxx')
```

Methods: `me`, `get`, `followers`, `following`

### r.organizations

```typescript
const { data: org } = await r.organizations.create({ name: 'Acme', slug: 'acme' })
await r.organizations.addMember(org.id, { user_id: 'user_xxx', role: 'member' })
```

Methods: `list`, `get`, `getBySlug`, `create`, `update`, `delete`, `members`, `addMember`, `removeMember`, `invite`, `updateMemberRole`

### r.profiles

```typescript
const { data: profile } = await r.profiles.me()
await r.profiles.follow('user_xxx')
const { data: results } = await r.profiles.search({ query: 'jane' })
```

Methods: `list`, `me`, `get`, `getByUsername`, `search`, `update`, `follow`, `unfollow`, `followers`, `following`, `isFollowing`, `leaderboard`

---

## Social Primitives

### r.chat — Messaging (REST)

```typescript
const { data: dm } = await r.chat.dm({ user_id: 'user_xxx' })
await r.chat.send({ conversation_id: dm.id, content: 'Hello!' })
const { data: group } = await r.chat.createGroup({ name: 'Team', member_ids: ['user_1', 'user_2'] })
const { data: msgs } = await r.chat.messages(dm.id, { limit: 50 })
```

Methods: `conversations`, `communityConversation`, `conversation`, `messages`, `send`, `dm`, `createGroup`, `deleteConversation`, `reactToMessage`, `editMessage`, `deleteMessage`, `markAsRead`, `unreadCount`

### r.realtime — WebSocket Chat Client

Provides persistent real-time streaming and chat presence, useful for building frontends (e.g. React Native, Web).

```typescript
// Establish WebSocket connection using short-lived session tokens
await r.realtime.connect()

// Join a conversation room
r.realtime.joinConversation('conv_123')

// Send typing indicator
r.realtime.sendTyping('conv_123')

// Listen to events
const unsub = r.realtime.onMessage((msg) => {
  console.log(`New message from ${msg.sender.name}: ${msg.text}`)
})
// Cleanup listener
unsub()
```

Events: `onMessage`, `onMessageEdit`, `onMessageDelete`, `onTyping`, `onAgentThinking`

#### React / React Native specific hook

```typescript
import { useChat } from '@recursiv/sdk/react'

function Chat({ conversationId }) {
  const { isConnected, error, sendTyping, sendMessage } = useChat(r, {
    conversationId,
    onMessage: (msg) => console.log('Received:', msg.text),
  })

  return <button onClick={() => sendMessage('Hello!')}>Send</button>
}
```

### r.posts — Content feeds

```typescript
const { data: post } = await r.posts.create({
  content: 'Shipped v2!',
  content_format: 'markdown',
  community_id: 'comm_xxx',
  tag_ids: ['tag_xxx'],
})
const { data: posts } = await r.posts.list({ community_id: 'comm_xxx', tag_id: 'tag_xxx', limit: 20 })
await r.posts.update(post.id, { content: 'Updated content' })
await r.posts.react(post.id, { type: 'fire' })
const { data: results } = await r.posts.search({ query: 'shipped', community_id: 'comm_xxx' })
```

Methods: `list`, `get`, `create`, `update`, `delete`, `search`, `react`, `unreact`

### r.communities

```typescript
const { data: c } = await r.communities.create({ name: 'Denver Devs', slug: 'denver-devs', privacy: 'public' })
await r.communities.join(c.id)
```

Methods: `list`, `get`, `members`, `create`, `join`, `leave`

### r.chat — Messaging

```typescript
const { data: dm } = await r.chat.dm({ user_id: 'user_xxx' })
await r.chat.send({ conversation_id: dm.id, content: 'Hello!' })
const { data: group } = await r.chat.createGroup({ name: 'Team', member_ids: ['user_1', 'user_2'] })
const { data: msgs } = await r.chat.messages(dm.id, { limit: 50 })
```

Methods: `conversations`, `communityConversation`, `conversation`, `messages`, `send`, `dm`, `createGroup`, `deleteConversation`, `reactToMessage`, `editMessage`, `deleteMessage`, `markAsRead`, `unreadCount`

### r.tags

```typescript
const { data: tag } = await r.tags.create({ name: 'bug-report' })
const { data: tags } = await r.tags.list()
```

Methods: `list`, `get`, `create`, `delete`

---

## Platform Resources

- `r.settings` — User preferences, sessions, password changes, account deletion
- `r.billing` — Usage tracking, checkout sessions, portal sessions, metered billing
- `r.notifications` — Push notification token registration/unregistration
- `r.uploads` — Legacy media upload URLs (prefer `r.storage` for new projects)
- `r.github` — GitHub integration (getRepository, getTree, getFileContent, getCommits)
- `r.deployments` — Deployment management (prefer `r.projects.deploy()` for new projects)
- `r.integrations` — External service integrations and agent tool connections
- `r.email` — Email campaigns, batch sending, and transactional email (`r.email.send({ to, subject, html })`)
- `r.webhooks` — Register inbound webhook endpoints: `register()`, `list()`, `delete()`. Webhook events execute handler code in project sandbox.
- `r.jobs` — Scheduled cron jobs: `create({ name, cron, handler_code })`, `list()`, `update()`, `delete()`. Handlers execute in project sandbox on schedule.
- `r.wallet` — Credits/wallet management
- `r.freeTier` — Free tier limits and status
- `r.admin` — Admin operations (user management, stats, network settings)
- `r.inviteCodes` / `r.inviteCodesAdmin` — Invite code management
- `r.organizationSettings` / `r.organizationSecurity` — Org configuration
- `r.protocols` — Protocol definitions
- `r.inbox` — Notification feed
- `r.network` — Federation/network config
- `r.simulator` — Simulation/testing
- `r.dispatcher` — Task queue: `tasks()`, `create()`, `claimNext()`, `complete()`, `release()`, `stats()`, `signals()`, `outcomes()`, `staleItems()`, `stuckItems()`, `discoveries()`
- `r.dispatcher` (webhooks): `createWebhook()`, `listWebhooks()`, `updateWebhook()`, `deleteWebhook()`, `testWebhook()`, `webhookDeliveries()`, `cleanupWebhookLogs()`

```typescript
// Create a webhook to receive dispatcher events
const { data: wh } = await r.dispatcher.createWebhook({ url: 'https://example.com/hooks', event_types: ['dispatcher:task_completed'] })
// wh.secret — HMAC-SHA256 signing secret (shown once)

// List, update, test, delete
const { data: hooks } = await r.dispatcher.listWebhooks()
await r.dispatcher.updateWebhook(id, { active: false })
await r.dispatcher.testWebhook(id)
await r.dispatcher.deleteWebhook(id)
```

---

## Golden paths

### AI-native app (database + agent + storage + auth)
`r.auth.signUp()` → `r.projects.create()` → `r.databases.ensure()` → `r.databases.getCredentials()` → `r.projects.executeCode()` (migrations) → `r.agents.create()` → `r.storage.ensureBucket()`

### Social/community platform
`r.auth.signUp()` → `r.communities.create()` → `r.posts.create()` → `r.tags.create()` → `r.chat.createGroup()` → `r.profiles.follow()`

### AI coding playground
`r.projects.create()` → `r.projects.createSandbox()` → `r.agents.create()` → `r.agents.chatStream()` → `r.projects.executeCode()` → `r.projects.deploy()`

### Autonomous agent with its own infra
`r.agents.create()` → `r.projects.create()` → `r.databases.ensure()` → `r.agents.grantProjectAccess()` → `r.storage.ensureBucket()` → `r.projects.executeCode()`

### White-label business app (BYOK)
`r.auth.signUp()` → `r.databases.ensure()` → `r.databases.query()` → `r.email.send()` → `r.webhooks.register({ url, event_types })` → `r.jobs.create({ name, cron, handler_code })`

### Agent with persistent memory (learns across sessions)
`r.memory.context({ message, project_id })` → inject into system prompt → do work → `r.memory.facts.add({ fact, project_id })` → `r.memory.decisions.log({ decision, context, project_id })`

---

## Code recipes — copy-paste into your app

### Recipe 1: Database-backed list with create/delete

```typescript
// lib/db.ts — initialize database once
import { sdk } from './recursiv';

const PROJECT_ID = 'YOUR_PROJECT_ID'; // from lib/project.tsx
const DB_NAME = 'app-db';

export async function ensureDb() {
  await sdk.databases.ensure({ project_id: PROJECT_ID, name: DB_NAME });
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const { data } = await sdk.databases.query({ project_id: PROJECT_ID, name: DB_NAME, sql, params });
  return data.rows as T[];
}

// Run once on app startup — creates table if it doesn't exist
export async function migrate() {
  await ensureDb();
  await query(`CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}
```

```typescript
// app/(tabs)/items.tsx — list + create + delete
import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { query, migrate } from '../../lib/db';
import { useAuth } from '../../lib/auth';

type Item = { id: number; title: string; created_by: string; created_at: string };

export default function ItemsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await query<Item>('SELECT * FROM items ORDER BY created_at DESC');
    setItems(rows);
    setLoading(false);
  }, []);

  useEffect(() => { migrate().then(load); }, [load]);

  const create = async () => {
    if (!title.trim()) return;
    await query('INSERT INTO items (title, created_by) VALUES ($1, $2)', [title.trim(), user?.id]);
    setTitle('');
    load();
  };

  const remove = async (id: number) => {
    await query('DELETE FROM items WHERE id = $1', [id]);
    load();
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TextInput
          value={title} onChangeText={setTitle} placeholder="New item..."
          style={{ flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff' }}
          placeholderTextColor="#666" onSubmitEditing={create}
        />
        <Pressable onPress={create} style={{ backgroundColor: '#10b981', borderRadius: 8, padding: 12, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={items} keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => remove(item.id)}
            style={{ padding: 16, borderBottomWidth: 1, borderColor: '#222' }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>{item.title}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ color: '#666', textAlign: 'center', marginTop: 32 }}>No items yet</Text>}
      />
    </View>
  );
}
```

### Recipe 2: Agent chat with streaming responses

```typescript
// app/(tabs)/chat.tsx — real-time agent chat
import { useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { sdk } from '../../lib/recursiv';

type Message = { role: 'user' | 'assistant'; content: string };

const AGENT_ID = 'YOUR_AGENT_ID'; // create via sdk.agents.create()

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    try {
      // Use chatStream for real-time responses
      // NOTE: agents.chat() is ASYNC — it does NOT return the reply.
      const stream = sdk.agents.chatStream(AGENT_ID, { message: userMsg });
      let assistantContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      for await (const chunk of stream) {
        assistantContent += chunk.delta ?? '';
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef} data={messages} keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: item.role === 'user' ? '#10b981' : '#1f2937',
            borderRadius: 12, padding: 12, maxWidth: '80%',
          }}>
            <Text style={{ color: '#fff' }}>{item.content}</Text>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#222' }}>
        <TextInput
          value={input} onChangeText={setInput} placeholder="Message..."
          style={{ flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 12, color: '#fff' }}
          placeholderTextColor="#666" onSubmitEditing={send} editable={!streaming}
        />
        {streaming ? (
          <ActivityIndicator style={{ width: 44 }} />
        ) : (
          <Pressable onPress={send} style={{ backgroundColor: '#10b981', borderRadius: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>↑</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
```

### Recipe 3: File upload with storage buckets

```typescript
// lib/storage.ts — upload and download files
import { sdk } from './recursiv';

const PROJECT_ID = 'YOUR_PROJECT_ID';
const BUCKET_NAME = 'user-uploads';

export async function ensureBucket() {
  await sdk.storage.ensureBucket({ project_id: PROJECT_ID, name: BUCKET_NAME });
}

export async function uploadFile(key: string, file: Blob, contentType: string): Promise<string> {
  const { data } = await sdk.storage.getUploadUrl({
    project_id: PROJECT_ID, bucket_name: BUCKET_NAME, key, content_type: contentType,
  });
  await fetch(data.url, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
  const { data: dl } = await sdk.storage.getDownloadUrl({
    project_id: PROJECT_ID, bucket_name: BUCKET_NAME, key,
  });
  return dl.url;
}

export async function getFileUrl(key: string): Promise<string> {
  const { data } = await sdk.storage.getDownloadUrl({
    project_id: PROJECT_ID, bucket_name: BUCKET_NAME, key,
  });
  return data.url;
}
```

### Recipe 4: Social feed with posts, reactions, and tags

```typescript
// app/(tabs)/feed.tsx — community feed with post creation
import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { sdk } from '../../lib/recursiv';

const COMMUNITY_ID = 'YOUR_COMMUNITY_ID'; // create via sdk.communities.create()

type Post = { id: string; content: string; author?: { name: string }; created_at: string; reaction_counts?: Record<string, number> };

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await sdk.posts.list({ community_id: COMMUNITY_ID, limit: 50 });
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    if (!content.trim()) return;
    await sdk.posts.create({ content: content.trim(), content_format: 'markdown', community_id: COMMUNITY_ID });
    setContent('');
    load();
  };

  const react = async (postId: string, type: string) => {
    await sdk.posts.react(postId, { type });
    load();
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ marginBottom: 16, gap: 8 }}>
        <TextInput
          value={content} onChangeText={setContent} placeholder="What's on your mind?"
          multiline style={{ borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 12, color: '#fff', minHeight: 60 }}
          placeholderTextColor="#666"
        />
        <Pressable onPress={publish} style={{ backgroundColor: '#10b981', borderRadius: 8, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Post</Text>
        </Pressable>
      </View>
      <FlatList
        data={posts} keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#222' }} />}
        renderItem={({ item }) => (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>{item.author?.name ?? 'Anonymous'}</Text>
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>{item.content}</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable onPress={() => react(item.id, 'upvote')}>
                <Text style={{ color: '#666' }}>👍 {item.reaction_counts?.upvote ?? 0}</Text>
              </Pressable>
              <Pressable onPress={() => react(item.id, 'fire')}>
                <Text style={{ color: '#666' }}>🔥 {item.reaction_counts?.fire ?? 0}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
```

### Recipe 5: Create an AI agent at app startup

```typescript
// lib/agent.ts — ensure agent exists (idempotent)
import { sdk } from './recursiv';

const PROJECT_ID = 'YOUR_PROJECT_ID';
const ORG_ID = 'YOUR_ORG_ID';
let agentId: string | null = null;

export async function ensureAgent(): Promise<string> {
  if (agentId) return agentId;

  // Check if agent already exists
  const { data: agents } = await sdk.agents.list({ organization_id: ORG_ID });
  const existing = agents.find((a) => a.username === 'app_assistant');
  if (existing) {
    agentId = existing.id;
    return agentId;
  }

  // Create new agent
  const { data: agent } = await sdk.agents.create({
    name: 'App Assistant',
    username: 'app_assistant',
    model: 'anthropic/claude-sonnet-4',
    organization_id: ORG_ID,
    system_prompt: `You are a helpful assistant for this app.
You have access to the project database and can help users with their questions.
Be concise and friendly. If you don't know something, say so.`,
  });

  agentId = agent.id;
  return agentId;
}
```

### Recipe 6: Real-time chat with WebSocket

```typescript
// app/(tabs)/live-chat.tsx — real-time messaging with typing indicators
import { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useChat } from '@recursiv/sdk/react';
import { sdk } from '../../lib/recursiv';

type ChatMessage = { id: string; text: string; sender: { id: string; name: string }; timestamp: string };

const CONVERSATION_ID = 'YOUR_CONVERSATION_ID'; // from sdk.chat.dm() or sdk.chat.createGroup()

export default function LiveChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const listRef = useRef<FlatList>(null);
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Load message history on mount
  useEffect(() => {
    (async () => {
      const { data: history } = await sdk.chat.messages(CONVERSATION_ID, { limit: 50 });
      setMessages(history.map((m: any) => ({
        id: m.id,
        text: m.content,
        sender: m.sender,
        timestamp: m.created_at,
      })));
      setLoadingHistory(false);
    })();
  }, []);

  // Connect to real-time WebSocket
  const { isConnected, error, sendMessage, sendTyping } = useChat(sdk, {
    conversationId: CONVERSATION_ID,
    onMessage: (msg) => {
      setMessages((prev) => [...prev, {
        id: msg.id ?? String(Date.now()),
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date().toISOString(),
      }]);
      // Clear typing indicator for this sender
      setTypingUsers((prev) => prev.filter((name) => name !== msg.sender.name));
    },
    onTyping: (evt) => {
      const name = evt.sender?.name ?? 'Someone';
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
      // Auto-clear typing after 3 seconds of no activity
      if (typingTimeouts.current[name]) clearTimeout(typingTimeouts.current[name]);
      typingTimeouts.current[name] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }, 3000);
    },
  });

  const handleSend = () => {
    if (!input.trim() || !isConnected) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleTextChange = (text: string) => {
    setInput(text);
    if (text.length > 0) sendTyping();
  };

  if (loadingHistory) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1 }}>
      {/* Connection status */}
      {!isConnected && (
        <View style={{ backgroundColor: '#dc2626', padding: 8, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>
            {error ? `Disconnected: ${error.message}` : 'Connecting...'}
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <View style={{ gap: 2 }}>
            <Text style={{ color: '#9ca3af', fontSize: 11 }}>{item.sender.name}</Text>
            <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 12, alignSelf: 'flex-start', maxWidth: '85%' }}>
              <Text style={{ color: '#fff' }}>{item.text}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#666', textAlign: 'center', marginTop: 32 }}>No messages yet. Say hello!</Text>
        }
      />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <Text style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}

      {/* Input */}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#222' }}>
        <TextInput
          value={input}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          style={{ flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 12, color: '#fff' }}
          placeholderTextColor="#666"
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!isConnected}
          style={{
            backgroundColor: isConnected ? '#10b981' : '#374151',
            borderRadius: 20, width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

### Recipe 7: Settings page with database-backed user preferences

```typescript
// lib/preferences.ts — user preferences backed by Postgres
import { query, migrate as baseMigrate } from './db';

export type Preferences = {
  notifications_enabled: boolean;
  dark_mode: boolean;
  email_digest: boolean;
  auto_play_videos: boolean;
  show_online_status: boolean;
};

const DEFAULTS: Preferences = {
  notifications_enabled: true,
  dark_mode: true,
  email_digest: false,
  auto_play_videos: true,
  show_online_status: true,
};

export async function migratePreferences() {
  await baseMigrate();
  await query(`CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    notifications_enabled BOOLEAN DEFAULT true,
    dark_mode BOOLEAN DEFAULT true,
    email_digest BOOLEAN DEFAULT false,
    auto_play_videos BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

export async function loadPreferences(userId: string): Promise<Preferences> {
  const rows = await query<Preferences>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId],
  );
  if (rows.length === 0) return { ...DEFAULTS };
  const { ...prefs } = rows[0];
  return prefs;
}

export async function savePreference(userId: string, key: keyof Preferences, value: boolean) {
  // Upsert: insert if not exists, update the specific column
  await query(
    `INSERT INTO user_preferences (user_id, ${key}, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET ${key} = $2, updated_at = NOW()`,
    [userId, value],
  );
}
```

```typescript
// app/(tabs)/settings.tsx — toggle switches that save immediately
import { useState, useEffect } from 'react';
import { View, Text, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../lib/auth';
import { Preferences, loadPreferences, savePreference, migratePreferences } from '../../lib/preferences';

type SettingRow = {
  key: keyof Preferences;
  label: string;
  description: string;
};

const SETTINGS: SettingRow[] = [
  { key: 'notifications_enabled', label: 'Push Notifications', description: 'Receive push notifications for new messages and updates' },
  { key: 'dark_mode', label: 'Dark Mode', description: 'Use dark color scheme throughout the app' },
  { key: 'email_digest', label: 'Email Digest', description: 'Receive a weekly summary of activity via email' },
  { key: 'auto_play_videos', label: 'Auto-play Videos', description: 'Automatically play videos in your feed' },
  { key: 'show_online_status', label: 'Show Online Status', description: 'Let others see when you are active' },
];

export default function SettingsScreen() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    migratePreferences()
      .then(() => loadPreferences(user.id))
      .then(setPrefs);
  }, [user?.id]);

  const toggle = async (key: keyof Preferences) => {
    if (!prefs || !user?.id) return;
    const newValue = !prefs[key];

    // Optimistic update — change UI immediately
    setPrefs((prev) => (prev ? { ...prev, [key]: newValue } : prev));
    setSaving(key);

    try {
      await savePreference(user.id, key, newValue);
    } catch {
      // Revert on failure
      setPrefs((prev) => (prev ? { ...prev, [key]: !newValue } : prev));
    } finally {
      setSaving(null);
    }
  };

  if (!prefs) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 4 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 }}>Settings</Text>

      {SETTINGS.map((setting) => (
        <View
          key={setting.key}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 16, borderBottomWidth: 1, borderColor: '#222',
          }}
        >
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>{setting.label}</Text>
            <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>{setting.description}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {saving === setting.key && <ActivityIndicator size="small" color="#10b981" />}
            <Switch
              value={prefs[setting.key]}
              onValueChange={() => toggle(setting.key)}
              trackColor={{ false: '#374151', true: '#10b981' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
```

### Recipe 8: Dashboard with stats cards and charts

```typescript
// app/(tabs)/dashboard.tsx — stats overview with bar charts and pull-to-refresh
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { query, migrate } from '../../lib/db';

// --- Migration: create analytics tables ---
async function migrateDashboard() {
  await migrate();
  await query(`CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

// --- Stat types ---
type StatCard = { label: string; value: string; color: string };
type BarData = { label: string; value: number; color: string };

// --- Loading skeleton ---
function Skeleton({ width, height }: { width: number | string; height: number }) {
  return (
    <View style={{
      width: width as any, height, backgroundColor: '#1f2937',
      borderRadius: 8, overflow: 'hidden',
    }}>
      <View style={{ flex: 1, backgroundColor: '#374151', opacity: 0.5 }} />
    </View>
  );
}

// --- Stat card component ---
function StatCardView({ stat }: { stat: StatCard }) {
  return (
    <View style={{
      flex: 1, minWidth: 140, backgroundColor: '#111827',
      borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: stat.color,
    }}>
      <Text style={{ color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        {stat.label}
      </Text>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 }}>
        {stat.value}
      </Text>
    </View>
  );
}

// --- Bar chart (pure View — no chart library) ---
function BarChart({ data, title }: { data: BarData[]; title: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 }}>{title}</Text>
      <View style={{ gap: 12 }}>
        {data.map((bar) => (
          <View key={bar.label} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>{bar.label}</Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{bar.value}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{
                height: 8, borderRadius: 4, backgroundColor: bar.color,
                width: `${Math.round((bar.value / maxValue) * 100)}%`,
              }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Main dashboard screen ---
export default function DashboardScreen() {
  const [stats, setStats] = useState<StatCard[] | null>(null);
  const [activityData, setActivityData] = useState<BarData[]>([]);
  const [statusData, setStatusData] = useState<BarData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    await migrateDashboard();

    // Run all queries in parallel for speed
    const [users, activeUsers, projects, events] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM app_users'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM app_users WHERE active = true'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM projects'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM events WHERE created_at > NOW() - INTERVAL \'7 days\''),
    ]);

    setStats([
      { label: 'Total Users', value: users[0]?.count ?? '0', color: '#10b981' },
      { label: 'Active Users', value: activeUsers[0]?.count ?? '0', color: '#3b82f6' },
      { label: 'Projects', value: projects[0]?.count ?? '0', color: '#8b5cf6' },
      { label: 'Events (7d)', value: events[0]?.count ?? '0', color: '#f59e0b' },
    ]);

    // Activity by day of week
    const daily = await query<{ day: string; count: string }>(
      `SELECT TO_CHAR(created_at, 'Dy') as day, COUNT(*) as count
       FROM events WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY day ORDER BY MIN(created_at)`,
    );
    const dayColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
    setActivityData(
      daily.map((d, i) => ({ label: d.day, value: Number(d.count), color: dayColors[i % dayColors.length] })),
    );

    // Project status breakdown
    const statuses = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM projects GROUP BY status ORDER BY count DESC`,
    );
    const statusColors: Record<string, string> = { active: '#10b981', paused: '#f59e0b', completed: '#3b82f6', archived: '#6b7280' };
    setStatusData(
      statuses.map((s) => ({ label: s.status, value: Number(s.count), color: statusColors[s.status] ?? '#6b7280' })),
    );
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Dashboard</Text>

      {/* Stat cards — 2x2 grid */}
      {stats ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {stats.map((s) => <StatCardView key={s.label} stat={s} />)}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} width={160} height={80} />)}
        </View>
      )}

      {/* Activity chart */}
      {activityData.length > 0 ? (
        <BarChart data={activityData} title="Activity (last 7 days)" />
      ) : stats ? (
        <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>No activity data yet</Text>
        </View>
      ) : (
        <Skeleton width="100%" height={200} />
      )}

      {/* Project status chart */}
      {statusData.length > 0 ? (
        <BarChart data={statusData} title="Projects by Status" />
      ) : stats ? (
        <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>No projects yet</Text>
        </View>
      ) : (
        <Skeleton width="100%" height={160} />
      )}
    </ScrollView>
  );
}
```

---

## Response shapes

```typescript
{ data: T[], meta: { limit, offset, has_more } }  // list (PaginatedResponse)
{ data: T }                                         // single (SingleResponse)
{ data: { deleted: true } }                         // delete (DeleteResponse)
{ data: { success: true } }                         // success (SuccessResponse)
```

Pagination: pass `limit` and `offset`. Check `meta.has_more`.

---

## Error types

| Error | HTTP | When |
|-------|------|------|
| `AuthenticationError` | 401 | Missing or invalid API key |
| `AuthorizationError` | 403 | API key lacks required scope |
| `NotFoundError` | 404 | Resource doesn't exist or no access |
| `ValidationError` | 400 | Invalid input (check `error.details`) |
| `RateLimitError` | 429 | Rate limit hit (`error.retryAfter` seconds) |
| `ConflictError` | 409 | Resource already exists |

Auto-retry on 429/5xx built in (exponential backoff, default `maxRetries: 2`).

---

## Configuration

```typescript
const r = new Recursiv({
  apiKey: 'sk_live_...',                   // or set RECURSIV_API_KEY env var
  baseUrl: 'https://recursiv.io/api/v1',  // default
  timeout: 30000,                          // request timeout in ms
  maxRetries: 2,                           // auto-retry on 429/5xx
})

// Zero-arg works when RECURSIV_API_KEY is set
const r = new Recursiv()

// Anonymous sandbox (no API key needed)
const r = new Recursiv({ anonymous: true })

// Self-hosted
const r = new Recursiv({ baseUrl: 'https://my-instance.com/api/v1' })
```

---

## Common mistakes that break apps

```typescript
// ❌ WRONG: agents.chat() is async — this does NOT contain the agent's reply
const reply = await r.agents.chat(agentId, { message: 'Hello' })
console.log(reply.data.content) // undefined! reply only has message_id + conversation_id

// ✅ RIGHT: use chatStream() for real-time responses
const stream = r.agents.chatStream(agentId, { message: 'Hello' })
for await (const chunk of stream) {
  process.stdout.write(chunk.delta ?? '')
}

// ❌ WRONG: getCredentials takes name, not database_id
const creds = await r.databases.getCredentials({ database_id: db.id }) // ValidationError!

// ✅ RIGHT: pass project_id + name
const creds = await r.databases.getCredentials({ project_id: 'proj_xxx', name: 'my-db' })

// ❌ WRONG: creating agent without organization_id
const agent = await r.agents.create({ name: 'Bot', model: 'anthropic/claude-sonnet-4' }) // fails

// ✅ RIGHT: organization_id is required
const agent = await r.agents.create({
  name: 'Bot', username: 'bot_' + Date.now(),
  model: 'anthropic/claude-sonnet-4', system_prompt: '...',
  organization_id: orgId,  // REQUIRED
})

// ❌ WRONG: not handling private communities
const community = await r.communities.get('comm_xxx') // 404 if private and you're not a member

// ✅ RIGHT: handle 404 gracefully
try {
  const community = await r.communities.get('comm_xxx')
} catch (e) {
  if (e.status === 404) { /* community is private or doesn't exist */ }
}
```

---

## Gotchas

1. **`agents.chatStream()` does NOT work in React Native** (no ReadableStream). Use raw fetch to `${baseUrl}/agents/${id}/chat/stream` and parse SSE manually.
2. **`ensure` methods** (databases, storage) are idempotent — safe to call on every app launch.
3. **Do NOT use `r.posts` as a database.** Posts are for social content. Use `r.databases` for structured data.
4. **API keys need explicit scopes.** Missing scopes → `AuthorizationError` (403).
5. **`organization_id` is required** when creating agents and projects.
6. **`databases.getCredentials()`** takes `{ project_id, name }` — not `database_id`.
7. **`agents.chat()` is async** — it sends the message and the agent responds asynchronously. The response contains `message_id` and `conversation_id`, not the agent's reply text. Use `chatStream()` for real-time responses.
8. **Self-hosted:** pass `baseUrl` to constructor. Default is `https://recursiv.io/api/v1`.
9. **`r.memory` rejects secrets.** Facts containing patterns like `sk_`, `api_key=`, `password=`, or private keys are rejected on write. Store secrets in environment variables, not memory.
10. **Memory is network-scoped.** Facts and decisions are isolated per network (tenant). Two teams on different networks cannot see each other's memory.
11. **`r.memory.context()` has a token budget.** Default is 2000 tokens (~8000 chars). Pass `max_tokens` to control how much context is returned.
