import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Eye, Loader2 } from 'lucide-react';
import { endImpersonation, getImpersonationContext, type ImpersonationContext } from '@/lib/impersonation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function ImpersonationBanner() {
  const [ctx, setCtx] = useState<ImpersonationContext | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setCtx(getImpersonationContext());
    // re-check when storage changes (e.g. tab interactions)
    const onStorage = () => setCtx(getImpersonationContext());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user?.id]);

  if (!ctx || !user) return null;

  const handleExit = async () => {
    setBusy(true);
    try {
      await endImpersonation();
      toast.info('Sessão encerrada. Faça login com sua conta original.');
      navigate('/auth', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao sair');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 border-b border-amber-700 shadow">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-3 text-sm flex-wrap">
        <Eye className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0 truncate">
          <strong>Modo impersonação:</strong> {ctx.label}
          {ctx.originatorEmail && <span className="opacity-80"> · voltar para {ctx.originatorEmail}</span>}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExit}
          disabled={busy}
          className="bg-amber-950 text-amber-50 hover:bg-amber-900 border-amber-950"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1.5" />}
          Sair e voltar
        </Button>
      </div>
    </div>
  );
}
