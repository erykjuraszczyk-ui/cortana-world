import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages project URL has the /cortana-world/ prefix.
  base: process.env.GITHUB_ACTIONS ? "/cortana-world/" : "/",
});
