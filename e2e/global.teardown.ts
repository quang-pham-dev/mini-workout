import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default function globalTeardown() {
  rmSync(fileURLToPath(new URL('./.auth', import.meta.url)), {
    recursive: true,
    force: true,
  });
}
