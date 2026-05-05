import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, ScanLine } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WorkoutPlan } from '@/hooks/useWorkoutPlans';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan;
}

interface ShareRow {
  token: string;
  expires_at: string;
}

/**
 * Gera (ou reaproveita) um link/QR de compartilhamento do treino.
 * - Aba "Executar (sem login)": link público para qualquer pessoa fazer o treino.
 * - Aba "Importar para conta": link que abre na importação para outro usuário logado.
 * Ambos expiram em 24h.
 */
export function ShareWorkoutDialog({ open, onOpenChange, plan }: Props) {
  const { user } = useAuth();
  const [share, setShare] = useState<ShareRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    void createShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function createShare() {
    if (!user) return;
    setLoading(true);
    try {
      const exercises = (plan.exercises ?? []).map((ex, i) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        order_index: ex.order_index ?? i,
        is_cooldown: (ex as any).is_cooldown ?? false,
        image_urls: ex.image_urls ?? [],
        image_url: ex.image_url ?? null,
        video_url: ex.video_url ?? null,
        video_type: ex.video_type ?? null,
        video_start_seconds: ex.video_start_seconds ?? null,
        video_end_seconds: ex.video_end_seconds ?? null,
        body_analysis: ex.body_analysis ?? null,
        aesthetic_analysis: ex.aesthetic_analysis ?? null,
        mobility_analysis: ex.mobility_analysis ?? null,
      }));
      const snapshot = {
        exercises,
        days_of_week: plan.days_of_week,
        cooldown_enabled: plan.cooldown_enabled ?? false,
      };
      const { data, error } = await (supabase as any)
        .from('workout_shares')
        .insert({
          user_id: user.id,
          workout_plan_id: plan.id,
          plan_name: plan.name,
          snapshot,
        })
        .select('token, expires_at')
        .single();
      if (error) throw error;
      setShare(data as ShareRow);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar link');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = share ? `${origin}/p/treino/${share.token}` : '';
  const importUrl = share ? `${origin}/import/treino/${share.token}` : '';

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar treino</DialogTitle>
          <DialogDescription>
            "{plan.name}" — link válido por 24 horas.
          </DialogDescription>
        </DialogHeader>

        {loading || !share ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="public" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="public">Sem login</TabsTrigger>
              <TabsTrigger value="import">Importar p/ conta</TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Quem ler este QR pode executar o treino direto no navegador, sem instalar o app.
              </p>
              <div className="flex justify-center p-4 bg-white rounded-md border border-border">
                <QRCodeCanvas value={publicUrl} size={192} includeMargin />
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-2 py-1 truncate">{publicUrl}</code>
                <Button size="icon" variant="outline" onClick={() => copy('public', publicUrl)}>
                  {copied === 'public' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Outro usuário logado pode escanear este QR (ou abrir o link) para receber e aprovar a inclusão do treino na conta dele.
              </p>
              <div className="flex justify-center p-4 bg-white rounded-md border border-border">
                <QRCodeCanvas value={importUrl} size={192} includeMargin />
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-2 py-1 truncate">{importUrl}</code>
                <Button size="icon" variant="outline" onClick={() => copy('import', importUrl)}>
                  {copied === 'import' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ScanLine className="h-3 w-3" /> Quem recebe pode também colar o link manualmente no navegador.
              </p>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
