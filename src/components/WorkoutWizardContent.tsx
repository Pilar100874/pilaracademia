import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfile } from '@/hooks/useProfile';
import { calculateAge } from '@/types/profile';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Question = {
  key: string;
  title: string;
  hint?: string;
  multi: boolean;
  options: string[];
  /** Obrigatória na etapa. Sem nenhuma obrigatória, basta 1 resposta por etapa. */
  required?: boolean;
};

type Step = { key: string; label: string; questions: Question[] };

const STEPS: Step[] = [
  {
    key: 'perfil',
    label: 'Perfil',
    questions: [
      { key: 'nivel', title: 'Qual o seu nível de experiência?', multi: false, options: ['Iniciante', 'Intermediário', 'Avançado', 'Atleta'] },
      { key: 'idade', title: 'Faixa de idade', multi: false, options: ['Até 25', '26 a 40', '41 a 60', 'Acima de 60'] },
      { key: 'condicao', title: 'Como está seu condicionamento hoje?', multi: false, options: ['Sedentário', 'Pouco ativo', 'Ativo', 'Muito ativo'] },
      { key: 'situacao', title: 'Alguma situação especial?', hint: 'Marque quantas quiser', multi: true, options: ['Gestante', 'Pós-parto', 'Pós-cirurgia', 'Reabilitação', 'Sobrepeso', 'Nenhuma'] },
    ],
  },
  {
    key: 'objetivo',
    label: 'Objetivo',
    questions: [
      { key: 'objetivos', title: 'Quais são seus objetivos?', hint: 'Marque quantos quiser', multi: true, options: ['Emagrecer', 'Ganhar massa', 'Definição', 'Força', 'Flexibilidade', 'Mobilidade', 'Postura', 'Resistência', 'Equilíbrio', 'Alívio de dores', 'Relaxamento', 'Condicionamento'] },
      { key: 'estilo', title: 'Que estilo de treino prefere?', multi: true, options: ['Pilates', 'Funcional', 'Musculação', 'Alongamento', 'Yoga', 'HIIT', 'Circuito', 'Calistenia'] },
    ],
  },
  {
    key: 'foco',
    label: 'Foco',
    questions: [
      { key: 'regioes', title: 'Quais regiões quer trabalhar?', hint: 'Marque quantas quiser', multi: true, options: ['Corpo todo', 'Glúteos', 'Pernas', 'Abdômen', 'Core', 'Costas', 'Peito', 'Ombros', 'Braços', 'Quadril', 'Coluna', 'Pés e tornozelos'] },
      { key: 'prioridade', title: 'O que é mais importante?', multi: false, options: ['Intensidade', 'Técnica e controle', 'Variedade', 'Simplicidade'] },
    ],
  },
  {
    key: 'saude',
    label: 'Saúde',
    questions: [
      { key: 'dores', title: 'Sente dor ou tem lesão em alguma região?', hint: 'Evitaremos sobrecarga nelas', multi: true, options: ['Lombar', 'Cervical', 'Ombro', 'Joelho', 'Quadril', 'Punho', 'Tornozelo', 'Nenhuma'] },
      { key: 'restricoes', title: 'Restrições de movimento', multi: true, options: ['Sem impacto', 'Sem saltos', 'Sem deitar de bruços', 'Sem ficar de joelhos', 'Sem peso nas mãos', 'Nenhuma'] },
    ],
  },
  {
    key: 'formato',
    label: 'Formato',
    questions: [
      { key: 'duracao', required: true, title: 'Quanto tempo por treino?', hint: 'Obrigatório — define quantos exercícios cabem', multi: false, options: ['15 min', '20 min', '30 min', '45 min', '60 min', '90 min'] },
      { key: 'intensidade', required: true, title: 'Intensidade desejada', hint: 'Obrigatório', multi: false, options: ['Leve', 'Moderada', 'Intensa'] },
      { key: 'estrutura', title: 'O treino deve ter', hint: 'Opcional — marque quantas quiser', multi: true, options: ['Aquecimento', 'Parte principal', 'Alongamento no final', 'Respiração'] },
      { key: 'local', title: 'Onde vai treinar?', hint: 'Opcional', multi: false, options: ['Estúdio', 'Academia', 'Casa', 'Ao ar livre'] },
    ],
  },
];

