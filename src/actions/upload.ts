'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  listFiles,
  deleteFile,
} from '@/lib/storage';

export type UserFile = {
  key: string;
  size?: number;
  last_modified?: string;
  url: string;
};

function userKey(userId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `users/${userId}/${Date.now()}-${safe}`;
}

export async function startUpload(input: { filename: string; contentType: string }) {
  const user = await requireSession();
  const key = userKey(user.id, input.filename);
  const upload = await getPresignedUploadUrl({ key, contentType: input.contentType });
  return { key, url: upload.url };
}

export async function finalizeUpload() {
  // Hook for any post-upload server work (insert DB row, send notification, etc.)
  revalidatePath('/upload');
}

export async function listMyFiles(): Promise<UserFile[]> {
  const user = await requireSession();
  const items = await listFiles();
  const mine = items.filter((it) => it.key.startsWith(`users/${user.id}/`));
  return Promise.all(
    mine.map(async (item) => {
      const dl = await getPresignedDownloadUrl(item.key);
      return {
        key: item.key,
        size: item.size,
        last_modified: item.last_modified,
        url: dl.url,
      };
    }),
  );
}

export async function removeFile(key: string) {
  const user = await requireSession();
  if (!key.startsWith(`users/${user.id}/`)) return;
  await deleteFile(key);
  revalidatePath('/upload');
}
