import jsPDF from 'jspdf';
import type { BodyPlan } from '@/types/bodyAnalysis';
import { goalLabel, sanitizeFitnessText } from './goalLabels';

export function exportPlanToPdf(plan: BodyPlan, profileName?: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 50;

  const line = (txt: string, size = 11, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const split = doc.splitTextToSize(txt, w - 80);
    doc.text(split, 40, y);
    y += split.length * (size + 4);
  };

  const sep = () => { y += 6; doc.setDrawColor(200); doc.line(40, y, w - 40, y); y += 12; };
  const page = () => { if (y > 760) { doc.addPage(); y = 50; } };

  line('Plano Corporal — Pilar Saúde', 18, true);
  if (profileName) line(profileName, 11);
  line(new Date().toLocaleDateString('pt-BR'), 10);
  sep();

  line(`Perfil: ${plan.profile_label || '—'}`, 12, true);
  line(`Objetivo: ${goalLabel(plan.goal?.primary)}`, 11);
  line(`Score: ${plan.score}/100`, 11);
  sep();

  line('Calorias e macros', 13, true);
  line(`Gasto total/dia: ${plan.calories?.tdee ?? '—'} kcal · Meta: ${plan.calories?.target ?? '—'} kcal`, 11);
  line(`Proteína ${plan.macros?.protein_g}g · Carboidrato ${plan.macros?.carbs_g}g · Gordura ${plan.macros?.fat_g}g`, 11);
  if (plan.macros?.water_ml) line(`Água: ${plan.macros.water_ml} ml/dia`, 11);
  sep();

  if (plan.training_intent) {
    line('Treino', 13, true);
    line(`Foco: ${plan.training_intent.focus}`, 11);
    line(`Frequência: ${plan.training_intent.frequency_per_week}x/semana · Split: ${plan.training_intent.split}`, 11);
    sep();
  }

  if (plan.periodization?.length) {
    page();
    line('Periodização (12 semanas)', 13, true);
    plan.periodization.forEach((p) => {
      page();
      line(`${p.phase} — Semanas ${p.weeks}`, 11, true);
      line(`Foco: ${p.focus}`, 10);
      if (p.calories) line(`Calorias: ${p.calories} kcal`, 10);
      if (p.training) line(`Treino: ${p.training}`, 10);
      if (p.cardio) line(`Cardio: ${p.cardio}`, 10);
      y += 4;
    });
    sep();
  }

  if (plan.narrative) {
    page();
    line('Resumo', 13, true);
    line(sanitizeFitnessText(plan.narrative.situation), 11);
    y += 4;
    line(sanitizeFitnessText(plan.narrative.plan), 11);
    if (plan.narrative.next_steps?.length) {
      y += 4;
      line('Próximos passos:', 11, true);
      plan.narrative.next_steps.forEach((s) => line(`• ${sanitizeFitnessText(s)}`, 11));
    }
  }

  doc.save(`plano-corporal-${Date.now()}.pdf`);
}
