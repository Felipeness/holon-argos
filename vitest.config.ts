import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@argos/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@argos/graph-memory": path.resolve(__dirname, "packages/graph-memory/src/index.ts"),
      "@argos/blueprint-engine": path.resolve(__dirname, "packages/blueprint-engine/src/index.ts"),
      "@argos/holon-runtime": path.resolve(__dirname, "packages/holon-runtime/src/index.ts"),
      "@argos/circuit-breaker": path.resolve(__dirname, "packages/circuit-breaker/src/index.ts"),
      "@argos/observability": path.resolve(__dirname, "packages/observability/src/index.ts"),
      "@argos/temporal-workflows": path.resolve(__dirname, "packages/temporal-workflows/src/index.ts"),
      "@argos/incident-pipeline": path.resolve(__dirname, "packages/incident-pipeline/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/__tests__/**/*.test.ts", "holons/**/__tests__/**/*.test.ts", "api/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "holons/*/domain/**/*.ts"],
      exclude: ["**/__tests__/**", "**/index.ts"],
    },
    testTimeout: 10_000,
  },
})
