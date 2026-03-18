import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@orchestrix/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@orchestrix/graph-memory": path.resolve(__dirname, "packages/graph-memory/src/index.ts"),
      "@orchestrix/blueprint-engine": path.resolve(__dirname, "packages/blueprint-engine/src/index.ts"),
      "@orchestrix/holon-runtime": path.resolve(__dirname, "packages/holon-runtime/src/index.ts"),
      "@orchestrix/circuit-breaker": path.resolve(__dirname, "packages/circuit-breaker/src/index.ts"),
      "@orchestrix/observability": path.resolve(__dirname, "packages/observability/src/index.ts"),
      "@orchestrix/temporal-workflows": path.resolve(__dirname, "packages/temporal-workflows/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/__tests__/**/*.test.ts", "holons/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "holons/*/domain/**/*.ts"],
      exclude: ["**/__tests__/**", "**/index.ts"],
    },
    testTimeout: 10_000,
  },
})
