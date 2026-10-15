import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUp,
  CalendarIcon,
  Columns2,
  Minus,
  Pencil,
  Plus,
  Ruler,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BodyFigure, BodyMorph, MARKER_ORDER, type MorphCallout } from '@/components/BodyFigure';
import type { BodySex } from '@/components/HumanBodyFigure';
import { useProfile } from '@/hooks/useProfile';

type MeasurementRow = Tables<'body_measurements'>;

/* ------------------------------------------------------------------ */
/* Field definitions                                                   */
/* ------------------------------------------------------------------ */

interface FieldSpec {
  key: keyof MeasurementRow;
  label: string;
  hint?: string;
  group: string;
  direction: 'down-good' | 'neutral';
}

const FIELDS: FieldSpec[] = [
  { key: 'neck_cm', label: 'Pescoço', group: 'Parte superior', direction: 'neutral' },
  { key: 'shoulders_cm', label: 'Ombros', hint: 'na parte mais larga', group: 'Parte superior', direction: 'neutral' },
  { key: 'chest_cm', label: 'Peitoral', hint: 'na altura dos mamilos', group: 'Parte superior', direction: 'neutral' },
  { key: 'arm_left_cm', label: 'Braço esquerdo', hint: 'relaxado, na parte mais grossa', group: 'Parte superior', direction: 'neutral' },
  { key: 'arm_right_cm', label: 'Braço direito', hint: 'relaxado, na parte mais grossa', group: 'Parte superior', direction: 'neutral' },
  { key: 'forearm_left_cm', label: 'Antebraço esquerdo', group: 'Parte superior', direction: 'neutral' },
  { key: 'forearm_right_cm', label: 'Antebraço direito', group: 'Parte superior', direction: 'neutral' },
  { key: 'waist_cm', label: 'Cintura', hint: 'na altura do umbigo', group: 'Tronco', direction: 'down-good' },
  { key: 'abdomen_cm', label: 'Abdômen', hint: '2 dedos abaixo do umbigo', group: 'Tronco', direction: 'down-good' },
  { key: 'hip_cm', label: 'Quadril', hint: 'na parte mais larga do bumbum', group: 'Tronco', direction: 'neutral' },
  { key: 'thigh_left_cm', label: 'Coxa esquerda', hint: 'na parte mais grossa', group: 'Parte inferior', direction: 'neutral' },
  { key: 'thigh_right_cm', label: 'Coxa direita', hint: 'na parte mais grossa', group: 'Parte inferior', direction: 'neutral' },
  { key: 'calf_left_cm', label: 'Panturrilha esquerda', group: 'Parte inferior', direction: 'neutral' },
  { key: 'calf_right_cm', label: 'Panturrilha direita', group: 'Parte inferior', direction: 'neutral' },
];

const GROUPS = ['Parte superior', 'Tronco', 'Parte inferior'];

const rowLabel = (r: MeasurementRow) =>
  format(parseISO(r.measured_at), "d 'de' MMM, yyyy", { locale: ptBR });

const parseMeasure = (raw: string): number | null => {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 300) return null;
  return Math.round(n * 10) / 10;
};

const fmtCm = (v: number | null | undefined) =>
  v != null && Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '—';

/* ------------------------------------------------------------------ */
/* Data hook                                                           */
/* ------------------------------------------------------------------ */

