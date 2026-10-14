import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isImpersonating } from '@/lib/impersonation';
import { Button } from '@/components/ui/button';

/** Aviso discreto para o usuário vinculado: treinos criados/atualizados pelo gestor. */
export function MemberNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const active = !!user && !isImpersonating();
  const { data = [] } = useQuery({
    queryKey: ['member-notifications', user?.id],
    enabled: active,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('member_notifications')
        .select('id,title,body,created_at')
        .eq('user_id', user!.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
  if (!active || data.length === 0) return null;

  const markRead = async (ids: string[]) => {
    await supabase.from('member_notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    qc.invalidateQueries({ queryKey: ['member-notifications'] });
  };

  const latest = data[0];
  return (
    <div className="fixed inset-x-2 top-2 z-50 mx-auto max-w-md min-w-0 rounded-md border border-border bg-background p-3 shadow-sm lg:left-64">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{latest.title}</p>
          {latest.body && <p className="truncate text-xs text-muted-foreground">{latest.body}</p>}
          {data.length > 1 && <p className="text-xs text-muted-foreground">+{data.length - 1} outra(s) novidade(s)</p>}
          <Button
            size="sm" variant="link" className="h-auto p-0 text-xs"
            onClick={() => { markRead(data.map((n) => n.id)); navigate('/workouts'); }}
          >
            Ver treinos
          </Button>
        </div>
        <button aria-label="Fechar aviso" onClick={() => markRead(data.map((n) => n.id))} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
