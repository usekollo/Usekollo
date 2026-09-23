import { defineConfig } from "vitest/config";

// Node environment, not jsdom: what is covered here is the security-critical
// server-side logic — signature verification, upload sniffing — none of which
// touches the DOM.
export default defineConfig({
  // Native tsconfig path resolution, so `@/…` imports work without the
  // vite-tsconfig-paths plugin.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Placeholder env, so the suite never needs a real .env. See the file.
    setupFiles: ["./vitest.setup.ts"],
  },
});
