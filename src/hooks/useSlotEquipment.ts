import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SlotEquipmentLink {
  id: string;
  bookable_slot_id: string;
  equipment_id: string;
  clinic_id: string;
  created_at: string;
}

/**
 * Lista todos os vínculos slot↔equipamento de uma clínica (opcionalmente
 * filtrando por janela de tempo via lista de slot ids).
 */
export function useSlotEquipmentLinks(clinicId: string | null, slotIds?: string[]) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['slot-equipment', clinicId, slotIds?.join(',') ?? 'all'],
    queryFn: async () => {
      if (!clinicId) return [];
      let q = (supabase.from('bookable_slot_equipment' as any) as any)
        .select('*')
        .eq('clinic_id', clinicId);
      if (slotIds && slotIds.length > 0) {
        q = q.in('bookable_slot_id', slotIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SlotEquipmentLink[];
    },
    enabled: !!clinicId,
  });

  const setEquipmentForSlot = useMutation({
    mutationFn: async (input: { slotId: string; equipmentIds: string[] }) => {
      if (!clinicId) throw new Error('clinic missing');
      // Remove tudo do slot e reinsere o conjunto desejado
      const { error: delErr } = await (supabase.from('bookable_slot_equipment' as any) as any)
        .delete()
        .eq('bookable_slot_id', input.slotId);
      if (delErr) throw delErr;
      if (input.equipmentIds.length === 0) return;
      const rows = input.equipmentIds.map((eid) => ({
        bookable_slot_id: input.slotId,
        equipment_id: eid,
        clinic_id: clinicId,
      }));
      const { error } = await (supabase.from('bookable_slot_equipment' as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slot-equipment'] });
      toast.success('Equipamentos vinculados');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao vincular equipamentos'),
  });

  return { ...query, setEquipmentForSlot };
}
