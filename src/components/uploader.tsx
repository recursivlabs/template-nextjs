'use client';

import { useState, useTransition } from 'react';
import type { UserFile } from '@/actions/upload';
import { startUpload, finalizeUpload, removeFile } from '@/actions/upload';

export function Uploader({ initialFiles }: { initialFiles: UserFile[] }) {
  const [files, setFiles] = useState<UserFile[]>(initialFiles);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const { key, url } = await startUpload({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });
      const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      await finalizeUpload();
      setFiles((prev) => [
        { key, size: file.size, uploaded_at: new Date().toISOString(), url: '' },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  return (
    <div className="space-y-6">
      <label className="block rounded-2xl border-2 border-dashed border-neutral-300 px-6 py-10 text-center cursor-pointer hover:bg-neutral-50">
        <input type="file" className="hidden" onChange={onPick} />
        <span className="font-medium">Click to choose a file</span>
        <p className="text-sm text-neutral-500 mt-1">Uploads straight to your Recursiv bucket.</p>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-2 bg-white"
          >
            <div className="min-w-0 flex-1">
              {file.url ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm underline truncate block">
                  {file.key.split('/').slice(-1)[0]}
                </a>
              ) : (
                <span className="text-sm truncate block">{file.key.split('/').slice(-1)[0]}</span>
              )}
              {file.size ? (
                <p className="text-xs text-neutral-400">{(file.size / 1024).toFixed(1)} KB</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await removeFile(file.key);
                  setFiles((prev) => prev.filter((f) => f.key !== file.key));
                })
              }
              className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
