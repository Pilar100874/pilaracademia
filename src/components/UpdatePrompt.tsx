import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    // Dynamically import the virtual register module from vite-plugin-pwa
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (cancelled) return;
        registerSW({
          immediate: true,
          onRegisteredSW(_swUrl, reg) {
            if (cancelled || !reg) return;
            setupWaiting(reg);
            // periodically check for updates while app is open (every 30 min)
            setInterval(() => {
              reg.update().catch(() => {});
            }, 30 * 60 * 1000);
          },
          onNeedRefresh() {
            setNeedRefresh(true);
          },
        });
      })
      .catch(() => {
        // fallback: just attach to existing registration
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (!cancelled && reg) setupWaiting(reg);
        });
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
