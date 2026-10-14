import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isImpersonating } from '@/lib/impersonation';

/**
 * isGestor: conta com papel "gestor" (cria e gerencia usuários vinculados).
 * isMember: conta criada por um gestor.
 * restricted: membro usando o app sozinho (sem o gestor dentro da conta) —
 * não pode criar/editar treinos nem biblioteca.
 */
export function useAccountKind() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['account-kind', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [roles, link] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user!.id).in('role', ['gestor', 'master_admin'] as never[]).limit(1),
        supabase.from('managed_users').select('manager_id').eq('member_id', user!.id).maybeSingle(),
      ]);
      return { isGestor: !!roles.data?.length, isMember: !!link.data };
    },
  });
  const isGestor = data?.isGestor ?? false;
  const isMember = data?.isMember ?? false;
  return { isGestor, isMember, restricted: isMember && !isImpersonating() };
}
