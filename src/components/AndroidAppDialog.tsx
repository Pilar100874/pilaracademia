import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, Watch, Bluetooth, ShieldCheck, Bell } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** APK servido pelo próprio app (public/downloads), sem depender do GitHub. */
const APK_URL = '/downloads/pilaracademia.apk';

const FEATURES = [
  {
    icon: Bluetooth,
    title: 'Balança por Bluetooth',
    text: 'Lê peso e bioimpedância da sua balança direto no app, sem outros aplicativos.',
  },
  {
    icon: Watch,
    title: 'Galaxy Watch',
    text: 'Passos, calorias, batimentos, sono e peso sincronizados na tela de Saúde.',
  },
  {
    icon: Bell,
    title: 'Sempre à mão',
    text: 'Ícone na tela inicial do celular, abrindo direto como um app instalado.',
  },
];

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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-5 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            Instale a versão nativa do Pilar Academia no seu Android e libere os
            recursos que não funcionam no navegador:
          </p>

          <div className="space-y-2.5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
                >
                  <div className="rounded-md bg-primary/10 p-2 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {f.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2.5 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Na primeira instalação o Android pede para permitir "instalar apps de
              fontes desconhecidas" no navegador. É seguro: o instalável é gerado
              automaticamente a partir do código do seu app.
            </span>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3 space-y-2">
          <Button className="w-full h-11 text-base" asChild>
            <a href={APK_URL} download>
              <Download className="h-4 w-4 mr-2" />
              Baixar app Android
            </a>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
