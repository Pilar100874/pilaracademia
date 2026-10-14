/**
 * Vínculo entre o "estilo de treino" escolhido no assistente e as categorias
 * da biblioteca de exercícios.
 *
 * O assistente não cria categorias novas: ele procura, entre as categorias que
 * o usuário já tem (pessoais + globais), aquelas cujo nome combina com o estilo.
 * A comparação ignora acentos e maiúsculas, então "Força" combina com "forca".
 */

export interface StyleCategoryMatch {
  id: string;
  name: string;
}

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Palavras que identificam cada estilo em uma categoria da biblioteca. */
export const STYLE_KEYWORDS: Record<string, string[]> = {
  Pilates: ['pilates', 'reformer', 'cadillac', 'barre', 'chair', 'wunda', 'ladder', 'camelot', 'solo'],
  Funcional: ['funcional', 'functional', 'cardio', 'hiit', 'circuito', 'kettlebell', 'battle', 'corda', 'guerra'],
  Musculação: [
    'musculacao',
    'peso livre',
    'peso do corpo',
    'barra',
    'haltere',
    'mancerno',
    'mancerna',
    'polia',
    'maquina',
    'aparelho',
    'sobrecarga',
    'forca',
    'leg press',
    'agachamento',
    'banco',
  ],
  Alongamento: [
    'alongamento',
    'alongar',
    'mobilidade',
    'flexibilidade',
    'stretch',
    'final de aula',
    'volta a calma',
    'cooldown',
    'respiracao',
  ],
  Yoga: ['yoga', 'asana', 'pranayama', 'surya', 'yogi'],
  HIIT: ['hiit', 'intervalado', 'alta intensidade', 'explosao', 'cardio', 'sprint'],
  Circuito: ['circuito', 'circuit', 'tabata', 'amrap', 'emom'],
  Calistenia: ['calistenia', 'calisthenics', 'peso do corpo', 'barra fixa', 'paralelas', 'argolas', 'monos'],
};

export const ALL_STYLES = Object.keys(STYLE_KEYWORDS);

/** Categorias da biblioteca que combinam com um único estilo. */
export function categoriesForStyle(
  style: string,
  categories: { id: string; name: string }[]
): StyleCategoryMatch[] {
  const kws = STYLE_KEYWORDS[style] || [];
  if (!kws.length) return [];
  return categories.filter((c) => kws.some((k) => norm(c.name).includes(k)));
}

/** Estilo → nomes das categorias ligadas a ele (para mostrar no assistente). */
export function styleCategoryMap(categories: { id: string; name: string }[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const style of ALL_STYLES) {
    map[style] = categoriesForStyle(style, categories).map((c) => c.name);
  }
  return map;
}

/** IDs das categorias que os estilos escolhidos puxam (sem duplicar). */
export function idsForStyles(styles: string[], categories: { id: string; name: string }[]): string[] {
  const ids: string[] = [];
  for (const style of styles) {
    for (const c of categoriesForStyle(style, categories)) {
      if (!ids.includes(c.id)) ids.push(c.id);
    }
  }
  return ids;
}
