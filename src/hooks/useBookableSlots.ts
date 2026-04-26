import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BookableSlot {
  id: string;
  clinic_id: string;
  scheduled_at: string;
  duration_minutes: number;
  equipment_id: string | null;
  instructor_id: string | null;
  room_id: string | null;
  capacity: number;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export function useBookableSlots(clinicId: string | null, fromISO?: string, toISO?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['bookable-slots', clinicId, fromISO, toISO],
    queryFn: async () => {
      if (!clinicId) return [];
      let q = supabase.from('bookable_slots' as any).select('*').eq('clinic_id', clinicId);
      if (fromISO) q = q.gte('scheduled_at', fromISO);
      if (toISO) q = q.lte('scheduled_at', toISO);
      const { data, error } = await q.order('scheduled_at');
      if (error) throw error;
      return (data ?? []) as unknown as BookableSlot[];
    },
    enabled: !!clinicId,
  });

  const create = useMutation({
    mutationFn: async (input: Omit<BookableSlot, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('bookable_slots' as any)
        .insert(input as any)
        .select('id')
        .single();
      if (error) throw error;
      return (data as any)?.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookable-slots'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar slot'),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BookableSlot> }) => {
      const { error } = await supabase.from('bookable_slots' as any).update(patch as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookable-slots'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao atualizar slot'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookable_slots' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookable-slots'] }),
  });

  return { ...query, create, update, remove };
}

export function useClinicSettings(clinicId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['clinic-settings', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      const { data } = await supabase.from('clinic_settings' as any).select('*').eq('clinic_id', clinicId).maybeSingle();
      return data as any;
    },
    enabled: !!clinicId,
  });

  const upsert = useMutation({
    mutationFn: async (input: { cancellation_min_hours: number; booking_open_days_ahead: number }) => {
      if (!clinicId) throw new Error('clinic missing');
      const { error } = await supabase.from('clinic_settings' as any).upsert({
        clinic_id: clinicId,
        ...input,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-settings'] });
      toast.success('Configurações salvas');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  return { ...query, upsert };
}
