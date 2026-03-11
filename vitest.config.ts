import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    include: ["src/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/._*"],
  },
});
