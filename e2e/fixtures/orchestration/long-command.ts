import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CONTRACT_ROOT!;
const descendant = spawn(
  process.execPath,
  ['-e', 'setInterval(() => {}, 1000)'],
  { stdio: 'ignore' },
);
writeFileSync(
  join(root, 'command-pids'),
  JSON.stringify([process.pid, descendant.pid]),
);
writeFileSync(join(root, 'ready'), 'command');
const timer = setInterval(() => {}, 1000);
// Reap the descendant on graceful group termination; it shares our process group.
process.on('SIGTERM', () => {
  descendant.kill('SIGTERM');
});
descendant.on('exit', () => {
  clearInterval(timer);
});
