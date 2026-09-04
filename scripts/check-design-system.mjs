import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const readTree = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await readTree(path)));
    else if (/\.(css|ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
};

const tokensSource = await read('packages/design-system/src/tokens.ts');
const cssSources = await Promise.all(
  [
    'packages/design-system/design-tokens.css',
    'packages/design-system/theme-light.css',
    'packages/design-system/theme-dark.css',
    'packages/design-system/globals.css',
  ].map(read),
);
const cssSource = cssSources.join('\n');
const colorSection = tokensSource.slice(
  tokensSource.indexOf('color: {'),
  tokensSource.indexOf('  spacing: {'),
);
const compatibilitySection = tokensSource.slice(
  tokensSource.indexOf('compatibilityColor: {'),
  tokensSource.indexOf('  spacing: {'),
);
const colorTokens = [
  ...colorSection.matchAll(/:\s*'([^']+)'/g),
  ...compatibilitySection.matchAll(/:\s*'([^']+)'/g),
].map(([, token]) => token);
const uniqueColorTokens = [...new Set(colorTokens)];
const missingTokens = colorTokens.filter(
  (token) =>
    !cssSource.includes(`--color-${token}:`) &&
    !cssSource.includes(`--${token}:`),
);

const themeRoles = cssSources
  .slice(1, 3)
  .map(
    (source) =>
      new Set([...source.matchAll(/--([\w-]+)\s*:/g)].map(([, name]) => name)),
  );
const themeDrift = [
  ...[...themeRoles[0]].filter((role) => !themeRoles[1].has(role)),
  ...[...themeRoles[1]].filter((role) => !themeRoles[0].has(role)),
];
const compatibilityColors = [
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'input',
  'ring',
  'ring-offset',
];
const missingCompatibility = compatibilityColors.filter(
  (token) =>
    !cssSource.includes(`--color-${token}:`) ||
    !themeRoles[0].has(token) ||
    !themeRoles[1].has(token),
);
const inlineTheme = cssSources[3].match(/@theme inline\s*\{([\s\S]*?)\}/)?.[1] ?? '';
const missingInlineRegistration = compatibilityColors.filter(
  (token) => !inlineTheme.includes(`--color-${token}: var(--${token})`),
);
const animationNames = [
  ...cssSource.matchAll(/--animate-[\w-]+:\s*([\w-]+)/g),
].map(([, name]) => name);
const keyframes = new Set(
  [...cssSource.matchAll(/@keyframes\s+([\w-]+)/g)].map(([, name]) => name),
);
const missingKeyframes = animationNames.filter((name) => !keyframes.has(name));

const uiFiles = await readTree(resolve(root, 'packages/ui/src'));
const uiSources = await Promise.all(
  uiFiles.map((path) => readFile(path, 'utf8')),
);
const uiGlobalImport = uiSources.some((source) =>
  /@import[^;]*(design-system|globals\.css|ui\/styles\.css)/.test(source),
);
const consumerFiles = [
  ...(await readTree(resolve(root, 'apps/web/src'))).filter(
    (path) => !path.endsWith('.module.css'),
  ),
  ...uiFiles,
];
const consumerSources = await Promise.all(
  consumerFiles.map((path) => readFile(path, 'utf8')),
);
const publicColorNames = new Set(
  [...cssSource.matchAll(/--color-([\w-]+)\s*:/g)].map(([, name]) => name),
);
const undefinedConsumerTokens = consumerSources.flatMap((source) =>
  [...source.matchAll(/var\(--color-([\w-]+)\)/g)]
    .map(([, name]) => name)
    .filter((name) => !publicColorNames.has(name)),
);

const result = {
  missingTokens: missingTokens.filter(
    (token, index) => missingTokens.indexOf(token) === index,
  ),
  themeDrift,
  missingCompatibility,
  missingInlineRegistration,
  missingKeyframes,
  uiGlobalImport,
  undefinedConsumerTokens,
};

if (Object.values(result).some((value) => value === true || value.length > 0)) {
  console.error(`Design-system drift detected: ${JSON.stringify(result)}`);
  process.exitCode = 1;
} else {
  console.log(
    `Design-system foundation check passed (${uniqueColorTokens.length} color tokens).`,
  );
}
