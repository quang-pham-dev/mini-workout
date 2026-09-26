export function productDestination(productAppUrl: string) {
  const origin = new URL(productAppUrl);

  return {
    signIn: new URL('/login', origin).toString(),
    register: new URL('/register', origin).toString(),
  } as const;
}

export function linkBehavior(destination: string, currentUrl: string) {
  const destinationUrl = new URL(destination, currentUrl);
  const current = new URL(currentUrl);

  if (destinationUrl.hostname === current.hostname) {
    return { opensNewTab: false } as const;
  }

  return {
    opensNewTab: true,
    target: '_blank',
    rel: 'noopener',
  } as const;
}

export type CrossAppNavigationIntent = Readonly<{
  destinationApp: 'member' | 'admin' | 'studio';
  action: 'login' | 'register' | 'open';
  placement: string;
}>;

export function crossAppNavigationMetadata(intent: CrossAppNavigationIntent) {
  return {
    'data-cross-app-navigation': 'true',
    'data-source-app': 'landing',
    'data-destination-app': intent.destinationApp,
    'data-navigation-action': intent.action,
    'data-navigation-placement': intent.placement,
  } as const;
}
