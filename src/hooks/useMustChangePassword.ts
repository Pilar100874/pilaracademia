import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useMustChangePassword() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['must-change-password', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_security_flags')
        .select('must_change_password')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data?.must_change_password;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
