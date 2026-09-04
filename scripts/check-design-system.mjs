import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const unique = (values) => [...new Set(values)];
const readTree = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await readTree(path)));
    else if (/\.(css|scss|js|jsx|ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
};
const namesFromDeclarations = (source, prefix = '--color-') =>
  unique(
    [...source.matchAll(new RegExp(`${prefix}([\\w-]+)\\s*:`, 'g'))].map(
      ([, name]) => name,
    ),
  );
const filesInSources = async (parent) =>
  (
    await Promise.all(
      (await readdir(resolve(root, parent), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            return await readTree(resolve(root, parent, entry.name, 'src'));
          } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
          }
        }),
    )
  ).flat();

const tokensSource = await read('packages/design-system/src/tokens.ts');
const cssSources = await Promise.all(
  [
    'packages/design-system/design-tokens.css',
    'packages/design-system/theme-light.css',
    'packages/design-system/theme-dark.css',
    'packages/design-system/globals.css',
  ].map(read),
);
const cssSource = withoutComments(cssSources.join('\n'));
const colorSection = tokensSource.slice(
  tokensSource.indexOf('color: {'),
  tokensSource.indexOf('  spacing: {'),
);
const compatibilitySection = tokensSource.slice(
  tokensSource.indexOf('compatibilityColor: {'),
  tokensSource.indexOf('  spacing: {'),
);
const colorTokens = unique(
  [
    ...colorSection.matchAll(/:\s*'([^']+)'/g),
    ...compatibilitySection.matchAll(/:\s*'([^']+)'/g),
  ].map(([, token]) => token),
);
const declaredColorNames = new Set(namesFromDeclarations(cssSource));
const declaredVariableNames = new Set(namesFromDeclarations(cssSource, '--'));
const missingTokens = colorTokens.filter(
  (token) =>
    !declaredColorNames.has(token) && !declaredVariableNames.has(token),
);

const themeRoles = cssSources
  .slice(1, 3)
  .map(
    (source) =>
      new Set(
        [...withoutComments(source).matchAll(/--([\w-]+)\s*:/g)].map(
          ([, name]) => name,
        ),
      ),
  );
const themeDrift = unique([
  ...[...themeRoles[0]].filter((role) => !themeRoles[1].has(role)),
  ...[...themeRoles[1]].filter((role) => !themeRoles[0].has(role)),
]);
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
    !declaredColorNames.has(token) ||
    !themeRoles[0].has(token) ||
    !themeRoles[1].has(token),
);
const inlineTheme =
  withoutComments(cssSources[3]).match(/@theme inline\s*\{([\s\S]*?)\}/)?.[1] ??
  '';
const missingInlineRegistration = compatibilityColors.filter(
  (token) =>
    !new RegExp(`--color-${token}\\s*:\\s*var\\(--${token}\\)`).test(
      inlineTheme,
    ),
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
  /@import[^;]*(design-system|globals\.css|ui\/styles\.css)/.test(
    withoutComments(source),
  ),
);
const consumerFiles = unique([
  ...(await filesInSources('apps')),
  ...(await filesInSources('packages')).filter(
    (path) => !path.includes('/packages/design-system/'),
  ),
]);
const consumerSources = await Promise.all(
  consumerFiles.map(async (path) => ({
    path,
    source: withoutComments(await readFile(path, 'utf8')),
  })),
);
const undefinedConsumerTokens = unique(
  consumerSources.flatMap(({ path, source }) =>
    [...source.matchAll(/var\(--color-([\w-]+)\)/g)]
      .map(([, name]) => ({ name, path }))
      .filter(({ name }) => !declaredColorNames.has(name))
      .map(({ name, path }) => `${relative(root, path)}: ${name}`),
  ),
);

const registeredUtilities = new Set([
  ...declaredColorNames,
  ...[...cssSource.matchAll(/@utility\s+([\w-]+)/g)].map(([, name]) => name),
]);
const ignoredUtilitySuffixes = new Set([
  'auto',
  'black',
  'b',
  'base',
  'center',
  'current',
  'dashed',
  'dotted',
  'double',
  'end',
  'inherit',
  'left',
  'none',
  'right',
  'sm',
  'solid',
  'start',
  'transparent',
  'white',
  'xs',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
  '10xl',
]);
const requiredUtilities = unique(
  consumerSources
    .filter(({ path }) => /\.(js|jsx|ts|tsx)$/.test(path))
    .flatMap(({ path, source }) =>
      [
        ...source.matchAll(
          /(?:[\w-]+:)*((?:bg|border|decoration|divide|from|ring-offset|ring|text|to|via)-([\w-]+))/g,
        ),
      ].flatMap(([, utility, colorName]) => {
        if (
          ignoredUtilitySuffixes.has(colorName) ||
          /^(?:[trblxyse]-)?\d+$/.test(colorName) ||
          /^(?:t|b|l|r|x|y|s|e)(?:-\d+)?$/.test(colorName)
        )
          return [];
        return registeredUtilities.has(utility) ||
          registeredUtilities.has(colorName)
          ? []
          : [`${relative(root, path)}: ${utility}`];
      }),
    ),
);

const result = {
  missingTokens,
  themeDrift,
  missingCompatibility,
  missingInlineRegistration,
  missingKeyframes,
  uiGlobalImport,
  undefinedConsumerTokens,
  requiredUtilities,
};

if (Object.values(result).some((value) => value === true || value.length > 0)) {
  console.error(`Design-system drift detected: ${JSON.stringify(result)}`);
  process.exitCode = 1;
} else {
  console.log(
    `Design-system foundation check passed (${colorTokens.length} color tokens).`,
  );
}