function useMeasurements() {
  return useQuery({
    queryKey: ['body_measurements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('measured_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MeasurementRow[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Main tab                                                            */
/* ------------------------------------------------------------------ */

export function MeasurementsTab() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useMeasurements();
  const [mode, setMode] = useState<'list' | 'compare'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MeasurementRow | null>(null);
  const [deleting, setDeleting] = useState<MeasurementRow | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('body_measurements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body_measurements'] });
      toast.success('Medição excluída.');
      setDeleting(null);
    },
    onError: () => toast.error('Não foi possível excluir. Tente novamente.'),
  });

  if (mode === 'compare' && rows.length >= 2) {
    return <MeasurementsCompare rows={rows} sex={profile?.gender} onClose={() => setMode('list')} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Medidas com trena</h2>
          <p className="text-xs text-muted-foreground">
            Registre circunferências do corpo e acompanhe a evolução.
          </p>
        </div>
        <div className="flex gap-2">
          {rows.length >= 2 && (
            <Button variant="outline" size="sm" onClick={() => setMode('compare')}>
              <Columns2 className="h-4 w-4 mr-1.5" />
              Comparar
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova medição
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Ruler className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Nenhuma medição ainda</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Anote suas medidas de trena — cintura, quadril, braços, coxas e mais — para comparar sua evolução ao longo do tempo.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Registrar primeira medição
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const filled = FIELDS.filter((f) => r[f.key] != null);
            return (
              <div
                key={r.id}
                className="rounded-md border border-border bg-card p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Ruler className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{rowLabel(r)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {filled.length > 0
                      ? filled
                          .slice(0, 4)
                          .map((f) => `${f.label}: ${fmtCm(r[f.key] as number)} cm`)
                          .join(' · ') + (filled.length > 4 ? ` · +${filled.length - 4}` : '')
                      : 'Sem medidas preenchidas'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar medição"
                  onClick={() => {
                    setEditing(r);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir medição"
                  onClick={() => setDeleting(r)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <MeasurementDialog
        sex={profile?.gender}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['body_measurements'] });
          setDialogOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir medição?</AlertDialogTitle>
            <AlertDialogDescription>
              A medição de {deleting ? rowLabel(deleting) : ''} será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit dialog                                                   */
/* ------------------------------------------------------------------ */

function MeasurementDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  sex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MeasurementRow | null;
  onSaved: () => void;
  sex?: BodySex;
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const numericValues = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const f of FIELDS) out[f.key as string] = parseMeasure(values[f.key as string] ?? '');
    return out;
  }, [values]);

  const focusField = (key: string) => {
    setActiveKey(key);
    const el = inputRefs.current[key];
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.focus({ preventScroll: true });
    }
  };

  const initFrom = (row: MeasurementRow | null) => {
    setDate(row ? parseISO(row.measured_at) : new Date());
    const v: Record<string, string> = {};
    for (const f of FIELDS) {
      const val = row?.[f.key] as number | null | undefined;
      if (val != null) v[f.key as string] = String(val).replace('.', ',');
    }
    setValues(v);
    setNotes(row?.notes ?? '');
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      measured_at: format(date, 'yyyy-MM-dd'),
      notes: notes.trim() || null,
    };
    let filled = 0;
    for (const f of FIELDS) {
      const parsed = parseMeasure(values[f.key as string] ?? '');
      payload[f.key as string] = parsed;
      if (parsed != null) filled += 1;
    }
    if (filled === 0) {
      toast.error('Preencha pelo menos uma medida.');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('not-authenticated');
      if (editing) {
        const { error } = await supabase
          .from('body_measurements')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('body_measurements')
          .insert({ ...payload, user_id: userData.user.id });
        if (error) throw error;
      }
      toast.success(editing ? 'Medição atualizada.' : 'Medição salva.');
      onSaved();
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (open) initFrom(editing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col overflow-hidden p-0 max-w-lg sm:max-w-2xl max-h-[90vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle>{editing ? 'Editar medição' : 'Nova medição'}</DialogTitle>
          <DialogDescription>
            Meça com a trena justa ao corpo, sem apertar. Preencha só as medidas que quiser.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="sm:grid sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-5 space-y-5 sm:space-y-0">
            <div>
              <div className="sm:sticky sm:top-0">
                <BodyFigure
                  sex={sex}
                  values={numericValues}
                  activeKey={activeKey}
                  onMarkerClick={focusField}
                />
                <p className="text-[10px] text-muted-foreground text-center mt-1 leading-snug">
                  Toque nos números da figura para ir até a medida correspondente.
                </p>
              </div>
            </div>
            <div className="space-y-5 min-w-0">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Data da medição</p>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) setDate(d);
                    setCalendarOpen(false);
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {GROUPS.map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                {group}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FIELDS.filter((f) => f.group === group).map((f) => (
                  <div key={f.key as string} className="space-y-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold mr-1 align-middle">
                        {MARKER_ORDER[f.key as string]}
                      </span>
                      {f.label}
                    </p>
                    {f.hint && (
                      <p className="text-[10px] text-muted-foreground truncate">{f.hint}</p>
                    )}
                    <div className="relative">
                      <Input
                        ref={(el) => {
                          inputRefs.current[f.key as string] = el;
                        }}
                        inputMode="decimal"
                        placeholder="0,0"
                        value={values[f.key as string] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (/^[\d.,]*$/.test(raw)) {
                            setValues((prev) => ({ ...prev, [f.key as string]: raw }));
                          }
                        }}
                        onFocus={() => setActiveKey(f.key as string)}
                        className={cn('pr-9', activeKey === (f.key as string) && 'ring-1 ring-primary')}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Observações (opcional)</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: medido em jejum, pela manhã"
              maxLength={300}
              rows={2}
            />
          </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar medição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Compare view                                                        */
/* ------------------------------------------------------------------ */

/** Callouts do morph: uma seta com nome para cada grupo de medida, sempre
 *  visível (mostra "—" quando a medida não foi preenchida em nenhuma das duas). */
function measurementCallouts(rowA: MeasurementRow, rowB: MeasurementRow): MorphCallout[] {
  const get = (row: MeasurementRow, key: string): number | null => {
    const v = row[key] as number | null;
    return v != null && Number.isFinite(v) && v > 0 ? v : null;
  };
  const pair = (row: MeasurementRow, a: string, b: string): number | null => {
    const nums = [get(row, a), get(row, b)].filter((v): v is number => v != null);
    return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
  };
  const A = (k: string) => get(rowA, k);
  const B = (k: string) => get(rowB, k);
  const pA = (a: string, b: string) => pair(rowA, a, b);
  const pB = (a: string, b: string) => pair(rowB, a, b);
  return [
    { side: 'left', region: 'trunk', at: 'neck', label: 'Pescoço', a: A('neck_cm'), b: B('neck_cm'), unit: 'cm', y: 52 },
    { side: 'left', region: 'leftArm', at: 'arm', label: 'Braço', a: pA('arm_left_cm', 'arm_right_cm'), b: pB('arm_left_cm', 'arm_right_cm'), unit: 'cm', y: 116 },
    { side: 'left', region: 'trunk', at: 'waist', label: 'Cintura', a: A('waist_cm'), b: B('waist_cm'), unit: 'cm', y: 180 },
    { side: 'left', region: 'trunk', at: 'abdomen', label: 'Abdômen', a: A('abdomen_cm'), b: B('abdomen_cm'), unit: 'cm', y: 244 },
    { side: 'left', region: 'leftLeg', at: 'thigh', label: 'Coxa', a: pA('thigh_left_cm', 'thigh_right_cm'), b: pB('thigh_left_cm', 'thigh_right_cm'), unit: 'cm', y: 308 },
    { side: 'right', region: 'trunk', at: 'shoulder', label: 'Ombros', a: A('shoulders_cm'), b: B('shoulders_cm'), unit: 'cm', y: 52 },
    { side: 'right', region: 'trunk', at: 'chest', label: 'Peito', a: A('chest_cm'), b: B('chest_cm'), unit: 'cm', y: 116 },
    { side: 'right', region: 'rightArm', at: 'forearm', label: 'Antebraço', a: pA('forearm_left_cm', 'forearm_right_cm'), b: pB('forearm_left_cm', 'forearm_right_cm'), unit: 'cm', y: 180 },
    { side: 'right', region: 'trunk', at: 'hip', label: 'Quadril', a: A('hip_cm'), b: B('hip_cm'), unit: 'cm', y: 244 },
    { side: 'right', region: 'rightLeg', at: 'calf', label: 'Panturrilha', a: pA('calf_left_cm', 'calf_right_cm'), b: pB('calf_left_cm', 'calf_right_cm'), unit: 'cm', y: 308 },
  ];
}

function MeasurementsCompare({
  rows,
  onClose,
  sex,
}: {
  rows: MeasurementRow[];
  onClose: () => void;
  sex?: BodySex;
}) {
  // Padrão cronológico: A = medição mais antiga, B = mais recente.
  // Sem isso, medições na mesma data caem em ordem arbitrária do banco e a
  // animação antes→depois pode tocar ao contrário.
  const chrono = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const d = a.measured_at.localeCompare(b.measured_at);
        return d !== 0 ? d : (a.created_at ?? '').localeCompare(b.created_at ?? '');
      }),
    [rows],
  );
  const [idA, setIdA] = useState<string>(chrono[0].id);
  const [idB, setIdB] = useState<string>(chrono[chrono.length - 1].id);

  const rowA = rows.find((r) => r.id === idA) ?? rows[0];
  const rowB = rows.find((r) => r.id === idB) ?? rows[0];

  const visibleFields = useMemo(
    () =>
      FIELDS.filter((f) => {
        const a = rowA[f.key] as number | null;
        const b = rowB[f.key] as number | null;
        return (a != null && Number.isFinite(a)) || (b != null && Number.isFinite(b));
      }),
    [rowA, rowB],
  );

  const totals = useMemo(() => {
    const sum = (r: MeasurementRow) =>
      visibleFields.reduce((acc, f) => acc + ((r[f.key] as number | null) ?? 0), 0);
    return { a: sum(rowA), b: sum(rowB) };
  }, [rowA, rowB, visibleFields]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Comparar medições</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Medição A (antes)</p>
          <Select value={idA} onValueChange={setIdA}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={r.id === idB}>
                  {rowLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => {
            setIdA(idB);
            setIdB(idA);
          }}
          aria-label="Inverter medições"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Medição B (depois)</p>
          <Select value={idB} onValueChange={setIdB}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rows.map((r) => (
                <SelectItem key={r.id} value={r.id} disabled={r.id === idA}>
                  {rowLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Total comparison */}
      <div className="rounded-md border border-border bg-card p-4 flex items-center justify-around">
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Medição A</p>
          <p className="text-3xl font-bold leading-tight">{fmtCm(totals.a)}</p>
          <p className="text-[10px] text-muted-foreground">cm somados</p>
        </div>
        <DeltaBadge delta={totals.b - totals.a} direction="down-good" />
        <div className="text-center">
          <p className="text-[11px] text-muted-foreground">Medição B</p>
          <p className="text-3xl font-bold leading-tight text-primary">{fmtCm(totals.b)}</p>
          <p className="text-[10px] text-muted-foreground">cm somados</p>
        </div>
      </div>

      <BodyMorph
        sex={sex}
        valuesA={rowA as unknown as Record<string, number | null>}
        valuesB={rowB as unknown as Record<string, number | null>}
        labelA={rowLabel(rowA)}
        labelB={rowLabel(rowB)}
        callouts={measurementCallouts(rowA, rowB)}
      />

      <div className="space-y-3">
        {visibleFields.map((f) => (
          <MeasureCompareRow key={f.key as string} field={f} rowA={rowA} rowB={rowB} />
        ))}
      </div>

      {visibleFields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          As medições selecionadas não têm medidas em comum para comparar.
        </p>
      )}

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Na soma total, menos centímetros em geral indica redução de medidas. Para braços, peito e
          coxas, o aumento pode significar ganho de massa muscular — interprete junto com sua
          bioimpedância.
        </p>
      </div>
    </div>
  );
}

function DeltaBadge({
  delta,
  direction,
}: {
  delta: number | null;
  direction: 'down-good' | 'neutral';
}) {
  if (delta == null || !Number.isFinite(delta))
    return <span className="text-xs text-muted-foreground">—</span>;
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
        <Minus className="h-3 w-3" /> estável
      </span>
    );
  }
  const good = direction === 'neutral' ? null : delta < 0;
  const cls =
    good == null
      ? 'bg-muted text-muted-foreground border-border'
      : good
        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
        : 'bg-red-500/10 text-red-700 border-red-500/30';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border font-medium',
        cls,
      )}
    >
      {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {delta > 0 ? '+' : ''}
      {delta.toFixed(1).replace('.', ',')} cm
    </span>
  );
}

