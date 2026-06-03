import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://idasj0301.github.io",
  trailingSlash: "always",
  integrations: [sitemap()],
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  build: {
    format: "directory",
  },
});
