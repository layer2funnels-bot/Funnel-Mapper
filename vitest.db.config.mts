import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", env: loadEnv(mode, process.cwd(), ""), testTimeout: 20000 },
}));
