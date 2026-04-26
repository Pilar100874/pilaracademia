import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SkillLevel {
  id: string;
  clinic_id: string;
  name: string;
  rank: number;
  color: string | null;
}

export interface Equipment {
  id: string;
  clinic_id: string;
  name: string;
  equipment_type: string;
  identifier: string | null;
  station_token: string;
  active: boolean;
}

export interface Student {
  id: string;
  clinic_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  skill_level_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface ExerciseSequence {
  id: string;
  clinic_id: string;
  name: string;
  description: string | null;
  equipment_id: string | null;
  equipment_type: string | null;
  skill_level_id: string | null;
  estimated_minutes: number | null;
  created_at: string;
}

export interface SequenceItem {
  id: string;
  sequence_id: string;
  exercise_library_id: string | null;
  name: string;
  image_urls: string[];
  video_url: string | null;
  video_type: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  sets: number;
  reps: number;
  duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number;
}

export interface Prescription {
  id: string;
  clinic_id: string;
  student_id: string;
  sequence_id: string;
  context: 'in_class' | 'at_home';
  scheduled_for: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

// ===== SKILL LEVELS =====
export function useSkillLevels(clinicId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['skill-levels', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('clinic_skill_levels')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('rank', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SkillLevel[];
    },
    enabled: !!clinicId,
  });
  const create = useMutation({
    mutationFn: async (input: { name: string; rank: number; color?: string }) => {
      if (!clinicId) throw new Error('clinic missing');
      const { error } = await supabase.from('clinic_skill_levels').insert({
        clinic_id: clinicId,
        name: input.name.trim(),
        rank: input.rank,
        color: input.color ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill-levels', clinicId] });
      toast.success('Nível criado');
    },
    onError: () => toast.error('Erro ao criar nível'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_skill_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skill-levels', clinicId] }),
  });
  return { ...query, create, remove };
}

// ===== EQUIPMENT =====
export function useEquipment(clinicId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['equipment', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('clinic_equipment')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Equipment[];
    },
    enabled: !!clinicId,
  });
  const create = useMutation({
    mutationFn: async (input: { name: string; equipment_type: string; identifier?: string }) => {
      if (!clinicId) throw new Error('clinic missing');
      const { error } = await supabase.from('clinic_equipment').insert({
        clinic_id: clinicId,
        name: input.name.trim(),
        equipment_type: input.equipment_type.trim(),
        identifier: input.identifier ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment', clinicId] });
      toast.success('Equipamento adicionado');
    },
    onError: () => toast.error('Erro ao adicionar equipamento'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment', clinicId] }),
  });
  return { ...query, create, remove };
}

// ===== STUDENTS =====
export function useStudents(clinicId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['students', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('clinic_students')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Student[];
    },
    enabled: !!clinicId,
  });
  const create = useMutation({
    mutationFn: async (input: { full_name: string; email?: string; phone?: string; skill_level_id?: string | null; notes?: string }) => {
      if (!clinicId) throw new Error('clinic missing');
      const { error } = await supabase.from('clinic_students').insert({
        clinic_id: clinicId,
        full_name: input.full_name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        skill_level_id: input.skill_level_id ?? null,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', clinicId] });
      toast.success('Aluno cadastrado');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao cadastrar aluno'),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Student>) => {
      const { error } = await supabase.from('clinic_students').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', clinicId] });
      toast.success('Aluno atualizado');
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students', clinicId] }),
  });
  return { ...query, create, update, remove };
}

// ===== SEQUENCES =====
export function useSequences(clinicId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['sequences', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('exercise_sequences')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ExerciseSequence[];
    },
    enabled: !!clinicId,
  });
  const create = useMutation({
    mutationFn: async (input: { name: string; description?: string; equipment_id?: string | null; equipment_type?: string | null; skill_level_id?: string | null; estimated_minutes?: number | null; created_by: string }) => {
      if (!clinicId) throw new Error('clinic missing');
      const { data, error } = await supabase.from('exercise_sequences').insert({
        clinic_id: clinicId,
        name: input.name.trim(),
        description: input.description ?? null,
        equipment_id: input.equipment_id ?? null,
        equipment_type: input.equipment_type ?? null,
        skill_level_id: input.skill_level_id ?? null,
        estimated_minutes: input.estimated_minutes ?? null,
        created_by: input.created_by,
      }).select().single();
      if (error) throw error;
      return data as ExerciseSequence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequences', clinicId] });
      toast.success('Sequência criada');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar sequência'),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ExerciseSequence>) => {
      const { error } = await supabase.from('exercise_sequences').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequences', clinicId] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequences', clinicId] }),
  });
  return { ...query, create, update, remove };
}

export function useSequenceItems(sequenceId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['sequence-items', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return [];
      const { data, error } = await supabase
        .from('exercise_sequence_items')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as SequenceItem[];
    },
    enabled: !!sequenceId,
  });
  const addItem = useMutation({
    mutationFn: async (input: Partial<SequenceItem> & { name: string }) => {
      if (!sequenceId) throw new Error('sequence missing');
      const items = query.data ?? [];
      const order = items.length;
      const { error } = await supabase.from('exercise_sequence_items').insert({
        sequence_id: sequenceId,
        name: input.name,
        sets: input.sets ?? 3,
        reps: input.reps ?? 12,
        duration_seconds: input.duration_seconds ?? null,
        rest_seconds: input.rest_seconds ?? null,
        notes: input.notes ?? null,
        image_urls: input.image_urls ?? [],
        video_url: input.video_url ?? null,
        video_type: input.video_type ?? null,
        video_start_seconds: input.video_start_seconds ?? null,
        video_end_seconds: input.video_end_seconds ?? null,
        exercise_library_id: input.exercise_library_id ?? null,
        order_index: order,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequence-items', sequenceId] }),
    onError: (e: any) => toast.error(e?.message || 'Erro ao adicionar exercício'),
  });
  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_sequence_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequence-items', sequenceId] }),
  });
  const updateItem = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<SequenceItem>) => {
      const { error } = await supabase.from('exercise_sequence_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequence-items', sequenceId] }),
  });
  const reorderItems = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each item's order_index
      await Promise.all(orderedIds.map((id, idx) =>
        supabase.from('exercise_sequence_items').update({ order_index: idx }).eq('id', id)
      ));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequence-items', sequenceId] }),
  });
  const addFromLibrary = useMutation({
    mutationFn: async (libraryExercises: Array<{ id: string; name: string; default_sets: number; default_reps: number; image_urls: string[]; video_url: string | null; video_type: string | null; video_start_seconds: number | null; video_end_seconds: number | null; }>) => {
      if (!sequenceId) throw new Error('sequence missing');
      const items = query.data ?? [];
      let order = items.length;
      const rows = libraryExercises.map((ex) => ({
        sequence_id: sequenceId,
        exercise_library_id: ex.id,
        name: ex.name,
        sets: ex.default_sets,
        reps: ex.default_reps,
        image_urls: ex.image_urls ?? [],
        video_url: ex.video_url,
        video_type: ex.video_type,
        video_start_seconds: ex.video_start_seconds,
        video_end_seconds: ex.video_end_seconds,
        order_index: order++,
      }));
      const { error } = await supabase.from('exercise_sequence_items').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-items', sequenceId] });
      toast.success('Exercícios adicionados');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao adicionar'),
  });
  return { ...query, addItem, removeItem, updateItem, reorderItems, addFromLibrary };
}

// ===== PRESCRIPTIONS =====
export function usePrescriptions(filters: { clinicId?: string | null; studentId?: string | null }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['prescriptions', filters.clinicId, filters.studentId],
    queryFn: async () => {
      let q = supabase.from('prescriptions').select('*').order('created_at', { ascending: false });
      if (filters.clinicId) q = q.eq('clinic_id', filters.clinicId);
      if (filters.studentId) q = q.eq('student_id', filters.studentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Prescription[];
    },
    enabled: !!(filters.clinicId || filters.studentId),
  });
  const create = useMutation({
    mutationFn: async (input: { clinic_id: string; student_id: string; sequence_id: string; context: 'in_class' | 'at_home'; scheduled_for?: string | null; notes?: string; created_by: string }) => {
      const { error } = await supabase.from('prescriptions').insert({
        clinic_id: input.clinic_id,
        student_id: input.student_id,
        sequence_id: input.sequence_id,
        context: input.context,
        scheduled_for: input.scheduled_for ?? null,
        notes: input.notes ?? null,
        created_by: input.created_by,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescrição criada');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao prescrever'),
  });
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Prescription['status'] }) => {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
  return { ...query, create, updateStatus };
}
