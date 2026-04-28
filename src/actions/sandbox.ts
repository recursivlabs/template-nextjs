'use server';

import { getAuthedSdk } from '@/lib/recursiv';

export async function executeCode(
  code: string,
  language: 'javascript' | 'typescript' | 'python' = 'typescript'
) {
  const sdk = await getAuthedSdk();
  return sdk.sandbox.execute({ code, language });
}
