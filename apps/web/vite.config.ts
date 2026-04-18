import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";

export default defineConfig({
  envDir: resolve(__dirname, "../.."),
  server: {
    port: 5173,
    host: true,
  },
  plugins: [
    tsconfigPaths(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
});
