import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents, useSequences, useEquipment } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import {
  Users, Dumbbell, ListOrdered, Activity, CalendarDays,
  Radio, TrendingUp, FileBarChart, ArrowUpRight, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';

export default function ClinicOverviewPage() {
  const { activeClinicId, activeClinic } = useUserRoles();
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const navigate = useNavigate();

  const cards = [
    { label: 'Alunos', value: students.length, sub: 'cadastrados', icon: Users, to: '/clinica/alunos' },
    { label: 'Agenda', value: 'Hoje', sub: 'ver aulas', icon: CalendarDays, to: '/clinica/agenda' },
    { label: 'Equipamentos', value: equipment.length, sub: 'ativos', icon: Dumbbell, to: '/clinica/equipamentos' },
    { label: 'Sequências', value: sequences.length, sub: 'criadas', icon: ListOrdered, to: '/clinica/sequencias' },
    { label: 'Aula ao vivo', value: 'Iniciar', sub: 'agora', icon: Radio, to: '/clinica/aula', highlight: true },
    { label: 'Evolução', value: 'Ver', sub: 'progressos', icon: TrendingUp, to: '/clinica/evolucao' },
    { label: 'Relatórios', value: 'Ver', sub: 'métricas', icon: FileBarChart, to: '/clinica/relatorios' },
    { label: 'Atividade', value: '→', sub: 'logs', icon: Activity, to: '/clinica/relatorios' },
  ];

  return (
    <div className="min-h-screen">
      <ClinicPageHeader icon={Sparkles} title={activeClinic?.name || 'Visão geral'} subtitle="Painel da clínica" />

      {/* Cards grid */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
          {cards.map((c) => (
            <Card
              key={c.label}
              onClick={() => navigate(c.to)}
              className={`group cursor-pointer p-6 hover-lift relative overflow-hidden ${
                c.highlight ? 'bg-primary text-primary-foreground border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 ${
                    c.highlight
                      ? 'bg-brand text-brand-foreground'
                      : 'bg-brand text-brand-foreground'
                  }`}
                >
                  <c.icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <ArrowUpRight
                  className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 ${
                    c.highlight ? 'text-primary-foreground' : 'text-primary'
                  }`}
                />
              </div>
              <div className="mt-6">
                <div className="font-display text-3xl font-bold tracking-tight num-display">
                  {c.value}
                </div>
                <div className={`text-sm font-bold mt-1 ${c.highlight ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {c.label}
                </div>
                <div className={`text-xs mt-0.5 ${c.highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {c.sub}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-8 bg-gradient-to-br from-card via-card to-muted/40 border-2 border-dashed">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-2xl bg-brand text-brand-foreground flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-[260px]">
              <h2 className="font-display text-2xl font-bold mb-3">Como funciona</h2>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside marker:text-primary marker:font-bold">
                <li>Cadastre seus equipamentos e níveis de habilidade.</li>
                <li>Cadastre seus alunos e atribua o nível.</li>
                <li>Crie sequências de exercícios por equipamento e nível.</li>
                <li>Prescreva sequências para o aluno (presencial ou casa).</li>
                <li>Inicie uma aula ao vivo e acompanhe a execução em tempo real.</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
