import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, X, BookOpen, ChevronRight, Compass } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HelpSection = {
  title: string;
  intro: string;
  steps: { label: string; desc: string }[];
  tips?: string[];
};

const HELP_BY_ROUTE: Record<string, HelpSection> = {
  '/': {
    title: 'Hoje (Dashboard)',
    intro: 'Tela principal do dia. Tudo que você registra fica vinculado à data selecionada no topo — não à data do sistema.',
    steps: [
      { label: 'Selecione o dia', desc: 'Use o seletor no topo para navegar entre datas. Os registros são salvos no dia ativo, mesmo se você abrir o app em outro horário.' },
      { label: 'Adicione refeições', desc: 'Toque no botão flutuante (+) para registrar comida por foto, código de barras, busca de produtos, kit ou texto livre.' },
      { label: 'Registre líquidos', desc: 'Use o atalho de líquidos para água, café, sucos e bebidas alcoólicas — a hidratação aparece no card lateral.' },
      { label: 'Acompanhe metas', desc: 'Cards exibem calorias, proteína, carboidrato, gordura e hidratação em tempo real, com anel de progresso.' },
      { label: 'Atalhos rápidos', desc: 'Toque nos cards de métrica para abrir o registro correspondente (peso, glicemia, fotos de progresso, etc.).' },
      { label: 'Repetir ontem', desc: 'Atalho para copiar todos os alimentos do dia anterior — útil para rotinas estáveis.' },
    ],
    tips: [
      'Os totais do dia mudam conforme você troca a data no topo.',
      'Cardápio diário com IA leva em conta seu exame de sangue e preferências.',
    ],
  },
  '/history': {
    title: 'Histórico',
    intro: 'Veja tudo que foi registrado em dias anteriores, separado por categorias.',
    steps: [
      { label: 'Refeições e Líquidos', desc: 'As abas separam alimentos sólidos das bebidas para leitura mais fácil.' },
      { label: 'Aderência', desc: 'Gráfico mostra os dias em que você bateu suas metas calóricas e de macros.' },
      { label: 'Editar ou excluir', desc: 'Toque em qualquer item para ajustar valores, porção ou removê-lo.' },
      { label: 'Filtrar por período', desc: 'Use os filtros de data para ver apenas o intervalo que interessa.' },
    ],
  },
  '/projections': {
    title: 'Projeções',
    intro: 'Estimativas da evolução do seu peso baseadas em duas fontes de dados.',
    steps: [
      { label: 'Por Peso Registrado', desc: 'Tendência calculada com base nas últimas pesagens reais que você anotou.' },
      { label: 'Por Calorias', desc: 'Projeção a partir do saldo calórico (consumido vs. gasto) dos últimos dias.' },
      { label: 'Defina metas', desc: 'Toque em uma meta de peso/data para ver o ritmo necessário para atingi-la.' },
    ],
    tips: ['Quanto mais consistente o registro, mais precisa é a projeção.'],
  },
  '/health': {
    title: 'Saúde',
    intro: 'Indicadores do corpo, bioimpedância e exames de sangue em uma tela só, com abas.',
    steps: [
      { label: 'Visão geral', desc: 'IMC, peso ideal, gasto em repouso e zonas de frequência cardíaca a partir de peso, altura, idade e sexo do perfil.' },
      { label: 'Bioimpedância', desc: 'Envie a foto do laudo — a IA extrai % gordura, massa muscular, água e mais, explicados sem jargão, com comparação entre medições.' },
      { label: 'Exames de sangue', desc: 'Faça upload do PDF/foto. A IA extrai marcadores, mostra tendências e ajusta cardápio e treinos sugeridos com base no resultado.' },
      { label: 'Glicemia', desc: 'Registre medições — o tipo (jejum, pós-refeição) é categorizado automaticamente. Há também predição do impacto glicêmico antes de comer.' },
    ],
    tips: ['As análises de exame são educativas — sempre valide com seu médico.'],
  },
  '/products': {
    title: 'Produtos',
    intro: 'Sua biblioteca pessoal de alimentos, kits e produtos para reuso rápido.',
    steps: [
      { label: 'Crie produtos', desc: 'Cadastre alimentos que você consome com frequência, com macros pré-definidos por porção.' },
      { label: 'Kits', desc: 'Agrupe vários itens em um "kit" (ex.: marmita padrão) e registre tudo de uma vez.' },
      { label: 'Consuma rápido', desc: 'Toque em "Consumir" para adicionar ao dia ativo sem digitar novamente.' },
      { label: 'Edite valores', desc: 'Atualize nutrientes, porção e foto a qualquer momento.' },
    ],
  },
  '/menu': {
    title: 'Cardápio Semanal',
    intro: 'Cardápio gerado por IA com refeições da semana e lista de compras automática, considerando suas preferências e exames.',
    steps: [
      { label: 'Gerar cardápio', desc: 'A IA monta 7 dias de refeições respeitando suas metas calóricas, restrições alimentares e exames de sangue recentes.' },
      { label: 'Ver receitas', desc: 'Toque em uma refeição para ver ingredientes, modo de preparo e macros.' },
      { label: 'Lista de compras', desc: 'A aba de compras agrupa todos os ingredientes da semana — marque o que já tem em casa.' },
      { label: 'Regenerar', desc: 'Não gostou? Gere um novo cardápio quantas vezes quiser.' },
    ],
    tips: ['Atualize suas preferências alimentares em Perfil para resultados mais precisos.'],
  },
  '/workouts': {
    title: 'Treinos',
    intro: 'Monte, agende e execute treinos personalizados.',
    steps: [
      { label: 'Criar treino', desc: 'Combine exercícios da biblioteca em uma sessão com séries, repetições e descanso. Inclui opção de alongamento final por treino.' },
      { label: 'Gerar com IA', desc: 'IA cria treinos a partir do seu objetivo e equipamentos disponíveis — também considera seu exame de sangue.' },
      { label: 'Play do treino', desc: 'Inicie a execução para ver demonstrações, cronômetro de descanso e análise técnica de vídeo.' },
      { label: 'Modo de hoje', desc: 'No início do treino escolha Normal, Cansado ou Muito cansado — séries e cargas se ajustam automaticamente.' },
      { label: 'Comandos por voz', desc: 'Ative o microfone na barra inferior do player para usar "próximo", "voltar" e "finalizar" sem tocar a tela. Desliga sozinho ao sair do treino.' },
      { label: 'Agendar', desc: 'Atribua treinos a dias da semana fixos ou datas avulsas.' },
    ],
  },
  '/exercises': {
    title: 'Biblioteca de Exercícios',
    intro: 'Catálogo de exercícios reutilizáveis, independentes dos treinos.',
    steps: [
      { label: 'Cadastrar', desc: 'Adicione exercícios com fotos, grupo muscular, equipamento e vídeo de referência.' },
      { label: 'Pré-visualizar', desc: 'Toque em um exercício para abrir o player com fotos, vídeo e análise técnica.' },
      { label: 'Reutilizar em treinos', desc: 'Os exercícios da biblioteca aparecem ao montar qualquer treino.' },
    ],
  },
  '/food-preferences': {
    title: 'Preferências Alimentares',
    intro: 'Defina restrições e gostos para personalizar o cardápio gerado por IA.',
    steps: [
      { label: 'Restrições', desc: 'Marque alergias, intolerâncias ou alimentos que você não consome (ex.: lactose, glúten).' },
      { label: 'Preferências positivas', desc: 'Indique alimentos que gosta para que apareçam mais no cardápio sugerido.' },
      { label: 'Estilo alimentar', desc: 'Vegetariano, low-carb, mediterrâneo, etc. — ajusta o tom das sugestões.' },
    ],
  },
  '/profile': {
    title: 'Perfil',
    intro: 'Seus dados pessoais, preferências e gestão de conta.',
    steps: [
      { label: 'Dados pessoais', desc: 'Atualize peso, altura, idade, sexo e nível de atividade — usados nos cálculos do app.' },
      { label: 'Metas', desc: 'Defina objetivos de peso, prazo e calorias diárias.' },
      { label: 'Lembretes', desc: 'Configure notificações de água, refeições e treino.' },
      { label: 'Privacidade (LGPD)', desc: 'Exporte todos os seus dados em JSON/PDF ou exclua sua conta permanentemente.' },
      { label: 'Conta', desc: 'Gerencie e-mail, senha e logout.' },
    ],
  },
  '/onboarding': {
    title: 'Configuração inicial',
    intro: 'Wizard de boas-vindas que coleta os dados base para os cálculos do app.',
    steps: [
      { label: 'Dados pessoais', desc: 'Peso, altura, idade e sexo — base para calcular seu gasto calórico e metas.' },
      { label: 'Objetivo', desc: 'Perder, manter ou ganhar massa — define o saldo calórico sugerido.' },
      { label: 'Atividade', desc: 'Quanto você se mexe no dia a dia, fora dos treinos.' },
      { label: 'Preferências', desc: 'Restrições alimentares para personalizar sugestões.' },
    ],
    tips: ['Você pode ajustar tudo depois em Perfil.'],
  },
};

