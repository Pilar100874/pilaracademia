import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';

export type PermissionKey = 'can_create_exercises' | 'can_create_sequences' | 'can_prescribe_workouts';

export interface ClinicUserPermission {
  id: string;
  clinic_id: string;
  user_id: string;
  can_create_exercises: boolean;
  can_create_sequences: boolean;
  can_prescribe_workouts: boolean;
}

/** Permissões do usuário logado na clínica ativa. Admin sempre = true. */
export function useMyClinicPermissions() {
  const { user } = useAuth();
  const { activeClinicId, isAdmin, roles } = useUserRoles();

  return useQuery({
    queryKey: ['my-clinic-permissions', user?.id, activeClinicId],
    enabled: !!user?.id && !!activeClinicId,
    queryFn: async () => {
      if (isAdmin) {
        return {
          can_create_exercises: true,
          can_create_sequences: true,
          can_prescribe_workouts: true,
        };
      }
      const { data } = await supabase
        .from('clinic_user_permissions')
        .select('*')
        .eq('clinic_id', activeClinicId!)
        .eq('user_id', user!.id)
        .maybeSingle();

      // Default por papel
      const role = roles.find((r) => r.clinic_id === activeClinicId)?.role;
      const isInstructor = role === 'instructor';

      return {
        can_create_exercises: data?.can_create_exercises ?? isInstructor,
        can_create_sequences: data?.can_create_sequences ?? isInstructor,
        can_prescribe_workouts: data?.can_prescribe_workouts ?? isInstructor,
      };
    },
  });
}

/** Lista todas as permissões da clínica (apenas admin). */
export function useClinicPermissions(clinicId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['clinic-permissions', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_user_permissions')
        .select('*')
        .eq('clinic_id', clinicId!);
      if (error) throw error;
      return (data ?? []) as ClinicUserPermission[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: {
      user_id: string;
      can_create_exercises: boolean;
      can_create_sequences: boolean;
      can_prescribe_workouts: boolean;
    }) => {
      if (!clinicId) throw new Error('Sem clínica');
      const { error } = await supabase
        .from('clinic_user_permissions')
        .upsert(
          { clinic_id: clinicId, ...input },
          { onConflict: 'clinic_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-permissions', clinicId] });
      qc.invalidateQueries({ queryKey: ['my-clinic-permissions'] });
    },
  });

  return { ...query, upsert };
}
