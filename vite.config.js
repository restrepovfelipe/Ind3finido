import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  appType: "mpa",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        quienessomos: resolve(__dirname, "quienessomos/index.html"),
        portafolio: resolve(__dirname, "portafolio/index.html"),
      },
    },
  },
});
