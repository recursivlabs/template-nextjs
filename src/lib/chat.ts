'use server';

import type { Conversation, Message, SentMessage } from '@recursiv/sdk';
import { getRecursiv } from './recursiv';

export type { Conversation, Message } from '@recursiv/sdk';

export async function listConversations(): Promise<Conversation[]> {
  const r = getRecursiv();
  const { data } = await r.chat.conversations({ limit: 50 });
  return data;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const r = getRecursiv();
  const { data } = await r.chat.messages(conversationId, { limit: 100 });
  return data;
}

export async function sendMessage(conversationId: string, content: string): Promise<SentMessage> {
  const r = getRecursiv();
  const { data } = await r.chat.send({ conversation_id: conversationId, content });
  return data;
}

export async function startDirectMessage(userId: string) {
  const r = getRecursiv();
  const { data } = await r.chat.dm({ user_id: userId });
  return data;
}
