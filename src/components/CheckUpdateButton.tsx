import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Botão "Verificar atualização" — força um check no service worker.
 * - Se houver versão nova esperando, aplica e recarrega.
 * - Caso contrário, avisa que já está na versão mais recente.
 */
export function CheckUpdateButton() {
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator)) {
        // Sem SW: hard reload contornando cache do navegador
        toast.success("Recarregando para buscar a versão mais recente…");
        setTimeout(() => window.location.reload(), 600);
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration();

      if (!reg) {
        // Não está rodando como PWA com SW ativo — apenas recarrega
        toast.success("Recarregando…");
        setTimeout(() => window.location.reload(), 600);
        return;
      }

      // Pede ao SW para checar nova versão no servidor
      await reg.update().catch(() => {});

      // Se já tinha um worker esperando OU se o update achou um novo, aplica
      const waiting = reg.waiting || (reg.installing && reg.installing);

      if (reg.waiting) {
        toast.success("Nova versão encontrada — atualizando…");
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        // O listener de controllerchange no UpdatePrompt fará o reload
        return;
      }

      // Pequena espera para o "installing" virar "waiting"
      if (reg.installing) {
        const installing = reg.installing;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 4000);
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              clearTimeout(timer);
              resolve();
            }
          });
        });
        if (reg.waiting) {
          toast.success("Nova versão encontrada — atualizando…");
          (reg.waiting as ServiceWorker).postMessage({ type: "SKIP_WAITING" });
          return;
        }
      }

      toast.success("Você já está na versão mais recente.");
    } catch {
      toast.error("Não foi possível verificar agora. Tentando recarregar…");
      setTimeout(() => window.location.reload(), 600);
    } finally {
      setTimeout(() => setBusy(false), 1200);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={check}
      disabled={busy}
      className="gap-2"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {busy ? "Verificando..." : "Verificar atualização"}
    </Button>
  );
}
