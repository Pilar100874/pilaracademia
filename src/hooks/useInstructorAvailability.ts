import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InstructorAvailability {
  id: string;
  clinic_id: string;
  instructor_id: string;
  day_of_week: number; // 0=dom..6=sab
  start_time: string;  // 'HH:MM:SS'
  end_time: string;    // 'HH:MM:SS'
  room_id: string | null;
  color: string | null;
  notes: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InstructorColor {
  id: string;
  clinic_id: string;
  instructor_id: string;
  color: string;
}

/** Paleta padrão (HSL) para auto-atribuição de cores a professores. */
export const INSTRUCTOR_PALETTE = [
  'hsl(220 70% 55%)',
  'hsl(160 65% 42%)',
  'hsl(280 60% 58%)',
  'hsl(20 85% 55%)',
  'hsl(340 70% 55%)',
  'hsl(45 90% 50%)',
  'hsl(195 75% 45%)',
  'hsl(120 50% 45%)',
  'hsl(0 70% 55%)',
  'hsl(255 60% 60%)',
];

export function colorForInstructor(
  instructorId: string | null | undefined,
  colors: InstructorColor[],
  fallbackIndex?: number,
): string {
  if (!instructorId) return 'hsl(var(--muted-foreground))';
  const explicit = colors.find((c) => c.instructor_id === instructorId)?.color;
  if (explicit) return explicit;
  // Hash determinístico
  let h = 0;
  for (let i = 0; i < instructorId.length; i++) h = (h * 31 + instructorId.charCodeAt(i)) | 0;
  const idx = Math.abs(fallbackIndex ?? h) % INSTRUCTOR_PALETTE.length;
  return INSTRUCTOR_PALETTE[idx];
}

export function useInstructorAvailability(clinicId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['instructor-availability', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('instructor_availability' as any)
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('active', true);
      if (error) throw error;
      return (data ?? []) as unknown as InstructorAvailability[];
    },
    enabled: !!clinicId,
  });

  const create = useMutation({
    mutationFn: async (input: Omit<InstructorAvailability, 'id' | 'active' | 'created_at' | 'updated_at'> & { active?: boolean }) => {
      const { error } = await supabase.from('instructor_availability' as any).insert(input as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-availability'] });
      toast.success('Turno cadastrado');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<InstructorAvailability> & { id: string }) => {
      const { error } = await supabase.from('instructor_availability' as any).update(patch as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-availability'] }),
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instructor_availability' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-availability'] });
      toast.success('Turno removido');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  return { ...query, create, update, remove };
}

export function useInstructorColors(clinicId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['instructor-colors', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('instructor_colors' as any)
        .select('*')
        .eq('clinic_id', clinicId);
      if (error) throw error;
      return (data ?? []) as unknown as InstructorColor[];
    },
    enabled: !!clinicId,
  });

  const upsert = useMutation({
    mutationFn: async (input: { clinic_id: string; instructor_id: string; color: string }) => {
      const { error } = await supabase
        .from('instructor_colors' as any)
        .upsert(input as any, { onConflict: 'clinic_id,instructor_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-colors'] }),
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  return { ...query, upsert };
}
