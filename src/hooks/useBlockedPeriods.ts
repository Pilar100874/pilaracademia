import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlockedPeriod {
  id: string;
  clinic_id: string;
  name: string;
  day_of_week: number; // 0..6 (dom..sáb)
  start_time: string;  // 'HH:MM:SS'
  end_time: string;
  room_id: string | null;
  color: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BlockedPeriodException {
  id: string;
  blocked_period_id: string;
  clinic_id: string;
  exception_date: string; // YYYY-MM-DD
  reason: string | null;
  created_by: string;
  created_at: string;
}

export function useBlockedPeriods(clinicId: string | null | undefined) {
  const qc = useQueryClient();

  const periodsQuery = useQuery({
    queryKey: ['blocked-periods', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('clinic_blocked_periods')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data || []) as BlockedPeriod[];
    },
  });

  const exceptionsQuery = useQuery({
    queryKey: ['blocked-period-exceptions', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('clinic_blocked_period_exceptions')
        .select('*')
        .eq('clinic_id', clinicId);
      if (error) throw error;
      return (data || []) as BlockedPeriodException[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Omit<BlockedPeriod, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('clinic_blocked_periods').insert({
        ...input,
        created_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-periods', clinicId] });
      toast.success('Bloqueio criado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<BlockedPeriod> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('clinic_blocked_periods')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-periods', clinicId] });
      toast.success('Bloqueio atualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('clinic_blocked_periods')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-periods', clinicId] });
      qc.invalidateQueries({ queryKey: ['blocked-period-exceptions', clinicId] });
      toast.success('Bloqueio removido');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Liberar pontualmente uma data específica
  const addException = useMutation({
    mutationFn: async ({ blocked_period_id, exception_date, reason }: { blocked_period_id: string; exception_date: string; reason?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('clinic_blocked_period_exceptions').insert({
        blocked_period_id,
        clinic_id: clinicId,
        exception_date,
        reason: reason ?? null,
        created_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-period-exceptions', clinicId] });
      toast.success('Horário liberado para esse dia');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Re-bloquear (remove exceção)
  const removeException = useMutation({
    mutationFn: async ({ blocked_period_id, exception_date }: { blocked_period_id: string; exception_date: string }) => {
      const { error } = await (supabase as any)
        .from('clinic_blocked_period_exceptions')
        .delete()
        .eq('blocked_period_id', blocked_period_id)
        .eq('exception_date', exception_date);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-period-exceptions', clinicId] });
      toast.success('Bloqueio restaurado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    periods: periodsQuery.data || [],
    exceptions: exceptionsQuery.data || [],
    isLoading: periodsQuery.isLoading || exceptionsQuery.isLoading,
    create,
    update,
    remove,
    addException,
    removeException,
  };
}

/**
 * Verifica se um instante (date+hour) está dentro de algum bloqueio padrão ATIVO
 * E que NÃO esteja liberado por exceção naquela data.
 * roomId opcional: se o bloqueio tem room_id definido, só bloqueia quando bate.
 */
export function findActiveBlockAt(
  periods: BlockedPeriod[],
  exceptions: BlockedPeriodException[],
  d: Date,
  hour: number,
  minute: number = 0,
  roomId: string | null = null,
): BlockedPeriod | null {
  const dow = d.getDay();
  const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const candidates = periods.filter((p) => {
    if (!p.active) return false;
    if (p.day_of_week !== dow) return false;
    if (p.start_time > hhmm || p.end_time <= hhmm) return false;
    if (p.room_id && roomId && p.room_id !== roomId) return false;
    return true;
  });

  for (const p of candidates) {
    const released = exceptions.some(
      (e) => e.blocked_period_id === p.id && e.exception_date === dateStr,
    );
    if (!released) return p;
  }
  return null;
}
