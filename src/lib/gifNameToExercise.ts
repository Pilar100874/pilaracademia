import { supabase } from '@/integrations/supabase/client';

/**
 * Extrai um nome legível a partir do nome do arquivo do GIF.
 * Ex.: "Seated-Overhead-Triceps-Extension-(female)_Upper-A_converted.gif"
 *  ->  "Seated Overhead Triceps Extension"
 */
export function exerciseNameFromFilename(filename: string): string {
  let base = filename.replace(/\.[^.]+$/, '');

  // corta tudo a partir de (female)/(male) — inclusive variações sem parênteses
  const genderIdx = base.search(/[-_\s]*\(?\s*(female|male|fem|masc)\s*\)?/i);
  if (genderIdx > 0) base = base.slice(0, genderIdx);

  base = base
    .replace(/_converted$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // remove numeração residual no fim ("... 2", "... 01")
  base = base.replace(/\s+\d{1,3}$/, '').trim();

  if (!base) return '';
  return base
    .split(' ')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Traduz nomes de exercícios (EN -> PT-BR) via edge function de IA.
 * Em caso de falha devolve os nomes originais.
 */
export async function translateExerciseNames(names: string[]): Promise<string[]> {
  if (!names.length) return [];
  try {
    const { data, error } = await supabase.functions.invoke('translate-exercise-names', {
      body: { names },
    });
    if (error) throw error;
    const out = (data as any)?.names;
    if (Array.isArray(out) && out.length === names.length) {
      return out.map((n: unknown, i: number) =>
        typeof n === 'string' && n.trim() ? n.trim() : names[i],
      );
    }
  } catch (e) {
    console.error('[translateExerciseNames] falhou', e);
  }
  return names;
}
