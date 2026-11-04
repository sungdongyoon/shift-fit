import { fileURLToPath } from "node:url";
import { findSourceDuplicates, removeSourceDuplicates } from "./source-duplicates.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const clean = process.argv.includes("--clean");

if (clean) {
  const removed = await removeSourceDuplicates(projectRoot);
  console.log(`Removed ${removed.length} numbered source copies.`);
}

const duplicates = await findSourceDuplicates(projectRoot);

if (duplicates.length) {
  console.error("번호가 붙은 소스 복사본을 발견했습니다:");

  for (const duplicate of duplicates) console.error(`  ${duplicate.relativePath}`);

  console.error("동기화 상태를 확인하고, 복사본이 불필요하면 npm run clean:duplicates를 실행하세요.");
  process.exitCode = 1;
} else {
  console.log("Source duplicate check passed (0 copies).");
}
