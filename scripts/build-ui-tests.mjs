import { build } from "vite";
import react from "@vitejs/plugin-react";
await build({
  configFile: false,
  logLevel: "error",
  plugins: [react()],
  build: {
    ssr: "src/App.jsx",
    outDir: "node_modules/.cache/ito-helper-ui",
    emptyOutDir: true,
    rolldownOptions: { output: { entryFileNames: "app.mjs" } },
  },
});
