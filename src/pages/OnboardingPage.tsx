import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Building2, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Tela de onboarding pós-login: o usuário escolhe se vai criar uma clínica
 * (vira admin) ou se é um aluno aguardando vínculo.
 * Se já tem papel definido, redireciona automaticamente.
 */
export default function OnboardingPage() {
  const { user } = useAuth();
  const { isLoading, roles, isStaff, isStudent } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (isStaff) navigate('/clinica', { replace: true });
    else if (isStudent) navigate('/meu-pilates', { replace: true });
  }, [isLoading, isStaff, isStudent, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (roles.length > 0) return null;

  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-background">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Bem-vindo{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ''}!</h1>
          <p className="text-muted-foreground mt-2">Como você vai usar o Pilar Pilates?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6 cursor-pointer hover:shadow-lg transition group" onClick={() => navigate('/clinica/criar')}>
            <Building2 className="h-10 w-10 text-primary mb-3" />
            <h2 className="font-bold text-lg">Sou da clínica</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua clínica, cadastre alunos, monte sequências de exercícios e acompanhe a evolução.
            </p>
            <Button className="w-full">
              Criar minha clínica <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>

          <Card className="p-6 cursor-pointer hover:shadow-lg transition group" onClick={() => navigate('/')}>
            <GraduationCap className="h-10 w-10 text-emerald-500 mb-3" />
            <h2 className="font-bold text-lg">Sou aluno</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use o app pessoal de calorias e saúde. Quando sua clínica te cadastrar com este e-mail, suas aulas aparecerão aqui automaticamente.
            </p>
            <Button variant="outline" className="w-full">
              Ir para meu app <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Você pode mudar essa escolha depois.
        </p>
      </div>
    </div>
  );
}
