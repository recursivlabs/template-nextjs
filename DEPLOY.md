# DEPLOY

## Recommended: Recursiv MCP from Claude Desktop

Open Claude Desktop in this project folder. With the Recursiv MCP configured, just say:

> *Deploy this project.*

Claude calls `deploy_project` and gives you a live URL when the build finishes.

If you don't have a Recursiv project yet, ask first:

> *Create a Recursiv project for this app, push the code to a new GitHub repo under my account, then deploy it.*

Claude uses `create_project`, configures the repo, and deploys end-to-end.

## Manual: SDK from your terminal

```typescript
// scripts/deploy.ts
import { Recursiv } from '@recursiv/sdk';

const r = new Recursiv();
const { data: deployment } = await r.projects.deploy(process.env.RECURSIV_PROJECT_ID!, {
  branch: 'main',
  type: 'production',
});
console.log('Live at:', deployment.deployment_url);
```

```bash
RECURSIV_API_KEY=sk_live_... RECURSIV_PROJECT_ID=proj_... \
  npx tsx scripts/deploy.ts
```

## Manual: Vercel / other hosts

This is a vanilla Next.js 14 App Router app. It runs on any host that supports Next.js.

Required environment variables in production:

```
RECURSIV_API_KEY=sk_live_...
RECURSIV_PROJECT_ID=proj_...
RECURSIV_ORG_ID=org_...
```

Optional:

```
RECURSIV_API_BASE_URL=          # only for staging / self-host
NODE_ENV=production
```

## Preview deploys

Use the Recursiv MCP `deploy_project` tool with `type: 'preview'` for a per-branch preview URL.

```
> Deploy this branch as a preview.
```

## Custom domain

After your first deploy, point your domain at the deploy URL Claude returned. Recursiv handles TLS automatically.
