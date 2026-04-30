import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
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
      { label: 'Selecione o dia', desc: 'Use o seletor de dias no topo para navegar entre datas. Os registros são salvos no dia que estiver ativo.' },
      { label: 'Adicione refeições', desc: 'Toque no botão flutuante (+) para registrar comida por foto, código de barras, busca ou texto livre.' },
      { label: 'Registre líquidos', desc: 'Use o atalho de líquidos para água, café, sucos e bebidas alcoólicas.' },
      { label: 'Acompanhe metas', desc: 'Os cards mostram calorias, macros e hidratação do dia em tempo real.' },
      { label: 'Atalhos rápidos', desc: 'Toque nos cards de métrica para abrir o registro correspondente (peso, glicemia, etc.).' },
    ],
    tips: ['Os totais do dia mudam conforme você troca a data no topo.'],
  },
  '/history': {
    title: 'Histórico',
    intro: 'Veja tudo que foi registrado em dias anteriores, separado por categorias.',
    steps: [
      { label: 'Refeições e Líquidos', desc: 'As abas separam alimentos sólidos das bebidas para leitura mais fácil.' },
      { label: 'Editar ou excluir', desc: 'Toque em qualquer item para editar valores ou removê-lo do histórico.' },
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
  },
  '/health': {
    title: 'Saúde',
    intro: 'Métricas corporais e indicadores derivados dos seus dados.',
    steps: [
      { label: 'IMC e BMR', desc: 'Cálculos automáticos a partir de peso, altura, idade e sexo do perfil.' },
      { label: 'Glicemia', desc: 'Registre medições — o tipo (jejum, pós-refeição) é categorizado automaticamente.' },
      { label: 'Peso atual vs. histórico', desc: 'O peso atual é o último registrado; o histórico mostra a evolução completa.' },
    ],
  },
  '/products': {
    title: 'Produtos',
    intro: 'Sua biblioteca pessoal de alimentos e produtos para reuso rápido.',
    steps: [
      { label: 'Crie produtos', desc: 'Cadastre alimentos que você consome com frequência com macros pré-definidos.' },
      { label: 'Consuma rápido', desc: 'Toque em "Consumir" para adicionar ao dia atual sem digitar novamente.' },
      { label: 'Edite valores', desc: 'Atualize macros, porção e foto a qualquer momento.' },
    ],
  },
  '/workouts': {
    title: 'Treinos',
    intro: 'Monte, agende e execute treinos personalizados.',
    steps: [
      { label: 'Criar treino', desc: 'Combine exercícios da biblioteca em uma sessão com séries, repetições e descanso.' },
      { label: 'Gerar com IA', desc: 'Use o gerador de IA — agora você pode escolher a categoria de equipamentos disponíveis.' },
      { label: 'Play do treino', desc: 'Inicie a execução para ver demonstrações, cronômetro de descanso e análise técnica.' },
      { label: 'Agendar', desc: 'Atribua treinos a dias específicos da semana ou datas livres.' },
    ],
  },
  '/exercises': {
    title: 'Biblioteca de Exercícios',
    intro: 'Catálogo de exercícios reutilizáveis, independentes dos treinos.',
    steps: [
      { label: 'Cadastrar', desc: 'Adicione exercícios com fotos (limite por exercício), grupo muscular e equipamento.' },
      { label: 'Pré-visualizar', desc: 'Toque em um exercício para abrir o player com fotos, vídeo e análise.' },
      { label: 'Reutilizar em treinos', desc: 'Os exercícios da biblioteca aparecem ao montar qualquer treino.' },
    ],
  },
  '/profile': {
    title: 'Perfil',
    intro: 'Seus dados pessoais e preferências do app.',
    steps: [
      { label: 'Dados pessoais', desc: 'Atualize peso, altura, idade, sexo e nível de atividade — usados nos cálculos do app.' },
      { label: 'Metas', desc: 'Defina objetivos de peso e calorias diárias.' },
      { label: 'Conta', desc: 'Gerencie e-mail, senha e logout.' },
    ],
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

export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Hide on auth screen
  if (pathname.startsWith('/auth')) return null;

  const help = HELP_BY_ROUTE[pathname] ?? FALLBACK;

  return (
    <>
      <button
        type="button"
        aria-label="Como usar esta tela"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-40 rounded-full border border-border bg-card/90 backdrop-blur-md',
          'shadow-sm hover:shadow-md transition-all',
          'h-10 w-10 flex items-center justify-center',
          'top-[calc(env(safe-area-inset-top)+0.75rem)] right-3',
          'text-foreground/70 hover:text-foreground'
        )}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
