import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time purge of stale Workbox caches from older service-worker versions.
// This fixes blank video/image dialogs caused by outdated cached Supabase responses.
const CACHE_PURGE_KEY = "cache-purge-v2";
if (typeof window !== "undefined" && "caches" in window) {
  if (localStorage.getItem(CACHE_PURGE_KEY) !== "done") {
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.includes("supabase") || k.includes("workbox"))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => localStorage.setItem(CACHE_PURGE_KEY, "done"))
      .catch(() => {
        /* ignore */
      });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
