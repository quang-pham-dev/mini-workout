import { Options, defineConfig } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: {
    index: 'src/index.ts',
    button: 'src/components/button/index.ts',
    'data-table': 'src/components/table/data-table.tsx',
  },
  format: ['cjs', 'esm'],
  banner: {
    js: "'use client'",
  },
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@mini-workout/design-system'],
  dts: true,
  ...options,
}));
