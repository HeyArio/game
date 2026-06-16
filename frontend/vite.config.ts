import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // allowedHosts goes here, directly under server:
    allowedHosts: ['185.221.237.90.nip.io'],
    
    proxy: {
      // TESTING ONLY: proxies browser calls to NVIDIA so client-side case
      // generation (src/lib/nvidia.ts) works during `npm run dev` without CORS
      // errors. Has no effect on a production build.
      "/nvidia-api": {
        target: "https://integrate.api.nvidia.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nvidia-api/, ""),
      },
    },
  },
});