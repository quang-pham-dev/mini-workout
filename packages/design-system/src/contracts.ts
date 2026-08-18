/**
 * Shared component vocabulary for platform implementations.
 *
 * These contracts intentionally describe names and behavior, not rendering
 * details. Web and native components can implement them independently.
 */
export const componentContracts = {
  button: {
    variants: [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ],
    sizes: ['default', 'sm', 'lg', 'icon'],
    accessibility: [
      'supports keyboard activation',
      'exposes disabled state',
      'requires an accessible name',
      'preserves visible focus indication',
    ],
  },
  input: {
    variants: ['default'],
    accessibility: [
      'has an associated label or accessible name',
      'exposes disabled state',
      'exposes invalid state when validation fails',
    ],
  },
  label: {
    variants: ['default'],
    accessibility: ['is associated with its form control'],
  },
  accordion: {
    variants: ['default'],
    accessibility: [
      'supports keyboard expansion and collapse',
      'exposes expanded state',
      'preserves heading and control semantics',
    ],
  },
  badge: {
    variants: ['default', 'secondary', 'destructive', 'outline'],
    accessibility: ['communicates status without relying on color alone'],
  },
  card: {
    variants: ['default'],
    accessibility: ['preserves a logical content heading when one is present'],
  },
  pagination: {
    variants: ['default'],
    accessibility: [
      'uses a navigation landmark with an accessible label',
      'exposes the current page',
    ],
  },
  table: {
    variants: ['default'],
    accessibility: ['uses table semantics for tabular data'],
  },
} as const;

export const componentNames = Object.keys(componentContracts) as Array<
  keyof typeof componentContracts
>;

export type ButtonVariant = (typeof componentContracts.button.variants)[number];
export type ButtonSize = (typeof componentContracts.button.sizes)[number];
export type BadgeVariant = (typeof componentContracts.badge.variants)[number];
