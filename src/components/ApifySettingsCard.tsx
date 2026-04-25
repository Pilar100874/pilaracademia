import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ExternalLink, Instagram, KeyRound, Loader2, BookOpen } from 'lucide-react';

/**
 * Permite ao usuário gerenciar seu próprio token Apify (usado para importar
 * vídeos do Instagram). Se nenhum token for definido, o servidor cai para o
 * token global (APIFY_API_TOKEN).
 */
export function ApifySettingsCard() {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSavedToken, setHasSavedToken] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('instagram_api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.instagram_api_key) {
        setHasSavedToken(true);
        setToken(''); // não exibe o valor por segurança
      } else {
        setHasSavedToken(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = token.trim();
    if (!trimmed) {
      toast.error('Informe um token válido');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, instagram_api_key: trimmed },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
      setHasSavedToken(true);
      setToken('');
      toast.success('Token Apify salvo');
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao salvar token');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, instagram_api_key: null },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
      setHasSavedToken(false);
      setToken('');
      toast.success('Token removido — usaremos o token padrão do servidor');
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao remover token');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-compact space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
          <Instagram className="h-5 w-5 text-pink-500" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Importação do Instagram</h2>
          <p className="text-xs text-muted-foreground">
            Token Apify usado para baixar vídeos
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </span>
        ) : hasSavedToken ? (
          <span className="text-green-600 dark:text-green-500 font-medium">
            ✓ Token pessoal configurado
          </span>
        ) : (
          <span className="text-muted-foreground">
            Usando o token padrão do servidor
          </span>
        )}
      </div>

      {/* Links externos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-xl justify-start"
        >
          <a
            href="https://console.apify.com/sign-up"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Criar conta Apify
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-xl justify-start"
        >
          <a
            href="https://console.apify.com/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Pegar meu token
          </a>
        </Button>
      </div>

      {/* Manual */}
      <Accordion type="single" collapsible>
        <AccordionItem value="manual" className="border rounded-xl px-3">
          <AccordionTrigger className="text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Como configurar (passo a passo)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="text-sm space-y-2 text-muted-foreground list-decimal pl-5">
              <li>
                Acesse{' '}
                <a
                  href="https://apify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  apify.com
                </a>{' '}
                e crie uma conta gratuita (inclui ~$5/mês de crédito).
              </li>
              <li>
                No painel, vá em{' '}
                <span className="font-medium text-foreground">
                  Settings → Integrations → API tokens
                </span>
                .
              </li>
              <li>
                Copie o token padrão (<em>Personal API token</em>) ou crie um novo.
              </li>
              <li>Cole o token no campo abaixo e clique em "Salvar".</li>
              <li>
                Pronto! Use o botão "Instagram" na biblioteca de exercícios para
                importar reels e carrosséis.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              O token é salvo de forma privada no seu perfil. Se você não definir
              um, será usado o token compartilhado do servidor (sujeito a limites).
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Campo do token */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {hasSavedToken ? 'Substituir token' : 'Token Apify'}
        </Label>
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={
            hasSavedToken ? 'Cole um novo token para substituir' : 'apify_api_...'
          }
          disabled={saving || loading}
          className="h-12 rounded-xl font-mono text-sm"
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || loading || !token.trim()}
          className="flex-1 h-11 rounded-xl"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar token'}
        </Button>
        {hasSavedToken && (
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={saving || loading}
            className="h-11 rounded-xl"
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
