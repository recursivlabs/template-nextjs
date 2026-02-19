'use server';

import { getRecursiv } from '@/lib/recursiv';

export async function listPosts(offset = 0) {
  const r = getRecursiv();
  return r.posts.list({ limit: 20, offset });
}

export async function createPost(content: string) {
  const r = getRecursiv();
  return r.posts.create({ content, content_format: 'markdown' });
}

export async function reactToPost(postId: string, type: 'like' | 'heart' | 'fire') {
  const r = getRecursiv();
  return r.posts.react(postId, type);
}
