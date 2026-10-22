import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    target: "es2020",
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        visualIdentity: fileURLToPath(new URL("./visual-identity/index.html", import.meta.url))
      }
    }
  }
});
