import Link from 'next/link';
import { SignUpForm } from '@/components/sign-up-form';

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-neutral-500 mt-1">Takes about ten seconds.</p>
      </div>
      <SignUpForm />
      <p className="text-sm text-neutral-500 text-center">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-black underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
