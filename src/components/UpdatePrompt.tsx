import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const isPreviewOrIframe = (() => {
  if (typeof window === "undefined") return false;
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");
  try {
    return isPreviewHost || window.self !== window.top;
  } catch {
    return true;
  }
})();

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (isPreviewOrIframe) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const setupWaiting = (reg: ServiceWorkerRegistration) => {
      setRegistration(reg);
      if (reg.waiting) setNeedRefresh(true);

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      });
    };

    let activeReg: ServiceWorkerRegistration | null = null;

    const recheck = () => activeReg?.update().catch(() => {});

    const startPolling = (reg: ServiceWorkerRegistration) => {
      activeReg = reg;
      // Immediate check so the banner can surface on the auth/login screen.
      reg.update().catch(() => {});
      // Burst of early checks — handles the auto-login case where the user
      // never types credentials: the session is restored instantly and we
      // still want the banner to surface within a few seconds.
      [1500, 5000, 15000, 30000, 60000].forEach((ms) => {
        setTimeout(() => reg.update().catch(() => {}), ms);
      });
      // Check every 5 min while the tab is open (browser & PWA).
      setInterval(() => {
        reg.update().catch(() => {});
      }, 5 * 60 * 1000);
      // Also re-check whenever the tab becomes visible / focused —
      // covers reopening the PWA and switching back to the browser tab.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") recheck();
      });
      window.addEventListener("focus", recheck);
      // Re-check on client-side navigations (SPA route changes) so users
      // logged-in via stored session also trigger checks while browsing.
      window.addEventListener("popstate", recheck);
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        const r = origPush.apply(this, args as Parameters<typeof origPush>);
        recheck();
        return r;
      };
      history.replaceState = function (...args) {
        const r = origReplace.apply(this, args as Parameters<typeof origReplace>);
        recheck();
        return r;
      };
    };

    // Dynamically import the virtual register module from vite-plugin-pwa
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        registerSW({
          immediate: true,
          onRegisteredSW(_swUrl, reg) {
            if (cancelled || !reg) return;
            setupWaiting(reg);
            startPolling(reg);
          },
          onNeedRefresh() {
            setNeedRefresh(true);
          },
        });
      })
      .catch(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (!cancelled && reg) {
            setupWaiting(reg);
            startPolling(reg);
          }
        });
      });

    // Re-check for new versions on auth state changes (login, token refresh).
    // This makes the update banner appear right after a successful login,
    // even if the user kept the auth screen open for a while.
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        recheck();
      }
    });

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = async () => {
    setUpdating(true);
    try {
      const reg = registration ?? (await navigator.serviceWorker.getRegistration());
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        // controllerchange listener will reload
        return;
      }
      // No waiting worker — just reload to fetch latest
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-card border border-border rounded-md shadow-lg px-4 py-3 flex items-center gap-3 max-w-md w-full">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base leading-tight">Nova versão disponível</p>
          <p className="text-xs text-muted-foreground">Atualize para usar a versão mais recente.</p>
        </div>
        <Button size="sm" onClick={applyUpdate} disabled={updating}>
          {updating ? "Atualizando..." : "Atualizar"}
        </Button>
        <button
          type="button"
          aria-label="Dispensar"
          onClick={() => setNeedRefresh(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
