import { ReactNode } from 'react';

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="mx-auto min-h-[100svh] max-w-[76rem] bg-background px-[clamp(1rem,5vw,5rem)] py-[clamp(2rem,7vw,6rem)] text-text-primary">
      {children}
    </main>
  );
}
