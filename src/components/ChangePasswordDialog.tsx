import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError('');
      setShowCurrent(false);
      setShowNext(false);
      setShowConfirm(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    if (next.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (next !== confirm) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    if (current === next) {
      setError('A nova senha deve ser diferente da atual.');
      return;
    }
    setLoading(true);
    try {
      // O servidor não valida a senha atual, então conferimos aqui: se a
      // senha atual não abre a sessão, não deixamos trocar.
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (!email) {
        setError('Sessão expirada. Entre novamente para alterar a senha.');
        return;
      }
      const { error: checkErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (checkErr) {
        setError('A senha atual está incorreta.');
        return;
      }
      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) throw updErr;
      toast.success('Senha alterada com sucesso.');
      onOpenChange(false);
    } catch (e: any) {
      const msg: string = e?.message || '';
      if (/same as the old|identical/i.test(msg)) {
        setError('A nova senha deve ser diferente da atual.');
      } else if (/at least|6 char|mínimo/i.test(msg)) {
        setError('A nova senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(msg || 'Não foi possível alterar a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="min-w-0 max-w-md flex flex-col overflow-hidden p-0 max-h-[90vh]"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Alterar senha
          </DialogTitle>
          <DialogDescription>
            Digite sua senha atual e escolha uma nova.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm">Senha atual</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNext ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showNext ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                tabIndex={-1}
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="min-w-0">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !current || !next || !confirm}
            className="min-w-0"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar nova senha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
