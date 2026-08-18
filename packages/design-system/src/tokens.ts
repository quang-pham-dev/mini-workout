/**
 * Platform-neutral semantic token names.
 *
 * The web adapter currently maps these names to CSS custom properties. A
 * future native adapter can map the same names to React Native values without
 * changing component contracts or product code.
 */
export const semanticTokens = {
  color: {
    background: 'background',
    foreground: 'foreground',
    surface: 'surface',
    surfaceRaised: 'surface-raised',
    surfaceSunken: 'surface-sunken',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
    textTertiary: 'text-tertiary',
    textDisabled: 'text-disabled',
    textInverse: 'text-inverse',
    borderDefault: 'border-default',
    borderSubtle: 'border-subtle',
    borderStrong: 'border-strong',
    primary: 'primary',
    primaryHover: 'primary-hover',
    primaryActive: 'primary-active',
    primaryForeground: 'primary-foreground',
    ring: 'ring',
  },
  spacing: {
    inline: '4',
    control: '10',
    section: '24',
  },
  radius: {
    control: 'md',
    container: 'lg',
    pill: 'full',
  },
  typography: {
    body: 'body-md',
    label: 'body-sm',
    caption: 'caption',
    heading: 'heading-md',
  },
} as const;

export type SemanticColorToken =
  (typeof semanticTokens.color)[keyof typeof semanticTokens.color];
export type SemanticSpacingToken =
  (typeof semanticTokens.spacing)[keyof typeof semanticTokens.spacing];
export type SemanticRadiusToken =
  (typeof semanticTokens.radius)[keyof typeof semanticTokens.radius];
export type SemanticTypographyToken =
  (typeof semanticTokens.typography)[keyof typeof semanticTokens.typography];

export function getCssVariable(token: SemanticColorToken): string {
  return `var(--color-${token})`;
}
