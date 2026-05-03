import { ArrowLeft, Beef, Wheat, Droplets, Flame, BookOpen, Activity, Target, FlaskConical, Droplet, Scale, Shield, Utensils, Dumbbell, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';

interface NutrientCardProps {
  icon: typeof Beef;
  name: string;
  kcalPerGram: string;
  colorClass: string;
  bgClass: string;
  purpose: string;
  sources: string;
  hint: string;
}

function NutrientCard({ icon: Icon, name, kcalPerGram, colorClass, bgClass, purpose, sources, hint }: NutrientCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgClass}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{kcalPerGram}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="font-medium">Para que serve:</span> {purpose}</p>
        <p><span className="font-medium">Onde encontrar:</span> {sources}</p>
        <p className="text-xs text-muted-foreground italic">{hint}</p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl px-4 py-4 flex items-center gap-4 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Central de ajuda</h1>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Intro */}
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">O que são nutrientes?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nutrientes (também chamados de "macros" ou macronutrientes) são os 3 tipos
            principais que o corpo precisa em grandes quantidades todos os dias para
            ter energia, construir músculo e regular hormônios.
          </p>
        </section>

        {/* Os 3 nutrientes */}
        <section className="space-y-3">
          <NutrientCard
            icon={Beef}
            name="Proteína"
            kcalPerGram="4 kcal por grama"
            colorClass="text-orange-500"
            bgClass="bg-orange-500/10"
            purpose="Construir e reparar músculos, pele, cabelo, enzimas e hormônios."
            sources="Carne, frango, peixe, ovo, queijo, iogurte, feijão, lentilha, tofu, whey."
            hint="Em geral 1,6 a 2,2 g por kg de peso para quem treina ou quer emagrecer mantendo músculo."
          />
          <NutrientCard
            icon={Wheat}
            name="Carboidratos"
            kcalPerGram="4 kcal por grama"
            colorClass="text-sky-500"
            bgClass="bg-sky-500/10"
            purpose="Combustível principal do corpo e do cérebro. É o que dá energia para treinar e raciocinar."
            sources="Arroz, pão, massa, batata, mandioca, aveia, frutas, mel."
            hint="Quem treina pesado precisa mais; quem quer perder gordura, geralmente menos."
          />
          <NutrientCard
            icon={Droplets}
            name="Gordura"
            kcalPerGram="9 kcal por grama"
            colorClass="text-violet-500"
            bgClass="bg-violet-500/10"
            purpose="Produção de hormônios, absorção das vitaminas A, D, E e K, saúde do cérebro."
            sources="Azeite, abacate, castanhas, ovo, peixe gordo (salmão, sardinha), manteiga."
            hint="Pelo menos 0,8 g por kg de peso — abaixo disso, hormônios caem."
          />
        </section>

        {/* Por que rastrear */}
        <section className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-foreground" />
            <h3 className="font-semibold text-sm">Por que o app rastreia nutrientes?</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Contar só calorias não basta. <strong className="text-foreground">2.000 kcal de
            refrigerante ≠ 2.000 kcal de comida real.</strong> Bater suas metas de
            nutrientes garante que você não perca músculo enquanto emagrece, tenha
            energia para os treinos e mantenha hormônios e saciedade em ordem.
          </p>
        </section>

        {/* Como ler */}
        <section className="rounded-md border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Como ler na tela do Pilar</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Quando você vê <code className="bg-muted px-1.5 py-0.5 rounded text-xs">150g P · 250g C · 65g G</code>, significa:
          </p>
          <ul className="text-sm space-y-1 ml-2">
            <li>• <span className="text-orange-500 font-medium">P</span> = 150 g de proteína</li>
            <li>• <span className="text-sky-500 font-medium">C</span> = 250 g de carboidratos</li>
            <li>• <span className="text-violet-500 font-medium">G</span> = 65 g de gordura</li>
          </ul>
          <p className="text-xs text-muted-foreground italic">
            A meta diária é calculada automaticamente a partir do seu peso, altura, idade,
            nível de atividade e objetivo (perder peso, manter, ganhar massa).
          </p>
        </section>

        {/* Calorias */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-500" />
            <h3 className="font-semibold text-sm">E as calorias?</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Caloria é a <strong className="text-foreground">unidade de energia</strong> dos
            alimentos. Cada nutriente entrega calorias diferentes (proteína e carbo: 4 kcal/g;
            gordura: 9 kcal/g). A soma dos 3 forma o total calórico do dia.
          </p>
        </section>

        {/* Atividade */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">TDEE e BMR — o que significam?</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">BMR</strong> é quanto seu corpo gasta parado,
            só para se manter vivo. <strong className="text-foreground">TDEE</strong> é o
            total que você gasta no dia (BMR + atividades + treinos). Sua meta calórica
            diária é calculada a partir do TDEE, ajustada pelo seu objetivo.
          </p>
        </section>

        {/* Exame de sangue */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-rose-500" />
            <h3 className="font-semibold text-sm">Exames de sangue</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Faça upload do PDF ou foto do laudo na aba <strong className="text-foreground">Saúde</strong>.
            A IA extrai marcadores (colesterol, glicose, vitamina D, ferritina, etc.), mostra a evolução em
            gráficos e <strong className="text-foreground">ajusta automaticamente o cardápio diário e os treinos
            sugeridos</strong> com base no que está alterado.
          </p>
          <p className="text-xs text-muted-foreground italic">
            ⚕️ Análises educativas. Não substituem consulta médica.
          </p>
        </section>

        {/* Glicemia */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-sm">Glicemia e impacto glicêmico</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Registre suas medições de glicose — o tipo (jejum, pré, pós-refeição) é categorizado
            automaticamente pelo horário. Antes de uma refeição, você pode ver a
            <strong className="text-foreground"> previsão de impacto glicêmico</strong> baseada nos
            carboidratos líquidos do prato.
          </p>
        </section>

        {/* Bioimpedância */}
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-cyan-500" />
            <h3 className="font-semibold text-sm">Composição corporal</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tire foto do laudo da sua balança de bioimpedância — a IA extrai % de gordura, massa magra,
            água corporal e outros valores. Combine com fotos de progresso (frente, lado, costas) para
            ver evolução visual ao longo das semanas.
          </p>
        </section>

        {/* Privacidade */}
        <section className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-foreground" />
            <h3 className="font-semibold text-sm">Privacidade e seus dados (LGPD)</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Em <strong className="text-foreground">Perfil</strong> você pode exportar todos os seus dados
            em JSON ou PDF a qualquer momento, e também excluir sua conta permanentemente. Consulte os
            <button
              type="button"
              onClick={() => navigate('/termos')}
              className="underline underline-offset-2 hover:text-foreground mx-1"
            >Termos de Uso</button>
            e a
            <button
              type="button"
              onClick={() => navigate('/privacidade')}
              className="underline underline-offset-2 hover:text-foreground mx-1"
            >Política de Privacidade</button>
            para detalhes.
          </p>
        </section>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Dúvidas sobre alguma tela específica? Toque no ícone <strong>Ajuda</strong> na barra inferior
          para ver instruções da tela atual.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
