import test from 'node:test';
import assert from 'node:assert/strict';
import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDesktopProject, localRuntimePath, prepareLocalRuntime } from './local-runtime.mjs';

const fixture = async context => {
  const directory = await mkdtemp(join(tmpdir(), 'shiftfit-runtime-test-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const projectRoot = join(directory, 'Desktop', 'shiftfit');
  const runtimeRoot = join(directory, 'Cache', 'runtime');
  await mkdir(projectRoot, { recursive: true });
  await writeFile(join(projectRoot, 'package.json'), '{"name":"shiftfit"}');
  await writeFile(join(projectRoot, 'package-lock.json'), '{"lockfileVersion":3}');
  let installs = 0;
  const install = async root => {
    installs++;
    await mkdir(join(root, 'node_modules/next/dist/bin'), { recursive: true });
    await writeFile(join(root, 'node_modules/next/dist/bin/next'), '// installed next');
  };
  return { projectRoot, runtimeRoot, install, installs: () => installs };
};

test('macOS 바탕화면 프로젝트만 자동 캐시를 사용하며 프로젝트별 경로를 구분한다', () => {
  assert.equal(isDesktopProject('/home/test/Desktop/shiftfit', '/home/test', 'darwin'), true);
  assert.equal(isDesktopProject('/home/test/Desktop-other/app', '/home/test', 'darwin'), false);
  assert.equal(isDesktopProject('/home/test/Developer/app', '/home/test', 'darwin'), false);
  assert.equal(isDesktopProject('/home/test/Desktop/app', '/home/test', 'linux'), false);
  assert.notEqual(localRuntimePath('/a/shiftfit', '/home/test'), localRuntimePath('/b/shiftfit', '/home/test'));
});

test('자동 생성 폴더만 연결하고 재실행 시 의존성을 다시 설치하지 않는다', async context => {
  const f = await fixture(context);
  await writeFile(join(f.projectRoot, 'source.ts'), 'preserve source');
  await mkdir(join(f.projectRoot, 'node_modules'), { recursive: true });
  await writeFile(join(f.projectRoot, 'node_modules/cloud-placeholder'), 'stale');
  await prepareLocalRuntime(f);
  assert.equal((await lstat(join(f.projectRoot, 'node_modules'))).isSymbolicLink(), true);
  assert.equal(await readlink(join(f.projectRoot, '.next')), join(f.runtimeRoot, '.next'));
  assert.equal(await readFile(join(f.projectRoot, 'source.ts'), 'utf8'), 'preserve source');
  await prepareLocalRuntime(f);
  assert.equal(f.installs(), 1);
  await writeFile(join(f.projectRoot, 'package-lock.json'), '{"lockfileVersion":3,"changed":true}');
  await prepareLocalRuntime(f);
  assert.equal(f.installs(), 2);
});

test('설치 실패 시 기존 프로젝트 의존성과 소스를 건드리지 않는다', async context => {
  const f = await fixture(context);
  await mkdir(join(f.projectRoot, 'node_modules'), { recursive: true });
  await writeFile(join(f.projectRoot, 'node_modules/existing'), 'keep');
  await assert.rejects(prepareLocalRuntime({ ...f, install: async () => { throw new Error('offline'); } }));
  assert.equal(await readFile(join(f.projectRoot, 'node_modules/existing'), 'utf8'), 'keep');
  assert.equal((await lstat(join(f.projectRoot, 'node_modules'))).isDirectory(), true);
});
