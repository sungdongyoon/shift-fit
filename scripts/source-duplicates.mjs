import { lstat, readdir, unlink } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

const ignoredDirectories = new Set([
  ".git", "node_modules", ".next", "out", "build", "coverage", ".yarn",
]);

const canonicalName = name => {
  const extension = extname(name);
  let stem = basename(name, extension);
  let previous;

  do {
    previous = stem;
    stem = stem.replace(/ (?:[2-9]|[1-9]\d+)$/, "");
  } while (stem !== previous);

  return stem === basename(name, extension) ? null : `${stem}${extension}`;
};

const isRegularFile = async path => {
  try {
    return (await lstat(path)).isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

export const findSourceDuplicates = async projectRoot => {
  const root = resolve(projectRoot);
  const duplicates = [];

  const visit = async directory => {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(directory, entry.name);

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) await visit(path);
        continue;
      }

      if (!entry.isFile()) continue;

      const name = canonicalName(entry.name);
      if (!name) continue;

      const canonical = join(directory, name);
      if (!await isRegularFile(canonical)) continue;

      duplicates.push({ path, canonical, relativePath: relative(root, path) });
    }
  };

  await visit(root);

  return duplicates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
};

export const removeSourceDuplicates = async projectRoot => {
  const duplicates = await findSourceDuplicates(projectRoot);
  const removed = [];

  for (const duplicate of duplicates) {
    // Recheck the canonical file before deleting a numbered copy.
    if (!await isRegularFile(duplicate.canonical)) continue;

    try {
      await unlink(duplicate.path);
      removed.push(duplicate.relativePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return removed;
};
