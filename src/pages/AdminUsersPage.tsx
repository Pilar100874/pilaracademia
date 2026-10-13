import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMaster } from '@/hooks/useIsMaster';
import { Navigate, useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Users, Search, ArrowLeft, Check, X, Trash2, LogIn, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { AdminCopyWorkoutDialog } from '@/components/AdminCopyWorkoutDialog';
import { startImpersonation } from '@/lib/impersonation';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ProfileRow {
  user_id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  approval_status: ApprovalStatus;
  created_at: string;
}

export default function AdminUsersPage() {
  const { isMaster, isLoading: roleLoading } = useIsMaster();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin', 'users-list'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id,name,email,is_active,approval_status,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
    enabled: isMaster,
  });

  const setActive = useMutation({
    mutationFn: async ({ user_id, is_active }: { user_id: string; is_active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_active }).eq('user_id', user_id);
      if (error) throw error;
    },
    onMutate: async ({ user_id, is_active }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'users-list'] });
      const prev = qc.getQueryData<ProfileRow[]>(['admin', 'users-list']);
      qc.setQueryData<ProfileRow[]>(['admin', 'users-list'], (old) =>
        old?.map((p) => (p.user_id === user_id ? { ...p, is_active } : p)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin', 'users-list'], ctx.prev);
      toast.error('Falha ao atualizar');
    },
    onSuccess: () => toast.success('Status atualizado'),
  });

  const decide = useMutation({
    mutationFn: async ({ user_id, status }: { user_id: string; status: ApprovalStatus }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: status,
          approval_decided_at: new Date().toISOString(),
          approval_decided_by: user?.id ?? null,
        })
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      toast.success(vars.status === 'approved' ? 'Usuário aprovado' : 'Usuário rejeitado');
    },
    onError: () => toast.error('Falha ao decidir'),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users-list'] });
      toast.success('Usuário excluído');
      setConfirmDelete(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Falha ao excluir usuário'),
  });

  const [confirmDelete, setConfirmDelete] = useState<ProfileRow | null>(null);
  const [copyTarget, setCopyTarget] = useState<ProfileRow | null>(null);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isMaster) return <Navigate to="/" replace />;

  const term = search.trim().toLowerCase();
  const match = (p: ProfileRow) =>
    !term ||
    (p.name || '').toLowerCase().includes(term) ||
    (p.email || '').toLowerCase().includes(term);

  const pending = profiles.filter((p) => p.approval_status === 'pending' && match(p));
  const allList = profiles.filter(match);

  const renderRow = (p: ProfileRow, opts: { showDecide?: boolean }) => (
    <li
      key={p.user_id}
      className="rounded-md border border-border bg-card px-3 py-2.5 space-y-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{p.name || '—'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{p.email || 'sem e-mail'}</p>
          <p className="text-[10px] text-muted-foreground">
            Cadastro: {new Date(p.created_at).toLocaleDateString('pt-BR')} ·{' '}
            <span
              className={
                p.approval_status === 'approved'
                  ? 'text-emerald-600'
                  : p.approval_status === 'rejected'
                    ? 'text-destructive'
                    : 'text-amber-600'
              }
            >
              {p.approval_status === 'approved'
                ? 'aprovado'
                : p.approval_status === 'rejected'
                  ? 'rejeitado'
                  : 'pendente'}
            </span>
          </p>
        </div>
        {!opts.showDecide && (
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={p.is_active}
              onCheckedChange={(v) => setActive.mutate({ user_id: p.user_id, is_active: v === true })}
            />
            <span className="text-[10px] text-muted-foreground">{p.is_active ? 'ativo' : 'inativo'}</span>
          </div>
        )}
      </div>
      {opts.showDecide && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => decide.mutate({ user_id: p.user_id, status: 'approved' })}
            disabled={decide.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => decide.mutate({ user_id: p.user_id, status: 'rejected' })}
            disabled={decide.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Rejeitar
          </Button>
        </div>
      )}
      {p.user_id !== user?.id && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={async () => {
            try {
              toast.loading('Entrando na conta…', { id: 'imp' });
              await startImpersonation(p.user_id);
            } catch (e) {
              toast.error((e as Error).message || 'Falha ao entrar na conta', { id: 'imp' });
            }
          }}
          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
        >
          <LogIn className="h-3 w-3" />
          Entrar como usuário
        </button>
        <button
          type="button"
          onClick={() => setCopyTarget(p)}
          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
        >
          <Copy className="h-3 w-3" />
          Copiar treino
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(p)}
          className="text-[11px] text-destructive hover:underline inline-flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Excluir usuário
        </button>
        </div>
      )}
    </li>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuários
          </h1>
          <p className="text-xs text-muted-foreground">Aprovar acesso e ativar/desativar contas</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
          />
        </div>

        <Tabs defaultValue={pending.length > 0 ? 'pending' : 'all'}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pendentes {pending.length > 0 && <span className="ml-1 text-amber-600">({pending.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              Todos ({allList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhuma solicitação pendente.
              </p>
            ) : (
              <ul className="space-y-2">{pending.map((p) => renderRow(p, { showDecide: true }))}</ul>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum usuário.</p>
            ) : (
              <ul className="space-y-2">{allList.map((p) => renderRow(p, {}))}</ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AdminCopyWorkoutDialog target={copyTarget} onClose={() => setCopyTarget(null)} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. O usuário{' '}
              <strong>{confirmDelete?.name || confirmDelete?.email || '—'}</strong> e todos os
              dados associados (vídeos, treinos, registros) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) deleteUser.mutate(confirmDelete.user_id);
              }}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo…
                </>
              ) : (
                'Excluir definitivamente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
