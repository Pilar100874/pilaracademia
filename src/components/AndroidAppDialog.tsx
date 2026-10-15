import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smartphone, Github, Download, Watch, ExternalLink, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPO_KEY = 'pilar_github_repo';
const DEFAULT_REPO = 'https://github.com/Pilar100874/pilaracademia';

/** Aceita "https://github.com/ dono/repo", "github.com/dono/repo" ou "dono/repo". */
function normalizeRepo(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const full = value.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i);
  if (full) return `https://github.com/${full[1]}/${full[2].replace(/\.git$/i, '')}`;
  const short = value.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return `https://github.com/${short[1]}/${short[2]}`;
  return null;
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function AndroidAppDialog({ open, onOpenChange }: Props) {
  const [repo, setRepo] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(REPO_KEY) ?? DEFAULT_REPO;
    setRepo(stored);
    setSaved(normalizeRepo(stored));
    setError(null);
  }, [open]);

  const save = () => {
    const normalized = normalizeRepo(repo);
    if (!normalized) {
      setError('Endereço inválido. Exemplo: github.com/seu-usuario/pilaracademia');
      return;
    }
    localStorage.setItem(REPO_KEY, normalized);
    setRepo(normalized);
    setSaved(normalized);
    setError(null);
  };

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
            A versão nativa para Android permite ler a sua balança por Bluetooth e
            sincronizar os dados do Galaxy Watch (passos, calorias, batimentos, sono e
            peso) direto na tela de Saúde.
          </p>

          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <p className="font-medium flex items-center gap-2">
              <Github className="h-4 w-4" />
              Endereço do seu repositório no GitHub
            </p>
            <p className="text-xs text-muted-foreground">
              É ele que gera e guarda o instalável do app. Cole uma vez e o botão abaixo
              leva direto para a página de download.
            </p>
            <div className="flex gap-2">
              <Input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="github.com/seu-usuario/pilaracademia"
                className="h-11 rounded-xl"
                inputMode="url"
              />
              <Button variant="outline" className="h-11 rounded-xl shrink-0" onClick={save}>
                Salvar
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {saved && (
              <p className="text-xs flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvo: {saved}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Como baixar o instalável
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
              <li>
                Abra a aba <span className="font-medium text-foreground">Actions</span> do
                seu repositório (o botão abaixo já abre nela).
              </li>
              <li>
                Clique na execução mais recente de{' '}
                <span className="font-medium text-foreground">Build Android APK</span>.
              </li>
              <li>
                Em <span className="font-medium text-foreground">Artifacts</span>, baixe{' '}
                <span className="font-medium text-foreground">pilaracademia-debug-apk</span>{' '}
                e instale o arquivo no celular.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Você precisa estar logado no GitHub para baixar. Na primeira instalação o
              Android pede para permitir "instalar apps de fontes desconhecidas".
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium flex items-center gap-2">
              <Watch className="h-4 w-4 text-primary" />
              Conectar o Galaxy Watch
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
              <li>
                No celular, abra o <span className="font-medium text-foreground">Samsung
                Health</span> → Configurações → Health Connect e ative o compartilhamento.
              </li>
              <li>
                Abra o app Pilar Academia → Saúde → cartão{' '}
                <span className="font-medium text-foreground">Dados do relógio</span> →
                Conectar.
              </li>
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
              <code className="text-foreground">npx cap run android</code> (requer Android
              Studio).
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3 space-y-2">
          {saved ? (
            <>
              <Button className="w-full" onClick={() => openUrl(`${saved}/actions/workflows/android-apk.yml`)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir página de download
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => openUrl(`${saved}/actions`)}>
                Ver todas as execuções do build
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => openUrl('https://github.com/actions')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir GitHub
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
