import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export interface Appointment {
  id: string;
  clinic_id: string;
  student_id: string;
  instructor_id: string | null;
  equipment_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  created_by: string;
}

export function useAppointments(clinicId: string | null, dayISO?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['appointments', clinicId, dayISO ?? 'all'],
    queryFn: async () => {
      if (!clinicId) return [];
      let q = supabase.from('class_appointments').select('*').eq('clinic_id', clinicId).order('scheduled_at');
      if (dayISO) {
        const start = new Date(dayISO);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        q = q.gte('scheduled_at', start.toISOString()).lt('scheduled_at', end.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
    enabled: !!clinicId,
  });

  const create = useMutation({
    mutationFn: async (input: Omit<Appointment, 'id' | 'status' | 'checked_in_at' | 'completed_at'>) => {
      const { error } = await supabase.from('class_appointments').insert({ ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', clinicId] });
      toast.success('Aula agendada');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao agendar'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const patch: any = { status };
      if (status === 'checked_in') patch.checked_in_at = new Date().toISOString();
      if (status === 'completed') patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from('class_appointments').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', clinicId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments', clinicId] }),
  });

  return { ...query, create, updateStatus, remove };
}
