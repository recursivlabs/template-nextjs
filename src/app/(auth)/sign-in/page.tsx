import Link from 'next/link';
import { SignInForm } from '@/components/sign-in-form';

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-neutral-500 mt-1">Sign in to continue.</p>
      </div>
      <SignInForm />
      <p className="text-sm text-neutral-500 text-center">
        New here?{' '}
        <Link href="/sign-up" className="text-black underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
