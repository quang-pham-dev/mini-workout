import { auth } from '@/auth';
import { ONBOARDING_COOKIE_NAME } from '@/lib/auth/constants';
import { cookies, headers } from 'next/headers';

type ProfileFooterSectionProps = {
  email: string;
};

export async function ProfileFooterSection({
  email,
}: ProfileFooterSectionProps) {
  const handleSignOut = async () => {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete(ONBOARDING_COOKIE_NAME);
    await auth.api.signOut({ headers: await headers() });
  };

  return (
    <footer className="mt-8 flex items-center justify-between border-t border-border-subtle pt-6 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-4">
      <span className="text-[0.85rem] text-text-tertiary">
        Signed in as {email}
      </span>
      <form action={handleSignOut}>
        <button
          className="rounded-full border border-border-default bg-surface px-5 py-[0.6rem] text-sm font-medium text-text-secondary transition-[background-color,color,border-color] hover:border-border-strong hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </footer>
  );
}
