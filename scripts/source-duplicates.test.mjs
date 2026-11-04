import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findSourceDuplicates, removeSourceDuplicates } from "./source-duplicates.mjs";

const fixture = async context => {
  const root = await mkdtemp(join(tmpdir(), "shiftfit-copy-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));

  return root;
};

test("번호 복사본만 감지하고 원본 없는 파일과 일반 숫자 이름은 유지한다", async context => {
  const root = await fixture(context);
  const files = ["page.tsx", "page 2.tsx", "page 3.tsx", "page 2 2.tsx", "orphan 2.tsx", "v2.ts", "section 1.tsx"];

  for (const name of files) await writeFile(join(root, name), name);

  const found = await findSourceDuplicates(root);

  assert.deepEqual(found.map(item => item.relativePath), ["page 2 2.tsx", "page 2.tsx", "page 3.tsx"]);
});

test("삭제 시 현재 원본과 원본 없는 파일을 그대로 보존한다", async context => {
  const root = await fixture(context);
  await writeFile(join(root, "page.tsx"), "current source");
  await writeFile(join(root, "page 2.tsx"), "obsolete source");
  await writeFile(join(root, "page 3.tsx"), "other obsolete source");
  await writeFile(join(root, "orphan 2.tsx"), "only copy");

  const removed = await removeSourceDuplicates(root);

  assert.equal(removed.length, 2);
  assert.equal(await readFile(join(root, "page.tsx"), "utf8"), "current source");
  assert.equal(await readFile(join(root, "orphan 2.tsx"), "utf8"), "only copy");
  assert.equal((await findSourceDuplicates(root)).length, 0);
});

test("Git·생성 폴더와 외부 심볼릭 링크는 검색하거나 삭제하지 않는다", async context => {
  const root = await fixture(context);
  const external = await fixture(context);
  await writeFile(join(external, "external.ts"), "external");
  await writeFile(join(external, "external 2.ts"), "external copy");
  await symlink(external, join(root, "linked"), "dir");

  for (const directory of [".git", "node_modules", ".next"]) {
    await mkdir(join(root, directory));
    await writeFile(join(root, directory, "file.ts"), "generated");
    await writeFile(join(root, directory, "file 2.ts"), "generated copy");
  }

  assert.equal((await findSourceDuplicates(root)).length, 0);
  await removeSourceDuplicates(root);
  assert.equal(await readFile(join(external, "external 2.ts"), "utf8"), "external copy");
});
