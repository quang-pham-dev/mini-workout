import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'dist',
  'node_modules',
]);
const staleText = [
  'Clinic Platform',
  'Turborepo starter',
  'create-turbo',
  'docs`: a [Next.js]',
  'docs/00-testing-strategy.md',
];

function collectMarkdownFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files;
}

const errors = [];

for (const file of collectMarkdownFiles(root)) {
  const content = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(root, file);

  for (const staleValue of staleText) {
    if (content.includes(staleValue)) {
      errors.push(`${relativeFile}: stale text "${staleValue}"`);
    }
  }

  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split(/[?#]/, 1)[0];
    if (!target || /^(https?:|mailto:|#)/.test(target)) continue;

    const resolvedPath = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolvedPath)) {
      errors.push(`${relativeFile}: broken local link "${target}"`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Documentation checks passed.');
