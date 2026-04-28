import { listMyFiles } from '@/actions/upload';
import { Uploader } from '@/components/uploader';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const files = await listMyFiles();
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Files</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Direct-to-bucket uploads via presigned URLs from <code>r.storage</code>.
        </p>
      </header>
      <Uploader initialFiles={files} />
    </main>
  );
}
