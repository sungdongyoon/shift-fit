import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFile, lstat, mkdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

export const isDesktopProject = (projectRoot, home = homedir(), platform = process.platform) => {
  const location = relative(join(home, 'Desktop'), resolve(projectRoot));
  return platform === 'darwin' && location !== '..' && !location.startsWith('../') && !isAbsolute(location);
};

export const localRuntimePath = (projectRoot, home = homedir()) => {
  const id = createHash('sha256').update(resolve(projectRoot)).digest('hex').slice(0, 12);
  return join(home, 'Library', 'Caches', 'shiftfit', id);
};

const exists = async path => lstat(path).then(() => true, error => {
  if (error.code === 'ENOENT') return false;
  throw error;
});

const linkGeneratedDirectory = async (projectRoot, runtimeRoot, name) => {
  // Only these disposable directories may be replaced; never remove project sources.
  if (name !== 'node_modules' && name !== '.next') throw new Error('Unsupported generated directory');
  const link = join(projectRoot, name);
  const target = join(runtimeRoot, name);
  if (await exists(link)) {
    const stat = await lstat(link);
    if (stat.isSymbolicLink() && resolve(projectRoot, await readlink(link)) === target) return;
    await rm(link, { recursive: true, force: true });
  }
  await symlink(target, link, 'dir');
};

const installDependencies = runtimeRoot => new Promise((resolveInstall, reject) => {
  const child = spawn('npm', ['ci', '--no-audit', '--no-fund'], { cwd: runtimeRoot, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', code => code === 0 ? resolveInstall() : reject(new Error(`npm ci failed (${code})`)));
});

export const prepareLocalRuntime = async ({ projectRoot, runtimeRoot, install = installDependencies }) => {
  projectRoot = resolve(projectRoot);
  runtimeRoot = resolve(runtimeRoot);
  if (projectRoot === runtimeRoot) throw new Error('The runtime must be outside the source directory');
  const manifest = await readFile(join(projectRoot, 'package.json'));
  const lockfile = await readFile(join(projectRoot, 'package-lock.json'));
  const fingerprint = createHash('sha256').update(manifest).update(lockfile).digest('hex');
  const fingerprintPath = join(runtimeRoot, '.dependencies-hash');
  const previous = await readFile(fingerprintPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });

  await mkdir(runtimeRoot, { recursive: true });
  if (previous !== fingerprint || !await exists(join(runtimeRoot, 'node_modules/next/dist/bin/next'))) {
    await copyFile(join(projectRoot, 'package.json'), join(runtimeRoot, 'package.json'));
    await copyFile(join(projectRoot, 'package-lock.json'), join(runtimeRoot, 'package-lock.json'));
    await install(runtimeRoot);
    if (!await exists(join(runtimeRoot, 'node_modules/next/dist/bin/next'))) throw new Error('Next.js installation is incomplete');
    await writeFile(fingerprintPath, fingerprint);
  }

  // Install successfully before replacing any old dependencies or cache.
  await mkdir(join(runtimeRoot, '.next'), { recursive: true });
  await linkGeneratedDirectory(projectRoot, runtimeRoot, 'node_modules');
  await linkGeneratedDirectory(projectRoot, runtimeRoot, '.next');
  return runtimeRoot;
};
