import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startRemindersLoop } from "@/lib/reminders";

const isPreviewOrIframe = (() => {
  if (typeof window === "undefined") return false;
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app");
  try {
    return isPreviewHost || window.self !== window.top;
  } catch {
    return true;
  }
})();

if (typeof navigator !== "undefined" && "serviceWorker" in navigator && isPreviewOrIframe) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => {
      /* ignore */
    });
}

// One-time purge of stale Workbox/media caches from older service-worker versions.
// This fixes blank video/image previews caused by outdated cached media responses.
const CACHE_PURGE_KEY = "cache-purge-v5";
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
              k.includes("exercise-videos") ||
              k.includes("workout-images")
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

// Start local reminders loop (only fires if user opted in & granted permission)
if (typeof window !== "undefined") {
  try { startRemindersLoop(); } catch { /* ignore */ }
}
