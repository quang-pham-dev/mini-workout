import { ThemeToggle } from '@/components/theme/theme';

export default function ThemePreviewPage() {
  return (
    <main className="grid min-h-[100svh] grid-cols-[1fr_minmax(0,560px)_1fr] items-center gap-8 p-12 max-[700px]:grid-cols-1 max-[700px]:p-6">
      <button
        className="min-h-11 rounded-lg border border-[var(--color-border-default)] bg-transparent px-4 py-2 text-[var(--color-foreground)]"
        type="button"
      >
        Previous control
      </button>
      <section className="grid gap-4 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-card)] p-12 max-[700px]:p-8 [&>h1]:m-0 [&>p]:m-0">
        <p className="[font-family:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
          Theme preview
        </p>
        <h1>Choose your workout atmosphere.</h1>
        <p>
          Preview the theme controls without requiring an account or database.
        </p>
        <ThemeToggle />
      </section>
      <button
        className="min-h-11 rounded-lg border border-[var(--color-border-default)] bg-transparent px-4 py-2 text-[var(--color-foreground)]"
        type="button"
      >
        Next control
      </button>
    </main>
  );
}