function MeasureCompareRow({
  field,
  rowA,
  rowB,
}: {
  field: FieldSpec;
  rowA: MeasurementRow;
  rowB: MeasurementRow;
}) {
  const rawA = rowA[field.key] as number | null;
  const rawB = rowB[field.key] as number | null;
  const a = rawA != null && Number.isFinite(rawA) ? rawA : null;
  const b = rawB != null && Number.isFinite(rawB) ? rawB : null;
  const max = Math.max(a ?? 0, b ?? 0) || 1;
  const delta = a != null && b != null ? b - a : null;

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">{field.label}</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: a, primary: false },
          { value: b, primary: true },
        ].map(({ value, primary }, idx) => (
          <div key={idx} className="space-y-1.5 min-w-0">
            <p className="text-[10px] text-muted-foreground">{idx === 0 ? 'Medição A' : 'Medição B'}</p>
            <p className={cn('text-xl font-semibold leading-none', primary && 'text-primary')}>
              {fmtCm(value)}
              {value != null && (
                <span className="text-[11px] font-normal text-muted-foreground ml-1">cm</span>
              )}
            </p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              {value != null && (
                <div
                  className={cn('h-full rounded-full', primary ? 'bg-primary' : 'bg-muted-foreground/40')}
                  style={{ width: `${Math.max(4, Math.round((value / max) * 100))}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Variação de A para B</p>
        <DeltaBadge delta={delta} direction={field.direction} />
      </div>
    </div>
  );
}
