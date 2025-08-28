import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import path from "node:path";

export default defineConfig({
  // Extension metadata
  manifest: {
    name: "Celesta ✨",
    description: "What does this thing even do?",
    permissions: [
      "storage",
      "tabs",
      "scripting",
      "contextMenus",
      "sidePanel",
      "debugger",
    ],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "/icon/icon16.png",
      32: "/icon/icon32.png",
      48: "/icon/icon48.png",
      128: "/icon/icon128.png",
    },
  },
  //@ts-ignore
  web_accessible_resources: [
    {
      resources: ["perms/index.html", "perms/requestPermissions.ts"],
      matches: ["*://*/*"],
    },
  ],

  // Entrypoint and code organization
  entrypointsDir: "entrypoints",

  // Add TypeScript path aliases
  alias: {
    "~": path.resolve("src"),
    "@shared": path.resolve("src/shared"),
  },

  modules: ["@wxt-dev/module-react"],

  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        manifest.name += " (dev)";
      }
    },
  },

  //@ts-ignore
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
