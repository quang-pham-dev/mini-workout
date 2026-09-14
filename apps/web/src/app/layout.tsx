import './globals.css';
import { OfflineIndicator } from '@/components/offline-indicator';
import { ThemeProvider } from '@/components/theme';
import { Toaster } from '@/components/toaster';
import type { Metadata } from 'next';
import localFont from 'next/font/local';

const DARK_THEME_COLOR = 'oklch(0.14 0.008 250)';
const THEME_STORAGE_KEY = 'mini-workout-theme';

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const key = ${JSON.stringify(THEME_STORAGE_KEY)}; const stored = localStorage.getItem(key); const preference = stored === 'dark' || stored === 'system' ? stored : stored === 'light' ? 'light' : 'light'; const resolved = preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : preference === 'system' ? 'light' : preference; const root = document.documentElement; root.classList.toggle('light', resolved === 'light'); root.classList.toggle('dark', resolved === 'dark'); root.dataset.theme = resolved; root.dataset.themePreference = preference; root.style.colorScheme = resolved; let meta = document.querySelector('meta[name="theme-color"]'); if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); document.head.append(meta); } meta.setAttribute('content', resolved === 'dark' ? ${JSON.stringify(DARK_THEME_COLOR)} : '#ffffff'); } catch {} })();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <OfflineIndicator />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