const FALLBACK: HelpSection = {
  title: 'Ajuda',
  intro: 'Navegue pelas abas inferiores para acessar cada área do app.',
  steps: [
    { label: 'Hoje', desc: 'Dashboard do dia atual.' },
    { label: 'Histórico', desc: 'Registros passados.' },
    { label: 'Treinos / Exercícios', desc: 'Sessões e biblioteca.' },
    { label: 'Saúde', desc: 'Indicadores corporais.' },
    { label: 'Perfil', desc: 'Seus dados.' },
  ],
};

type HelpMenuProps = {
  /** When true, renders only the trigger button inline (no fixed positioning). */
  inline?: boolean;
  className?: string;
};

export function HelpMenu({ inline = false, className }: HelpMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hide on auth screen
  if (pathname.startsWith('/auth')) return null;

  const help = HELP_BY_ROUTE[pathname] ?? FALLBACK;

  const trigger = (
    <button
      type="button"
      aria-label="Como usar esta tela"
      onClick={() => setOpen(true)}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-2xl transition-all min-w-0 flex-1',
        'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <div className="p-1.5 rounded-xl transition-all">
        <HelpCircle className="h-5 w-5" />
      </div>
      <span className="text-[9px] font-medium">Ajuda</span>
    </button>
  );

  return (
    <>
      {trigger}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto p-0"
        >
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 py-4 flex items-start justify-between gap-3">
            <SheetHeader className="text-left space-y-1 flex-1">
              <SheetTitle className="font-serif text-2xl">
                {help.title}
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                {help.intro}
              </SheetDescription>
            </SheetHeader>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -mt-1"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-5 py-5 space-y-5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Como usar
              </h3>
              <ol className="space-y-3">
                {help.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-foreground text-background text-xs font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {step.label}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {help.tips && help.tips.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Dicas
                </h3>
                <ul className="space-y-1.5">
                  {help.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-foreground/80 leading-relaxed">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/tour');
              }}
              className="w-full flex items-center gap-3 rounded-md border border-border bg-card p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 shrink-0">
                <Compass className="h-4 w-4 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Tour: como usar o Pilar</p>
                <p className="text-xs text-muted-foreground">Passo a passo ilustrado das 4 áreas principais</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/ajuda');
              }}
              className="w-full flex items-center gap-3 rounded-md border border-border bg-card p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
                <BookOpen className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Guia completo de nutrientes</p>
                <p className="text-xs text-muted-foreground">Entenda proteína, carboidrato, gordura e seu gasto calórico</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
