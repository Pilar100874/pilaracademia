import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents, useSequences, useEquipment } from '@/hooks/useClinicData';
import { Card } from '@/components/ui/card';
import { Users, Dumbbell, ListOrdered, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClinicOverviewPage() {
  const { activeClinicId, activeClinic } = useUserRoles();
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const navigate = useNavigate();

  const cards = [
    { label: 'Alunos', value: students.length, icon: Users, to: '/clinica/alunos', color: 'bg-blue-500' },
    { label: 'Agenda', value: '→', icon: Activity, to: '/clinica/agenda', color: 'bg-violet-500' },
    { label: 'Equipamentos', value: equipment.length, icon: Dumbbell, to: '/clinica/equipamentos', color: 'bg-amber-500' },
    { label: 'Sequências', value: sequences.length, icon: ListOrdered, to: '/clinica/sequencias', color: 'bg-emerald-500' },
    { label: 'Aula ao vivo', value: '→', icon: Activity, to: '/clinica/aula', color: 'bg-rose-500' },
    { label: 'Evolução', value: '→', icon: Activity, to: '/clinica/evolucao', color: 'bg-cyan-500' },
    { label: 'Relatórios', value: '→', icon: Activity, to: '/clinica/relatorios', color: 'bg-indigo-500' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{activeClinic?.name}</h1>
        <p className="text-muted-foreground">Painel da clínica</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 cursor-pointer hover:shadow-lg transition" onClick={() => navigate(c.to)}>
            <div className={`h-10 w-10 rounded-xl ${c.color} text-white flex items-center justify-center mb-3`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Como funciona</h2>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Cadastre seus equipamentos e níveis de habilidade.</li>
          <li>Cadastre seus alunos e atribua o nível.</li>
          <li>Crie sequências de exercícios por equipamento e nível.</li>
          <li>Prescreva sequências para o aluno (presencial ou casa).</li>
          <li>Inicie uma aula ao vivo e acompanhe a execução em tempo real.</li>
        </ol>
      </Card>
    </div>
  );
}