const AGENDA_QUESTIONS: Question[] = [
  { key: 'divisao', title: 'Como dividir a semana?', hint: 'Opcional', multi: false, options: ['Corpo todo todo dia', 'Alternar superior e inferior', 'Um foco por dia', 'A IA decide'] },
  { key: 'semanas', title: 'Por quantas semanas?', hint: 'Opcional', multi: false, options: ['4 semanas', '8 semanas', '12 semanas', 'Contínuo'] },
  { key: 'progressao', title: 'Aumentar a dificuldade com o tempo?', hint: 'Opcional', multi: false, options: ['Sim, aos poucos', 'Não, manter igual'] },
];

const ALL_STEPS = [
  ...STEPS.map((s) => ({ key: s.key, label: s.label })),
  { key: 'agenda', label: 'Agenda' },
  { key: 'final', label: 'Detalhes' },
  { key: 'resumo', label: 'Resumo' },
];

const COUNT_OPTIONS = [4, 6, 8, 10, 12, 15, 20];
const COUNT_BY_DURATION: Record<string, number> = { '15 min': 4, '20 min': 6, '30 min': 8, '45 min': 12, '60 min': 15, '90 min': 20 };

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface WorkoutWizardResult {
  prompt: string;
  name: string;
  count: number;
  days: number[];
  useBloodExam: boolean;
  useBodyPlan: boolean;
}

interface WorkoutWizardContentProps {
  onCancel: () => void;
  onDone: (result: WorkoutWizardResult) => void;
  hasBloodExams?: boolean;
  /** Equipamentos extras, renderizados na etapa Objetivo. */
  extrasSlot?: React.ReactNode;
  generating?: boolean;
  hasBodyPlan?: boolean;
  /** Nomes das categorias da biblioteca que cada estilo de treino usa. */
  styleCategories?: Record<string, string[]>;
  /** Avisa o container quais estilos foram marcados, para vincular as categorias. */
  onStylesChange?: (styles: string[]) => void;
}

