import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export type SetupCommand = { command: string; args: string[] };

export function startSetupCommand(
  command: SetupCommand,
  env: NodeJS.ProcessEnv,
  timeoutMs = 120_000,
  killProcess: typeof process.kill = process.kill,
) {
  if (process.platform === 'win32')
    throw new Error('E2E setup commands require POSIX process groups');
  const child = spawn(command.command, command.args, {
    env,
    detached: true,
    stdio: 'inherit',
  });
  let exit: { code: number | null; error?: Error } | undefined;
  child.once('error', (error) => {
    exit = { code: null, error };
  });
  child.once('close', (code) => {
    exit ??= { code };
  });
  let termination: Promise<void> | undefined;
  const stop = () =>
    (termination ??= (async () => {
      const deadline = Date.now() + 5_000;
      let sentTerm = false;
      let sentKill = false;
      while (true) {
        let groupAlive = child.pid !== undefined;
        if (child.pid !== undefined) {
          try {
            killProcess(-child.pid, 0);
          } catch (probeError) {
            const probeCode = (probeError as NodeJS.ErrnoException).code;
            if (probeCode === 'ESRCH') {
              groupAlive = false;
            } else if (probeCode === 'EPERM') {
              // macOS can return EPERM instead of ESRCH for orphaned/zombie process
              // groups whose leader was adopted by init. Attempt SIGKILL directly:
              // - ESRCH → already dead (safe to proceed)
              // - success → killed now (safe to proceed)
              // - EPERM → truly unverifiable; bail out to preserve safety invariant
              try {
                killProcess(-child.pid, 'SIGKILL');
                sentTerm = true;
                sentKill = true;
              } catch (killError) {
                if ((killError as NodeJS.ErrnoException).code === 'ESRCH') {
                  groupAlive = false;
                } else {
                  throw new Error(
                    `Cannot establish setup command termination (process group ${child.pid}). Lock retained; manual recovery required.`,
                    { cause: probeError },
                  );
                }
              }
            } else {
              throw new Error(
                `Cannot establish setup command termination (process group ${child.pid}). Lock retained; manual recovery required.`,
                { cause: probeError },
              );
            }
          }
          if (groupAlive) {
            const signal = !sentTerm
              ? 'SIGTERM'
              : !sentKill && Date.now() >= deadline - 4_500
                ? 'SIGKILL'
                : undefined;
            if (signal) {
              try {
                killProcess(-child.pid, signal);
              } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
                  throw new Error(
                    `Cannot terminate setup process group ${child.pid}. Lock retained; manual recovery required.`,
                    { cause: error },
                  );
              }
              sentTerm = true;
              if (signal === 'SIGKILL') sentKill = true;
            }
          }
        }
        // Leader exit alone is insufficient: its descendants may still write.
        if (exit !== undefined && !groupAlive) return;
        if (Date.now() >= deadline)
          throw new Error(
            `Setup process group ${child.pid} has not terminated. Lock retained; manual recovery required.`,
          );
        await delay(20);
      }
    })());
  const finished = (async () => {
    const deadline = Date.now() + timeoutMs;
    while (
      exit === undefined &&
      termination === undefined &&
      Date.now() < deadline
    )
      await delay(20);
    const timedOut = exit === undefined && termination === undefined;
    await stop();
    if (timedOut) throw new Error('E2E setup command timed out');
    if (exit?.error)
      throw new Error('E2E setup command could not start', {
        cause: exit.error,
      });
    if (exit?.code !== 0)
      throw new Error(
        `E2E setup command failed (exit ${exit?.code ?? 'signal'})`,
      );
  })();
  return { finished, stop };
}
