import { MainLayout } from '@/components/layout/main-layout';

export default function HomeLayout({ children }: LayoutProps<'/home'>) {
  return <MainLayout>{children}</MainLayout>;
}
