import { useEffect, useRef, useState } from 'react';
import { Bluetooth, BluetoothSearching, Scale, Activity, Copy, Check, Info, Droplet, Dumbbell, Bone, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { calculateAge } from '@/types/profile';
import {
  ScaleBleSession,
  deriveBodyMetrics,
  deriveSegmental,
  isScaleBleSupported,
  type ScaleReading,
} from '@/lib/scaleBle';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'scanning' | 'connecting' | 'measuring' | 'done' | 'error';

/**
 * Leitura direta da balança por Bluetooth (somente app nativo).
 * EXPERIMENTAL — dialeto da Proscan Voice inferido da família Fitdays/ICOMON;
 * o log técnico permite ajustar o parser com capturas reais.
 */
export function ScaleBleCard({ onSaved }: { onSaved?: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [rawLog, setRawLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sessionRef = useRef<ScaleBleSession | null>(null);

  useEffect(() => () => {
    void sessionRef.current?.stop();
  }, []);

  if (!isScaleBleSupported()) return null;

  const ageYears = profile?.birth_date ? calculateAge(profile.birth_date) : null;
  const isMale = profile?.gender ? profile.gender === 'male' : null;

  const derived =
    reading?.weightKg != null
      ? deriveBodyMetrics({
          impedanceOhm: reading.impedanceOhm ?? null,
          weightKg: reading.weightKg,
          heightCm: profile?.height_cm ?? null,
          ageYears,
          isMale,
        })
      : null;
  const bodyFatPct = derived?.bodyFatPct ?? null;
  const segmental =
    reading?.segmentalOhm && derived
      ? deriveSegmental(reading.segmentalOhm, derived.muscleMassKg, derived.fatMassKg)
      : null;

  const start = async () => {
    setReading(null);
    setRawLog([]);
    setMessage('');
    const session = new ScaleBleSession(
      {
        onState: (state, msg) => {
          setPhase(state);
          if (msg) setMessage(msg);
          if (state === 'error') sessionRef.current = null;
        },
        onReading: (r) => setReading(r),
        onRawFrame: (hex) => setRawLog((prev) => (prev.length > 300 ? prev : [...prev, hex])),
      },
      {
        heightCm: profile?.height_cm ?? null,
        ageYears,
        isMale,
        weightKg: profile?.weight_kg ?? null,
      },
      user?.id ?? 'anon',
    );
    sessionRef.current = session;
    await session.start();
  };

  const finish = () => {
    const result = sessionRef.current?.finish() ?? reading;
    sessionRef.current = null;
    if (result && (result.weightKg != null || result.impedanceOhm != null)) {
      setReading(result);
      setPhase('done');
    } else {
      setPhase('error');
      setMessage('Nenhuma medição estável recebida. Pise na balança e aguarde estabilizar.');
    }
  };

  const cancel = async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
    setPhase('idle');
  };

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(rawLog.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const saveExam = async () => {
    if (!user || !reading || reading.weightKg == null) return;
    setIsSaving(true);
    try {
      const measuredAt = new Date().toISOString();
      const heightCm = profile?.height_cm ?? null;
      const heightM = heightCm ? heightCm / 100 : null;
      const fatPct = bodyFatPct;
      const weightKg = reading.weightKg;

      const { data: existing } = await supabase
        .from('body_analyses')
        .select('id')
        .eq('user_id', user.id)
        .eq('measured_at', measuredAt)
        .limit(1);
      if (existing && existing.length > 0) {
        toast({ title: 'Exame já salvo', description: 'Essa medição já está no seu histórico.' });
        return;
      }

      const extracted = {
        measured_at: measuredAt,
        weight_kg: weightKg,
        body_fat_pct: fatPct,
        fat_mass_kg: fatPct != null ? Math.round(weightKg * (fatPct / 100) * 10) / 10 : null,
        lean_mass_kg: fatPct != null ? Math.round(weightKg * (1 - fatPct / 100) * 10) / 10 : null,
        height_cm: heightCm,
        bmi: heightM ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : null,
        sex: profile?.gender ?? null,
        age_years: ageYears,
        // Derivações calculadas pelo app a partir do peso + impedância
        body_water_kg: derived?.waterKg ?? null,
        muscle_mass_kg: derived?.muscleMassKg ?? null,
        skeletal_muscle_kg: derived?.skeletalMuscleKg ?? null,
        bone_mass_kg: derived?.boneMassKg ?? null,
        bmr_kcal: derived?.bmrKcal ?? null,
        segmental_muscle: segmental?.muscle ?? null,
        segmental_fat: segmental?.fat ?? null,
      };

      const { error } = await supabase.from('body_analyses').insert({
        user_id: user.id,
        image_url: null,
        measured_at: measuredAt,
        extracted,
        plan: null,
        summary: 'Medição lida diretamente da balança via Bluetooth.',
      });
      if (error) throw error;
      toast({ title: 'Exame salvo!', description: 'A medição da balança entrou no seu histórico de bioimpedância.' });
      onSaved?.();
    } catch {
      toast({ title: 'Erro ao salvar exame', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const busy = phase === 'scanning' || phase === 'connecting' || phase === 'measuring';

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bluetooth className="h-5 w-5 text-primary" />
        <span className="font-semibold">Ler balança por Bluetooth</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700">
          experimental
        </span>
      </div>

      {phase === 'idle' && (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pise na balança para acordá-la e toque em conectar — peso e gordura entram direto aqui,
            sem abrir outro aplicativo.
          </p>
          {(!profile?.height_cm || !profile?.birth_date || !profile?.gender) && (
            <p className="text-[12px] text-amber-700 leading-relaxed">
              Complete altura, nascimento e sexo no Perfil para calcularmos sua gordura corporal.
            </p>
          )}
          <Button size="sm" onClick={() => void start()}>
            <BluetoothSearching className="h-4 w-4 mr-2" />
            Conectar balança
          </Button>
        </>
      )}

      {busy && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {phase === 'scanning' && 'Procurando a balança… selecione-a na lista do sistema.'}
            {phase === 'connecting' && `Conectando${message ? ` a ${message}` : ''}…`}
            {phase === 'measuring' && 'Conectado! Suba na balança e aguarde a medição estabilizar.'}
          </p>
          {reading?.weightKg != null && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3 text-center">
                <Scale className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="text-lg font-bold">{reading.weightKg.toFixed(1)} kg</p>
              </div>
              <div className="rounded-md border border-border p-3 text-center">
                <Activity className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Gordura</p>
                <p className="text-lg font-bold">{bodyFatPct != null ? `${bodyFatPct}%` : '—'}</p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={finish} disabled={reading?.weightKg == null && reading?.impedanceOhm == null}>
              Concluir medição
            </Button>
            <Button size="sm" variant="outline" onClick={() => void cancel()}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {phase === 'done' && reading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border p-3 text-center">
              <Scale className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Peso</p>
              <p className="text-lg font-bold">{reading.weightKg != null ? `${reading.weightKg.toFixed(1)} kg` : '—'}</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <Activity className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Gordura corporal</p>
              <p className="text-lg font-bold">{bodyFatPct != null ? `${bodyFatPct}%` : '—'}</p>
            </div>
          </div>
          {derived && (derived.waterKg != null || derived.muscleMassKg != null || derived.boneMassKg != null || derived.bmrKcal != null) && (
            <div className="grid grid-cols-2 gap-3">
              {derived.waterKg != null && reading.weightKg != null && (
                <div className="rounded-md border border-border p-3 text-center">
                  <Droplet className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Água corporal</p>
                  <p className="text-lg font-bold">{Math.round((derived.waterKg / reading.weightKg) * 100)}%</p>
                </div>
              )}
              {derived.muscleMassKg != null && (
                <div className="rounded-md border border-border p-3 text-center">
                  <Dumbbell className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Massa muscular</p>
                  <p className="text-lg font-bold">{derived.muscleMassKg.toFixed(1)} kg</p>
                </div>
              )}
              {derived.boneMassKg != null && (
                <div className="rounded-md border border-border p-3 text-center">
                  <Bone className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Massa óssea</p>
                  <p className="text-lg font-bold">{derived.boneMassKg.toFixed(1)} kg</p>
                </div>
              )}
              {derived.bmrKcal != null && (
                <div className="rounded-md border border-border p-3 text-center">
                  <Flame className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Metabolismo basal</p>
                  <p className="text-lg font-bold">{derived.bmrKcal} kcal</p>
                </div>
              )}
            </div>
          )}
          {segmental && (Object.keys(segmental.muscle).length > 0 || Object.keys(segmental.fat).length > 0) && (
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              A balança enviou as impedâncias por região do corpo — ao salvar, o exame mostra o
              mapa de gordura e músculo por braço, perna e tronco.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Água, músculo, ossos e metabolismo basal são estimativas calculadas pelo app a partir
            do peso, da impedância e do seu perfil — podem divergir dos índices do app da balança.
          </p>
          {reading.impedanceOhm == null && (
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              A balança não enviou a impedância — a gordura foi estimada por fórmula a partir do seu perfil.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {reading.weightKg != null && (
              <Button size="sm" onClick={() => void saveExam()} disabled={isSaving}>
                <Activity className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar como exame de bioimpedância'}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => void start()}>
              Medir novamente
            </Button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-destructive leading-relaxed">{message || 'Algo deu errado na leitura.'}</p>
          <Button size="sm" variant="outline" onClick={() => void start()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {rawLog.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
            onClick={() => setShowLog((v) => !v)}
          >
            <Info className="h-3.5 w-3.5" />
            {showLog ? 'Ocultar dados técnicos' : 'Ver dados técnicos (diagnóstico)'}
          </button>
          {showLog && (
            <div className="space-y-2">
              <div
                className={cn(
                  'rounded-md border border-border bg-muted/40 p-2 max-h-32 overflow-y-auto',
                  'font-mono text-[10px] leading-relaxed break-all',
                )}
              >
                {rawLog.join('\n')}
              </div>
              <Button size="sm" variant="outline" onClick={() => void copyLog()}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copiado!' : 'Copiar dados técnicos'}
              </Button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Se a leitura falhar, copie esses dados e envie ao suporte — eles ajudam a ajustar
                a leitura para o seu modelo de balança.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
