'use server';

import { getAuthedSdk } from '@/lib/recursiv';

export async function listPosts(offset = 0) {
  const sdk = await getAuthedSdk();
  return sdk.posts.list({ limit: 20, offset });
}

export async function createPost(content: string) {
  const sdk = await getAuthedSdk();
  return sdk.posts.create({ content, content_format: 'markdown' });
}

export async function reactToPost(postId: string, type: 'like' | 'heart' | 'fire') {
  const sdk = await getAuthedSdk();
  return sdk.posts.react(postId, type);
}
