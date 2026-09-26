export function productDestination(productAppUrl: string) {
  const origin = new URL(productAppUrl);

  return {
    signIn: new URL('/login', origin).toString(),
    register: new URL('/register', origin).toString(),
  } as const;
}
