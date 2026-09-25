import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('..', import.meta.url));
const root =
  process.argv.length === 4 && process.argv[2] === '--root'
    ? resolve(process.argv[3])
    : defaultRoot;

if (process.argv.length !== 2 && process.argv.length !== 4) {
  throw new Error('Usage: check-boundaries.mjs [--root <landing-directory>]');
}

const forbiddenPackages = [
  'react',
  'react-dom',
  '@mini-workout/ui',
  '@mini-workout/database',
  '@mini-workout/auth',
];

async function collectAstroFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectAstroFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.astro')) files.push(path);
  }

  return files;
}

function importSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }

  return specifiers;
}

function violationReason(specifier) {
  const forbiddenPackage = forbiddenPackages.find(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );
  if (forbiddenPackage) {
    return `${forbiddenPackage} is outside the Astro-native Landing boundary`;
  }
  if (
    /(?:^|\/)packages\/(?:[^/]+\/)?src(?:\/|$)/.test(specifier) ||
    /(?:^|\/)apps\/(?:[^/]+\/)?src(?:\/|$)/.test(specifier)
  ) {
    return 'workspace source-path imports are forbidden';
  }
  return undefined;
}

const sourceRoot = resolve(root, 'src');
let astroFiles = [];
try {
  astroFiles = await collectAstroFiles(sourceRoot);
} catch (error) {
  if (error && typeof error === 'object' && error.code === 'ENOENT') {
    throw new Error(`Landing source directory does not exist: ${sourceRoot}`);
  }
  throw error;
}

const violations = [];
for (const file of astroFiles) {
  const source = await readFile(file, 'utf8');
  for (const specifier of importSpecifiers(source)) {
    const reason = violationReason(specifier);
    if (reason) {
      violations.push(
        `${relative(root, file).split(sep).join('/')}: ${specifier} (${reason})`,
      );
    }
  }
}

if (violations.length) {
  console.error(
    `Landing Astro boundary violation:\n${violations.map((value) => `- ${value}`).join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Landing Astro boundary check passed (${astroFiles.length} files).`,
  );
}
