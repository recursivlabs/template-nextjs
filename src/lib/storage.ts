'use server';

import { getAuthedSdk } from './recursiv';

const PROJECT_ID = process.env.RECURSIV_PROJECT_ID;
const BUCKET = 'app-files';

let _ensured = false;

async function ensureBucket() {
  if (_ensured) return;
  if (!PROJECT_ID) throw new Error('RECURSIV_PROJECT_ID env var is not set.');
  const sdk = await getAuthedSdk();
  await sdk.storage.ensureBucket({ name: BUCKET, project_id: PROJECT_ID });
  _ensured = true;
}

/** Get a presigned URL the browser uses to PUT a file directly to storage. */
export async function getPresignedUploadUrl(input: { key: string; contentType: string }) {
  await ensureBucket();
  const sdk = await getAuthedSdk();
  const { data } = await sdk.storage.getUploadUrl({
    bucket_name: BUCKET,
    project_id: PROJECT_ID!,
    key: input.key,
    content_type: input.contentType,
  });
  return data; // { url, key? }
}

/** Get a presigned URL the browser uses to GET (download / display) a file. */
export async function getPresignedDownloadUrl(key: string) {
  await ensureBucket();
  const sdk = await getAuthedSdk();
  const { data } = await sdk.storage.getDownloadUrl({
    bucket_name: BUCKET,
    project_id: PROJECT_ID!,
    key,
  });
  return data; // { url, key? }
}

export async function listFiles() {
  await ensureBucket();
  const sdk = await getAuthedSdk();
  const { data } = await sdk.storage.listItems({
    bucket_name: BUCKET,
    project_id: PROJECT_ID!,
  });
  return data; // StorageBucketItem[]
}

export async function deleteFile(key: string) {
  await ensureBucket();
  const sdk = await getAuthedSdk();
  await sdk.storage.deleteObject({
    bucket_name: BUCKET,
    project_id: PROJECT_ID!,
    key,
  });
}
