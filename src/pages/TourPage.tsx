import { useState } from 'react';
import { ArrowLeft, ChevronRight, Home, Utensils, Dumbbell, Heart, Camera, Barcode, Search, Mic, Leaf, Activity, FlaskConical, Droplet, Scale, ShoppingBasket, ChefHat, Sparkles, Play, Calendar, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import tourDashboard from '@/assets/tour-dashboard.jpg';
import tourMenu from '@/assets/tour-menu.jpg';
import tourWorkouts from '@/assets/tour-workouts.jpg';
import tourHealth from '@/assets/tour-health.jpg';

type Step = {
  icon: typeof Home;
  title: string;
  desc: string;
};

type Section = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Home;
  accent: string;
  bg: string;
  route: string;
  image: string;
  steps: Step[];
};

const SECTIONS: Section[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Registrar comida do dia',
    icon: Home,
    accent: 'text-rose-600',
    bg: 'bg-rose-500/10',
    route: '/',
    image: tourDashboard,
    steps: [
      { icon: Calendar, title: '1. Escolha o dia', desc: 'Use o seletor no topo. Tudo que registrar fica vinculado ao dia ativo, não à data do sistema.' },
      { icon: Plus, title: '2. Toque no + flutuante', desc: 'Abre o menu de adicionar comida com 5 opções: foto, código de barras, busca, kit ou texto livre.' },
      { icon: Camera, title: '3. Por foto (mais rápido)', desc: 'Tire foto do prato. A IA identifica os alimentos, estima porções e calcula macros automaticamente.' },
      { icon: Barcode, title: '4. Por código de barras', desc: 'Escaneie embalagens. A IA lê o código e busca os dados nutricionais — ajuste a porção em segundos.' },
      { icon: Search, title: '5. Busca ou texto livre', desc: 'Busque na sua biblioteca de produtos, ou descreva em texto ("2 ovos e uma banana") e a IA monta tudo.' },
      { icon: Activity, title: '6. Acompanhe os anéis', desc: 'Cards mostram calorias, proteína, carbo, gordura e hidratação em tempo real. Toque para ver detalhes.' },
    ],
  },
  {
    id: 'menu',
    title: 'Cardápio Semanal',
    subtitle: 'Plano de 7 dias com IA',
    icon: Utensils,
    accent: 'text-amber-600',
    bg: 'bg-amber-500/10',
    route: '/menu',
    image: tourMenu,
    steps: [
      { icon: Sparkles, title: '1. Gerar cardápio', desc: 'A IA monta 7 dias respeitando suas metas calóricas, restrições e exames de sangue recentes.' },
      { icon: ChefHat, title: '2. Ver receitas', desc: 'Toque em uma refeição para abrir ingredientes, modo de preparo e macros detalhados.' },
      { icon: ShoppingBasket, title: '3. Lista de compras', desc: 'Aba dedicada agrupa todos os ingredientes da semana por categoria — marque o que já tem em casa.' },
      { icon: Sparkles, title: '4. Regenerar quando quiser', desc: 'Não gostou? Gere outro cardápio. Atualize suas preferências em Perfil para resultados melhores.' },
    ],
  },
  {
    id: 'workouts',
    title: 'Treinos',
    subtitle: 'Criar, executar e comandar por voz',
    icon: Dumbbell,
    accent: 'text-foreground',
    bg: 'bg-foreground/10',
    route: '/workouts',
    image: tourWorkouts,
    steps: [
      { icon: Plus, title: '1. Criar treino', desc: 'Combine exercícios da biblioteca com séries, repetições e descanso. Ative o alongamento final se quiser.' },
      { icon: Sparkles, title: '2. Ou gere com IA', desc: 'A IA cria treinos a partir do seu objetivo, equipamentos e exames — basta descrever o que precisa.' },
      { icon: Play, title: '3. Inicie o player', desc: 'Toque em Play. Ao começar, escolha o Modo de hoje (Normal, Cansado, Muito cansado) e o app ajusta cargas.' },
      { icon: Mic, title: '4. Comandos por voz', desc: 'Ative o microfone na barra inferior do player. Diga "próximo", "voltar" ou "finalizar" sem tocar a tela.' },
      { icon: Leaf, title: '5. Alongamento final', desc: 'Se ativado no treino, o player abre uma fase de alongamento ao terminar os exercícios.' },
      { icon: Calendar, title: '6. Agendar', desc: 'Atribua treinos a dias fixos da semana ou datas avulsas para receber lembretes.' },
    ],
  },
  {
    id: 'health',
    title: 'Saúde',
    subtitle: 'Exames, glicemia e bioimpedância',
    icon: Heart,
    accent: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    route: '/health',
    image: tourHealth,
    steps: [
      { icon: FlaskConical, title: '1. Upload de exame de sangue', desc: 'Tire foto ou envie o PDF do laudo. A IA extrai marcadores e mostra evolução em gráficos.' },
      { icon: Sparkles, title: '2. Ajuste automático', desc: 'O cardápio diário e os treinos sugeridos são ajustados conforme o que está alterado no exame.' },
      { icon: Droplet, title: '3. Registrar glicemia', desc: 'Anote medições de glicose. O tipo (jejum, pré, pós-refeição) é categorizado pelo horário automaticamente.' },
      { icon: Activity, title: '4. Predição de impacto', desc: 'Antes de comer, veja a previsão de impacto glicêmico baseada nos carboidratos líquidos do prato.' },
      { icon: Scale, title: '5. Bioimpedância', desc: 'Tire foto do laudo da balança. A IA extrai % de gordura, massa magra e água corporal.' },
      { icon: Camera, title: '6. Fotos de progresso', desc: 'Registre fotos frente/lado/costas para comparar visualmente a evolução ao longo das semanas.' },
    ],
  },
];

export default function TourPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  const current = SECTIONS.find((s) => s.id === active);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl px-4 py-4 flex items-center gap-4 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => (current ? setActive(null) : navigate(-1))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{current ? current.title : 'Como usar o Pilar'}</h1>
          {current && <p className="text-xs text-muted-foreground">{current.subtitle}</p>}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {!current && (
          <>
            <section className="space-y-2">
              <h2 className="font-serif text-2xl">Tour rápido</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Quatro áreas principais do app. Toque em uma para ver o passo a passo ilustrado.
              </p>
            </section>

            <div className="grid grid-cols-1 gap-3">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className="group rounded-md border border-border bg-card p-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shrink-0', s.bg)}>
                    <s.icon className={cn('h-6 w-6', s.accent)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>

            <section className="rounded-md border border-border bg-muted/30 p-4 mt-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 Em qualquer tela do app, toque no ícone <strong className="text-foreground">Ajuda</strong> na barra
                inferior para ver instruções específicas da tela atual.
              </p>
            </section>
          </>
        )}

        {current && (
          <>
            <section className="rounded-md border border-border bg-card p-4 flex items-center gap-3">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shrink-0', current.bg)}>
                <current.icon className={cn('h-6 w-6', current.accent)} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{current.title}</p>
                <p className="text-xs text-muted-foreground">{current.subtitle}</p>
              </div>
            </section>

            <ol className="space-y-3">
              {current.steps.map((step, i) => (
                <li key={i} className="rounded-md border border-border bg-card p-4 flex gap-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', current.bg)}>
                    <step.icon className={cn('h-4 w-4', current.accent)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Button
              className="w-full mt-2"
              onClick={() => navigate(current.route)}
            >
              Ir para {current.title}
            </Button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
