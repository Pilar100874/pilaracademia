import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ClinicRoleInfo = {
  hasClinicRole: boolean;
  isMasterAdmin: boolean;
  isStudent: boolean;
  clinicId: string | null;
};

export function useUserClinicRole() {
  const { user } = useAuth();
  return useQuery<ClinicRoleInfo>({
    queryKey: ['user-clinic-role', user?.id],
    queryFn: async () => {
      if (!user) {
        return { hasClinicRole: false, isMasterAdmin: false, isStudent: false, clinicId: null };
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role, clinic_id')
        .eq('user_id', user.id);

      const roles = data ?? [];
      const isMasterAdmin = roles.some((r) => r.role === 'master_admin');
      const clinicRoles = roles.filter((r) =>
        ['clinic_admin', 'instructor', 'receptionist'].includes(r.role as string)
      );
      const studentRow = roles.find((r) => r.role === 'student');
      return {
        hasClinicRole: clinicRoles.length > 0,
        isMasterAdmin,
        isStudent: !!studentRow,
        clinicId: clinicRoles[0]?.clinic_id ?? studentRow?.clinic_id ?? null,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
