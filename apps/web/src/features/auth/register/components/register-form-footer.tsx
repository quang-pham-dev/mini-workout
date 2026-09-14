import Link from 'next/link';

export function RegisterFormFooter() {
  return (
    <p className="mt-5 text-center text-sm text-text-secondary [&_a]:font-semibold [&_a]:text-primary">
      Already have an account? <Link href="/login">Sign in</Link>
    </p>
  );
}
