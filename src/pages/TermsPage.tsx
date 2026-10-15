import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="page-title text-xl">Termos de Uso</h1>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 py-6 prose prose-sm prose-neutral dark:prose-invert">
        <p className="text-sm text-muted-foreground">Última atualização: 02/05/2026</p>

        <h2>1. Aceitação</h2>
        <p>Ao usar o Pilar Saúde, você concorda com estes Termos. Se não concordar, não utilize o aplicativo.</p>

        <h2>2. Natureza do serviço</h2>
        <p>O Pilar é uma ferramenta de acompanhamento nutricional e de atividade física com auxílio de IA. <strong>Não substitui orientação médica, nutricional ou de educação física.</strong> Sempre consulte profissionais qualificados antes de adotar dietas, treinos ou interpretar exames.</p>

        <h2>3. Cadastro e responsabilidades</h2>
        <ul>
          <li>Você é responsável pelos dados informados e pela guarda das credenciais.</li>
          <li>Deve ter ao menos 16 anos. Menores devem usar com supervisão de responsável.</li>
        </ul>

        <h2>4. Conteúdo gerado por IA</h2>
        <p>Cardápios, sugestões de treino e leituras de exames são gerados por modelos de IA e podem conter imprecisões. Use como apoio, não como prescrição.</p>

        <h2>5. Propriedade intelectual</h2>
        <p>O conteúdo do app pertence ao Pilar Saúde. Seus dados pessoais, fotos e registros pertencem a você.</p>

        <h2>6. Encerramento</h2>
        <p>Você pode excluir sua conta a qualquer momento em <em>Perfil → Excluir conta</em>. Podemos suspender contas em caso de uso indevido.</p>

        <h2>7. Limitação de responsabilidade</h2>
        <p>O Pilar não se responsabiliza por decisões tomadas exclusivamente com base nas informações do app, nem por consequências de saúde decorrentes de seu uso.</p>

        <h2>8. Alterações</h2>
        <p>Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas no app.</p>

        <h2>9. Contato</h2>
        <p>Dúvidas: contato@pilarapp.com.br</p>
      </article>
    </div>
  );
}
