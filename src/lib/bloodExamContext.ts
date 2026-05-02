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

/**
 * Constrói um contexto orientado para PRESCRIÇÃO DE EXERCÍCIOS,
 * destacando marcadores que afetam tipo/intensidade de treino.
 */
export function buildBloodExamHealthContext(
  exams: BloodExamRow[] | undefined,
): string {
  if (!exams || exams.length === 0) return '';
  const latest = exams[0];
  const lines: string[] = [];

  const RELEVANT_KEYS = [
    'glicemia', 'glicose', 'hemoglobina_glicada', 'hba1c', 'insulina', 'homa',
    'colesterol_total', 'ldl', 'hdl', 'triglicerides', 'trigliceridos',
    'pcr', 'proteina_c_reativa',
    'hemoglobina', 'hematocrito', 'ferritina', 'ferro',
    'tsh', 't4', 't3',
    'vitamina_d', '25oh', 'b12', 'cobalamina',
    'creatinina', 'ureia', 'tgo', 'tgp', 'ast', 'alt', 'ggt',
    'testosterona', 'cortisol',
  ];

  const relevant = (latest.markers || []).filter((m: BloodMarker) => {
    if (m.status === 'normal' || m.status === 'unknown') return false;
    const key = (m.key || '').toLowerCase();
    return RELEVANT_KEYS.some((rk) => key.includes(rk));
  });

  if (relevant.length === 0 && !latest.alerts?.length) return '';

  lines.push('CONTEXTO DE SAÚDE (exame de sangue mais recente):');
  for (const m of relevant.slice(0, 10)) {
    lines.push(
      `- ${m.label}: ${m.value ?? '—'}${m.unit ? ' ' + m.unit : ''} (${m.status})`,
    );
  }
  if (latest.alerts?.length) {
    lines.push('Alertas: ' + latest.alerts.slice(0, 6).join('; '));
  }
  lines.push(
    'AJUSTE O TREINO: evite cargas máximas / Valsalva se pressão/colesterol/triglicérides/PCR estiverem altos; ' +
    'reduza intensidade e priorize mobilidade se houver anemia, vit. D/B12 baixas ou TSH alterado; ' +
    'inclua aquecimento extra e cuidados articulares quando indicado; nunca substitua orientação médica.',
  );
  return lines.join('\n');
}

