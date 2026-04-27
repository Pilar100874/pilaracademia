import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EquipmentMode = 'single_per_class' | 'free';

export interface ClinicRoom {
  id: string;
  clinic_id: string;
  name: string;
  color: string | null;
  capacity: number | null;
  active: boolean;
  equipment_mode: EquipmentMode;
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
    mutationFn: async (input: {
      name: string;
      color?: string | null;
      capacity?: number | null;
      equipment_mode?: EquipmentMode;
    }) => {
      if (!clinicId) throw new Error('Sem clínica');
      const { data, error } = await supabase
        .from('clinic_rooms' as any)
        .insert({
          clinic_id: clinicId,
          name: input.name,
          color: input.color ?? null,
          capacity: input.capacity ?? null,
          equipment_mode: input.equipment_mode ?? 'free',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicRoom;
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

// =============== Room <-> Equipment relationship ===============

export interface RoomEquipmentLink {
  id: string;
  clinic_id: string;
  room_id: string;
  equipment_id: string;
}

export function useRoomEquipment(clinicId: string | null | undefined) {
  const qc = useQueryClient();
  const queryKey = ['room-equipment', clinicId];

  const query = useQuery({
    queryKey,
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_equipment' as any)
        .select('*')
        .eq('clinic_id', clinicId!);
      if (error) throw error;
      return (data ?? []) as unknown as RoomEquipmentLink[];
    },
  });

  const setRoomEquipment = useMutation({
    mutationFn: async ({
      roomId,
      equipmentIds,
    }: {
      roomId: string;
      equipmentIds: string[];
    }) => {
      if (!clinicId) throw new Error('Sem clínica');
      // Delete existing then insert new (simple approach)
      const { error: delErr } = await supabase
        .from('room_equipment' as any)
        .delete()
        .eq('room_id', roomId);
      if (delErr) throw delErr;
      if (equipmentIds.length === 0) return;
      const rows = equipmentIds.map((eid) => ({
        clinic_id: clinicId,
        room_id: roomId,
        equipment_id: eid,
      }));
      const { error } = await supabase.from('room_equipment' as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { ...query, setRoomEquipment };
}
