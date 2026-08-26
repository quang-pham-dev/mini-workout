import { AppHeader } from '@/components/navigation/app-header';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
