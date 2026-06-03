import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://www.chuanke.com",
  trailingSlash: "never",
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
