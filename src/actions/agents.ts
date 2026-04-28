'use server';

import { getAuthedSdk } from '@/lib/recursiv';

export async function listAgents() {
  const sdk = await getAuthedSdk();
  return sdk.agents.list({ limit: 20 });
}

export async function chatWithAgent(agentId: string, message: string, conversationId?: string) {
  const sdk = await getAuthedSdk();
  return sdk.agents.chat(agentId, { message, conversation_id: conversationId });
}
