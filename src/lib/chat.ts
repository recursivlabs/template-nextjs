'use server';

import type { Conversation, Message, SentMessage } from '@recursiv/sdk';
import { getAuthedSdk } from './recursiv';

export type { Conversation, Message } from '@recursiv/sdk';

export async function listConversations(): Promise<Conversation[]> {
  const sdk = await getAuthedSdk();
  const { data } = await sdk.chat.conversations({ limit: 50 });
  return data;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const sdk = await getAuthedSdk();
  const { data } = await sdk.chat.messages(conversationId, { limit: 100 });
  return data;
}

export async function sendMessage(conversationId: string, content: string): Promise<SentMessage> {
  const sdk = await getAuthedSdk();
  const { data } = await sdk.chat.send({ conversation_id: conversationId, content });
  return data;
}

export async function startDirectMessage(userId: string) {
  const sdk = await getAuthedSdk();
  const { data } = await sdk.chat.dm({ user_id: userId });
  return data;
}
