import { ThemeSelector } from '@/components/theme/theme-selector';

export function ProfileAppearanceSection() {
  return (
    <section
      className="rounded-[1.25rem] border border-border-subtle bg-surface p-6"
      aria-labelledby="appearance-title"
    >
      <div className="mb-5 flex flex-col gap-1">
        <h2
          className="text-[1.15rem] font-semibold tracking-[-0.02em]"
          id="appearance-title"
        >
          Appearance
        </h2>
        <p className="text-[0.85rem] text-text-secondary">
          Choose how Mini Workout looks to you. Select a theme or sync with your
          system.
        </p>
      </div>
      <ThemeSelector />
    </section>
  );
}
