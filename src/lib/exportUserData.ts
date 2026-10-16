import { supabase } from '@/integrations/supabase/client';
import { reportSections, sanitizeReport, reportLabel } from '../../supabase/functions/_shared/professionalReport';

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
  food_preferences: any | null;
  records: Record<string, any[]>;
}

/**
 * Coleta todos os dados pessoais do usuário das tabelas conhecidas.
 * Usado para exportação LGPD em JSON ou geração de PDF.
 */
export async function collectUserData(userId: string, email: string | null): Promise<UserDataExport> {
  const safe = async <T>(table: string, opts?: { dateCol?: string }, parent?: { column: string; ids: string[] }): Promise<T[]> => {
    const rows: T[] = [];
    if (parent && !parent.ids.length) return rows;
    for (let offset = 0; ; offset += 1000) {
      let q = supabase.from(table as any).select('*');
      q = parent ? q.in(parent.column, parent.ids) : q.eq('user_id', userId);
      if (opts?.dateCol) q = q.order(opts.dateCol, { ascending: false });
      const { data, error } = await q.order('id').range(offset, offset + 999);
      if (error) throw new Error(`Não foi possível carregar ${table}. Tente novamente.`);
      rows.push(...((data ?? []) as T[]));
      if ((data?.length ?? 0) < 1000) break;
    }
    return rows;
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
    food_preferences,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle().then((r) => r.data),
    safe('food_entries', { dateCol: 'consumed_at' }),
    safe('liquid_entries', { dateCol: 'consumed_at' }),
    safe('exercise_entries', { dateCol: 'performed_at' }),
    safe('weight_history', { dateCol: 'recorded_at' }),
    safe('glycemia_entries', { dateCol: 'measured_at' }),
    safe('body_analyses', { dateCol: 'created_at' }),
    safe('blood_exams', { dateCol: 'collected_at' }),
    safe('workout_plans', { dateCol: 'created_at' }),
    supabase.from('food_preferences' as any).select('*').eq('user_id', userId).maybeSingle().then((r: any) => r.data),
  ]);

  const entries = await Promise.all(reportSections.filter(section => !['food_entries', 'liquid_entries', 'exercise_entries', 'weight_history', 'glycemia_entries', 'body_analyses', 'blood_exams', 'workout_plans', 'food_preferences'].includes(section.key)).map(async section => [section.key, await safe<any>(section.key, section.date ? { dateCol: section.date } : undefined)] as const));
  const records: Record<string, any[]> = { ...Object.fromEntries(entries), food_entries, liquid_entries, exercise_entries, weight_history: weight_entries, glycemia_entries, body_analyses, blood_exams, workout_plans, food_preferences: food_preferences ? [food_preferences] : [] };
  const workoutExercises = await safe<any>('workout_exercises', undefined, { column: 'workout_plan_id', ids: workout_plans.map((row: any) => row.id) });
  records.workout_plans = workout_plans.map((row: any) => ({ ...row, exercises: workoutExercises.filter(ex => ex.workout_plan_id === row.id).sort((a, b) => a.order_index - b.order_index) }));
  const kitItems = await safe<any>('food_kit_items', undefined, { column: 'kit_id', ids: records.food_kits.map(row => row.id) });
  records.food_kits = records.food_kits.map(row => ({ ...row, items: kitItems.filter(item => item.kit_id === row.id).map(item => ({ quantity: item.quantity, unit: item.unit, product: records.custom_products.find(product => product.id === item.product_id)?.name ?? 'Produto' })) }));

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
    food_preferences,
    records,
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

// ----------------- helpers -----------------

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return String(s).slice(0, 10);
  }
};

const num = (v: any): number => (typeof v === 'number' ? v : Number(v) || 0);
const round = (n: number, d = 0) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

