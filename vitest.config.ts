import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig keeps JSX for Next.js to compile; tests that render the invoice PDF need it compiled here.
  oxc: { jsx: { runtime: "automatic" } },
});
