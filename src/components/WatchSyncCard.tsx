import { useCallback, useEffect, useState } from 'react';
import { Watch, RefreshCw, Footprints, Flame, HeartPulse, Moon, Scale, Settings, Activity, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  checkWatchAvailability,
  isWatchSyncSupported,
  openWatchSettings,
  readWatchSummary,
  requestWatchPermission,
  type WatchSummary,
} from '@/lib/healthConnect';

type Status = 'checking' | 'unavailable' | 'needs-permission' | 'ready';

interface ImportOptions {
  calories: boolean;
  weight: boolean;
  bodyExam: boolean;
}

export function WatchSyncCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('checking');
  const [summary, setSummary] = useState<WatchSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [options, setOptions] = useState<ImportOptions>({ calories: true, weight: true, bodyExam: true });

  useEffect(() => {
    if (!isWatchSyncSupported()) return;
    let cancelled = false;
    checkWatchAvailability().then(({ available }) => {
      if (cancelled) return;
      setStatus(available ? 'needs-permission' : 'unavailable');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await readWatchSummary();
      setSummary(data);
      setStatus('ready');
    } catch {
      toast({
        title: 'Não foi possível ler os dados',
        description: 'Verifique se o Samsung Health está compartilhando com o Health Connect.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  const connect = async () => {
    try {
      const granted = await requestWatchPermission();
      if (granted) {
        await sync();
      } else {
        toast({
          title: 'Permissão não concedida',
          description: 'Autorize o acesso aos dados de saúde para sincronizar o relógio.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível abrir a tela de permissões de saúde.',
        variant: 'destructive',
      });
    }
  };

  const dayBounds = (iso: string) => {
    const d = new Date(iso);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const importCalories = async (userId: string, s: WatchSummary): Promise<string> => {
    if (s.caloriesToday == null) return 'Calorias: sem dados hoje.';
    const now = new Date();
    const { start, end } = dayBounds(now.toISOString());
    const { data: existing } = await supabase
      .from('exercise_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('exercise_type', 'watch_sync')
      .gte('performed_at', start)
      .lte('performed_at', end)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('exercise_entries')
        .update({ calories_burned: s.caloriesToday })
        .eq('id', existing[0].id);
      if (error) throw error;
      return `Calorias atualizadas no exercício de hoje (${s.caloriesToday} kcal).`;
    }

    const { error } = await supabase.from('exercise_entries').insert({
      user_id: userId,
      name: 'Atividade do relógio',
      duration_minutes: 0,
      calories_burned: s.caloriesToday,
      exercise_type: 'watch_sync',
      performed_at: now.toISOString(),
    });
    if (error) throw error;
    return `Calorias lançadas como exercício de hoje (${s.caloriesToday} kcal).`;
  };

  const importWeight = async (userId: string, s: WatchSummary): Promise<string> => {
    if (!s.latestWeight) return 'Peso: sem dados no relógio.';
    const { start, end } = dayBounds(s.latestWeight.date);
    const { data: existing } = await supabase
      .from('weight_history')
      .select('id')
      .eq('user_id', userId)
      .gte('recorded_at', start)
      .lte('recorded_at', end)
      .limit(1);
    if (existing && existing.length > 0) return 'Peso: já existe registro neste dia.';
    const { error } = await supabase.from('weight_history').insert({
      user_id: userId,
      weight_kg: s.latestWeight.kg,
      recorded_at: s.latestWeight.date,
    });
    if (error) throw error;
    return `Peso salvo (${s.latestWeight.kg} kg).`;
  };

  const importBodyExam = async (userId: string, s: WatchSummary): Promise<string> => {
    const { latestWeight, latestBodyFat, latestHeightCm } = s;
    if (!latestWeight && !latestBodyFat) return 'Bioimpedância: sem dados no relógio.';
    const measuredAt = latestBodyFat?.date || latestWeight?.date || new Date().toISOString();
    const heightM = latestHeightCm ? latestHeightCm / 100 : null;
    const weightKg = latestWeight?.kg ?? null;
    const fatPct = latestBodyFat?.pct ?? null;

    const { data: existing } = await supabase
      .from('body_analyses')
      .select('id')
      .eq('user_id', userId)
      .eq('measured_at', measuredAt)
      .limit(1);
    if (existing && existing.length > 0) return 'Bioimpedância: medição já estava salva.';

    const extracted = {
      measured_at: measuredAt,
      weight_kg: weightKg,
      body_fat_pct: fatPct,
      fat_mass_kg: weightKg != null && fatPct != null ? Math.round(weightKg * (fatPct / 100) * 10) / 10 : null,
      lean_mass_kg: weightKg != null && fatPct != null ? Math.round(weightKg * (1 - fatPct / 100) * 10) / 10 : null,
      height_cm: latestHeightCm ?? null,
      bmi: weightKg != null && heightM ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : null,
    };

    const { error } = await supabase.from('body_analyses').insert({
      user_id: userId,
      image_url: null,
      measured_at: measuredAt,
      extracted,
      plan: {} as never,
      summary: 'Medição importada da balança via Health Connect.',
    });
    if (error) throw error;
    return 'Exame de bioimpedância salvo.';
  };

  const confirmImport = async () => {
    if (!user || !summary) return;
    setIsImporting(true);
    const results: string[] = [];
    try {
      if (options.calories) results.push(await importCalories(user.id, summary));
      if (options.weight) results.push(await importWeight(user.id, summary));
      if (options.bodyExam) results.push(await importBodyExam(user.id, summary));
      toast({
        title: 'Importação concluída',
        description: results.join(' '),
      });
      setImportOpen(false);
    } catch {
      toast({
        title: 'Erro ao importar',
        description: results.length ? `${results.join(' ')} — mas houve falha em um dos itens.` : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (!isWatchSyncSupported()) return null;

  const formatSleep = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  const metrics: { icon: typeof Footprints; label: string; value: string }[] = summary
    ? [
        { icon: Footprints, label: 'Passos hoje', value: summary.stepsToday != null ? summary.stepsToday.toLocaleString('pt-BR') : '—' },
        { icon: Flame, label: 'Calorias ativas', value: summary.caloriesToday != null ? `${summary.caloriesToday.toLocaleString('pt-BR')} kcal` : '—' },
        { icon: HeartPulse, label: 'Batimentos', value: summary.lastHeartRate != null ? `${summary.lastHeartRate} bpm` : '—' },
        { icon: HeartPulse, label: 'Repouso', value: summary.restingHeartRate != null ? `${summary.restingHeartRate} bpm` : '—' },
        { icon: Moon, label: 'Sono (última noite)', value: summary.sleepMinutesLastNight != null ? formatSleep(summary.sleepMinutesLastNight) : '—' },
        { icon: Scale, label: 'Peso no relógio', value: summary.latestWeight ? `${summary.latestWeight.kg} kg` : '—' },
        { icon: Activity, label: 'Gordura corporal', value: summary.latestBodyFat ? `${summary.latestBodyFat.pct}%` : '—' },
      ]
    : [];

  const hasAnythingToImport =
    !!summary && (summary.caloriesToday != null || !!summary.latestWeight || !!summary.latestBodyFat);

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Watch className="h-5 w-5 text-primary" />
        <span className="font-semibold">Samsung Health</span>
      </div>

      {status === 'checking' && (
        <p className="text-sm text-muted-foreground">Verificando conexão com o relógio...</p>
      )}

      {status === 'unavailable' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O Health Connect não está disponível neste aparelho. Instale o app "Health Connect" na Play Store
            e ative o compartilhamento do Samsung Health com ele.
          </p>
          <Button variant="outline" size="sm" onClick={() => void openWatchSettings()}>
            <Settings className="h-4 w-4 mr-2" />
            Abrir configurações
          </Button>
        </div>
      )}

      {status === 'needs-permission' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seu relógio envia os dados ao <strong>Samsung Health</strong>, e o app lê de lá: passos, calorias,
            batimentos, sono e peso. Antes, ative em <strong>Samsung Health → Configurações → Health Connect</strong> o compartilhamento dos dados.
          </p>
          <Button size="sm" onClick={() => void connect()}>
            <Watch className="h-4 w-4 mr-2" />
            Conectar Samsung Health
          </Button>
        </div>
      )}

      {status === 'ready' && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-md border border-border p-3 text-center">
                <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Sincronizado às {new Date(summary.syncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void sync()} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
            {hasAnythingToImport && (
              <Button size="sm" onClick={() => setImportOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Importar do Samsung Health
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="flex flex-col overflow-hidden p-0 max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <DialogTitle>Importar do Samsung Health</DialogTitle>
            <DialogDescription>
              Dados lidos do Samsung Health (enviados pelo seu relógio). Marque o que deseja salvar no app.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 space-y-3">
            {summary?.caloriesToday != null && (
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <Checkbox
                  checked={options.calories}
                  onCheckedChange={(v) => setOptions((o) => ({ ...o, calories: v === true }))}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium text-sm">
                    <Flame className="h-4 w-4 text-primary shrink-0" />
                    Calorias de hoje: {summary.caloriesToday.toLocaleString('pt-BR')} kcal
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Lança como exercício "Atividade do relógio" na data de hoje (tela inicial).
                  </span>
                </span>
              </label>
            )}

            {summary?.latestWeight && (
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <Checkbox
                  checked={options.weight}
                  onCheckedChange={(v) => setOptions((o) => ({ ...o, weight: v === true }))}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium text-sm">
                    <Scale className="h-4 w-4 text-primary shrink-0" />
                    Peso: {summary.latestWeight.kg} kg
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Salva no histórico de peso na data da medição.
                  </span>
                </span>
              </label>
            )}

            {(summary?.latestWeight || summary?.latestBodyFat) && (
              <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer">
                <Checkbox
                  checked={options.bodyExam}
                  onCheckedChange={(v) => setOptions((o) => ({ ...o, bodyExam: v === true }))}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium text-sm">
                    <Activity className="h-4 w-4 text-primary shrink-0" />
                    Exame de bioimpedância
                    {summary.latestBodyFat ? ` (${summary.latestBodyFat.pct}% gordura)` : ''}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Salva peso e gordura como exame na aba Bioimpedância.
                  </span>
                </span>
              </label>
            )}

            <p className="text-xs text-muted-foreground">
              Passos, batimentos e sono são apenas visualizados aqui — ainda não são salvos no histórico.
            </p>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-3">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={isImporting}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmImport()} disabled={isImporting || (!options.calories && !options.weight && !options.bodyExam)}>
              {isImporting ? 'Importando...' : 'Confirmar importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
