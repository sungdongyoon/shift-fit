import type { NextConfig } from 'next';
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

const projectRoot = process.cwd();
const modulesPath = join(projectRoot, 'node_modules');
const runtimeRoot = existsSync(modulesPath) && lstatSync(modulesPath).isSymbolicLink()
  ? dirname(realpathSync(modulesPath))
  : undefined;

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    ...(runtimeRoot ? {
      turbopackAdditionalRoots: { runtime: { path: runtimeRoot } },
    } : {}),
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: projectRoot,
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
};

export default nextConfig;
