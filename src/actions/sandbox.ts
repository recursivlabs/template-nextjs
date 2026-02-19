'use server';

import { getRecursiv } from '@/lib/recursiv';

export async function executeCode(
  code: string,
  language: 'javascript' | 'typescript' | 'python' = 'typescript'
) {
  const r = getRecursiv();
  return r.sandbox.execute({ code, language });
}
