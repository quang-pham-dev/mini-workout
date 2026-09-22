import { getCategories } from '../queries';
import Link from 'next/link';

const categoryDescriptions: Record<string, string> = {
  strength: 'Build everyday power',
  mobility: 'Move with more ease',
  'mindful-movement': 'Find a quieter rhythm',
};

export async function CategoryDiscoverySection() {
  const categories = await getCategories();

  return (
    <section className="mt-12" aria-labelledby="category-discovery-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-highlight">
            Find your lane
          </p>
          <h2
            className="m-0 text-[1.35rem] tracking-[-0.03em]"
            id="category-discovery-title"
          >
            Start with what feels good
          </h2>
        </div>
        <span className="hidden text-[0.85rem] text-text-tertiary sm:inline">
          {categories.length} ways to move
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 max-[680px]:grid-cols-1">
        {categories.map((category) => (
          <Link
            className="group rounded-2xl border border-border-subtle bg-surface-raised p-5 no-underline transition-[border-color,background-color,transform] duration-[160ms] hover:-translate-y-0.5 hover:border-highlight hover:bg-highlight-soft focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none"
            href={`/categories/${category.slug}`}
            key={category.slug}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold tracking-[-0.025em] text-text-primary">
                {category.name}
              </span>
              <span
                className="text-xl text-text-tertiary transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </span>
            <span className="mt-2 block text-sm leading-6 text-text-secondary">
              {categoryDescriptions[category.slug] ?? 'A focused way to move'}
            </span>
            <span className="mt-4 block text-xs font-semibold text-text-tertiary">
              {category.workoutCount}{' '}
              {category.workoutCount === 1 ? 'session' : 'sessions'}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
