import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Returns true when the current authenticated user has the `master_admin`
 * role in `public.user_roles`. Used to gate features like managing the
 * **global** exercise library and configuring the shared Apify token.
 */
export function useIsMaster() {
  const { user } = useAuth();

  const { data: isMaster = false, isLoading } = useQuery({
    queryKey: ['is-master', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'master_admin')
        .is('clinic_id', null)
        .maybeSingle();
      if (error) {
        console.warn('useIsMaster: failed to read role', error);
        return false;
      }
      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return { isMaster, isLoading };
}
