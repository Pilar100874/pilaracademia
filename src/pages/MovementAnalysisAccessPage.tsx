import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMaster } from '@/hooks/useIsMaster';
import { Navigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Search, ShieldAlert } from 'lucide-react';
// Page motion not used here
import { toast } from 'sonner';

interface ProfileRow {
  user_id: string;
  name: string;
  email: string | null;
  movement_analysis_enabled: boolean;
}

export default function MovementAnalysisAccessPage() {
  const { isMaster, isLoading: roleLoading } = useIsMaster();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin', 'movement-analysis-profiles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id,name,email,movement_analysis_enabled')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
    enabled: isMaster,
  });

  const toggle = useMutation({
    mutationFn: async ({ user_id, enabled }: { user_id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ movement_analysis_enabled: enabled })
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onMutate: async ({ user_id, enabled }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'movement-analysis-profiles'] });
      const prev = qc.getQueryData<ProfileRow[]>(['admin', 'movement-analysis-profiles']);
      qc.setQueryData<ProfileRow[]>(['admin', 'movement-analysis-profiles'], (old) =>
        old?.map((p) => (p.user_id === user_id ? { ...p, movement_analysis_enabled: enabled } : p)) ?? old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'movement-analysis-profiles'], ctx.prev);
      toast.error('Falha ao atualizar permissão');
    },
    onSuccess: () => toast.success('Permissão atualizada'),
  });

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isMaster) return <Navigate to="/" replace />;

  const term = search.trim().toLowerCase();
  const filtered = term
    ? profiles.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.email || '').toLowerCase().includes(term),
      )
    : profiles;

  const enabledCount = profiles.filter((p) => p.movement_analysis_enabled).length;

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise de movimento por IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Liberar uso do recurso por usuário (custo de IA por chamada)
          </p>
        </header>

        <div className="px-4 py-4 space-y-4">
          <div className="rounded-md border border-border bg-muted/20 p-3 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-snug text-muted-foreground">
              A análise de movimento usa Gemini com vídeo, gerando custo por execução.
              Habilite apenas para usuários autorizados. {enabledCount}/{profiles.length} liberados.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum usuário encontrado.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((p) => (
                <li
                  key={p.user_id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name || '—'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.email || 'sem e-mail'}</p>
                  </div>
                  <Switch
                    checked={p.movement_analysis_enabled}
                    onCheckedChange={(v) =>
                      toggle.mutate({ user_id: p.user_id, enabled: v === true })
                    }
                    disabled={toggle.isPending}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
