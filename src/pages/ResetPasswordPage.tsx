import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Quando o usuário chega via link de recuperação, o Supabase
    // dispara um evento PASSWORD_RECOVERY com a sessão temporária.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    // Caso já tenha sessão (link já trocado), libera direto.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast.error('Erro ao atualizar senha', { description: error.message });
      return;
    }
    toast.success('Senha atualizada com sucesso!');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/pwa-512x512.png"
            alt="Pilar Academia"
            className="h-20 w-20 mx-auto mb-4 rounded-3xl shadow-lg"
          />
          <h1 className="text-2xl font-extrabold text-foreground">Nova senha</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Defina uma nova senha para acessar sua conta.
          </p>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-card">
          {!ready ? (
            <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Validando link de recuperação…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar senha</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar nova senha'}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