function ageFrom(birth?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

function genderLabel(g?: string | null) {
  if (g === 'male') return 'Masculino';
  if (g === 'female') return 'Feminino';
  return '—';
}

function goalLabel(g?: string | null) {
  if (!g) return '—';
  const map: Record<string, string> = {
    lose: 'Perda de gordura',
    maintain: 'Manutenção',
    gain: 'Ganho de massa',
    cutting: 'Perda de gordura',
    bulking: 'Ganho de massa',
    recomp: 'Recomposição',
  };
  return map[g.toLowerCase()] || g;
}

function bmi(weight?: number | null, heightCm?: number | null): number | null {
  if (!weight || !heightCm) return null;
  const h = heightCm / 100;
  return round(weight / (h * h), 1);
}

function bmiLabel(b: number | null): string {
  if (b == null) return '';
  if (b < 18.5) return 'Abaixo do peso';
  if (b < 25) return 'Peso normal';
  if (b < 30) return 'Sobrepeso';
  if (b < 35) return 'Obesidade I';
  if (b < 40) return 'Obesidade II';
  return 'Obesidade III';
}

interface DailyAgg {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  liquid_ml: number;
  burned: number;
  workouts: number;
}

function aggregateByDay(data: UserDataExport, periodDays = 90) {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);
  const map = new Map<string, DailyAgg>();
  const key = (s: string) => String(s).slice(0, 10);

  const ensure = (k: string): DailyAgg => {
    let d = map.get(k);
    if (!d) {
      d = {
        date: k,
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0,
        liquid_ml: 0, burned: 0, workouts: 0,
      };
      map.set(k, d);
    }
    return d;
  };

  for (const f of data.food_entries) {
    const d = new Date(f.consumed_at || f.created_at);
    if (isNaN(d.getTime()) || d < since) continue;
    const e = ensure(key(f.consumed_at || f.created_at));
    e.calories += num(f.calories);
    e.protein += num(f.protein);
    e.carbs += num(f.carbs);
    e.fat += num(f.fat);
    e.fiber += num(f.fiber);
    e.sodium += num(f.sodium);
  }
  for (const l of data.liquid_entries) {
    const d = new Date(l.consumed_at || l.created_at);
    if (isNaN(d.getTime()) || d < since) continue;
    const e = ensure(key(l.consumed_at || l.created_at));
    e.liquid_ml += num(l.amount_ml);
  }
  for (const ex of data.exercise_entries) {
    const d = new Date(ex.performed_at || ex.created_at);
    if (isNaN(d.getTime()) || d < since) continue;
    const e = ensure(key(ex.performed_at || ex.created_at));
    e.burned += num(ex.calories_burned);
    e.workouts += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function minMax(nums: number[]): { min: number; max: number } | null {
  if (!nums.length) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/**
 * Gera um PDF completo com TODOS os dados relevantes do usuário,
 * pensado para compartilhamento com profissionais (nutricionista, médico).
 */
export async function downloadPDF(data: UserDataExport) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLine = (
    text: string,
    opts?: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; indent?: number },
  ) => {
    const size = opts?.size ?? 10;
    const color = opts?.color ?? [40, 40, 40];
    const indent = opts?.indent ?? 0;
    doc.setFont('times', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2 - indent);
    const lh = size + 4;
    ensureSpace(lines.length * lh);
    doc.text(lines, margin + indent, y);
    y += lines.length * lh + (opts?.gap ?? 0);
  };

  const sectionHeader = (text: string) => {
    y += 10;
    ensureSpace(28);
    writeLine(text, { size: 14, bold: true, color: [20, 20, 20] });
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y - 6, pageW - margin, y - 6);
    y += 4;
  };

  const subHeader = (text: string) => {
    y += 4;
    writeLine(text, { size: 11, bold: true, color: [60, 60, 60] });
  };

  const kv = (label: string, value: string) => {
    writeLine(`${label}: ${value}`, { size: 10 });
  };

  const bullet = (text: string, size = 9) => writeLine(`• ${text}`, { size, indent: 6 });

  // ===== Header =====
  writeLine('Pilar Saúde', { size: 22, bold: true });
  writeLine('Relatório completo para profissional de saúde', {
    size: 10,
    color: [100, 100, 100],
  });
  writeLine(`Gerado em ${new Date(data.exported_at).toLocaleString('pt-BR')}`, {
    size: 9,
    color: [120, 120, 120],
  });
  if (data.user.email) writeLine(`Conta: ${data.user.email}`, { size: 9, color: [120, 120, 120] });

  // ===== Perfil =====
  sectionHeader('Perfil e metas');
  if (data.profile) {
    const p = data.profile;
    const age = ageFrom(p.birth_date);
    const b = bmi(num(p.weight_kg), num(p.height_cm));
    kv('Nome', p.name || '—');
    kv('Sexo', genderLabel(p.gender));
    kv('Idade', age != null ? `${age} anos` : '—');
    kv('Altura', p.height_cm ? `${p.height_cm} cm` : '—');
    kv('Peso atual', p.weight_kg ? `${p.weight_kg} kg` : '—');
    if (b != null) kv('IMC', `${b} (${bmiLabel(b)})`);
    kv('Objetivo', goalLabel(p.goal));
    kv('Nível de atividade', p.activity_level || '—');
    y += 4;
    subHeader('Metas diárias');
    kv('Calorias', `${p.daily_calories_override ?? p.daily_calories ?? '—'} kcal`);
    kv('Proteína', `${p.daily_protein_override ?? p.daily_protein ?? '—'} g`);
    kv('Carboidratos', `${p.daily_carbs_override ?? p.daily_carbs ?? '—'} g`);
    kv('Gordura', `${p.daily_fat_override ?? p.daily_fat ?? '—'} g`);
    kv('Líquidos', `${p.daily_liquid_ml_override ?? p.daily_liquid_ml ?? '—'} ml`);
  } else {
    writeLine('Sem perfil cadastrado.');
  }

  // ===== Preferências e restrições alimentares =====
  if (data.food_preferences) {
    sectionHeader('Preferências e restrições alimentares');
    const fp = data.food_preferences;
    if (Array.isArray(fp.favorite_foods) && fp.favorite_foods.length)
      kv('Alimentos preferidos', fp.favorite_foods.join(', '));
    if (Array.isArray(fp.disliked_foods) && fp.disliked_foods.length)
      kv('Alimentos a evitar', fp.disliked_foods.join(', '));
    if (Array.isArray(fp.restrictions) && fp.restrictions.length)
      kv('Restrições', fp.restrictions.join(', '));
    if (Array.isArray(fp.allergies) && fp.allergies.length)
      kv('Alergias', fp.allergies.join(', '));
    if (fp.notes) kv('Observações', String(fp.notes));
  }

  // ===== Resumo geral =====
  sectionHeader('Resumo geral dos registros');
  bullet(`${data.food_entries.length} refeições registradas`);
  bullet(`${data.liquid_entries.length} líquidos registrados`);
  bullet(`${data.exercise_entries.length} atividades físicas registradas`);
  bullet(`${data.weight_entries.length} medições de peso`);
  bullet(`${data.glycemia_entries.length} medições de glicemia`);
  bullet(`${data.body_analyses.length} análises corporais`);
  bullet(`${data.blood_exams.length} exames de sangue`);
  bullet(`${data.workout_plans.length} planos de treino`);

  // ===== Aderência (últimos 30 dias) =====
  const daily30 = aggregateByDay(data, 30);
  const daysWithFood = daily30.filter((d) => d.calories > 0);
  if (daysWithFood.length > 0) {
    sectionHeader('Médias diárias — últimos 30 dias');
    const target = data.profile || {};
    const avgCal = round(avg(daysWithFood.map((d) => d.calories)));
    const avgProt = round(avg(daysWithFood.map((d) => d.protein)), 1);
    const avgCarb = round(avg(daysWithFood.map((d) => d.carbs)), 1);
    const avgFat = round(avg(daysWithFood.map((d) => d.fat)), 1);
    const avgFiber = round(avg(daysWithFood.map((d) => d.fiber)), 1);
    const avgLiq = round(avg(daily30.map((d) => d.liquid_ml)));
    const avgBurned = round(avg(daily30.map((d) => d.burned)));
    const workoutDays = daily30.filter((d) => d.workouts > 0).length;

    const tCal = num(target.daily_calories_override ?? target.daily_calories);
    const tProt = num(target.daily_protein_override ?? target.daily_protein);
    const tCarb = num(target.daily_carbs_override ?? target.daily_carbs);
    const tFat = num(target.daily_fat_override ?? target.daily_fat);
    const tLiq = num(target.daily_liquid_ml_override ?? target.daily_liquid_ml);

    const pct = (avg: number, t: number) => (t > 0 ? ` (${Math.round((avg / t) * 100)}% da meta)` : '');

    kv('Dias com registros alimentares', `${daysWithFood.length} de ${daily30.length}`);
    kv('Calorias médias/dia', `${avgCal} kcal${pct(avgCal, tCal)}`);
    kv('Proteína média/dia', `${avgProt} g${pct(avgProt, tProt)}`);
    kv('Carboidratos médios/dia', `${avgCarb} g${pct(avgCarb, tCarb)}`);
    kv('Gordura média/dia', `${avgFat} g${pct(avgFat, tFat)}`);
    kv('Fibra média/dia', `${avgFiber} g`);
    kv('Líquidos médios/dia', `${avgLiq} ml${pct(avgLiq, tLiq)}`);
    kv('Calorias gastas/dia (atividade)', `${avgBurned} kcal`);
    kv('Dias com treino', `${workoutDays} de ${daily30.length}`);
  }

  // ===== Peso =====
  if (data.weight_entries.length > 0) {
    sectionHeader('Evolução do peso');
    const sorted = [...data.weight_entries].sort((a, b) =>
      (a.recorded_at || a.created_at).localeCompare(b.recorded_at || b.created_at),
    );
    const weights = sorted.map((w) => num(w.weight_kg)).filter((n) => n > 0);
    const mm = minMax(weights);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first && last && weights.length > 1) {
      const delta = round(num(last.weight_kg) - num(first.weight_kg), 2);
      kv(
        'Período',
        `${fmtDate(first.recorded_at || first.created_at)} → ${fmtDate(last.recorded_at || last.created_at)}`,
      );
      kv('Peso inicial', `${first.weight_kg} kg`);
      kv('Peso atual', `${last.weight_kg} kg`);
      kv('Variação', `${delta > 0 ? '+' : ''}${delta} kg`);
      if (mm) kv('Mínimo / Máximo', `${mm.min} kg / ${mm.max} kg`);
      kv('Média', `${round(avg(weights), 1)} kg`);
    }
    y += 4;
    subHeader('Últimas pesagens');
    const recent = [...sorted].reverse().slice(0, 15);
    for (const w of recent) {
      bullet(`${fmtDate(w.recorded_at || w.created_at)}: ${w.weight_kg} kg`);
    }
  }

  // ===== Glicemia =====
  if (data.glycemia_entries.length > 0) {
    sectionHeader('Glicemia');
    const vals = data.glycemia_entries.map((g) => num(g.glucose_mg_dl)).filter((n) => n > 0);
    const mm = minMax(vals);
    kv('Total de medições', String(data.glycemia_entries.length));
    kv('Média', `${round(avg(vals))} mg/dL`);
    if (mm) kv('Mínimo / Máximo', `${mm.min} / ${mm.max} mg/dL`);
    // Por categoria
    const byCat: Record<string, number[]> = {};
    for (const g of data.glycemia_entries) {
      const c = g.category || g.measurement_type || 'outro';
      (byCat[c] ||= []).push(num(g.glucose_mg_dl));
    }
    if (Object.keys(byCat).length > 1) {
      y += 4;
      subHeader('Médias por momento');
      for (const [c, arr] of Object.entries(byCat)) {
        bullet(`${c}: ${round(avg(arr))} mg/dL (${arr.length} medições)`);
      }
    }
    y += 4;
    subHeader('Últimas medições');
    const recent = [...data.glycemia_entries]
      .sort((a, b) => (b.measured_at || b.created_at).localeCompare(a.measured_at || a.created_at))
      .slice(0, 12);
    for (const g of recent) {
      const cat = g.category || g.measurement_type || '';
      bullet(`${fmtDate(g.measured_at || g.created_at)} — ${g.glucose_mg_dl} mg/dL${cat ? ` (${cat})` : ''}`);
    }
  }

  // ===== Atividade física =====
  if (data.exercise_entries.length > 0) {
    sectionHeader('Atividade física');
    const totalMin = data.exercise_entries.reduce((s, e) => s + num(e.duration_minutes), 0);
    const totalKcal = data.exercise_entries.reduce((s, e) => s + num(e.calories_burned), 0);
    kv('Total de sessões', String(data.exercise_entries.length));
    kv('Tempo total', `${Math.round(totalMin)} min`);
    kv('Calorias gastas (estimadas)', `${Math.round(totalKcal)} kcal`);
    // Por tipo
    const byType: Record<string, { count: number; min: number; kcal: number }> = {};
    for (const e of data.exercise_entries) {
      const t = e.exercise_type || 'outro';
      const b = (byType[t] ||= { count: 0, min: 0, kcal: 0 });
      b.count++;
      b.min += num(e.duration_minutes);
      b.kcal += num(e.calories_burned);
    }
    y += 4;
    subHeader('Por tipo');
    for (const [t, b] of Object.entries(byType)) {
      bullet(`${t}: ${b.count}x · ${Math.round(b.min)} min · ${Math.round(b.kcal)} kcal`);
    }
    y += 4;
    subHeader('Últimas atividades');
    const recent = [...data.exercise_entries]
      .sort((a, b) => (b.performed_at || b.created_at).localeCompare(a.performed_at || a.created_at))
      .slice(0, 10);
    for (const e of recent) {
      bullet(
        `${fmtDate(e.performed_at || e.created_at)} — ${e.name || e.exercise_type} · ${num(e.duration_minutes)} min · ${Math.round(num(e.calories_burned))} kcal`,
      );
    }
  }

  // ===== Análises corporais =====
  if (data.body_analyses.length > 0) {
    sectionHeader('Análises corporais (bioimpedância)');
    const recent = [...data.body_analyses]
      .sort((a, b) =>
        (b.measured_at || b.created_at).localeCompare(a.measured_at || a.created_at),
      )
      .slice(0, 3);
    for (const a of recent) {
      subHeader(`Análise de ${fmtDate(a.measured_at || a.created_at)}`);
      const e = a.extracted || {};
      const fields: Array<[string, any, string?]> = [
        ['Peso', e.weight_kg, 'kg'],
        ['Gordura corporal', e.body_fat_pct, '%'],
        ['Massa magra', e.lean_mass_kg, 'kg'],
        ['Massa muscular', e.muscle_mass_kg, 'kg'],
        ['Água corporal', e.body_water_pct, '%'],
        ['TMB', e.bmr_kcal, 'kcal'],
        ['Idade metabólica', e.metabolic_age, 'anos'],
        ['Gordura visceral', e.visceral_fat],
      ];
      for (const [label, v, unit] of fields) {
        if (v != null && v !== '') kv(label, `${v}${unit ? ' ' + unit : ''}`);
      }
      if (a.summary) writeLine(String(a.summary), { size: 9 });
      y += 6;
    }
  }

  // ===== Exames de sangue (TODOS os marcadores) =====
  if (data.blood_exams.length > 0) {
    sectionHeader('Exames de sangue');
    const sorted = [...data.blood_exams].sort((a, b) =>
      (b.collected_at || b.created_at).localeCompare(a.collected_at || a.created_at),
    );

    for (const exam of sorted.slice(0, 5)) {
      ensureSpace(60);
      subHeader(
        `Exame de ${fmtDate(exam.collected_at || exam.created_at)}${exam.lab_name ? ` — ${exam.lab_name}` : ''}`,
      );
      if (exam.summary) {
        writeLine(String(exam.summary), { size: 9, color: [70, 70, 70] });
        y += 2;
      }

      const markers: any[] = Array.isArray(exam.markers) ? exam.markers : [];
      const abnormal = markers.filter(
        (m: any) => m.status === 'high' || m.status === 'low' || m.status === 'borderline',
      );
      const normal = markers.filter((m: any) => m.status === 'normal');

      if (abnormal.length > 0) {
        writeLine('Marcadores fora da faixa:', { size: 10, bold: true });
        for (const m of abnormal) {
          const ref =
            m.ref_min != null && m.ref_max != null ? ` [ref: ${m.ref_min}–${m.ref_max}]` : '';
          bullet(
            `${m.label}: ${m.value ?? '—'}${m.unit ? ' ' + m.unit : ''} (${m.status})${ref}`,
          );
        }
      }
      if (normal.length > 0) {
        y += 2;
        writeLine('Marcadores dentro da faixa:', { size: 10, bold: true });
        for (const m of normal) {
          bullet(`${m.label}: ${m.value ?? '—'}${m.unit ? ' ' + m.unit : ''}`);
        }
      }
      if (Array.isArray(exam.alerts) && exam.alerts.length > 0) {
        y += 2;
        writeLine('Alertas:', { size: 10, bold: true });
        for (const a of exam.alerts) bullet(String(a));
      }
      if (Array.isArray(exam.diet_recommendations) && exam.diet_recommendations.length > 0) {
        y += 2;
        writeLine('Recomendações alimentares geradas:', { size: 10, bold: true });
        for (const r of exam.diet_recommendations) bullet(String(r));
      }
      y += 8;
    }

    // Tendência entre exames (se 2+)
    if (sorted.length >= 2) {
      sectionHeader('Tendência entre exames');
      // Coleta por marker key/label
      const series = new Map<string, Array<{ date: string; value: number; unit?: string; status?: string }>>();
      for (const exam of [...sorted].reverse()) {
        const date = (exam.collected_at || exam.created_at)?.slice(0, 10) || '';
        for (const m of exam.markers || []) {
          if (m.value == null) continue;
          const k = m.key || m.label;
          if (!k) continue;
          const markerSeries = series.get(k) ?? [];
          series.set(k, markerSeries);
          markerSeries.push({
            date,
            value: num(m.value),
            unit: m.unit,
            status: m.status,
          });
        }
      }
      let shown = 0;
      for (const [k, arr] of series.entries()) {
        if (arr.length < 2) continue;
        const first = arr[0];
        const last = arr[arr.length - 1];
        const delta = round(last.value - first.value, 2);
        const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        bullet(
          `${k}: ${first.value}${first.unit ? ' ' + first.unit : ''} (${first.date}) ${arrow} ${last.value}${last.unit ? ' ' + last.unit : ''} (${last.date}) — Δ ${delta > 0 ? '+' : ''}${delta}`,
        );
        shown++;
        if (shown >= 25) break;
      }
    }
  }

  // ===== Planos de treino =====
  if (data.workout_plans.length > 0) {
    sectionHeader('Planos de treino');
    const recent = [...data.workout_plans]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5);
    for (const p of recent) {
      subHeader(`${p.name || 'Plano'} (${fmtDate(p.created_at)})`);
      if (p.description) writeLine(String(p.description), { size: 9, color: [70, 70, 70] });
      if (Array.isArray(p.exercises)) {
        bullet(`${p.exercises.length} exercícios`);
      }
    }
  }

  // Full record appendix: no sampling or hidden truncation.
  const details = (value: any, prefix = '') => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) { value.forEach((item, index) => details(item, `${prefix} ${index + 1}`)); return; }
    if (typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        if (/url|hash/i.test(key)) continue;
        details(item, prefix ? `${prefix} / ${reportLabel(key)}` : reportLabel(key));
      }
      return;
    }
    // Write each wrapped line separately so very large text cannot overflow a page.
    const text = `${prefix}: ${typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value}`;
    doc.setFontSize(9);
    for (const line of doc.splitTextToSize(text, pageW - margin * 2)) writeLine(line, { size: 9 });
  };
  sectionHeader('Registros completos — todo o histórico');
  writeLine('Todas as medições e registros pessoais disponíveis. Fotos, vídeos e arquivos originais permanecem no aplicativo; são incluídas as informações e os resultados dos registros.', { size: 9 });
  for (const section of reportSections) {
    sectionHeader(section.title);
    const rows = data.records[section.key] ?? [];
    if (!rows.length) { writeLine('Sem registros.'); continue; }
    rows.forEach((row, index) => { subHeader(`Registro ${index + 1} de ${rows.length}`); details(sanitizeReport(row)); });
  }

  // ===== Disclaimer =====
  sectionHeader('Aviso');
  writeLine(
    'Este relatório é gerado automaticamente a partir dos registros do usuário no aplicativo Pilar Saúde. As informações têm caráter informativo e não substituem avaliação clínica. Decisões terapêuticas devem ser feitas por profissional habilitado.',
    { size: 9, color: [100, 100, 100] },
  );

  // ===== Footer =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Pilar Saúde · Relatório completo · ${i} / ${pageCount}`,
      pageW / 2,
      pageH - 24,
      { align: 'center' },
    );
  }

  doc.save(`pilar-academia-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}
