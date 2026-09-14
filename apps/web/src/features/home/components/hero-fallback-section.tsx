export function HeroFallbackSection() {
  return (
    <section
      className="grid grid-cols-[minmax(0,1fr)_minmax(15rem,0.6fr)] items-end gap-8 max-[680px]:mt-16 max-[680px]:grid-cols-1"
      aria-hidden
    >
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
          Welcome!
        </p>
        <h1 className="text-balance font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.07em]">
          Make a little room for movement.
        </h1>
      </div>
      <p className="mb-2 max-w-96 text-[1.05rem] leading-[1.6] text-text-secondary">
        A few good places to start, chosen around the kind of movement you said
        you want more of.
      </p>
    </section>
  );
}