export function WorkoutWizardContent({ onCancel, onDone, extrasSlot, generating = false, hasBloodExams = false, hasBodyPlan = false, styleCategories, onStylesChange }: WorkoutWizardContentProps) {
  const { profile } = useProfile();
  const [useBlood, setUseBlood] = useState(hasBloodExams);
  const [useBody, setUseBody] = useState(hasBodyPlan);
  useEffect(() => setUseBlood(hasBloodExams), [hasBloodExams]);
  useEffect(() => setUseBody(hasBodyPlan), [hasBodyPlan]);
  const ageSeeded = useRef(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [freeText, setFreeText] = useState('');
  const [name, setName] = useState('');
  const [count, setCount] = useState(8);
  const [days, setDays] = useState<number[]>([]);
  const [countManual, setCountManual] = useState(false);
  const durationAnswer = answers.duracao?.[0];
  const suggestedCount = durationAnswer ? COUNT_BY_DURATION[durationAnswer] : undefined;
  useEffect(() => {
    if (suggestedCount && !countManual) setCount(suggestedCount);
  }, [suggestedCount, countManual]);

  // Estilo escolhido → categorias da biblioteca (o container aplica a seleção).
  const stylesKey = (answers.estilo || []).join('|');
  useEffect(() => {
    onStylesChange?.(stylesKey ? stylesKey.split('|') : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesKey]);

  useEffect(() => {
    if (ageSeeded.current || !profile?.birth_date) return;
    const age = calculateAge(profile.birth_date);
    if (!age || age <= 0) return;
    ageSeeded.current = true;
    const opt = age <= 25 ? 'Até 25' : age <= 40 ? '26 a 40' : age <= 60 ? '41 a 60' : 'Acima de 60';
    setAnswers((prev) => (prev.idade?.length ? prev : { ...prev, idade: [opt] }));
  }, [profile?.birth_date]);

  const toggleDay = (idx: number) => {
    setShowStepError(false);
    setDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()));
  };

  const toggle = (q: Question, opt: string) => {
    setShowStepError(false);
    setAnswers((prev) => {
      const cur = prev[q.key] || [];
      if (!q.multi) return { ...prev, [q.key]: cur[0] === opt ? [] : [opt] };
      const exclusive = /^(Nenhuma|Corpo todo|Só o corpo)$/;
      let next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
      if (exclusive.test(opt) && !cur.includes(opt)) next = [opt];
      else next = next.filter((o) => o === opt || !exclusive.test(o));
      return { ...prev, [q.key]: next };
    });
  };

  const composedPrompt = useMemo(() => {
    const lines: string[] = [];
    STEPS.forEach((s) =>
      s.questions.forEach((q) => {
        const a = answers[q.key];
        if (a?.length) lines.push(`- ${q.title.replace(/\?$/, '')}: ${a.join(', ')}`);
      })
    );
    if (days.length) lines.push(`- Dias de treino: ${days.map((d) => DAYS[d]).join(', ')}`);
    AGENDA_QUESTIONS.forEach((q) => {
      if (q.key === 'divisao' && days.length < 2) return;
      const a = answers[q.key];
      if (a?.length) lines.push(`- ${q.title.replace(/\?$/, '')}: ${a.join(', ')}`);
    });
    if (durationAnswer) lines.push(`- Quantidade de exercícios: ${count} (o treino deve caber em ${durationAnswer}, contando séries e descanso)`);
    const styleCats = Array.from(new Set((answers.estilo || []).flatMap((s) => styleCategories?.[s] || [])));
    if (styleCats.length) lines.push(`- Categorias do estilo escolhido: ${styleCats.join(', ')}`);
    if (freeText.trim()) lines.push(`- Pedido do aluno: ${freeText.trim()}`);
    return lines.length ? `Monte um treino considerando:\n${lines.join('\n')}` : '';
  }, [answers, freeText, styleCategories, days, count, durationAnswer]);

  const [showStepError, setShowStepError] = useState(false);

  const steps = ALL_STEPS;
  const isLast = step === steps.length - 1;
  const current = STEPS[step];
  const totalAnswered = Object.values(answers).filter((a) => a.length).length;

  const missingIn = (i: number) => (STEPS[i]?.questions ?? []).filter((q) => q.required && !(answers[q.key]?.length));

  const stepComplete = (i: number): boolean => {
    const key = steps[i]?.key;
    if (!key) return false;
    if (key === 'resumo') return true;
    if (key === 'final') return !!name.trim();
    if (key === 'agenda') return days.length > 0;
    const qs = STEPS[i]?.questions ?? [];
    if (!qs.length) return false;
    if (qs.some((q) => q.required)) return missingIn(i).length === 0;
    return qs.some((q) => answers[q.key]?.length);
  };

  const stepError = (i: number) => {
    const key = steps[i]?.key;
    if (key === 'agenda') return 'Escolha ao menos um dia da semana.';
    if (key === 'final') return 'Dê um nome ao treino para continuar.';
    const miss = missingIn(i).map((q) => q.title.replace(/\?$/, ''));
    return miss.length ? `Falta responder: ${miss.join(' · ')}.` : 'Responda ao menos uma pergunta desta etapa.';
  };

  const renderQuestion = (q: Question) => (
    <section key={q.key} className={cn('rounded-md border bg-card p-4 space-y-3', showStepError && q.required && !(answers[q.key]?.length) ? 'border-destructive/50' : 'border-border')}>
      <div>
        <h2 className="font-semibold text-base">{q.title}{q.required && <span className="text-destructive"> *</span>}</h2>
        <p className="text-xs text-muted-foreground">{q.hint || (q.multi ? 'Marque quantas quiser' : 'Escolha uma opção')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {(q.key === 'estilo' && styleCategories ? Object.keys(styleCategories) : q.options).map((opt) => {
          const on = (answers[q.key] || []).includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(q, opt)}
              className={cn(
                'flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2.5 py-2.5 text-center text-sm leading-snug transition-colors',
                on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/60'
              )}
            >
              {on && <Check className="h-3.5 w-3.5 shrink-0" />}
              <span className="min-w-0 whitespace-normal break-words">{opt}</span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const summaryFor = (i: number): string[] => {
    const key = steps[i]?.key;
    const qa = (qs: Question[]) => qs.filter((q) => answers[q.key]?.length).map((q) => `${q.title.replace(/\?$/, '')}: ${answers[q.key].join(', ')}`);
    if (key === 'agenda') return [`Dias: ${days.map((d) => DAYS[d]).join(', ') || '—'}`, ...qa(AGENDA_QUESTIONS.filter((q) => q.key !== 'divisao' || days.length > 1))];
    if (key === 'final') return [`Nome: ${name.trim() || '—'}`, `Exercícios: ${count}`, ...(freeText.trim() ? [`Pedido: ${freeText.trim()}`] : [])];
    const lines = qa(STEPS[i]?.questions ?? []);
    if (key === 'saude') {
      if (useBlood) lines.push('Usar exames de sangue');
      if (useBody) lines.push('Usar bioimpedância');
    }
    return lines.length ? lines : ['—'];
  };

  const missingSteps = steps.filter((s, i) => s.key !== 'final' && !stepComplete(i)).map((s) => s.label);
  const allComplete = steps.every((_, i) => stepComplete(i));

  const goTo = (i: number) => {
    setShowStepError(false);
    if (i <= step) { setStep(i); return; }
    for (let j = step; j < i; j++) {
      if (!stepComplete(j)) { setStep(j); setShowStepError(true); return; }
    }
    setStep(i);
  };

  const goNext = () => {
    if (!stepComplete(step)) { setShowStepError(true); return; }
    setShowStepError(false);
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-4 lg:px-8">
        <div className="flex items-center justify-between gap-1">
          {steps.map((s, i) => {
            const done = stepComplete(i) && i !== step;
            return (
            <button
              key={s.key}
              type="button"
              onClick={() => goTo(i)}
              title={done ? `${s.label} — respondido` : `${s.label} — incompleto`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  i === step && 'bg-primary text-primary-foreground border-primary',
                  done && 'bg-primary/10 text-primary border-primary/40',
                  !done && i !== step && 'bg-background text-muted-foreground border-border'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden sm:block w-full text-center text-[10px] leading-tight break-words',
                  i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-center text-xs font-medium sm:hidden">
          Etapa {step + 1} de {steps.length} · {steps[step]?.label}
        </p>
        <div className="h-1 rounded-full bg-muted overflow-hidden mt-2">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
        {showStepError && !stepComplete(step) && (
          <p className="min-w-0 break-words rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
            {stepError(step)}
          </p>
        )}
        {steps[step]?.key === 'agenda' ? (
          <section className={cn('rounded-md border bg-card p-4 space-y-3', showStepError ? 'border-destructive/50' : 'border-border')}>
            <div>
              <h2 className="font-semibold text-base">Em quais dias da semana?</h2>
              <p className="text-xs text-muted-foreground">Marque um ou mais dias — um treino é criado para cada dia.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {DAYS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      'flex items-center justify-center gap-1 rounded-md border px-2 py-2.5 text-sm transition-colors',
                      on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/60'
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5 shrink-0" />}
                    {d}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        {steps[step]?.key === 'agenda' && (
          <>{AGENDA_QUESTIONS.filter((q) => q.key !== 'divisao' || days.length > 1).map(renderQuestion)}</>
        )}
        {steps[step]?.key === 'agenda' ? null : current ? (
          <>
          {current.key === 'saude' && (
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-base">Usar meus dados de saúde?</h2>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={useBlood} disabled={!hasBloodExams} onCheckedChange={(v) => setUseBlood(!!v)} />
                <span>Considerar exames de sangue{!hasBloodExams && <span className="block text-xs text-muted-foreground">Nenhum exame cadastrado</span>}</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={useBody} disabled={!hasBodyPlan} onCheckedChange={(v) => setUseBody(!!v)} />
                <span>Considerar bioimpedância / análise corporal{!hasBodyPlan && <span className="block text-xs text-muted-foreground">Nenhuma análise cadastrada</span>}</span>
              </label>
            </section>
          )}
          {current.questions.map((q) => (
            <section key={q.key} className={cn('rounded-md border bg-card p-4 space-y-3', showStepError && q.required && !(answers[q.key]?.length) ? 'border-destructive/50' : 'border-border')}>
              <div>
                <h2 className="font-semibold text-base">{q.title}</h2>
                <p className="text-xs text-muted-foreground">{q.hint || (q.multi ? 'Marque quantas quiser' : 'Escolha uma opção')}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(q.key === 'estilo' && styleCategories ? Object.keys(styleCategories) : q.options).map((opt) => {
                  const on = (answers[q.key] || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggle(q, opt)}
                      className={cn(
                        'flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2.5 py-2.5 text-center text-sm leading-snug transition-colors',
                        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/60'
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5 shrink-0" />}
                      <span className="min-w-0 whitespace-normal break-words">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {q.key === 'estilo' && styleCategories && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {Object.keys(styleCategories).length
                    ? 'Os estilos são as categorias marcadas como “estilo de treino” na Biblioteca. O estilo escolhido define as categorias usadas no treino.'
                    : 'Nenhuma categoria marcada como “estilo de treino” ainda. Marque na Biblioteca ao editar uma categoria.'}
                </p>
              )}
            </section>
          ))}
          {current.key === 'objetivo' && extrasSlot}
          </>
        ) : steps[step]?.key === 'final' ? (
          <>
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <Label htmlFor="wiz-name">Nome do treino <span className="text-destructive">*</span></Label>
              <Input
                id="wiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Ex: Treino Glúteos e Core"
                aria-required="true"
                aria-invalid={!name.trim()}
              />
              {!name.trim() && (
                <p className="text-xs text-destructive">Obrigatório — dê um nome ao treino.</p>
              )}
            </section>
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <div>
                <h2 className="font-semibold text-base">Quantos exercícios?</h2>
                <p className="text-xs text-muted-foreground">
                  {suggestedCount ? `Sugerido ${suggestedCount} para ${durationAnswer}${countManual ? ' — você ajustou manualmente' : ''}.` : 'Ajuste se quiser.'}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {COUNT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCount(c); setCountManual(c !== suggestedCount); }}
                    className={cn(
                      'rounded-md border px-4 py-2.5 text-sm transition-colors',
                      count === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/60'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <Label htmlFor="wiz-free">Quer acrescentar algo? Escreva o que deseja no treino</Label>
              <Textarea
                id="wiz-free"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={4}
                placeholder="Ex: quero terminar com exercícios de respiração e evitar pranchas longas"
              />
            </section>
          </>
        ) : (
          <>
            {missingSteps.length > 0 && (
              <p className="min-w-0 break-words rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
                Falta responder: {missingSteps.join(', ')}.
              </p>
            )}
            <div>
              <h2 className="font-semibold text-base">Confira antes de montar</h2>
              <p className="text-xs text-muted-foreground">Toque em “Editar” para corrigir uma etapa.</p>
            </div>
            {steps.map((s, i) => s.key === 'resumo' ? null : (
              <section key={s.key} className={cn('rounded-md border bg-card p-3 space-y-1.5', stepComplete(i) ? 'border-border' : 'border-destructive/50')}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-semibold">{i + 1}. {s.label}</h3>
                  <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => { setShowStepError(false); setStep(i); }}>
                    Editar
                  </Button>
                </div>
                {summaryFor(i).map((l, k) => (
                  <p key={k} className="min-w-0 break-words text-xs leading-snug text-muted-foreground">{l}</p>
                ))}
              </section>
            ))}
          </>
        )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 sm:px-5 lg:px-8 flex items-center gap-2">
        <Button variant="outline" className="shrink-0 min-w-0 px-3 sm:px-4" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="whitespace-nowrap">{step === 0 ? 'Voltar' : 'Anterior'}</span>
        </Button>
        <span className="hidden sm:block flex-1 min-w-0 text-center text-xs text-muted-foreground truncate">
          {totalAnswered} respostas
        </span>
        {isLast ? (
          <Button
            className="shrink-0 min-w-0 px-3 sm:px-4"
            disabled={!allComplete || !composedPrompt || generating}
            onClick={() => onDone({ prompt: composedPrompt, name: name.trim(), count, days, useBloodExam: useBlood, useBodyPlan: useBody })}
          >
            {generating ? <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 sm:mr-1" />}
            <span className="whitespace-nowrap">{generating ? 'Gerando...' : 'Montar treino'}</span>
          </Button>
        ) : (
          <Button className="shrink-0 min-w-0 px-3 sm:px-4" onClick={goNext}>
            <span className="whitespace-nowrap">Próximo</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
