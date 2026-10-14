import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
      { key: 'duracao', title: 'Quanto tempo por treino?', multi: false, options: ['15 min', '30 min', '45 min', '60 min', '90 min'] },
      { key: 'intensidade', title: 'Intensidade desejada', multi: false, options: ['Leve', 'Moderada', 'Intensa'] },
      { key: 'local', title: 'Onde vai treinar?', multi: false, options: ['Estúdio', 'Academia', 'Casa', 'Ao ar livre'] },
      { key: 'equipamentos', title: 'Equipamentos disponíveis', multi: true, options: ['Reformer', 'Cadillac', 'Chair', 'Barrel', 'Bola', 'Faixa elástica', 'Halteres', 'Caneleira', 'Mini band', 'Rolo', 'Só o corpo'] },
      { key: 'estrutura', title: 'Estrutura da aula', multi: true, options: ['Aquecimento', 'Parte principal', 'Final com alongamento', 'Respiração'] },
    ],
  },
];

const ALL_STEPS = [...STEPS.map((s) => ({ key: s.key, label: s.label })), { key: 'final', label: 'Detalhes' }];

const COUNT_OPTIONS = [6, 8, 10, 12, 15, 20];

export interface WorkoutWizardResult {
  prompt: string;
  name: string;
  count: number;
}

interface WorkoutWizardContentProps {
  onCancel: () => void;
  onDone: (result: WorkoutWizardResult) => void;
}

export function WorkoutWizardContent({ onCancel, onDone }: WorkoutWizardContentProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [freeText, setFreeText] = useState('');
  const [name, setName] = useState('');
  const [count, setCount] = useState(8);

  const toggle = (q: Question, opt: string) => {
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
    if (freeText.trim()) lines.push(`- Pedido do aluno: ${freeText.trim()}`);
    return lines.length ? `Monte um treino considerando:\n${lines.join('\n')}` : '';
  }, [answers, freeText]);

  const isLast = step === ALL_STEPS.length - 1;
  const current = STEPS[step];
  const totalAnswered = Object.values(answers).filter((a) => a.length).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-4 lg:px-8">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {ALL_STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                i === step && 'bg-primary text-primary-foreground border-primary',
                i < step && 'bg-primary/10 text-primary border-primary/40',
                i > step && 'bg-background text-muted-foreground border-border'
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="font-semibold">{i + 1}</span>}
              {s.label}
            </button>
          ))}
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / ALL_STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 lg:px-8 lg:py-6 space-y-4">
        {current ? (
          current.questions.map((q) => (
            <section key={q.key} className="rounded-md border border-border bg-card p-4 space-y-3">
              <div>
                <h2 className="font-semibold text-base">{q.title}</h2>
                <p className="text-xs text-muted-foreground">{q.hint || (q.multi ? 'Marque quantas quiser' : 'Escolha uma opção')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const on = (answers[q.key] || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggle(q, opt)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/60'
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <>
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <Label htmlFor="wiz-name">Nome do treino</Label>
              <Input id="wiz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Treino Glúteos e Core" />
            </section>
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-base">Quantos exercícios?</h2>
              <div className="flex flex-wrap gap-2">
                {COUNT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm',
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
            <section className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
              <h2 className="font-semibold text-sm">Resumo do pedido</h2>
              {composedPrompt ? (
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans">{composedPrompt}</pre>
              ) : (
                <p className="text-xs text-muted-foreground">Responda pelo menos uma pergunta ou escreva o que deseja.</p>
              )}
            </section>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-5 py-3 lg:px-8 flex items-center gap-2">
        <Button variant="outline" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 0 ? 'Voltar' : 'Anterior'}
        </Button>
        <span className="flex-1 text-center text-xs text-muted-foreground truncate">
          {totalAnswered} respostas
        </span>
        {isLast ? (
          <Button
            disabled={!composedPrompt}
            onClick={() => onDone({ prompt: composedPrompt, name: name.trim() || 'Treino do assistente', count })}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Montar treino
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)}>
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
