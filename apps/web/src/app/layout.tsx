import './globals.css';
import { THEME_STORAGE_KEY, ThemeProvider } from '@/components/theme/theme';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Mini Workout',
  description: 'Build a consistent workout habit.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const key = ${JSON.stringify(THEME_STORAGE_KEY)}; const stored = localStorage.getItem(key); const preference = stored === 'dark' || stored === 'system' ? stored : stored === 'light' ? 'light' : 'light'; const resolved = preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : preference === 'system' ? 'light' : preference; const root = document.documentElement; root.classList.toggle('light', resolved === 'light'); root.classList.toggle('dark', resolved === 'dark'); root.dataset.theme = resolved; root.dataset.themePreference = preference; root.style.colorScheme = resolved; const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', resolved === 'dark' ? '#111318' : '#ffffff'); } catch {} })();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
