import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Github, Download, Watch } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AndroidAppDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-w-lg min-w-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            App Android (nativo)
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
          <p className="text-muted-foreground">
            A versão nativa para Android permite sincronizar os dados do seu Galaxy Watch
            (passos, calorias, batimentos, sono e peso) direto na tela de Saúde.
          </p>

          <div className="space-y-3">
            <p className="font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Como baixar o APK
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
              <li>No GitHub, o projeto já compila o APK automaticamente a cada atualização (aba <span className="font-medium text-foreground">Actions</span>).</li>
              <li>Abra a execução mais recente do fluxo <span className="font-medium text-foreground">Build Android APK</span>.</li>
              <li>Baixe o arquivo <span className="font-medium text-foreground">pilaracademia-debug-apk</span> e instale no celular.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Na primeira instalação o Android pode pedir para permitir "instalar apps de fontes desconhecidas".
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium flex items-center gap-2">
              <Watch className="h-4 w-4 text-primary" />
              Conectar o Galaxy Watch
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
              <li>No celular, abra o <span className="font-medium text-foreground">Samsung Health</span> → Configurações → Health Connect e ative o compartilhamento.</li>
              <li>Abra o app Pilar Academia → Saúde → cartão <span className="font-medium text-foreground">Dados do relógio</span> → Conectar.</li>
            </ol>
          </div>

          <div className="space-y-2 rounded-xl bg-muted/50 p-3">
            <p className="font-medium flex items-center gap-2 text-xs">
              <Github className="h-4 w-4" />
              Quer compilar você mesmo?
            </p>
            <p className="text-xs text-muted-foreground">
              No seu computador: <code className="text-foreground">npm install</code>,{' '}
              <code className="text-foreground">npx cap add android</code>,{' '}
              <code className="text-foreground">npm run build</code>,{' '}
              <code className="text-foreground">npx cap sync</code> e{' '}
              <code className="text-foreground">npx cap run android</code> (requer Android Studio).
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
