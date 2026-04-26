import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecurringSchedule {
  id: string;
  clinic_id: string;
  student_id: string;
  instructor_id: string | null;
  equipment_id: string | null;
  day_of_week: number; // 0=dom..6=sab
  start_time: string;  // 'HH:MM:SS'
  duration_minutes: number;
  active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string;
}

export function useRecurringSchedules(clinicId: string | null, studentId?: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['recurring-schedules', clinicId, studentId ?? 'all'],
    queryFn: async () => {
      if (!clinicId) return [];
      let q = supabase.from('recurring_schedules' as any).select('*').eq('clinic_id', clinicId).eq('active', true);
      if (studentId) q = q.eq('student_id', studentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RecurringSchedule[];
    },
    enabled: !!clinicId,
  });

  const create = useMutation({
    mutationFn: async (input: Omit<RecurringSchedule, 'id' | 'active' | 'start_date' | 'end_date'> & { active?: boolean }) => {
      const { error } = await supabase.from('recurring_schedules' as any).insert(input as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-schedules'] });
      toast.success('Horário fixo cadastrado');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_schedules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-schedules'] }),
  });

  return { ...query, create, remove };
}

/** Gera ocorrências virtuais (não persistidas) para um dia específico. */
export function expandRecurringForDay(recurring: RecurringSchedule[], day: Date) {
  const dow = day.getDay();
  const dayDate = day.toISOString().slice(0, 10);
  return recurring
    .filter((r) => r.active && r.day_of_week === dow)
    .filter((r) => r.start_date <= dayDate)
    .filter((r) => !r.end_date || r.end_date >= dayDate)
    .map((r) => {
      const [h, m] = r.start_time.split(':').map(Number);
      const sched = new Date(day);
      sched.setHours(h, m, 0, 0);
      return {
        virtual: true as const,
        recurring_id: r.id,
        student_id: r.student_id,
        equipment_id: r.equipment_id,
        instructor_id: r.instructor_id,
        scheduled_at: sched.toISOString(),
        duration_minutes: r.duration_minutes,
        notes: r.notes,
      };
    });
}
