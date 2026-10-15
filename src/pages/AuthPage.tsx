import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (m.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (m.includes('user already registered') || m.includes('already registered')) {
    return 'Este e-mail já está cadastrado. Faça login.';
  }
  if (m.includes('password') && m.includes('6')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
  }
  return message;
}

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
        toast.success('Conta criada!', {
          description: 'Verifique seu e-mail para confirmar o cadastro.',
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(isLogin ? 'Não foi possível entrar' : 'Não foi possível criar a conta', {
        description: translateAuthError(msg),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error('Erro ao enviar e-mail', { description: translateAuthError(error.message) });
      return;
    }
    toast.success('E-mail enviado!', {
      description: 'Verifique sua caixa de entrada para redefinir a senha.',
    });
    setForgotOpen(false);
    setForgotEmail('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <img 
            src="/pwa-512x512.png" 
            alt="Pilar Saúde Logo" 
            className="h-24 w-24 mx-auto mb-4 rounded-3xl shadow-lg"
          />
          <h1 className="text-3xl font-extrabold text-foreground">Pilar Saúde</h1>
          <p className="text-muted-foreground mt-2">
            Treinos e Nutrição Inteligente
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl bg-card p-6 shadow-card animate-scale-in">
          {/* Toggle */}
          <div className="flex rounded-2xl bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                isLogin 
                  ? 'bg-card shadow-soft text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                !isLogin 
                  ? 'bg-card shadow-soft text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required={!isLogin}
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
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

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 mt-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                'Entrar'
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          {forgotOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setForgotOpen(false)}>
              <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-card" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-1">Recuperar senha</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Digite seu e-mail e enviaremos um link para redefinir a senha.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="h-12 rounded-xl"
                  />
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-11 rounded-xl"
                      onClick={() => setForgotOpen(false)}
                      disabled={forgotLoading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 rounded-xl"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center mt-6">
            Ao continuar, você concorda com os{' '}
            <a href="/termos" className="underline hover:text-foreground">Termos de Uso</a>
            {' '}e a{' '}
            <a href="/privacidade" className="underline hover:text-foreground">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
