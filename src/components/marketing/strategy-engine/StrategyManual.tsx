import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AGENT_INFO, AGENT_ORDER } from './types';
import {
  BookOpen, Rocket, MessageSquare, FileText, Clock, LayoutDashboard,
  Settings, FolderKanban, ChevronRight, CheckCircle2, Lightbulb,
  AlertTriangle, Zap, Download, GitCompare, Shield, ArrowRight
} from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function StepCard({ number, title, description, tips }: {
  number: number;
  title: string;
  description: string;
  tips?: string[];
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
        {number}
      </div>
      <div className="space-y-1 min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        {tips && tips.length > 0 && (
          <div className="mt-2 space-y-1">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-primary/80">
                <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBox({ type, children }: { type: 'tip' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    tip: { bg: 'bg-primary/10 border-primary/30', icon: <Lightbulb className="h-4 w-4 text-primary" />, label: 'Dica' },
    warning: { bg: 'bg-destructive/10 border-destructive/30', icon: <AlertTriangle className="h-4 w-4 text-destructive" />, label: 'Atenção' },
    info: { bg: 'bg-accent border-accent', icon: <Zap className="h-4 w-4 text-accent-foreground" />, label: 'Info' },
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${s.bg}`}>
      {s.icon}
      <div className="text-xs leading-relaxed">{children}</div>
    </div>
  );
}

export function StrategyManual() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections: ManualSection[] = [
    {
      id: 'overview',
      title: 'Visão Geral',
      icon: <BookOpen className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            O <strong>Motor de Estratégia com IA</strong> é um sistema que transforma a descrição do seu negócio em uma estratégia completa de marketing digital, utilizando uma arquitetura de agentes inteligentes especializados.
          </p>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-sm font-semibold">O que o sistema produz:</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Pesquisa de voz do cliente (dores, desejos, objeções)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Análise competitiva do mercado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Posicionamento estratégico diferenciado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Arquitetura completa de funil de vendas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Roteiro de vídeo de vendas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Estrutura de landing page otimizada</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Criativos e copies para anúncios</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Sequências de e-mail marketing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> Scripts de Reels e vídeos curtos</li>
              </ul>
            </CardContent>
          </Card>

          <InfoBox type="info">
            Cada etapa é executada por um agente especializado, garantindo qualidade e consistência. Os agentes compartilham informações através de uma memória estratégica comum.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'create-project',
      title: 'Criar Projeto',
      icon: <FolderKanban className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            Tudo começa com a criação de um projeto estratégico. Cada projeto representa um negócio ou produto que você quer desenvolver uma estratégia de marketing.
          </p>

          <StepCard
            number={1}
            title="Acesse a aba Projetos"
            description="Na tela principal do Motor de Estratégia, clique no botão 'Projetos' para ver a lista de projetos existentes."
          />
          <StepCard
            number={2}
            title="Clique em 'Novo Projeto'"
            description="Clique no botão para criar um novo projeto. Preencha o nome do projeto e a descrição detalhada do negócio."
            tips={[
              "Quanto mais detalhada a descrição, melhores os resultados dos agentes",
              "Inclua: público-alvo, produto/serviço, diferencial, ticket médio e modelo de negócio"
            ]}
          />
          <StepCard
            number={3}
            title="Salve o projeto"
            description="Após preencher as informações, salve o projeto. Ele aparecerá na lista e estará pronto para receber as execuções dos agentes."
          />

          <InfoBox type="tip">
            <strong>Exemplo de boa descrição:</strong> "Curso online de inglês para executivos C-level que precisam negociar em inglês em reuniões internacionais. Ticket médio R$2.997. Diferencial: metodologia baseada em situações reais de boardroom."
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'agents',
      title: 'Os Agentes',
      icon: <Zap className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            O sistema utiliza <strong>9 agentes especializados</strong> que trabalham em sequência. Cada agente usa os resultados dos anteriores para criar sua parte da estratégia.
          </p>

          <div className="space-y-2">
            {AGENT_ORDER.map((key, index) => {
              const info = AGENT_INFO[key];
              if (!info) return null;
              return (
                <div key={key} className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-lg">{info.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold">{info.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{info.description}</p>
                  </div>
                  {index < AGENT_ORDER.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          <InfoBox type="warning">
            Os agentes possuem dependências entre si. O Vox (voz do cliente) deve ser executado antes do Positioning (posicionamento), que por sua vez alimenta o Funnel (funil). Respeite a sequência para melhores resultados.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'execution',
      title: 'Executar Agentes',
      icon: <Rocket className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            Após criar o projeto, você pode executar os agentes de duas formas:
          </p>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Execução Automática (Pipeline)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">Executa todos os agentes em sequência, do Vox ao Reel Writer.</p>
              <StepCard
                number={1}
                title="Abra o projeto"
                description="Clique em um projeto existente para abrir os detalhes."
              />
              <div className="mt-2">
                <StepCard
                  number={2}
                  title="Clique em 'Executar Pipeline'"
                  description="O botão com ícone de foguete inicia toda a sequência automaticamente. Acompanhe o progresso pela Timeline."
                  tips={["Ideal para quando você quer gerar a estratégia completa de uma vez"]}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Execução Manual (Agente a Agente)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">Execute agentes individualmente quando quiser controle total.</p>
              <StepCard
                number={1}
                title="Use o Chat Estratégico"
                description="Na aba 'Chat', converse com o Orchestrator. Peça para executar um agente específico."
              />
              <div className="mt-2">
                <StepCard
                  number={2}
                  title="Execute agentes específicos"
                  description="Na aba 'Timeline', clique no botão de play ao lado do agente desejado para executá-lo individualmente."
                  tips={["Útil para re-executar um agente específico após ajustes na descrição do negócio"]}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            O Dashboard é a visão geral do seu projeto estratégico. Ele mostra o progresso e os principais dados de cada etapa.
          </p>

          <StepCard
            number={1}
            title="Acesse o Dashboard"
            description="Ao abrir um projeto, a aba 'Dashboard' é exibida por padrão. Ela mostra cards com o status de cada agente."
          />
          <StepCard
            number={2}
            title="Monitore o progresso"
            description="Cada card mostra se o agente foi executado com sucesso, está pendente ou falhou. A barra de progresso geral indica quantos agentes já concluíram."
          />
          <StepCard
            number={3}
            title="Acesse dados rapidamente"
            description="Clique nos cards dos agentes concluídos para visualizar um resumo dos resultados produzidos."
          />

          <InfoBox type="tip">
            O Dashboard é ideal para apresentar o andamento do projeto para stakeholders — oferece uma visão executiva sem necessidade de entrar em cada artefato.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'chat',
      title: 'Chat Estratégico',
      icon: <MessageSquare className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            O Chat Estratégico é sua interface principal de interação com o sistema. Através dele, o agente Orchestrator coordena todos os outros agentes.
          </p>

          <StepCard
            number={1}
            title="Abra a aba Chat"
            description="Dentro de um projeto, clique na aba 'Chat' para iniciar a conversa com o Orchestrator."
          />
          <StepCard
            number={2}
            title="Faça perguntas ou dê comandos"
            description="Você pode pedir para executar agentes, tirar dúvidas sobre os artefatos gerados, pedir revisões ou solicitar análises específicas."
            tips={[
              'Exemplo: "Execute o agente Vox para analisar meu público"',
              'Exemplo: "Quais são as principais dores identificadas?"',
              'Exemplo: "Revise o posicionamento considerando que meu diferencial é X"',
            ]}
          />
          <StepCard
            number={3}
            title="Acompanhe as respostas"
            description="O Orchestrator responde com insights, sugere próximos passos e indica quais agentes executar com base no estado atual do projeto."
          />

          <InfoBox type="info">
            O Orchestrator tem acesso à memória estratégica do projeto — ele sabe quais agentes já foram executados e pode contextualizar todas as respostas.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'artifacts',
      title: 'Artefatos',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            Cada agente gera um <strong>artefato</strong> — um documento estruturado com os resultados da análise ou produção. Os artefatos formam a estratégia completa.
          </p>

          <StepCard
            number={1}
            title="Acesse a aba Artefatos"
            description="Na aba 'Artefatos', veja todos os documentos gerados pelos agentes, organizados por tipo."
          />
          <StepCard
            number={2}
            title="Visualize o conteúdo"
            description="Clique em um artefato para ver o conteúdo completo. O sistema renderiza automaticamente os dados em um formato legível."
          />
          <StepCard
            number={3}
            title="Aprove, rejeite ou peça revisão"
            description="Cada artefato pode ser aprovado (✓), rejeitado (✗) ou enviado para revisão. Revisões re-executam o agente com ajustes."
            tips={[
              "Use a revisão quando o resultado estiver bom mas precisar de ajustes finos",
              "A rejeição permite re-executar do zero com novos parâmetros"
            ]}
          />
          <StepCard
            number={4}
            title="Compare versões"
            description="O histórico de versões permite comparar diferentes execuções do mesmo agente, com diff visual entre versões."
          />

          <InfoBox type="tip">
            Use o recurso de <strong>Comparação A/B</strong> para gerar variações alternativas de um artefato e escolher a melhor versão.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'timeline',
      title: 'Timeline',
      icon: <Clock className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            A Timeline mostra a sequência de execuções dos agentes em ordem cronológica, permitindo acompanhar todo o histórico do projeto.
          </p>

          <StepCard
            number={1}
            title="Veja o histórico completo"
            description="Cada execução aparece com data/hora, agente responsável, status (sucesso/falha) e duração."
          />
          <StepCard
            number={2}
            title="Execute agentes diretamente"
            description="Na timeline, agentes pendentes mostram um botão de play para execução individual."
          />
          <StepCard
            number={3}
            title="Identifique falhas"
            description="Agentes que falharam aparecem destacados com a mensagem de erro. Você pode re-executá-los após corrigir o problema."
          />
        </div>
      ),
    },
    {
      id: 'export',
      title: 'Exportação',
      icon: <Download className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            O sistema permite exportar toda a estratégia gerada em diferentes formatos para uso externo.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <div className="text-2xl mb-1">📄</div>
              <h4 className="text-xs font-semibold">PDF</h4>
              <p className="text-[10px] text-muted-foreground">Ideal para apresentações e compartilhamento</p>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl mb-1">📝</div>
              <h4 className="text-xs font-semibold">Markdown</h4>
              <p className="text-[10px] text-muted-foreground">Para documentação e wikis</p>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl mb-1">📊</div>
              <h4 className="text-xs font-semibold">JSON</h4>
              <p className="text-[10px] text-muted-foreground">Para integrações e automações</p>
            </Card>
          </div>

          <StepCard
            number={1}
            title="Abra o menu de exportação"
            description="No cabeçalho do projeto, clique no botão de download (seta para baixo) para ver as opções."
          />
          <StepCard
            number={2}
            title="Escolha o formato"
            description="Selecione PDF, Markdown ou JSON. O download começa automaticamente."
          />

          <InfoBox type="warning">
            A exportação inclui apenas artefatos que já foram gerados. Execute todos os agentes antes de exportar para obter a estratégia completa.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'admin',
      title: 'Administração',
      icon: <Shield className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            O painel de administração permite personalizar o comportamento de cada agente através da <strong>Agent Card Architecture</strong>.
          </p>

          <StepCard
            number={1}
            title="Acesse a aba Admin"
            description="Na tela principal, clique no botão 'Admin' para abrir o painel de configuração dos Agent Cards."
          />
          <StepCard
            number={2}
            title="Selecione um agente"
            description="Expanda o card de um agente para ver e editar todos os seus campos."
          />
          <StepCard
            number={3}
            title="Edite os campos disponíveis"
            description="Cada agente possui 5 abas de configuração:"
            tips={[
              "Identidade: ID, nome, versão, papel e missão do agente",
              "Contratos: Capabilities, non-capabilities, inputs, dependências e output schema",
              "Raciocínio: Protocolo de raciocínio passo a passo e tratamento de erros",
              "Qualidade: Padrões de qualidade e anti-patterns proibidos",
              "Prompt: Preview do system prompt gerado automaticamente"
            ]}
          />
          <StepCard
            number={4}
            title="Salve as alterações"
            description="Clique em 'Salvar Agent Card' para persistir as configurações. O prompt é regenerado automaticamente."
          />

          <InfoBox type="tip">
            Use o botão <strong>"Resetar ao Padrão"</strong> para voltar às configurações originais de um agente caso as alterações não fiquem boas.
          </InfoBox>

          <InfoBox type="info">
            A aba <strong>Prompt</strong> mostra um indicador pulsante (●) quando há alterações não salvas, indicando que o prompt está atualizado mas ainda não foi persistido.
          </InfoBox>
        </div>
      ),
    },
    {
      id: 'templates',
      title: 'Templates de Nicho',
      icon: <GitCompare className="h-4 w-4" />,
      content: (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            O sistema oferece templates pré-configurados para nichos comuns, acelerando a criação de projetos.
          </p>

          <StepCard
            number={1}
            title="Acesse os templates"
            description="Ao criar um novo projeto, procure a opção de templates de nicho disponíveis."
          />
          <StepCard
            number={2}
            title="Escolha um template"
            description="Selecione o nicho mais próximo do seu negócio. O template preenche automaticamente a descrição com dados otimizados."
          />
          <StepCard
            number={3}
            title="Personalize"
            description="Ajuste a descrição pré-preenchida com os detalhes específicos do seu negócio antes de executar os agentes."
          />

          <InfoBox type="tip">
            Você também pode <strong>clonar projetos existentes</strong> para usar como base. Isso copia toda a configuração e permite ajustes sem afetar o original.
          </InfoBox>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Manual do Motor de Estratégia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Guia completo para utilizar o Motor de Estratégia com IA — da criação de projetos à exportação da estratégia final.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-3">
        {/* Sidebar */}
        <div className="col-span-3">
          <Card className="sticky top-0">
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {section.icon}
                    <span className="truncate">{section.title}</span>
                    {activeSection === section.id && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="col-span-9">
          <Card>
            <ScrollArea className="h-[560px]">
              <CardContent className="p-5">
                {sections.find(s => s.id === activeSection)?.content}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
