// @ts-nocheck — Ported from CRM Pilar; references tables not present in this project.
import { useUserRoles } from '@/hooks/useUserRoles';
import { useStudents } from '@/hooks/useClinicData';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Activity, Calendar as CalIcon } from 'lucide-react';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';

export default function StudentEvolutionPage() {
  const { activeClinicId } = useUserRoles();
  const { data: students = [] } = useStudents(activeClinicId);
  const [studentId, setStudentId] = useState<string>('');

  const { data: log = [] } = useQuery({
    queryKey: ['student-log-full', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const since = subDays(new Date(), 90).toISOString();
      const { data, error } = await supabase
        .from('execution_log')
        .select('*, exercise_sequences(name)')
        .eq('student_id', studentId)
        .gte('performed_at', since)
        .order('performed_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studentId,
  });

  // Group by date
  const byDate = useMemo(() => {
    const map = new Map<string, { date: string; exercises: number; sessions: Set<string> }>();
    for (const l of log as any[]) {
      const dk = format(new Date(l.performed_at), 'yyyy-MM-dd');
      const cur = map.get(dk) ?? { date: dk, exercises: 0, sessions: new Set() };
      cur.exercises++;
      if (l.sequence_id) cur.sessions.add(l.sequence_id + l.performed_at.slice(0, 10));
      map.set(dk, cur);
    }
    return Array.from(map.values()).map((d) => ({ ...d, sessions: d.sessions.size, label: format(new Date(d.date), 'dd/MM') }));
  }, [log]);

  // Sessions list (group by sequence + day)
  const sessions = useMemo(() => {
    const map = new Map<string, { key: string; date: string; sequence_name: string; count: number; performed_at: string }>();
    for (const l of (log as any[]).slice().reverse()) {
      const dk = format(new Date(l.performed_at), 'yyyy-MM-dd');
      const key = `${dk}-${l.sequence_id ?? 'avulso'}`;
      const cur = map.get(key) ?? { key, date: dk, sequence_name: l.exercise_sequences?.name || 'Avulso', count: 0, performed_at: l.performed_at };
      cur.count++;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.performed_at.localeCompare(a.performed_at));
  }, [log]);

  const totals = {
    exercises: log.length,
    sessions: sessions.length,
    days: byDate.length,
  };

  const current = students.find((s) => s.id === studentId);

  return (
    <>
    <ClinicPageHeader icon={TrendingUp} title="Evolução do aluno" subtitle="Últimos 90 dias" />
    <div className="p-6 space-y-4 max-w-6xl mx-auto">

      <Card className="p-4">
        <label className="text-sm font-medium">Selecione o aluno</label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Aluno..." /></SelectTrigger>
          <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
        </Select>
      </Card>

      {!studentId ? (
        <Card className="p-10 text-center text-muted-foreground">Escolha um aluno acima.</Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4"><div className="text-xs text-muted-foreground">Exercícios</div><div className="text-2xl font-bold">{totals.exercises}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Treinos</div><div className="text-2xl font-bold">{totals.sessions}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Dias ativos</div><div className="text-2xl font-bold">{totals.days}</div></Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Activity className="h-4 w-4" />Exercícios por dia</h3>
            {byDate.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem dados ainda.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDate}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="exercises" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><CalIcon className="h-4 w-4" />Treinos executados</h3>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{s.sequence_name}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(s.performed_at), "EEEE, dd/MM/yyyy", { locale: ptBR })}</div>
                    </div>
                    <Badge variant="secondary">{s.count} exercícios</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
    </>
  );
}
