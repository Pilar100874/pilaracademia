import { supabase } from '@/integrations/supabase/client';

export interface UserDataExport {
  exported_at: string;
  user: {
    id: string;
    email: string | null;
  };
  profile: any;
  food_entries: any[];
  liquid_entries: any[];
  exercise_entries: any[];
  weight_entries: any[];
  glycemia_entries: any[];
  body_analyses: any[];
  blood_exams: any[];
  workout_plans: any[];
}

/**
 * Coleta todos os dados pessoais do usuário das tabelas conhecidas.
 * Usado para exportação LGPD em JSON ou geração de PDF.
 */
export async function collectUserData(userId: string, email: string | null): Promise<UserDataExport> {
  const safe = async <T>(table: string): Promise<T[]> => {
    try {
      const { data, error } = await supabase.from(table as any).select('*').eq('user_id', userId);
      if (error) {
        console.warn(`[export] tabela ${table} falhou:`, error.message);
        return [];
      }
      return (data as T[]) || [];
    } catch (e) {
      console.warn(`[export] tabela ${table} indisponível`);
      return [];
    }
  };

  const [
    profile,
    food_entries,
    liquid_entries,
    exercise_entries,
    weight_entries,
    glycemia_entries,
    body_analyses,
    blood_exams,
    workout_plans,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle().then((r) => r.data),
    safe('food_entries'),
    safe('liquid_entries'),
    safe('exercise_entries'),
    safe('weight_entries'),
    safe('glycemia_entries'),
    safe('body_analyses'),
    safe('blood_exams'),
    safe('workout_plans'),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user: { id: userId, email },
    profile,
    food_entries,
    liquid_entries,
    exercise_entries,
    weight_entries,
    glycemia_entries,
    body_analyses,
    blood_exams,
    workout_plans,
  };
}

export function downloadJSON(data: UserDataExport) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pilar-academia-dados-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Gera um PDF com resumo legível dos dados do usuário usando jsPDF.
 * Mantém o estilo editorial do app (Cormorant Garamond / Instrument Sans no app,
 * mas no PDF usamos fontes serif/sans built-in para portabilidade).
 */
export async function downloadPDF(data: UserDataExport) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const writeLine = (text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }) => {
    const size = opts?.size ?? 10;
    const color = opts?.color ?? [40, 40, 40];
    doc.setFont('times', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    if (y + lines.length * (size + 4) > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * (size + 4);
  };

  const sectionHeader = (text: string) => {
    y += 8;
    writeLine(text, { size: 14, bold: true, color: [20, 20, 20] });
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y - 6, pageW - margin, y - 6);
    y += 4;
  };

  // Header
  writeLine('Pilar Academia', { size: 22, bold: true });
  writeLine(`Exportação dos seus dados — ${new Date(data.exported_at).toLocaleString('pt-BR')}`, {
    size: 9,
    color: [120, 120, 120],
  });
  if (data.user.email) writeLine(`Conta: ${data.user.email}`, { size: 9, color: [120, 120, 120] });

  // Profile
  sectionHeader('Perfil');
  if (data.profile) {
    const p = data.profile;
    writeLine(`Nome: ${p.name || '—'}`);
    writeLine(`Sexo: ${p.gender === 'male' ? 'Masculino' : p.gender === 'female' ? 'Feminino' : '—'}`);
    writeLine(`Data de nascimento: ${p.birth_date || '—'}`);
    writeLine(`Altura: ${p.height_cm ? p.height_cm + ' cm' : '—'}`);
    writeLine(`Peso: ${p.weight_kg ? p.weight_kg + ' kg' : '—'}`);
    writeLine(`Objetivo: ${p.goal || '—'}`);
    writeLine(`Calorias diárias: ${p.daily_calories || '—'} kcal`);
  } else {
    writeLine('Sem perfil salvo.');
  }

  // Counts summary
  sectionHeader('Resumo dos seus registros');
  writeLine(`• ${data.food_entries.length} refeições registradas`);
  writeLine(`• ${data.liquid_entries.length} líquidos registrados`);
  writeLine(`• ${data.exercise_entries.length} exercícios registrados`);
  writeLine(`• ${data.weight_entries.length} medições de peso`);
  writeLine(`• ${data.glycemia_entries.length} medições de glicemia`);
  writeLine(`• ${data.body_analyses.length} análises corporais`);
  writeLine(`• ${data.blood_exams.length} exames de sangue`);
  writeLine(`• ${data.workout_plans.length} planos de treino`);

  // Latest weight
  if (data.weight_entries.length > 0) {
    sectionHeader('Últimas pesagens');
    const recent = [...data.weight_entries]
      .sort((a, b) => (b.measured_at || b.created_at).localeCompare(a.measured_at || a.created_at))
      .slice(0, 10);
    for (const w of recent) {
      writeLine(
        `${(w.measured_at || w.created_at)?.slice(0, 10) || '—'}: ${w.weight_kg} kg`,
        { size: 9 },
      );
    }
  }

  // Latest blood exam highlights
  if (data.blood_exams.length > 0) {
    sectionHeader('Exames de sangue');
    for (const exam of data.blood_exams.slice(0, 5)) {
      const date = exam.collected_at || exam.created_at;
      writeLine(`Exame de ${date?.slice(0, 10) || '—'}`, { bold: true });
      if (exam.summary) writeLine(exam.summary, { size: 9 });
      const abnormal = (exam.markers || []).filter(
        (m: any) => m.status === 'high' || m.status === 'low' || m.status === 'borderline',
      );
      if (abnormal.length > 0) {
        writeLine('Marcadores fora da faixa:', { size: 9, bold: true });
        for (const m of abnormal.slice(0, 8)) {
          writeLine(
            `  • ${m.label}: ${m.value}${m.unit ? ' ' + m.unit : ''} (${m.status})`,
            { size: 9 },
          );
        }
      }
      y += 4;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Pilar Academia · ${i} / ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 24,
      { align: 'center' },
    );
  }

  doc.save(`pilar-academia-resumo-${new Date().toISOString().slice(0, 10)}.pdf`);
}
