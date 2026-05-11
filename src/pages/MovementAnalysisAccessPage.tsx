import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMaster } from '@/hooks/useIsMaster';
import { Navigate, useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Search, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow {
  user_id: string;
  name: string;
  email: string | null;
  movement_analysis_enabled: boolean;
  video_analysis_model: string | null;
}

interface MasterSettings {
  library_analysis_model: string;
  user_video_analysis_model: string;
}

const MODEL_OPTIONS = [
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (mais barato)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (padrão)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (melhor qualidade)' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)' },
  { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview, top)' },
];

export default function MovementAnalysisAccessPage() {
  const { isMaster, isLoading: roleLoading } = useIsMaster();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [reanalyzeBusy, setReanalyzeBusy] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['admin', 'master-settings'],
    queryFn: async (): Promise<MasterSettings> => {
      const { data, error } = await supabase
        .from('master_settings')
        .select('library_analysis_model,user_video_analysis_model')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return (data as MasterSettings) ?? {
        library_analysis_model: 'google/gemini-2.5-flash',
        user_video_analysis_model: 'google/gemini-2.5-flash',
      };
    },
    enabled: isMaster,
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<MasterSettings>) => {
      const { error } = await supabase.from('master_settings').update(patch).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'master-settings'] });
      toast.success('Configuração salva');
    },
    onError: () => toast.error('Falha ao salvar'),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin', 'movement-analysis-profiles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id,name,email,movement_analysis_enabled,video_analysis_model')
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
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'movement-analysis-profiles'], ctx.prev);
      toast.error('Falha ao atualizar permissão');
    },
  });

  const setUserModel = useMutation({
    mutationFn: async ({ user_id, model }: { user_id: string; model: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ video_analysis_model: model })
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onMutate: async ({ user_id, model }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'movement-analysis-profiles'] });
      const prev = qc.getQueryData<ProfileRow[]>(['admin', 'movement-analysis-profiles']);
      qc.setQueryData<ProfileRow[]>(['admin', 'movement-analysis-profiles'], (old) =>
        old?.map((p) => (p.user_id === user_id ? { ...p, video_analysis_model: model } : p)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'movement-analysis-profiles'], ctx.prev);
      toast.error('Falha ao atualizar modelo');
    },
    onSuccess: () => toast.success('Modelo do usuário atualizado'),
  });

  // ---------- Re-análise da biblioteca em lote ----------
  async function runReanalyzeBatch(limit: number) {
    if (!settings) return;
    setReanalyzeBusy(true);
    try {
      // Pega `limit` itens da biblioteca global com vídeo (em qualquer estado)
      const { data: list, error } = await supabase
        .from('exercise_library')
        .select('id,name,video_url,video_type')
        .eq('is_global', true)
        .not('video_url', 'is', null)
        .neq('video_type', 'instagram')
        .order('updated_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      const items = (list || []) as Array<{
        id: string;
        name: string;
        video_url: string;
        video_type: string;
      }>;
      if (items.length === 0) {
        toast.info('Nenhum vídeo encontrado para re-analisar');
        return;
      }
      setReanalyzeProgress({ done: 0, total: items.length });
      let done = 0;
      let fails = 0;
      for (const ex of items) {
        try {
          const { data, error: invErr } = await supabase.functions.invoke('analyze-exercise-video', {
            body: {
              videoUrl: ex.video_url,
              exerciseName: ex.name,
              categories: [],
              model: settings.library_analysis_model,
              mode: 'library',
            },
          });
          if (invErr) throw invErr;
          if (data?.fallback) throw new Error(data?.message || 'falha');
          if (!data?.body_analysis || !data?.aesthetic_analysis || !data?.mobility_analysis) {
            throw new Error('resposta inválida');
          }
          await supabase
            .from('exercise_library')
            .update({
              body_analysis: data.body_analysis,
              aesthetic_analysis: data.aesthetic_analysis,
              mobility_analysis: data.mobility_analysis,
              body_analyzed_at: new Date().toISOString(),
            })
            .eq('id', ex.id);
        } catch (err) {
          fails++;
          console.warn('reanalyze failed', ex.id, err);
        }
        done++;
        setReanalyzeProgress({ done, total: items.length });
      }
      toast.success(`Re-análise concluída: ${done - fails}/${done} vídeos`);
    } catch (err) {
      toast.error('Falha ao iniciar re-análise');
      console.error(err);
    } finally {
      setReanalyzeBusy(false);
      setTimeout(() => setReanalyzeProgress(null), 4000);
    }
  }

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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise de movimento por IA
          </h1>
          <p className="text-xs text-muted-foreground">Configuração e permissões</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Configuração global de modelos */}
        <section className="rounded-md border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold">Modelo de IA</h2>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Modelo para análise da <strong>biblioteca global</strong> (re-análise em lote)
            </p>
            <Select
              value={settings?.library_analysis_model ?? 'google/gemini-2.5-flash'}
              onValueChange={(v) => updateSettings.mutate({ library_analysis_model: v })}
              disabled={!settings}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Modelo padrão para <strong>vídeos enviados por usuários</strong>
            </p>
            <Select
              value={settings?.user_video_analysis_model ?? 'google/gemini-2.5-flash'}
              onValueChange={(v) => updateSettings.mutate({ user_video_analysis_model: v })}
              disabled={!settings}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Pode ser sobrescrito por usuário na lista abaixo.
            </p>
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs font-medium">Re-analisar biblioteca com modelo configurado</p>
            <p className="text-[11px] text-muted-foreground">
              Processa N vídeos da biblioteca global com o modelo selecionado. Comece pequeno (20) para checar custo antes de rodar tudo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={reanalyzeBusy} onClick={() => runReanalyzeBatch(20)}>
                {reanalyzeBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Lote de 20
              </Button>
              <Button size="sm" variant="outline" disabled={reanalyzeBusy} onClick={() => runReanalyzeBatch(100)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Lote de 100
              </Button>
              <Button size="sm" disabled={reanalyzeBusy} onClick={() => runReanalyzeBatch(5000)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-analisar todos
              </Button>
            </div>
            {reanalyzeProgress && (
              <p className="text-xs text-muted-foreground">
                Processando {reanalyzeProgress.done}/{reanalyzeProgress.total}…
              </p>
            )}
          </div>
        </section>

        {/* Permissões por usuário */}
        <section className="space-y-3">
          <div className="rounded-md border border-border bg-muted/20 p-3 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-snug text-muted-foreground">
              A análise gera custo por chamada. Habilite apenas usuários autorizados. {enabledCount}/{profiles.length} liberados.
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
                  className="rounded-md border border-border bg-card px-3 py-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name || '—'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.email || 'sem e-mail'}</p>
                    </div>
                    <Switch
                      checked={p.movement_analysis_enabled}
                      onCheckedChange={(v) =>
                        toggle.mutate({ user_id: p.user_id, enabled: v === true })
                      }
                    />
                  </div>
                  {p.movement_analysis_enabled && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Modelo usado nos vídeos deste usuário</p>
                      <Select
                        value={p.video_analysis_model ?? '__default__'}
                        onValueChange={(v) =>
                          setUserModel.mutate({
                            user_id: p.user_id,
                            model: v === '__default__' ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">
                            Usar padrão global ({settings?.user_video_analysis_model ?? '—'})
                          </SelectItem>
                          {MODEL_OPTIONS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
