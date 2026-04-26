import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffMember {
  user_id: string;
  role: 'clinic_admin' | 'instructor' | 'receptionist';
  name: string | null;
  email: string | null;
}

export function useClinicStaff(clinicId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['clinic-staff', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('clinic_id', clinicId!)
        .in('role', ['clinic_admin', 'instructor', 'receptionist']);
      if (error) throw error;
      const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      let profiles: any[] = [];
      if (userIds.length) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);
        profiles = data ?? [];
      }
      const merged: StaffMember[] = (roles ?? []).map((r) => {
        const p = profiles.find((pp) => pp.user_id === r.user_id);
        return {
          user_id: r.user_id,
          role: r.role as any,
          name: p?.name ?? null,
          email: p?.email ?? null,
        };
      });
      return merged;
    },
  });

  const removeStaff = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)
        .eq('clinic_id', clinicId!)
        .eq('role', role as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic-staff', clinicId] }),
  });

  return { ...query, removeStaff };
}

export function useStudentInstructors(clinicId: string | null, studentId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['student-instructors', clinicId, studentId],
    enabled: !!clinicId && !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_instructors')
        .select('id, instructor_user_id')
        .eq('clinic_id', clinicId!)
        .eq('student_id', studentId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const link = useMutation({
    mutationFn: async ({ instructor_user_id, created_by }: { instructor_user_id: string; created_by: string }) => {
      const { error } = await supabase
        .from('student_instructors')
        .insert({
          clinic_id: clinicId!,
          student_id: studentId!,
          instructor_user_id,
          created_by,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-instructors', clinicId, studentId] });
      qc.invalidateQueries({ queryKey: ['my-students', clinicId] });
    },
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('student_instructors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-instructors', clinicId, studentId] });
      qc.invalidateQueries({ queryKey: ['my-students', clinicId] });
    },
  });

  return { ...query, link, unlink };
}

/** IDs dos alunos vinculados ao professor logado (alunos fixos). */
export function useMyStudentIds(clinicId: string | null, instructorUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['my-students', clinicId, instructorUserId],
    enabled: !!clinicId && !!instructorUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_instructors')
        .select('student_id')
        .eq('clinic_id', clinicId!)
        .eq('instructor_user_id', instructorUserId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.student_id as string));
    },
  });
}
