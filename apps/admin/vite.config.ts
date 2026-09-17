import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: { tsconfigPaths: true },
  server: { port: 3001 },
  ssr: { external: ['@prisma/client'] },
  plugins: [tailwindcss(), nitro(), tanstackStart(), viteReact()],
});
