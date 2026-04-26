import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClinicRoom {
  id: string;
  clinic_id: string;
  name: string;
  color: string | null;
  capacity: number | null;
  active: boolean;
}

export function useClinicRooms(clinicId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['clinic-rooms', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_rooms' as any)
        .select('*')
        .eq('clinic_id', clinicId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as ClinicRoom[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; color?: string | null; capacity?: number | null }) => {
      if (!clinicId) throw new Error('Sem clínica');
      const { error } = await supabase.from('clinic_rooms' as any).insert({
        clinic_id: clinicId,
        name: input.name,
        color: input.color ?? null,
        capacity: input.capacity ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-rooms', clinicId] });
      toast.success('Sala criada');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar sala'),
  });

  const update = useMutation({
    mutationFn: async (input: Partial<ClinicRoom> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from('clinic_rooms' as any).update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic-rooms', clinicId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_rooms' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-rooms', clinicId] });
      toast.success('Sala removida');
    },
  });

  return { ...query, create, update, remove };
}
