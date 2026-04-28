// Stub: editor de canvas completo não foi portado (depende de fabric.js + dezenas de painéis).
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

export default function MarketingCanvas({ onClose }: { onClose?: () => void }) {
  return (
    <div className="p-6">
      <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Editor de Canvas</h2>
        <p className="text-sm text-muted-foreground">
          O editor visual completo (fabric.js) não está disponível nesta versão.
          Use o AI Creative Studio ou o Page Builder para criar conteúdo.
        </p>
        {onClose && (
          <Button variant="outline" onClick={onClose}>Voltar</Button>
        )}
      </Card>
    </div>
  );
}
