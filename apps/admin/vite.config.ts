import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const shimPath = path.resolve(
  currentDir,
  'src/libs/use-sync-external-store-shim.ts',
);

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'ADMIN_'],
  resolve: {
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
    alias: [
      {
        find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
        replacement: shimPath,
      },
      {
        find: /^use-sync-external-store\/with-selector(\.js)?$/,
        replacement: shimPath,
      },
    ],
  },
  server: { port: 3001 },
  ssr: {
    external: ['@prisma/client'],
  },
  plugins: [tailwindcss(), nitro(), tanstackStart(), viteReact()],
});
