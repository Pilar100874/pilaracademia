/**
 * Centralized Portuguese labels for plan goals and a sanitizer that
 * replaces leftover English fitness jargon (cutting/bulking/recomp/etc.)
 * in any free-text coming from AI or older stored records.
 */

export const GOAL_LABELS: Record<string, string> = {
  cutting: 'Perda de gordura',
  recomposicao: 'Recomposição',
  recomp: 'Recomposição',
  hipertrofia: 'Hipertrofia',
  manutencao: 'Manutenção',
  maintenance: 'Manutenção',
  bulking: 'Hipertrofia',
  bulk: 'Hipertrofia',
  'lean bulk': 'Hipertrofia',
};

export function goalLabel(value?: string | null): string {
  if (!value) return '—';
  const key = value.toLowerCase().trim();
  return GOAL_LABELS[key] || value;
}

/**
 * Replace English fitness terms inside free-form text with their
 * Portuguese equivalents. Case-insensitive, preserves surrounding text.
 */
const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bcutting\b/gi, 'perda de gordura'],
  [/\bcutt?\b/gi, 'perda de gordura'],
  [/\blean bulk(ing)?\b/gi, 'hipertrofia'],
  [/\bbulking\b/gi, 'hipertrofia'],
  [/\bbulk\b/gi, 'hipertrofia'],
  [/\bmaintenance\b/gi, 'manutenção'],
  [/\brecomp\b/gi, 'recomposição'],
];

export function sanitizeFitnessText(text?: string | null): string {
  if (!text) return '';
  let out = text;
  for (const [re, replacement] of TEXT_REPLACEMENTS) {
    out = out.replace(re, (match) => {
      // Preserve leading capitalization
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  return out;
}
