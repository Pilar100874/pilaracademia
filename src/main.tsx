import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
    .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
    .then(() => {
      if (typeof window !== "undefined" && "caches" in window) {
        return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
    })
    .catch(() => {
      /* ignore */
    });
}

// One-time purge of stale Workbox/media caches from older service-worker versions.
// This fixes blank video/image previews caused by outdated cached media responses.
const CACHE_PURGE_KEY = "cache-purge-v4";
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

// ===== HMR watchdog (preview/iframe only) =====
// Detecta quando o HMR do Vite trava (websocket caído, erro não recuperado,
// ou aba ficou inativa por muito tempo) e faz auto-recovery automático.
if (import.meta.hot && isPreviewOrIframe) {
  const RELOAD_COOLDOWN_MS = 10_000;
  const STALE_HIDDEN_MS = 60_000;
  const lastReloadKey = "__hmr_last_reload";

  const hardReload = async (reason: string) => {
    const last = Number(sessionStorage.getItem(lastReloadKey) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(lastReloadKey, String(Date.now()));
    console.warn(`[HMR watchdog] auto-recovering: ${reason}`);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  import.meta.hot.on("vite:ws:disconnect", () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => hardReload("ws disconnected"), 4000);
  });
  import.meta.hot.on("vite:ws:connect", () => {
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
  });

  import.meta.hot.on("vite:error", () => {
    setTimeout(() => hardReload("vite error overlay"), 1500);
  });

  let hiddenAt: number | null = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else if (document.visibilityState === "visible" && hiddenAt) {
      const elapsed = Date.now() - hiddenAt;
      hiddenAt = null;
      if (elapsed > STALE_HIDDEN_MS) hardReload("tab was hidden too long");
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
