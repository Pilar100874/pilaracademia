import type { BloodExamRow, BloodMarker } from '@/hooks/useBloodExams';

/**
 * Constrói um trecho curto de contexto sobre o exame mais recente
 * para enriquecer prompts de IA (cardápio, ajuste de macros, alertas).
 * Retorna string vazia se não houver exames.
 */
export function buildBloodExamContext(exams: BloodExamRow[] | undefined): string {
  if (!exams || exams.length === 0) return '';
  const latest = exams[0];
  const lines: string[] = [];

  const date = latest.collected_at || latest.created_at;
  lines.push(`Data do exame: ${date}`);

  const abnormal = (latest.markers || []).filter(
    (m: BloodMarker) => m.status === 'high' || m.status === 'low' || m.status === 'borderline',
  );
  if (abnormal.length > 0) {
    lines.push('Marcadores fora da faixa:');
    for (const m of abnormal.slice(0, 12)) {
      lines.push(
        `- ${m.label}: ${m.value ?? '—'}${m.unit ? ' ' + m.unit : ''} (${m.status})`,
      );
    }
  }
  if (latest.alerts?.length) {
    lines.push('Alertas: ' + latest.alerts.join('; '));
  }
  if (latest.diet_recommendations?.length) {
    lines.push('Orientações alimentares: ' + latest.diet_recommendations.join('; '));
  }
  return lines.join('\n');
}
