import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZxingScanner } from '@/components/ZxingScanner';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOKEN_RE = /\/import\/treino\/([0-9a-f-]{36})/i;
const PUBLIC_RE = /\/p\/treino\/([0-9a-f-]{36})/i;
const RAW_TOKEN = /^[0-9a-f-]{36}$/i;

/**
 * Diálogo para o usuário **logado** escanear (ou colar) o QR de outro
 * usuário e ser levado para a tela de importação do treino.
 */
export function ReceiveWorkoutDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [manualValue, setManualValue] = useState('');

  const handleToken = (raw: string) => {
    let token: string | null = null;
    const m1 = raw.match(TOKEN_RE);
    const m2 = raw.match(PUBLIC_RE);
    if (m1) token = m1[1];
    else if (m2) token = m2[1];
    else if (RAW_TOKEN.test(raw.trim())) token = raw.trim();

    if (!token) {
      toast.error('QR Code não reconhecido');
      return;
    }
    onOpenChange(false);
    navigate(`/import/treino/${token}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receber treino via QR</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR de "Importar p/ conta" do remetente.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md overflow-hidden border border-border aspect-square bg-black">
          {open && (
            <ZxingScanner
              onResult={handleToken}
              onError={(msg) => toast.error(msg)}
            />
          )}
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">Ou cole o link aqui:</p>
          <div className="flex gap-2">
            <Input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="https://…/import/treino/…"
            />
            <Button onClick={() => handleToken(manualValue)} disabled={!manualValue}>
              Abrir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
