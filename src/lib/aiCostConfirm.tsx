import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

// Espelha AI_FEATURE_COSTS (supabase/functions/_shared/aiCredits.ts), em centavos.
export const AI_FEATURE_BASE_COSTS: Record<string, number> = {
  'analyze-food': 3, 'analyze-food-text': 2, 'read-barcode': 2, 'simplify-narrative': 1,
  'adjust-macros': 2, 'analyze-workout-form': 5, 'analyze-bioimpedance': 8, 'extract-blood-exam': 8,
  'analyze-exercise-video': 15, 'compose-workout-from-text': 10, 'generate-daily-menu': 5, 'generate-weekly-menu': 10,
};

const LABELS: Record<string, string> = {
  'analyze-food': 'Analisar foto do alimento', 'analyze-food-text': 'Analisar alimento digitado',
  'read-barcode': 'Ler código de barras', 'simplify-narrative': 'Explicar de forma simples',
  'adjust-macros': 'Ajustar macros', 'analyze-workout-form': 'Analisar execução do exercício',
  'analyze-bioimpedance': 'Analisar laudo de bioimpedância', 'extract-blood-exam': 'Ler exame de sangue',
  'analyze-exercise-video': 'Analisar vídeo de exercício', 'compose-workout-from-text': 'Criar treino por IA',
  'generate-daily-menu': 'Gerar cardápio do dia', 'generate-weekly-menu': 'Gerar cardápio semanal',
};

export function aiPriceCents(feature: string, markupPercent: number) {
  return Math.round((AI_FEATURE_BASE_COSTS[feature] ?? 5) * (1 + markupPercent / 100));
}

type Pending = { feature: string; resolve: (ok: boolean) => void };
let listener: ((p: Pending) => void) | null = null;
let markup: number | null = null;
let exempt: boolean | null = null;

async function loadContext() {
  if (markup === null) {
    const { data } = await supabase.from('master_settings').select('ai_markup_percent').eq('id', 1).maybeSingle();
    const v = Number(data?.ai_markup_percent);
    markup = Number.isFinite(v) && v >= 0 ? v : 80;
  }
  if (exempt === null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc('is_master_admin' as any, { _user_id: user.id });
      exempt = !!data;
    }
  }
}
supabase.auth.onAuthStateChange(() => { exempt = null; });

const CONFIRM_PREF_KEY = 'pilar.ai-cost-confirm';

export function isAiCostConfirmEnabled(): boolean {
  try { return localStorage.getItem(CONFIRM_PREF_KEY) !== 'off'; } catch { return true; }
}

export function setAiCostConfirmEnabled(on: boolean) {
  try { localStorage.setItem(CONFIRM_PREF_KEY, on ? 'ask' : 'off'); } catch { /* ignora */ }
}

function askConfirm(feature: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) return resolve(true);
    listener({ feature, resolve });
  });
}

// Intercepta as chamadas às funções de IA e pede confirmação do custo antes.
const original = supabase.functions.invoke.bind(supabase.functions);
(supabase.functions as any).invoke = async (name: string, options: any = {}) => {
  if (name in AI_FEATURE_BASE_COSTS && !options?.skipCostConfirm && isAiCostConfirmEnabled()) {
    try { await loadContext(); } catch { /* segue com padrão */ }
    if (!exempt) {
      const ok = await askConfirm(name);
      if (!ok) {
        return { data: null, error: Object.assign(new Error('Uso da IA cancelado.'), { name: 'AiCostCancelled' }) };
      }
    }
  }
  const { skipCostConfirm, ...rest } = options ?? {};
  return original(name, rest);
};

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function AiCostConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [neverAsk, setNeverAsk] = useState(false);
  useEffect(() => {
    listener = (p) => setPending((cur) => { if (cur) { p.resolve(false); return cur; } return p; });
    return () => { listener = null; };
  }, []);
  const close = (ok: boolean) => {
    if (ok && neverAsk) setAiCostConfirmEnabled(false);
    pending?.resolve(ok);
    setPending(null);
    setNeverAsk(false);
  };
  const price = pending ? aiPriceCents(pending.feature, markup ?? 80) : 0;
  return (
    <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent className="min-w-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar uso da IA</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block">{pending ? LABELS[pending.feature] ?? 'Recurso de IA' : ''}</span>
            <span className="mt-2 block text-base text-foreground">Custo aproximado: <strong>~{brl(price)}</strong></span>
            <span className="mt-2 block text-xs">O valor será descontado dos seus créditos de IA. O desconto real pode variar um pouco.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
