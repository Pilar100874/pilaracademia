import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  Apple,
  ChevronDown,
  ChevronRight,
  FileText,
  LineChart,
  List,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBloodExams, type BloodExamRow, type BloodMarker } from '@/hooks/useBloodExams';
import { BloodExamUploadDialog } from '@/components/BloodExamUploadDialog';
import { BloodMarkerTrendChart } from '@/components/BloodMarkerTrendChart';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';

const STATUS_TONE: Record<BloodMarker['status'], string> = {
  low: 'border-amber-300 bg-amber-50 text-amber-800',
  high: 'border-rose-300 bg-rose-50 text-rose-800',
  borderline: 'border-amber-300 bg-amber-50 text-amber-800',
  normal: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  unknown: 'border-border bg-muted/40 text-muted-foreground',
};

const STATUS_LABEL: Record<BloodMarker['status'], string> = {
  low: 'Baixo',
  high: 'Alto',
  borderline: 'Limítrofe',
  normal: 'Normal',
  unknown: '—',
};

const CATEGORY_LABEL: Record<string, string> = {
  hemograma: 'Hemograma',
  glicemia: 'Glicemia e insulina',
  lipidios: 'Perfil lipídico',
  hormonios: 'Hormônios',
  vitaminas_minerais: 'Vitaminas e minerais',
  rim_figado: 'Rim e fígado',
  outros: 'Outros',
};

function MarkerRow({ m }: { m: BloodMarker }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{m.label}</p>
        {(m.ref_min != null || m.ref_max != null) && (
          <p className="text-[11px] text-muted-foreground">
            Referência:{' '}
            {m.ref_min != null && m.ref_max != null
              ? `${m.ref_min} – ${m.ref_max}`
              : m.ref_min != null
                ? `≥ ${m.ref_min}`
                : `≤ ${m.ref_max}`}
            {m.unit ? ` ${m.unit}` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">
          {m.value != null ? m.value : '—'}
          {m.unit && <span className="text-[11px] text-muted-foreground ml-1">{m.unit}</span>}
        </p>
        <span
          className={cn(
            'inline-block text-[10px] px-1.5 py-0.5 rounded-full border mt-0.5',
            STATUS_TONE[m.status],
          )}
        >
          {STATUS_LABEL[m.status]}
        </span>
      </div>
    </div>
  );
}

function ExamCard({ exam, onDelete }: { exam: BloodExamRow; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, BloodMarker[]>();
    for (const m of exam.markers || []) {
      const k = m.category || 'outros';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries());
  }, [exam.markers]);

  const abnormal = (exam.markers || []).filter(
    (m) => m.status === 'high' || m.status === 'low' || m.status === 'borderline',
  ).length;

  const date = exam.collected_at || exam.created_at;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Exame de {format(parseISO(date), "d 'de' MMM, yyyy", { locale: ptBR })}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {exam.lab_name || exam.file_name || 'Laudo laboratorial'} ·{' '}
            {(exam.markers || []).length} marcadores
            {abnormal > 0 && ` · ${abnormal} fora da faixa`}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {exam.summary && (
            <div className="rounded-md bg-muted/40 border border-border p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Resumo
              </p>
              <p className="text-sm leading-relaxed">{exam.summary}</p>
            </div>
          )}

          {exam.alerts?.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <p className="text-[11px] uppercase tracking-wider text-amber-900">Atenção</p>
              </div>
              <ul className="space-y-1 text-sm text-amber-900">
                {exam.alerts.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          )}

          {exam.diet_recommendations?.length > 0 && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Apple className="h-3.5 w-3.5 text-emerald-700" />
                <p className="text-[11px] uppercase tracking-wider text-emerald-900">
                  Orientações alimentares
                </p>
              </div>
              <ul className="space-y-1 text-sm text-emerald-900">
                {exam.diet_recommendations.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          )}

          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                {CATEGORY_LABEL[cat] || cat}
              </p>
              <div className="rounded-md border border-border bg-background px-3">
                {items.map((m) => (
                  <MarkerRow key={m.key} m={m} />
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-border">
            {exam.file_url ? (
              <a
                href={exam.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Ver PDF original
              </a>
            ) : (
              <span />
            )}
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BloodExamsTab() {
  const { list, remove } = useBloodExams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'trends'>('list');

  const exams = list.data || [];
  const hasMultiple = exams.length >= 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Envie seus exames de sangue. A IA extrai os marcadores e usa nos cardápios, nos ajustes de
          nutrientes e nas sugestões de treino.
        </p>
        <Button size="sm" onClick={() => setUploadOpen(true)} className="shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Enviar
        </Button>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Como seus exames são usados</p>
        <ul className="text-[11px] leading-relaxed text-muted-foreground space-y-0.5 list-disc pl-4">
          <li>O <strong>cardápio diário</strong> prioriza alimentos alinhados aos marcadores fora da faixa.</li>
          <li>O <strong>ajuste de nutrientes</strong> considera alertas (ex.: colesterol, glicemia).</li>
          <li>As <strong>sugestões de treino com IA</strong> ajustam intensidade e segurança conforme seus marcadores (ex.: pressão, anemia, tireoide).</li>
        </ul>
        <p className="text-[10px] text-muted-foreground/80 pt-1">
          Seus dados ficam privados e nunca substituem orientação médica.
        </p>
      </div>

      <MedicalDisclaimer />

      {exams.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhum exame ainda"
          description="Envie o PDF do seu exame para personalizar cardápios, nutrientes e treinos com base nos seus marcadores."
          action={{ label: 'Enviar exame', icon: Plus, onClick: () => setUploadOpen(true) }}
        />
      ) : (
        <>
          {hasMultiple && (
            <div className="flex gap-1 p-1 bg-muted/40 rounded-md">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded transition-colors',
                  view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                <List className="h-3 w-3" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView('trends')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded transition-colors',
                  view === 'trends' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                <LineChart className="h-3 w-3" />
                Evolução
              </button>
            </div>
          )}

          {view === 'trends' && hasMultiple ? (
            <BloodMarkerTrendChart exams={exams} />
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} onDelete={() => setConfirmId(exam.id)} />
              ))}
            </div>
          )}
        </>
      )}

      <BloodExamUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <ConfirmDeleteDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) {
            remove.mutate(confirmId);
            setConfirmId(null);
          }
        }}
        title="Remover exame"
        description="Tem certeza? Os marcadores deste exame não serão mais usados nas recomendações."
      />
    </div>
  );
}
