import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Activity, Loader2, RefreshCw } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BloodMarkerTrendChart } from '@/components/BloodMarkerTrendChart';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import type { BloodExamRow } from '@/hooks/useBloodExams';
import type { ExtractedBioimpedance } from '@/types/bodyAnalysis';

type Daily = { date: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; liquids: number | null; minutes: number | null; burned: number | null; sessions: number | null; foodCount: number };
type Profile = { name: string; email: string | null; birth_date: string | null; height_cm: number | null; weight_kg: number | null; goal: string | null; activity_level: string | null; created_at: string; daily_calories: number | null; daily_calories_override: number | null; daily_protein: number | null; daily_protein_override: number | null; daily_carbs: number | null; daily_carbs_override: number | null; daily_fat: number | null; daily_fat_override: number | null; daily_liquid_ml: number | null; daily_liquid_ml_override: number | null };
type Summary = {
  profile: Profile; startDate: string; endDate: string;
  currentWeight: { weight_kg: number; recorded_at: string } | null;
  daily: Daily[]; weights: { weight_kg: number; recorded_at: string }[];
  activities: { id: string; name: string; exercise_type: string; duration_minutes: number; calories_burned: number; performed_at: string }[];
  glucose: { id: string; glucose_mg_dl: number; measurement_type: string; measured_at: string; notes: string | null }[];
  body: { id: string; extracted: ExtractedBioimpedance; score: number | null; summary: string | null; measured_at: string | null; created_at: string }[];
  exams: BloodExamRow[];
  checkins: { id: string; period_start: string; period_end: string; adherence_score: number | null; summary: string | null }[];
  workouts: { id: string; name: string; objective: string | null; days_of_week: number[]; sets: number; reps: number }[];
};
const number = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const dateLabel = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
const average = (rows: Daily[], key: keyof Daily) => {
  const values = rows.map(row => row[key]).filter((value): value is number => typeof value === 'number');
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};
const COLORS = ['hsl(var(--primary))', 'hsl(var(--water))', 'hsl(var(--exercise))', 'hsl(var(--success))'];

