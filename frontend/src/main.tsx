import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { initAnalytics } from "./lib/analytics";
import "./index.css";

// Cookieless analytics — a no-op unless VITE_PLAUSIBLE_DOMAIN is configured.
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
