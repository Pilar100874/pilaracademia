import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

export interface MaterializeInput {
  clinic_id: string;
  student_id: string;
  instructor_id: string | null;
  equipment_id: string | null;
  day_of_week: number; // 0=dom..6=sab
  start_time: string;  // 'HH:MM:SS'
  duration_minutes: number;
  notes?: string | null;
  created_by: string;
  recurring_schedule_id?: string | null;
  /** Janela: data inicial (YYYY-MM-DD) */
  from_date: string;
  /** Janela: data final inclusive (YYYY-MM-DD) */
  to_date: string;
}

/**
 * Cria appointments reais a partir de um horário fixo dentro de um período.
 * Pula datas que já têm um appointment (mesmo recurring_schedule_id e mesmo dia).
 */
export async function materializeRecurringAppointments(input: MaterializeInput): Promise<number> {
  const start = new Date(input.from_date + 'T00:00:00');
  const end = new Date(input.to_date + 'T23:59:59');
  const [hh, mm] = input.start_time.split(':').map(Number);

  // Primeira ocorrência do day_of_week >= start
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getDay() !== input.day_of_week) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor > end) break;
  }
  while (cursor <= end) {
    const d = new Date(cursor);
    d.setHours(hh, mm, 0, 0);
    if (d >= new Date()) dates.push(d); // só futuro
    cursor.setDate(cursor.getDate() + 7);
  }
  if (dates.length === 0) return 0;

  // Buscar existentes para evitar duplicar
  const { data: existing } = await supabase
    .from('class_appointments')
    .select('scheduled_at')
    .eq('clinic_id', input.clinic_id)
    .eq('student_id', input.student_id)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString());

  const existingSet = new Set((existing ?? []).map((a) => new Date(a.scheduled_at).getTime()));

  const toInsert = dates
    .filter((d) => !existingSet.has(d.getTime()))
    .map((d) => ({
      clinic_id: input.clinic_id,
      student_id: input.student_id,
      instructor_id: input.instructor_id,
      equipment_id: input.equipment_id,
      scheduled_at: d.toISOString(),
      duration_minutes: input.duration_minutes,
      notes: input.notes ?? null,
      created_by: input.created_by,
      recurring_schedule_id: input.recurring_schedule_id ?? null,
      status: 'scheduled' as const,
    }));

  if (toInsert.length === 0) return 0;

  // Inserir um a um para não quebrar todo o lote em caso de regra de contrato
  let created = 0;
  for (const row of toInsert) {
    const { error } = await supabase.from('class_appointments').insert(row);
    if (!error) created++;
  }
  return created;
}

/**
 * Materializa todos os horários fixos do aluno dentro do período do contrato.
 * Para contratos do tipo "open" usa janela default de 60 dias.
 * Para "classes" usa janela de 90 dias (limitada pelo trigger ao total do pacote).
 */
export async function materializeStudentRecurring(opts: {
  clinic_id: string;
  student: {
    id: string;
    contract_type: string | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
  };
  recurring: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    duration_minutes: number;
    equipment_id: string | null;
    instructor_id: string | null;
    notes: string | null;
  }>;
  created_by: string;
}): Promise<number> {
  if (opts.recurring.length === 0) return 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  let from: string;
  let to: string;

  if (opts.student.contract_type === 'period') {
    from = opts.student.contract_start_date && opts.student.contract_start_date > today
      ? opts.student.contract_start_date
      : today;
    if (!opts.student.contract_end_date) return 0;
    to = opts.student.contract_end_date;
  } else if (opts.student.contract_type === 'classes') {
    from = today;
    to = format(addDays(new Date(), 90), 'yyyy-MM-dd');
  } else {
    from = today;
    to = format(addDays(new Date(), 60), 'yyyy-MM-dd');
  }

  let total = 0;
  for (const r of opts.recurring) {
    total += await materializeRecurringAppointments({
      clinic_id: opts.clinic_id,
      student_id: opts.student.id,
      instructor_id: r.instructor_id,
      equipment_id: r.equipment_id,
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      duration_minutes: r.duration_minutes,
      notes: r.notes,
      created_by: opts.created_by,
      recurring_schedule_id: r.id,
      from_date: from,
      to_date: to,
    });
  }
  return total;
}
