import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'super_admin' | 'clinic_admin' | 'instructor' | 'receptionist' | 'student' | 'station';

export interface UserRoleRow {
  id: string;
  user_id: string;
  clinic_id: string | null;
  role: AppRole;
}

export interface ClinicRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_user_id: string;
}

export function useUserRoles() {
  const { user } = useAuth();

  const rolesQuery = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [] as UserRoleRow[];
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []) as UserRoleRow[];
    },
    enabled: !!user,
  });

  const clinicsQuery = useQuery({
    queryKey: ['user-clinics', user?.id],
    queryFn: async () => {
      if (!user) return [] as ClinicRow[];
      const { data, error } = await supabase.from('clinics').select('*');
      if (error) throw error;
      return (data ?? []) as ClinicRow[];
    },
    enabled: !!user,
  });

  const roles = rolesQuery.data ?? [];
  const clinics = clinicsQuery.data ?? [];

  const isStaff = roles.some((r) => ['clinic_admin', 'instructor', 'receptionist'].includes(r.role));
  const isStudent = roles.some((r) => r.role === 'student');
  const isAdmin = roles.some((r) => r.role === 'clinic_admin');
  const isInstructor = roles.some((r) => r.role === 'instructor');

  // Active clinic = first clinic where user has any role with a clinic_id
  const staffRole = roles.find((r) => r.clinic_id && r.role !== 'student');
  const studentRole = roles.find((r) => r.clinic_id && r.role === 'student');
  const activeClinicId = staffRole?.clinic_id ?? studentRole?.clinic_id ?? null;
  const activeClinic = activeClinicId ? clinics.find((c) => c.id === activeClinicId) ?? null : null;

  return {
    roles,
    clinics,
    isLoading: rolesQuery.isLoading || clinicsQuery.isLoading,
    isStaff,
    isStudent,
    isAdmin,
    isInstructor,
    activeClinicId,
    activeClinic,
    refetch: () => {
      rolesQuery.refetch();
      clinicsQuery.refetch();
    },
  };
}
