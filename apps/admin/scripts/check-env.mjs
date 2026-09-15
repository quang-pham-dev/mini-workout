import process from 'node:process';

const required = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_TRUSTED_ORIGINS',
];
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(
    `Missing required admin environment variables: ${missing.join(', ')}`,
  );
  process.exit(1);
}
const authUrl = new URL(process.env.BETTER_AUTH_URL);
if (!['http:', 'https:'].includes(authUrl.protocol))
  throw new Error('BETTER_AUTH_URL must be an HTTP(S) URL.');
for (const origin of process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')) {
  const value = origin.trim();
  const url = new URL(value);
  if (url.origin !== value)
    throw new Error('BETTER_AUTH_TRUSTED_ORIGINS must contain origins only.');
}
console.log('Admin environment contract is valid (values redacted).');
