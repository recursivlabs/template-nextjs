'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import * as chatLib from '@/lib/chat';

export async function listConversations() {
  await requireSession();
  return chatLib.listConversations();
}

export async function loadMessages(conversationId: string) {
  await requireSession();
  return chatLib.listMessages(conversationId);
}

export async function sendMessage(formData: FormData) {
  await requireSession();
  const conversationId = String(formData.get('conversation_id') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  if (!conversationId || !content) return { error: 'Conversation and message are required.' };
  await chatLib.sendMessage(conversationId, content);
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}