function Metric({ title, value, note }: { title: string; value: string; note?: string }) {
  return <div className="min-w-0 rounded-md border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-2 text-xl font-semibold break-words">{value}</p>{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}</div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 border-t border-border pt-5"><h3 className="text-lg font-semibold">{title}</h3>{children}</section>;
}
function EvolutionChart({ title, unit, data, series, target, note }: {
  title: string; unit: string; data: Record<string, unknown>[];
  series: { key: string; name: string }[]; target?: number | null; note?: string;
}) {
  const hasData = data.some(row => series.some(s => typeof row[s.key] === 'number'));
  return <div className="min-w-0 rounded-md border border-border bg-card p-4">
    <h4 className="text-sm font-medium">{title} <span className="text-xs font-normal text-muted-foreground">({unit})</span></h4>
    {hasData ? <div className="mt-3 h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={30} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis width={45} domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip labelFormatter={value => dateLabel(String(value))} formatter={(value: number, name: string) => [`${number(value)} ${unit}`, name]} contentStyle={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 6 }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {target != null && <ReferenceLine y={target} stroke="hsl(var(--success))" strokeDasharray="5 5" label={{ value: 'Meta atual', fill: 'hsl(var(--muted-foreground))', fontSize: 10, position: 'insideTopRight' }} />}
          {series.map((s, i) => <Line key={s.key} type="linear" dataKey={s.key} name={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div> : <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sem registros neste período</div>}
    {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
  </div>;
}

function SummaryContent({ data, tab, setTab }: { data: Summary; tab: string; setTab: (value: string) => void }) {
  const p = data.profile;
  const weight = data.currentWeight?.weight_kg ?? p.weight_kg;
  const first = data.weights[0]?.weight_kg;
  const last = data.weights.at(-1)?.weight_kg;
  const delta = first != null && last != null && data.weights.length > 1 ? last - first : null;
  const bmi = weight && p.height_cm ? weight / ((p.height_cm / 100) ** 2) : null;
  const calorieTarget = p.daily_calories_override ?? p.daily_calories;
  const waterTarget = p.daily_liquid_ml_override ?? p.daily_liquid_ml;
  const body = [...data.body].sort((a, b) => (a.measured_at || a.created_at).localeCompare(b.measured_at || b.created_at));
  const latestBody = body.at(-1);
  const exams = [...data.exams].sort((a, b) => (a.collected_at || a.created_at).localeCompare(b.collected_at || b.created_at));
  const latestExam = exams.at(-1);
  const activeDays = data.daily.filter(d => d.sessions != null).length;
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const age = p.birth_date ? (() => { const birth = new Date(`${p.birth_date}T12:00:00`); const today = new Date(); return today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0); })() : null;
  const goals: Record<string, string> = { lose: 'Emagrecimento', gain: 'Ganho muscular', lose_weight: 'Emagrecimento', gain_muscle: 'Ganho muscular', maintain: 'Manutenção', cutting: 'Emagrecimento', hipertrofia: 'Hipertrofia', recomposicao: 'Recomposição', manutencao: 'Manutenção' };
  const chart = (title: string, unit: string, rows: Record<string, unknown>[], key: string, target?: number | null, note?: string) => <EvolutionChart title={title} unit={unit} data={rows} series={[{ key, name: title }]} target={target} note={note} />;
  const weightRows = data.weights.map(w => ({ date: w.recorded_at, value: w.weight_kg }));
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <span>{age != null && age > 0 ? `${age} anos` : 'Idade não informada'}</span><span>{p.height_cm ? `${number(p.height_cm)} cm` : 'Altura não informada'}</span>
      <span>Objetivo: {p.goal ? goals[p.goal] || p.goal : 'não informado'}</span><span>Cadastro: {new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
    </div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="overview" className="px-1 text-[10px] sm:text-xs">Visão geral</TabsTrigger>
        <TabsTrigger value="nutrition" className="px-1 text-[10px] sm:text-xs">Alimentação</TabsTrigger>
        <TabsTrigger value="training" className="px-1 text-[10px] sm:text-xs">Treinos</TabsTrigger>
        <TabsTrigger value="health" className="px-1 text-[10px] sm:text-xs">Saúde e corpo</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric title="Peso atual" value={`${number(weight)} kg`} note={data.currentWeight ? `Medição: ${new Date(data.currentWeight.recorded_at).toLocaleDateString('pt-BR')}` : 'Peso informado no perfil'} />
          <Metric title="Variação no período" value={delta == null ? '—' : `${delta > 0 ? '+' : ''}${number(delta)} kg`} note={`${data.weights.length} pesagens registradas`} />
          <Metric title="IMC atual" value={number(bmi)} note="Calculado com peso atual e altura" />
          <Metric title="Dias com atividade" value={number(activeDays, 0)} note={`${data.activities.length} atividades registradas`} />
          <Metric title="Calorias médias" value={`${number(average(data.daily, 'calories'), 0)} kcal`} note="Por dia com alimentação registrada" />
          <Metric title="Líquidos médios" value={`${number(average(data.daily, 'liquids'), 0)} ml`} note="Por dia com líquidos registrados" />
          <Metric title="Tempo de atividade" value={`${number(data.activities.reduce((sum, a) => sum + a.duration_minutes, 0), 0)} min`} note="Total registrado no período" />
          <Metric title="Avaliações" value={number(data.body.length + data.exams.length, 0)} note={`${data.body.length} corporais · ${data.exams.length} exames`} />
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {chart('Evolução do peso', 'kg', weightRows, 'value')}
          {chart('Atividade diária', 'min', data.daily, 'minutes')}
        </div>
        <Section title="Acompanhamento semanal">
          {chart('Pontuação do check-in', 'pontos', data.checkins.map(c => ({ date: c.period_end, value: c.adherence_score })), 'value')}
          {data.checkins.length ? <div className="divide-y divide-border">{[...data.checkins].reverse().slice(0, 8).map(c => <article className="py-3 space-y-1" key={c.id}><p className="text-sm font-medium">{dateLabel(c.period_start)} a {dateLabel(c.period_end)} · {number(c.adherence_score)} pontos</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.summary || 'Sem resumo disponível'}</p></article>)}</div> : <p className="text-sm text-muted-foreground">Nenhum check-in no período.</p>}
        </Section>
      </TabsContent>
      <TabsContent value="nutrition" className="space-y-5">
        <p className="text-xs text-muted-foreground">Médias apenas dos dias registrados. A linha de meta representa a configuração atual, não metas históricas.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric title="Dias com alimentação" value={number(data.daily.filter(d => d.foodCount > 0).length, 0)} />
          <Metric title="Proteína média" value={`${number(average(data.daily, 'protein'))} g`} />
          <Metric title="Carboidratos médios" value={`${number(average(data.daily, 'carbs'))} g`} />
          <Metric title="Gorduras médias" value={`${number(average(data.daily, 'fat'))} g`} />
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {chart('Calorias diárias', 'kcal', data.daily, 'calories', calorieTarget)}
          {chart('Líquidos diários', 'ml', data.daily, 'liquids', waterTarget)}
          <EvolutionChart title="Macronutrientes diários" unit="g" data={data.daily} series={[{ key: 'protein', name: 'Proteínas' }, { key: 'carbs', name: 'Carboidratos' }, { key: 'fat', name: 'Gorduras' }]} />
          {chart('Fibras diárias', 'g', data.daily, 'fiber')}
          {chart('Proteínas e meta', 'g', data.daily, 'protein', p.daily_protein_override ?? p.daily_protein)}
          {chart('Carboidratos e meta', 'g', data.daily, 'carbs', p.daily_carbs_override ?? p.daily_carbs)}
        </div>
      </TabsContent>
      <TabsContent value="training" className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric title="Treinos disponíveis" value={number(data.workouts.length, 0)} /><Metric title="Atividades registradas" value={number(data.activities.length, 0)} /><Metric title="Dias ativos" value={number(activeDays, 0)} /><Metric title="Gasto registrado" value={`${number(data.activities.reduce((sum, a) => sum + a.calories_burned, 0), 0)} kcal`} note="Estimativa das atividades" /></div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">{chart('Duração diária', 'min', data.daily, 'minutes')}{chart('Gasto com atividades', 'kcal', data.daily, 'burned')}{chart('Frequência diária', 'atividades', data.daily, 'sessions')}</div>
        <Section title="Treinos do usuário"><div className="divide-y divide-border">{data.workouts.map(w => <article key={w.id} className="py-3"><p className="font-medium text-sm break-words">{w.name}</p><p className="text-xs text-muted-foreground mt-1">{w.days_of_week.map(d => weekdays[d]).join(' · ') || 'Sem dias definidos'} · Padrão: {w.sets} séries × {w.reps} repetições</p>{w.objective && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{w.objective}</p>}</article>)}{!data.workouts.length && <p className="text-sm text-muted-foreground">Nenhum treino disponível.</p>}</div></Section>
        <Section title="Últimas atividades"><div className="divide-y divide-border">{[...data.activities].reverse().slice(0, 20).map(a => <div key={a.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="break-words">{a.name}</span><span className="text-muted-foreground">{dateLabel(a.performed_at)} · {number(a.duration_minutes)} min · {number(a.calories_burned, 0)} kcal</span></div>)}{!data.activities.length && <p className="text-sm text-muted-foreground">Nenhuma atividade registrada no período.</p>}</div></Section>
      </TabsContent>
      <TabsContent value="health" className="space-y-5">
        <MedicalDisclaimer />
        <Section title="Peso e composição corporal">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric title="Gordura corporal" value={`${number(latestBody?.extracted?.body_fat_pct)} %`} /><Metric title="Massa muscular" value={`${number(latestBody?.extracted?.muscle_mass_kg ?? latestBody?.extracted?.skeletal_muscle_kg)} kg`} /><Metric title="Gordura visceral" value={number(latestBody?.extracted?.visceral_fat)} /><Metric title="Pontuação corporal" value={number(latestBody?.score)} note="Última avaliação no período" /></div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">{chart('Peso registrado', 'kg', weightRows, 'value')}
            {([{ key: 'body_fat_pct', title: 'Gordura corporal', unit: '%' }, { key: 'muscle_mass_kg', title: 'Massa muscular', unit: 'kg' }, { key: 'skeletal_muscle_kg', title: 'Músculo esquelético', unit: 'kg' }, { key: 'lean_mass_kg', title: 'Massa magra', unit: 'kg' }, { key: 'fat_mass_kg', title: 'Massa de gordura', unit: 'kg' }, { key: 'visceral_fat', title: 'Gordura visceral', unit: 'nível' }, { key: 'body_water_kg', title: 'Água corporal', unit: 'kg' }, { key: 'bmr_kcal', title: 'Metabolismo basal medido', unit: 'kcal' }] as const).filter(m => body.some(b => b.extracted?.[m.key] != null)).map(m => <EvolutionChart key={m.key} title={m.title} unit={m.unit} data={body.map(b => ({ date: b.measured_at || b.created_at, value: b.extracted?.[m.key] ?? null }))} series={[{ key: 'value', name: m.title }]} />)}
          </div>
          {latestBody?.summary && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestBody.summary}</p>}
        </Section>
        <Section title="Glicemia">
          <EvolutionChart title="Medições de glicose" unit="mg/dL" data={data.glucose.map(g => ({ date: g.measured_at, value: g.glucose_mg_dl }))} series={[{ key: 'value', name: 'Glicose' }]} note="Medições em diferentes contextos não são diretamente comparáveis." />
          <div className="divide-y divide-border">{[...data.glucose].reverse().slice(0, 10).map(g => <p className="py-2 text-sm" key={g.id}>{dateLabel(g.measured_at)} · {g.measurement_type === 'fasting' ? 'Jejum' : g.measurement_type === 'post_meal' ? 'Após refeição' : g.measurement_type === 'random' ? 'Casual' : g.measurement_type} · {number(g.glucose_mg_dl)} mg/dL {g.notes && `· ${g.notes}`}</p>)}</div>
        </Section>
        <Section title="Exames de sangue">
          <BloodMarkerTrendChart exams={exams} />
          {latestExam && <><h4 className="text-sm font-medium">Último exame · {dateLabel(latestExam.collected_at || latestExam.created_at)}</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{latestExam.summary}</p><div className="divide-y divide-border">{(latestExam.markers || []).map((m, index) => <div key={`${m.key}-${index}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{m.label}</span><span className={m.status === 'high' || m.status === 'low' ? 'text-destructive' : 'text-muted-foreground'}>{number(m.value)} {m.unit} · {({ normal: 'Normal', high: 'Alto', low: 'Baixo', borderline: 'Limítrofe', unknown: 'Sem referência' })[m.status] || 'Sem referência'}</span></div>)}</div>{latestExam.alerts?.map((alert, i) => <p key={i} className="text-sm text-destructive">{alert}</p>)}</>}
        </Section>
      </TabsContent>
    </Tabs>
  </div>;
}

export function MemberEvolutionSummary({ member, onClose }: { member: { user_id: string; name: string } | null; onClose: () => void }) {
  const { user } = useAuth();
  const [days, setDays] = useState('90');
  const [tab, setTab] = useState('overview');
  const query = useQuery({
    queryKey: ['manager', 'evolution', user?.id, member?.user_id, days], enabled: !!member && !!user,
    queryFn: async (): Promise<Summary> => {
      if (!member) throw new Error('Selecione um usuário.');
      const { data, error } = await supabase.functions.invoke('manager-users', { body: { action: 'summary', userId: member.user_id, days: Number(days) } });
      if (error || data?.error) throw new Error(data?.error || 'Não foi possível carregar o resumo. Tente novamente.');
      return data as Summary;
    },
  });
  return <Dialog open={!!member} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100%-1rem)] min-w-0 max-w-6xl flex-col overflow-hidden p-0" onOpenAutoFocus={event => event.preventDefault()}>
      <DialogHeader className="shrink-0 border-b border-border px-4 pb-4 pt-5 sm:px-6">
        <DialogTitle className="pr-7 text-xl sm:text-2xl break-words">Evolução de {member?.name || 'usuário'}</DialogTitle>
        <DialogDescription>Histórico de alimentação, atividade e saúde</DialogDescription>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <Select value={days} onValueChange={setDays}><SelectTrigger className="w-44" aria-label="Período do resumo"><SelectValue /></SelectTrigger><SelectContent>{[['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['180', 'Últimos 6 meses'], ['365', 'Último ano'], ['0', 'Todo o histórico']].map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Atualizar</Button>
        </div>
      </DialogHeader>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6">
        {query.isPending ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando evolução…</div> : query.isError ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center"><AlertCircle className="h-7 w-7 text-destructive" /><p className="text-sm">{query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div> : query.data ? <SummaryContent data={query.data} tab={tab} setTab={setTab} /> : <Activity className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6"><p className="text-xs text-muted-foreground">Dados registrados pelo usuário · Dias sem registro não indicam consumo ou atividade zero.</p><Button variant="outline" onClick={onClose}>Fechar</Button></div>
    </DialogContent>
  </Dialog>;
}