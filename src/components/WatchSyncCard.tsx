import { useCallback, useEffect, useState } from 'react';
import { Watch, RefreshCw, Footprints, Flame, HeartPulse, Moon, Scale, Settings, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function WatchSyncCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('checking');
  const [summary, setSummary] = useState<WatchSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingWeight, setIsSavingWeight] = useState(false);

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

  const saveWeight = async () => {
    if (!user || !summary?.latestWeight) return;
    setIsSavingWeight(true);
    try {
      const weightDate = new Date(summary.latestWeight.date);
      const dayStart = new Date(weightDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(weightDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: existing } = await supabase
        .from('weight_history')
        .select('id')
        .eq('user_id', user.id)
        .gte('recorded_at', dayStart.toISOString())
        .lte('recorded_at', dayEnd.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        toast({ title: 'Peso já registrado', description: 'Já existe um peso salvo neste dia.' });
        return;
      }

      const { error } = await supabase.from('weight_history').insert({
        user_id: user.id,
        weight_kg: summary.latestWeight.kg,
        recorded_at: summary.latestWeight.date,
      });
      if (error) throw error;
      toast({ title: 'Peso salvo!', description: `${summary.latestWeight.kg} kg adicionado ao seu histórico.` });
    } catch {
      toast({ title: 'Erro ao salvar peso', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSavingWeight(false);
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

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Watch className="h-5 w-5 text-primary" />
        <span className="font-semibold">Dados do relógio</span>
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
            Conecte seu Galaxy Watch para trazer passos, calorias, batimentos, sono e peso automaticamente.
            Antes, ative em <strong>Samsung Health → Configurações → Health Connect</strong> o compartilhamento dos dados.
          </p>
          <Button size="sm" onClick={() => void connect()}>
            <Watch className="h-4 w-4 mr-2" />
            Conectar relógio
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
            {summary.latestWeight && (
              <Button variant="outline" size="sm" onClick={() => void saveWeight()} disabled={isSavingWeight}>
                <Scale className="h-4 w-4 mr-2" />
                {isSavingWeight ? 'Salvando...' : 'Salvar peso no histórico'}
              </Button>
            )}
            {(summary.latestWeight || summary.latestBodyFat) && (
              <Button variant="outline" size="sm" onClick={() => void saveBodyExam()} disabled={isSavingExam}>
                <Activity className="h-4 w-4 mr-2" />
                {isSavingExam ? 'Salvando...' : 'Salvar como exame de bioimpedância'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
