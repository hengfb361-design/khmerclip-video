import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is fully static: it talks to the Colab T4 server over HTTPS,
// so no proxy or server-side code is needed here.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // Cloud preview hostnames are passed in at run time so no VM hostname
    // is baked into the repository.
    allowedHosts: process.env.PREVIEW_HOST ? [process.env.PREVIEW_HOST] : [],
  },
  preview: { host: "0.0.0.0", port: 3000 },
});
