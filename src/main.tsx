import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time purge of stale Workbox/media caches from older service-worker versions.
// This fixes blank video/image previews caused by outdated cached media responses.
const CACHE_PURGE_KEY = "cache-purge-v3";
if (typeof window !== "undefined" && "caches" in window) {
  if (localStorage.getItem(CACHE_PURGE_KEY) !== "done") {
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) =>
              k.includes("supabase") ||
              k.includes("workbox") ||
              k.includes("exercise-videos")
            )
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
