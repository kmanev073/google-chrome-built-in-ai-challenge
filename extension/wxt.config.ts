import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  publicDir: "static",
  modules: ["@wxt-dev/auto-icons", "@wxt-dev/module-solid"],
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  extensionApi: "chrome",
  manifest: {
    name: "Anti-Phishing",
    permissions: ["tabs"],
    host_permissions: ["<all_urls>"],
  },
});
