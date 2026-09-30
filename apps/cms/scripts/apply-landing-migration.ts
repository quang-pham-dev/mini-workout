import { runApplyCommand } from '../src/migration/apply-command';

void runApplyCommand({
  args: process.argv.slice(2),
  env: process.env,
  fetcher: fetch,
  writeOutput: (value) => process.stdout.write(value),
}).then((exitCode) => {
  process.exitCode = exitCode;
});
