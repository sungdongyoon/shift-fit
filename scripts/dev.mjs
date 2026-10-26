import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDesktopProject, localRuntimePath, prepareLocalRuntime } from './local-runtime.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

if (isDesktopProject(projectRoot)) {
  const runtimeRoot = localRuntimePath(projectRoot);
  await prepareLocalRuntime({ projectRoot, runtimeRoot });
  console.log(`Shiftfit local runtime: ${runtimeRoot}`);
}

const child = spawn(process.execPath, [
  join(projectRoot, 'node_modules/next/dist/bin/next'), 'dev', ...process.argv.slice(2),
], { cwd: projectRoot, stdio: 'inherit', env: process.env });

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.once('error', error => { console.error(error); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
