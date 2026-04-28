// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents, useEquipment, useSequences } from '@/hooks/useClinicData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { BarChart3, Users, Dumbbell, ListOrdered } from 'lucide-react';
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const { activeClinicId } = useUserRoles();
  const { data: students = [] } = useStudents(activeClinicId);
  const { data: equipment = [] } = useEquipment(activeClinicId);
  const { data: sequences = [] } = useSequences(activeClinicId);

  const { data: log = [] } = useQuery({
    queryKey: ['clinic-log-30d', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('execution_log')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .gte('performed_at', since);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeClinicId,
  });

  const { data: appts = [] } = useQuery({
    queryKey: ['clinic-appts-30d', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from('class_appointments')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .gte('scheduled_at', since);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeClinicId,
  });

  // Frequency per student
  const studentFreq = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appts as any[]) {
      if (a.status === 'completed' || a.status === 'checked_in' || a.status === 'in_progress') {
        map.set(a.student_id, (map.get(a.student_id) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([id, count]) => ({ name: students.find((s) => s.id === id)?.full_name?.split(' ')[0] ?? '?', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [appts, students]);

  // Top sequences
  const topSequences = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of log as any[]) {
      if (!l.sequence_id) continue;
      map.set(l.sequence_id, (map.get(l.sequence_id) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, count]) => ({ name: sequences.find((s) => s.id === id)?.name ?? 'Sequência', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [log, sequences]);

  // Equipment usage
  const equipUsage = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appts as any[]) {
      if (a.equipment_id) map.set(a.equipment_id, (map.get(a.equipment_id) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([id, count]) => ({
      name: equipment.find((e) => e.id === id)?.name ?? '—',
      value: count,
    }));
  }, [appts, equipment]);

  return (
    <>
      <ClinicPageHeader icon={BarChart3} title="Relatórios" subtitle="Últimos 30 dias" />
      <div className="p-6 space-y-4 max-w-6xl mx-auto">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><Users className="h-4 w-4 text-muted-foreground" /><div className="text-2xl font-bold mt-2">{students.filter((s) => s.active).length}</div><div className="text-xs text-muted-foreground">Alunos ativos</div></Card>
        <Card className="p-4"><Dumbbell className="h-4 w-4 text-muted-foreground" /><div className="text-2xl font-bold mt-2">{equipment.filter((e) => e.active).length}</div><div className="text-xs text-muted-foreground">Equipamentos</div></Card>
        <Card className="p-4"><ListOrdered className="h-4 w-4 text-muted-foreground" /><div className="text-2xl font-bold mt-2">{sequences.length}</div><div className="text-xs text-muted-foreground">Sequências</div></Card>
        <Card className="p-4"><BarChart3 className="h-4 w-4 text-muted-foreground" /><div className="text-2xl font-bold mt-2">{appts.length}</div><div className="text-xs text-muted-foreground">Aulas no mês</div></Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Frequência por aluno (top 10)</h3>
        {studentFreq.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentFreq}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Sequências mais usadas</h3>
          {topSequences.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
          ) : (
            <div className="space-y-2">
              {topSequences.map((s, i) => (
                <div key={s.name + i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="font-bold">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Ocupação por equipamento</h3>
          {equipUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={equipUsage} dataKey="value" nameKey="name" outerRadius={70} label={(e: any) => e.name}>
                    {equipUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
    </>
  );
}
