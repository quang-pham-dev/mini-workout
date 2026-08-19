import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tokensPath = resolve(root, 'packages/design-system/src/tokens.ts');
const cssPaths = [
  'packages/design-system/design-tokens.css',
  'packages/design-system/theme-light.css',
  'packages/design-system/theme-dark.css',
].map((path) => resolve(root, path));

const tokensSource = await readFile(tokensPath, 'utf8');
const cssSource = (
  await Promise.all(cssPaths.map((path) => readFile(path, 'utf8')))
).join('\n');

const colorSection = tokensSource.slice(
  tokensSource.indexOf('color: {'),
  tokensSource.indexOf('  spacing: {'),
);
const colorTokens = [...colorSection.matchAll(/:\s*'([^']+)'/g)].map(
  ([, token]) => token,
);
const missingTokens = colorTokens.filter(
  (token) => !cssSource.includes(`--color-${token}:`),
);

if (missingTokens.length > 0) {
  console.error(
    `Design-system token drift detected. Missing CSS variables: ${missingTokens.join(', ')}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Design-system foundation check passed (${colorTokens.length} color tokens).`,
  );
}
