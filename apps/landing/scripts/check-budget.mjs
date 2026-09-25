import { readFile, readdir, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const budgets = {
  compressedJavaScript: 120 * 1024,
  compressedCss: 48 * 1024,
  largestFile: 512 * 1024,
  totalArtifact: 1.5 * 1024 * 1024,
};

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const root =
  process.argv.length === 4 && process.argv[2] === '--root'
    ? resolve(process.argv[3])
    : defaultRoot;

if (process.argv.length !== 2 && process.argv.length !== 4) {
  throw new Error('Usage: check-budget.mjs [--root <artifact-directory>]');
}

async function collectFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }

  return files;
}

let files;
try {
  files = await collectFiles(root);
} catch (error) {
  if (error && typeof error === 'object' && error.code === 'ENOENT') {
    throw new Error(`Landing artifact directory does not exist: ${root}`);
  }
  throw error;
}

if (!files.length) throw new Error('Landing artifact must not be empty.');

let totalArtifact = 0;
let compressedJavaScript = 0;
let compressedCss = 0;
let largest = { path: '', size: 0 };

for (const file of files) {
  const size = (await stat(file)).size;
  const path = relative(root, file).split(sep).join('/');
  totalArtifact += size;
  if (size > largest.size) largest = { path, size };

  if (file.endsWith('.js') || file.endsWith('.mjs')) {
    compressedJavaScript += gzipSync(await readFile(file)).byteLength;
  } else if (file.endsWith('.css')) {
    compressedCss += gzipSync(await readFile(file)).byteLength;
  }
}

const failures = [];
if (compressedJavaScript > budgets.compressedJavaScript) {
  failures.push(
    `compressed JavaScript ${compressedJavaScript} B exceeds ${budgets.compressedJavaScript} B`,
  );
}
if (compressedCss > budgets.compressedCss) {
  failures.push(
    `compressed CSS ${compressedCss} B exceeds ${budgets.compressedCss} B`,
  );
}
if (largest.size > budgets.largestFile) {
  failures.push(
    `largest file ${largest.path} is ${largest.size} B and exceeds ${budgets.largestFile} B`,
  );
}
if (totalArtifact > budgets.totalArtifact) {
  failures.push(
    `total artifact ${totalArtifact} B exceeds ${budgets.totalArtifact} B`,
  );
}

if (failures.length) {
  console.error(
    `Landing artifact budget failed:\n${failures.map((value) => `- ${value}`).join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Landing artifact budget passed: js-gzip=${compressedJavaScript} B, css-gzip=${compressedCss} B, largest=${largest.path}:${largest.size} B, total=${totalArtifact} B.`,
  );
}
