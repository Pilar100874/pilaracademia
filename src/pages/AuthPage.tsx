import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Sparkles } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password, name);
    } catch (_) {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
      {/* Left: brand hero (Ensegna-style yellow block) */}
      <div className="hero-yellow relative hidden lg:flex flex-col justify-between p-10 xl:p-16 overflow-hidden">
        {/* floating blobs */}
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-blob" style={{ animationDelay: '3s' }} />

        <div className="relative animate-slide-down">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Pilar Studio
          </div>
        </div>

        <div className="relative space-y-8 animate-fade-in">
          <h1 className="display-xl text-primary">
            Movemos<br />pessoas.<br />
            <span className="italic text-primary/80">Com método.</span>
          </h1>
          <p className="text-lg text-primary/85 max-w-md font-medium">
            Plataforma completa para clínicas de Pilates: agenda, alunos,
            sequências, aulas ao vivo e acompanhamento de evolução.
          </p>
          <div className="flex items-center gap-4 stagger">
            {['Agenda', 'Sequências', 'Live', 'Evolução'].map((t) => (
              <span
                key={t}
                className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-navy"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative text-primary/70 text-xs font-medium">
          © {new Date().getFullYear()} Pilar — Design + Tecnologia
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="text-center lg:hidden animate-slide-up">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-brand shadow-brand mb-4">
              <Sparkles className="h-9 w-9 text-brand-foreground" />
            </div>
            <h1 className="display-lg text-foreground">Pilar Studio</h1>
            <p className="text-muted-foreground mt-2 font-medium">Bem-vindo de volta</p>
          </div>

          <div className="hidden lg:block animate-slide-down">
            <h2 className="display-lg">{isLogin ? 'Entre na sua conta' : 'Crie sua conta'}</h2>
            <p className="text-muted-foreground mt-2 font-medium">
              {isLogin
                ? 'Acesse sua clínica, alunos e sequências.'
                : 'Comece em poucos minutos. Sem cartão de crédito.'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex rounded-full bg-muted p-1 animate-fade-in">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${
                isLogin ? 'bg-primary text-primary-foreground shadow-navy' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${
                !isLogin ? 'bg-primary text-primary-foreground shadow-navy' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 stagger">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome</label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required={!isLogin} className="h-12" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="h-12" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Senha</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="h-12" />
            </div>

            <Button type="submit" size="lg" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? 'Entrar →' : 'Criar conta →'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
