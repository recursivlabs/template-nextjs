'use server';

import { getRecursiv } from '@/lib/recursiv';

export async function listAgents() {
  const r = getRecursiv();
  return r.agents.list({ limit: 20 });
}

export async function chatWithAgent(agentId: string, message: string, conversationId?: string) {
  const r = getRecursiv();
  return r.agents.chat(agentId, { message, conversation_id: conversationId });
}
