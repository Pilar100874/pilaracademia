/**
 * Estilos de treino do assistente = categorias da biblioteca marcadas como
 * "estilo" (is_style). Criar/marcar uma categoria cria o estilo.
 */
type Cat = { id: string; name: string; is_style?: boolean };

const styleCats = (categories: Cat[]) => categories.filter((c) => c.is_style);

/** Nomes dos estilos disponíveis (sem duplicar). */
export function styleOptions(categories: Cat[]): string[] {
  return Array.from(new Set(styleCats(categories).map((c) => c.name))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Estilo → nomes das categorias ligadas a ele. */
export function styleCategoryMap(categories: Cat[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const name of styleOptions(categories)) map[name] = [name];
  return map;
}

/** IDs das categorias que os estilos escolhidos puxam. */
export function idsForStyles(styles: string[], categories: Cat[]): string[] {
  return styleCats(categories).filter((c) => styles.includes(c.name)).map((c) => c.id);
}
