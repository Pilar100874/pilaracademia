import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccountKind } from '@/hooks/useAccountKind';
import { startImpersonation } from '@/lib/impersonation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Check, Copy, KeyRound, Loader2, LogIn, Plus, Trash2, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminCopyWorkoutDialog } from '@/components/AdminCopyWorkoutDialog';

interface Member { user_id: string; name: string; email: string | null; created_at: string }

const COMMON_PASSWORDS = ['12345678', 'password', 'senha123', 'qwerty123', '11111111', '00000000', 'abcd1234', 'pilar123'];

function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: 'Pelo menos 8 caracteres' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: 'Letras maiúsculas e minúsculas' },
    { ok: /\d/.test(pw), label: 'Pelo menos um número' },
    { ok: /[^A-Za-z0-9]/.test(pw), label: 'Pelo menos um símbolo (ex.: ! @ # $)' },
    { ok: pw.length > 0 && !COMMON_PASSWORDS.includes(pw.toLowerCase()), label: 'Não pode ser uma senha comum (ex.: 12345678)' },
  ];
}

function PasswordHints({ password }: { password: string }) {
  const checks = passwordChecks(password);
  return (
    <ul className="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2">
      {checks.map((c) => (
        <li key={c.label} className={`flex items-center gap-1.5 text-[11px] ${c.ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {c.ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0 opacity-50" />}
          {c.label}
        </li>
      ))}
      <li className="pt-0.5 text-[11px] text-muted-foreground">
        Dica: misture palavras com números e símbolos, ex.: <span className="font-medium text-foreground">Pilar#Treino2026</span>
      </li>
    </ul>
  );
}

export default function ManagerUsersPage() {
  const { user } = useAuth();
  const { isGestor } = useAccountKind();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [copyTarget, setCopyTarget] = useState<Member | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [pwTarget, setPwTarget] = useState<Member | null>(null);
  const [newPw, setNewPw] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['manager', 'members', user?.id],
    enabled: !!user && isGestor,
    queryFn: async (): Promise<Member[]> => {
      const { data: links } = await supabase.from('managed_users').select('member_id').eq('manager_id', user!.id);
      const ids = (links ?? []).map((l) => l.member_id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from('profiles')
        .select('user_id,name,email,created_at').in('user_id', ids).order('name');
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('manager-users', { body });
    if (data?.error) throw new Error(data.error);
    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        const j = ctx ? await ctx.clone().json() : null;
        if (j?.error) msg = j.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return data;
  };

  const create = async () => {
    setBusy(true);
    try {
      await call({ action: 'create', ...form });
      toast.success('Usuário criado. Repasse o e-mail e a senha para a pessoa.');
      setForm({ name: '', email: '', password: '' });
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['manager', 'members'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await call({ action: 'delete', userId: confirmDelete.user_id });
      toast.success('Usuário excluído');
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['manager', 'members'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const changePw = async () => {
    if (!pwTarget) return;
    setBusy(true);
    try {
      await call({ action: 'set_password', userId: pwTarget.user_id, password: newPw });
      toast.success('Senha alterada. Repasse a nova senha para a pessoa.');
      setPwTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (user && !isGestor && !isLoading) {
    // aguarda a leitura do papel antes de redirecionar
  }
  if (!user) return <Navigate to="/auth" replace />;

  const sources = [
    { user_id: user.id, name: 'Meus treinos' },
    ...members.map((m) => ({ user_id: m.user_id, name: m.name || m.email || '—' })),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" /> Meus usuários
          </h1>
          <p className="text-xs text-muted-foreground">Crie contas, monte treinos e acompanhe os dados</p>
        </div>
        {isGestor && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        {!isGestor ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Esta área é só para contas de Gestor.</p>
        ) : isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : members.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum usuário ainda. Toque em "Novo" para criar o primeiro.
          </p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="rounded-md border border-border bg-card px-3 py-2.5 space-y-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name || '—'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    onClick={async () => {
                      try {
                        toast.loading('Entrando na conta…', { id: 'imp' });
                        await startImpersonation(m.user_id, '/gestor');
                      } catch (e) {
                        toast.error((e as Error).message || 'Falha ao entrar', { id: 'imp' });
                      }
                    }}
                  >
                    <LogIn className="h-3 w-3" /> Entrar na conta
                  </button>
                  <button type="button" onClick={() => setCopyTarget(m)}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copiar treino para este usuário
                  </button>
                  <button type="button" onClick={() => { setPwTarget(m); setNewPw(''); }}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> Mudar senha
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(m)}
                    className="text-[11px] text-destructive hover:underline inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => !busy && setCreateOpen(o)}>
        <DialogContent className="flex max-h-[90vh] min-w-0 flex-col overflow-hidden p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="shrink-0 px-5 pt-5">
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>A conta já sai liberada. Repasse o e-mail e a senha para a pessoa.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 space-y-3">
            <div className="space-y-1"><Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>E-mail</Label>
              <Input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Senha inicial (mín. 8 caracteres)</Label>
              <Input type="text" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <div className="shrink-0 border-t border-border px-5 py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={create} disabled={busy || !form.name.trim() || !form.email.trim() || form.password.length < 8}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminCopyWorkoutDialog target={copyTarget} onClose={() => setCopyTarget(null)} sources={sources} />

      <Dialog open={!!pwTarget} onOpenChange={(o) => !busy && !o && setPwTarget(null)}>
        <DialogContent className="flex max-h-[90vh] min-w-0 flex-col overflow-hidden p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="shrink-0 px-5 pt-5">
            <DialogTitle>Mudar senha</DialogTitle>
            <DialogDescription className="break-words">
              Nova senha para {pwTarget?.name || pwTarget?.email}. Repasse a senha para a pessoa.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 space-y-1">
            <Label>Nova senha (mín. 8 caracteres)</Label>
            <Input type="text" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div className="shrink-0 border-t border-border px-5 py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPwTarget(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={changePw} disabled={busy || newPw.length < 8}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de <strong>{confirmDelete?.name || confirmDelete?.email}</strong> e todos os dados dela serão apagados. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
