// Stub: módulo de envio em massa (WhatsApp/SMS) não foi portado.
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";

export default function EnvioMassaMarketing() {
  return (
    <div className="p-6">
      <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
        <Send className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Envio em Massa</h2>
        <p className="text-sm text-muted-foreground">
          Recurso de disparo em massa (WhatsApp/SMS) não está disponível nesta versão.
        </p>
      </Card>
    </div>
  );
}
