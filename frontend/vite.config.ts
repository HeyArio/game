import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // allowedHosts goes here, directly under server:
    allowedHosts:true,
    
    proxy: {
      // TESTING ONLY: proxies browser calls to the LLM providers so client-side
      // case generation (src/lib/providers.ts) works during `npm run dev`
      // without CORS errors. Has no effect on a production build.
      "/openrouter-api": {
        target: "https://openrouter.ai/api",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openrouter-api/, ""),
      },
      "/groq-api": {
        target: "https://api.groq.com/openai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/groq-api/, ""),
      },
      "/mistral-api": {
        target: "https://api.mistral.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/mistral-api/, ""),
      },
      "/zai-api": {
        target: "https://api.z.ai/api/anthropic",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zai-api/, ""),
      },
      "/gemini-api": {
        target: "https://generativelanguage.googleapis.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gemini-api/, ""),
      },
    },
  },
});