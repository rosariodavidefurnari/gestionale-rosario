import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/e2e/**",
      // Stale git worktrees under `.worktrees/` carry their own node_modules
      // and checked-out code from abandoned branches. Scanning them causes
      // vitest to load two copies of React (the main workspace's and the
      // worktree's) into the same process, which breaks any component that
      // touches `useRef` (e.g. Radix Dialog) with
      // `Cannot read properties of null (reading 'useRef')`.
      "**/.worktrees/**",
    ],
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
