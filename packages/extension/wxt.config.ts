import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import path from "node:path";

export default defineConfig({
  // Extension metadata
  manifest: {
    name: "Celesta ✨",
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxCUTWXy3euKRYZjEgEo/ncbkSYfYD+AmpW4l563mZJ1bSqZg6lmtMSN9Oa+ODxScxqVcLqAIsIm2YeLGTRigivw4Ru10+yUIArKhf53Y7Kzepxjyf5MKxZbqmt82GqCeOq3vSoNNHeG5lQyiVLWyF3j0eO9XOXwB6s5v11m/AS0yErBkusXkDP3DaeerRiKAN4vsPy04tFLWP7mPYexU4pmUEnoS2jTBEBcNiIyFhRSR72o/jxxvIaymtv1t72QLqYBhIMe7KVej1Jtx3YBFA3vjHUOTF0TEopPsV5Ja+I4a0dmlJ/U45ET28zcUWD+53+Hd9MzKYiXy2yV2KboSvwIDAQAB",
    description: "What does this thing even do?",
    permissions: [
      "storage",
      "tabs",
      "scripting",
      "contextMenus",
      "sidePanel",
      "debugger",
      "identity",
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
