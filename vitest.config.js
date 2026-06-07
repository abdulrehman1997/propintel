import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.js"],
    include: [
      "tests/**/*.test.js",
      "lib/**/__tests__/**/*.test.{js,jsx}",
      "app/**/*.test.{js,jsx}",
      "app/**/__tests__/**/*.test.{js,jsx}",
      "updater/__tests__/**/*.test.{js,jsx}",
    ],
    environmentMatchGlobs: [["updater/**/*.test.{js,jsx}", "node"]],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.js"],
      exclude: ["lib/calculations.js"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
