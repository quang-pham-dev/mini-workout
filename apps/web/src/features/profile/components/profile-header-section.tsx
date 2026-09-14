import { getInitials } from '@/lib/auth/initials';

const memberSinceFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

type ProfileHeaderSectionProps = {
  name: string;
  email: string;
  createdAt: Date;
};

export async function ProfileHeaderSection({
  name,
  email,
  createdAt,
}: ProfileHeaderSectionProps) {
  const initials = getInitials(name, email);

  const memberSince = memberSinceFormatter.format(new Date(createdAt));

  return (
    <header className="mb-8 flex items-center gap-6 border-b border-border-subtle pb-8 max-[640px]:flex-col max-[640px]:items-start">
      <div
        className="grid size-[4.5rem] shrink-0 place-items-center rounded-full border-2 border-border-subtle bg-surface-sunken font-display text-[1.75rem] font-bold tracking-[-0.02em]"
        aria-hidden="true"
      >
        {initials || ''}
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.04em]">
          {name || ''}
        </h1>
        <p className="text-[0.95rem] text-text-secondary">{email}</p>
        <span className="text-[0.8rem] text-text-tertiary">
          Member since {memberSince}
        </span>
      </div>
    </header>
  );
}
