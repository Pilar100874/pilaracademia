import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SECTION = "text-sm text-muted-foreground leading-relaxed";

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
        <p className="text-sm text-muted-foreground">Última atualização: 15/10/2026 — em conformidade com a LGPD (Lei 13.709/2018).</p>

        <h2>1. Quem somos</h2>
        <p>Pilar Saúde é o controlador dos dados pessoais coletados no app. Contato do encarregado (DPO): <a href="mailto:contato@pilarapp.com.br">contato@pilarapp.com.br</a></p>

        <h2>2. Dados coletados</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, data de nascimento, sexo e senha (armazenada de forma criptografada; nunca temos acesso ao seu texto).</li>
          <li><strong>Saúde:</strong> peso, altura, fotos de progresso, exames de sangue, glicemia, pressão arterial, bioimpedância e composição corporal.</li>
          <li><strong>Atividade:</strong> alimentos registrados, água, treinos, exercícios e vídeos de exercícios.</li>
          <li><strong>Dados do relógio (opcional):</strong> se você conectar o Galaxy Watch/smartwatch no app de celular, lemos passos, calorias ativas, batimentos, sono e peso a partir do Health Connect (Android) ou HealthKit (iOS), apenas com a sua autorização e somente dentro do app instalado no seu celular.</li>
          <li><strong>Técnicos:</strong> identificadores de dispositivo e logs mínimos para segurança e funcionamento do serviço.</li>
        </ul>

        <h2>3. Base legal</h2>
        <p>Tratamos seus dados com base no <em>consentimento</em> (ao cadastrar) e na <em>execução de contrato</em> (prestar o serviço). Dados sensíveis de saúde e fitness são tratados apenas mediante o seu consentimento específico e podem ser revogados a qualquer momento.</p>

        <h2>4. Como usamos</h2>
        <ul>
          <li>Calcular metas, gerar cardápios e treinos personalizados por IA.</li>
          <li>Exibir histórico, projeções de peso, evolução e correlações com exames.</li>
          <li>Sugerir exercícios e séries considerando seu perfil, exames e bioimpedância (quando você autoriza).</li>
          <li>Manter o serviço funcionando, seguro e em conformidade legal.</li>
        </ul>

        <h2>5. Acesso pelo seu professor/gestor (opcional)</h2>
        <p>Se você é aluno de um gestor (professor ou academia) vinculado à sua conta, essa pessoa pode visualizar seus dados de evolução (peso, alimentação, treinos, saúde) e criar treinos para você, dentro do próprio app. Esse acesso existe apenas quando a conta foi criada ou vinculada pelo gestor, e o gestor responde pela guarda desses dados. Você pode solicitar o desvínculo pelo contato da seção 12.</p>

        <h2>6. Compartilhamento</h2>
        <p>Compartilhamos dados apenas com provedores essenciais para operar o app (infraestrutura de banco de dados, autenticação e inteligência artificial). Não vendemos seus dados e não os usamos para publicidade. Podemos divulgar informações se exigido por lei ou ordem judicial.</p>

        <h2>7. Provedores de IA</h2>
        <p>Imagens de pratos, exames, bioimpedância e textos enviados para análise são processados por modelos de IA (por exemplo, Google Gemini) por meio do gateway do Lovable. Esse conteúdo não é usado para treinamento de modelos e os resultados ficam armazenados apenas na sua conta.</p>

        <h2>8. Câmera e mídia</h2>
        <p>O acesso à câmera é usado apenas quando você escolhe tirar fotos (alimentos, exercícios, exames). As imagens são reduzidas antes do envio e ficam salvas somente na sua conta. O reconhecimento de código de barras acontece no seu dispositivo; enviamos ao modelo apenas a foto que você confirma.</p>

        <h2>9. Seus direitos (LGPD Art. 18)</h2>
        <ul>
          <li>Confirmação e acesso aos dados — exporte tudo em <em>Perfil → Exportar dados</em> (JSON e PDF).</li>
          <li>Correção de dados incompletos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Portabilidade.</li>
          <li><strong>Eliminação dos dados</strong> — em <em>Perfil → Excluir conta</em>.</li>
          <li>Revogação do consentimento e oposição ao tratamento.</li>
        </ul>

        <h2>10. Retenção</h2>
        <p>Mantemos seus dados enquanto a conta estiver ativa. Ao excluir a conta, todos os dados pessoais são apagados em até 30 dias, exceto registros que precisem ser mantidos por obrigação legal.</p>

        <h2>11. Segurança</h2>
        <p>Usamos criptografia em trânsito (HTTPS), controle de acesso por linha no banco (cada usuário só acessa os próprios dados) e armazenamento isolado por usuário. Registros de acessos administrativos ficam registrados para auditoria.</p>

        <h2>12. Crianças e adolescentes</h2>
        <p>O app não é destinado a menores de 16 anos sem supervisão e autorização de responsável.</p>

        <h2>13. Alterações</h2>
        <p>Mudanças relevantes nesta política serão comunicadas no app antes de entrarem em vigor. O uso do app após a mudança significa que você concorda com a versão atualizada.</p>

        <h2>14. Contato</h2>
        <p>Para exercer seus direitos, tirar dúvidas ou solicitar o desvínculo de um gestor: <a href="mailto:contato@pilarapp.com.br">contato@pilarapp.com.br</a></p>
      </article>
    </div>
  );
}
