import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="page-title text-xl">Política de Privacidade</h1>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 py-6 prose prose-sm prose-neutral dark:prose-invert">
        <p className="text-sm text-muted-foreground">Última atualização: 02/05/2026 — em conformidade com a LGPD (Lei 13.709/2018).</p>

        <h2>1. Quem somos</h2>
        <p>Pilar Academia é o controlador dos dados pessoais coletados no app. Contato do encarregado (DPO): contato@pilarapp.com.br</p>

        <h2>2. Dados coletados</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, data de nascimento, sexo.</li>
          <li><strong>Saúde:</strong> peso, altura, fotos de progresso, exames de sangue, glicemia, pressão arterial, bioimpedância.</li>
          <li><strong>Atividade:</strong> alimentos, treinos, água, lembretes.</li>
          <li><strong>Técnicos:</strong> identificadores de dispositivo e logs mínimos para segurança.</li>
        </ul>

        <h2>3. Base legal</h2>
        <p>Tratamos seus dados com base no <em>consentimento</em> (ao cadastrar) e na <em>execução de contrato</em> (prestar o serviço). Dados de saúde são tratados apenas mediante consentimento específico.</p>

        <h2>4. Como usamos</h2>
        <ul>
          <li>Calcular metas, gerar cardápios e treinos personalizados via IA.</li>
          <li>Exibir histórico, projeções e correlações com exames.</li>
          <li>Manter o serviço funcionando, seguro e em conformidade legal.</li>
        </ul>

        <h2>5. Compartilhamento</h2>
        <p>Compartilhamos dados apenas com provedores essenciais para operar o app (infraestrutura de banco, autenticação e IA). Não vendemos dados. Podemos divulgar se exigido por lei.</p>

        <h2>6. Provedores de IA</h2>
        <p>Imagens de pratos, exames e textos enviados para análise são processados por modelos de IA (Google Gemini / OpenAI via gateway). Não são usados para treinamento de modelos.</p>

        <h2>7. Seus direitos (LGPD Art. 18)</h2>
        <ul>
          <li>Confirmação e acesso aos dados (exportar em <em>Perfil → Exportar dados</em>).</li>
          <li>Correção de dados incompletos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Portabilidade.</li>
          <li><strong>Eliminação dos dados</strong> (em <em>Perfil → Excluir conta</em>).</li>
          <li>Revogação do consentimento.</li>
        </ul>

        <h2>8. Retenção</h2>
        <p>Mantemos seus dados enquanto a conta estiver ativa. Ao excluir a conta, todos os dados pessoais são apagados em até 30 dias, exceto registros que precisem ser mantidos por obrigação legal.</p>

        <h2>9. Segurança</h2>
        <p>Usamos criptografia em trânsito (HTTPS), controle de acesso por linha (RLS) e armazenamento isolado por usuário.</p>

        <h2>10. Crianças</h2>
        <p>O app não é destinado a menores de 16 anos sem supervisão de responsável.</p>

        <h2>11. Alterações</h2>
        <p>Mudanças relevantes serão comunicadas no app antes de entrar em vigor.</p>

        <h2>12. Contato</h2>
        <p>Para exercer seus direitos: contato@pilarapp.com.br</p>
      </article>
    </div>
  );
}
