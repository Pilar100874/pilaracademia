import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  target: { user_id: string; name: string; email: string | null } | null;
  onClose: () => void;
  /** Gestor: de quem copiar (ele mesmo + usuários vinculados). */
  sources?: { user_id: string; name: string }[];
}

export function AdminCopyWorkoutDialog({ target, onClose, sources }: Props) {
  const { user } = useAuth();
  const [planId, setPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const ownerId = sourceId ?? user?.id;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin', 'own-plans', ownerId],
    enabled: !!target && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('id,name,objective')
        .eq('user_id', ownerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const copy = async () => {
    if (!planId || !target) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-copy-workout', {
        body: { planId, targetUserId: target.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Treino copiado para ${target.name || target.email}`);
      setPlanId(null);
      onClose();
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao copiar treino');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        className="flex max-h-[85vh] min-w-0 flex-col overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 px-5 pt-5">
          <DialogTitle>Copiar treino</DialogTitle>
          <DialogDescription className="break-words">
            Escolha um dos seus treinos para enviar a {target?.name || target?.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {sources && (
            <div className="mb-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Copiar de</p>
              <select
                className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={ownerId ?? ''}
                onChange={(e) => { setSourceId(e.target.value); setPlanId(null); }}
              >
                {sources.filter((s) => s.user_id !== target?.user_id).map((s) => (
                  <option key={s.user_id} value={s.user_id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : plans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum treino aqui.</p>
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    className={cn(
                      'flex w-full min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left',
                      planId === p.id ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.objective && <p className="truncate text-[11px] text-muted-foreground">{p.objective}</p>}
                    </div>
                    {planId === p.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button className="flex-1" onClick={copy} disabled={!planId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Copiar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
