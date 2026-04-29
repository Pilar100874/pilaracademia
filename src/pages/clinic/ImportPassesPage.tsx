import { useState, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClinicPageHeader } from '@/components/clinic/ClinicPageHeader';
import { PageMotion } from '@/components/PageMotion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2, X, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Platform = 'gympass' | 'totalpass' | 'classpass' | 'outro';

const PLATFORM_LABELS: Record<Platform, string> = {
  gympass: 'Gympass / Wellhub',
  totalpass: 'TotalPass',
  classpass: 'ClassPass',
  outro: 'Outro',
};

const PILAR_FIELDS = [
  { key: 'student_name', label: 'Nome do aluno', required: true },
  { key: 'student_email', label: 'E-mail', required: false },
  { key: 'student_document', label: 'CPF / Documento', required: false },
  { key: 'checkin_at', label: 'Data/hora da aula', required: true },
  { key: 'amount', label: 'Valor de repasse', required: false },
  { key: 'external_user_id', label: 'ID externo do aluno', required: false },
  { key: 'payment_status', label: 'Status do pagamento', required: false },
] as const;

type PilarFieldKey = typeof PILAR_FIELDS[number]['key'];
type Mapping = Partial<Record<PilarFieldKey, string>>;

const AUTO_DETECT: Record<PilarFieldKey, string[]> = {
  student_name: ['nome', 'name', 'aluno', 'usuario', 'user', 'cliente', 'customer', 'beneficiario', 'beneficiário', 'colaborador'],
  student_email: ['email', 'e-mail', 'mail'],
  student_document: ['cpf', 'documento', 'document', 'doc'],
  checkin_at: ['data', 'date', 'checkin', 'check-in', 'check in', 'horario', 'horário', 'hora', 'datetime', 'data da aula', 'data aula', 'visit'],
  amount: ['valor', 'amount', 'price', 'preço', 'preco', 'repasse', 'pagamento', 'total', 'comissao', 'comissão'],
  external_user_id: ['id', 'user_id', 'external_id', 'codigo', 'código', 'matricula', 'matrícula'],
  payment_status: ['status', 'situacao', 'situação', 'pago', 'paid'],
};

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function autoDetectMapping(headers: string[]): Mapping {
  const m: Mapping = {};
  for (const field of PILAR_FIELDS) {
    const candidates = AUTO_DETECT[field.key];
    const found = headers.find((h) => {
      const n = normalize(h);
      return candidates.some((c) => n === c || n.includes(c));
    });
    if (found) m[field.key] = found;
  }
  return m;
}

function parseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0));
  }
  if (typeof v === 'string') {
    const s = v.trim();
    const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (br) {
      const [, d, m, y, hh = '0', mm = '0', ss = '0'] = br;
      const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
      const dt = new Date(year, parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm), parseInt(ss));
      if (!isNaN(dt.getTime())) return dt;
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt;
  }
  return null;
}

function parseAmount(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[R$\s]/gi, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

interface ParsedRow {
  raw: Record<string, unknown>;
  student_name: string;
  student_email: string | null;
  student_document: string | null;
  checkin_at: Date | null;
  amount: number | null;
  external_user_id: string | null;
  payment_status: string | null;
  matched_student_id: string | null;
  status: 'ok' | 'no_date' | 'no_name' | 'unmatched' | 'duplicate';
  dedupe_key: string;
}

export default function ImportPassesPage() {
  const { activeClinicId, activeClinic } = useUserRoles();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [platform, setPlatform] = useState<Platform>('gympass');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [parsing, setParsing] = useState(false);

  const { data: savedMapping } = useQuery({
    queryKey: ['epc-mapping', activeClinicId, platform],
    queryFn: async () => {
      if (!activeClinicId) return null;
      const { data } = await supabase
        .from('external_pass_column_mappings')
        .select('mapping')
        .eq('clinic_id', activeClinicId)
        .eq('platform', platform)
        .maybeSingle();
      return (data?.mapping ?? null) as Mapping | null;
    },
    enabled: !!activeClinicId,
  });

  useMemo(() => {
    if (savedMapping && headers.length > 0 && Object.keys(mapping).length === 0) {
      setMapping(savedMapping);
    }
  }, [savedMapping, headers, mapping]);

  const { data: students = [] } = useQuery({
    queryKey: ['clinic-students-for-import', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('clinic_students')
        .select('id, full_name, email')
        .eq('clinic_id', activeClinicId);
      if (error) throw error;
      return (data ?? []).map((s) => ({ id: s.id, name: s.full_name, email: s.email }));
    },
    enabled: !!activeClinicId,
  });

  // Identidades externas já vinculadas — match instantâneo por external_user_id / e-mail / documento
  const { data: externalIdentities = [] } = useQuery({
    queryKey: ['student-external-identities', activeClinicId, platform],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('student_external_identities')
        .select('student_id, external_user_id, external_email, external_document')
        .eq('clinic_id', activeClinicId)
        .eq('platform', platform)
        .eq('active', true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeClinicId,
  });

  const { data: imports = [] } = useQuery({
    queryKey: ['external-pass-imports', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data } = await supabase
        .from('external_pass_imports')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!activeClinicId,
  });

  const { data: existingKeys = new Set<string>() } = useQuery({
    queryKey: ['epc-dedupe-keys', activeClinicId, platform],
    queryFn: async () => {
      if (!activeClinicId) return new Set<string>();
      const { data } = await supabase
        .from('external_pass_checkins')
        .select('dedupe_key')
        .eq('clinic_id', activeClinicId)
        .eq('platform', platform);
      return new Set((data ?? []).map((r) => r.dedupe_key));
    },
    enabled: !!activeClinicId,
  });

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
      if (json.length === 0) {
        toast.error('Planilha vazia');
        return;
      }
      const cols = Object.keys(json[0]);
      setHeaders(cols);
      setRows(json);
      setFileName(file.name);
      const auto = savedMapping ?? autoDetectMapping(cols);
      setMapping(auto);
      toast.success(`${json.length} linhas carregadas`);
    } catch (e) {
      console.error(e);
      toast.error('Não consegui ler o arquivo. Verifique se é CSV ou XLSX válido.');
    } finally {
      setParsing(false);
    }
  }, [savedMapping]);

  const parsed = useMemo<ParsedRow[]>(() => {
    if (rows.length === 0 || !mapping.student_name || !mapping.checkin_at) return [];

    const studentByEmail = new Map<string, string>();
    const studentByDoc = new Map<string, string>();
    const studentByName = new Map<string, string>();
    students.forEach((s) => {
      if (s.email) studentByEmail.set(normalize(s.email), s.id);
      if (s.name) studentByName.set(normalize(s.name), s.id);
    });

    const seen = new Set<string>();
    return rows.map((r) => {
      const name = String(r[mapping.student_name!] ?? '').trim();
      const email = mapping.student_email ? String(r[mapping.student_email] ?? '').trim() : '';
      const doc = mapping.student_document ? String(r[mapping.student_document] ?? '').replace(/\D/g, '') : '';
      const date = parseDate(r[mapping.checkin_at!]);
      const amount = mapping.amount ? parseAmount(r[mapping.amount]) : null;
      const extId = mapping.external_user_id ? String(r[mapping.external_user_id] ?? '').trim() : '';
      const status = mapping.payment_status ? String(r[mapping.payment_status] ?? '').trim() : '';

      let matched: string | null = null;
      if (email) matched = studentByEmail.get(normalize(email)) ?? null;
      if (!matched && doc) matched = studentByDoc.get(doc) ?? null;
      if (!matched && name) matched = studentByName.get(normalize(name)) ?? null;

      const dedupe = `${date?.toISOString() ?? 'no-date'}|${normalize(name)}|${email ? normalize(email) : ''}|${extId}`;
      let rowStatus: ParsedRow['status'] = 'ok';
      if (!name) rowStatus = 'no_name';
      else if (!date) rowStatus = 'no_date';
      else if (existingKeys.has(dedupe) || seen.has(dedupe)) rowStatus = 'duplicate';
      else if (!matched) rowStatus = 'unmatched';
      seen.add(dedupe);

      return {
        raw: r,
        student_name: name,
        student_email: email || null,
        student_document: doc || null,
        checkin_at: date,
        amount,
        external_user_id: extId || null,
        payment_status: status || null,
        matched_student_id: matched,
        status: rowStatus,
        dedupe_key: dedupe,
      };
    });
  }, [rows, mapping, students, existingKeys]);

  const stats = useMemo(() => {
    const total = parsed.length;
    const ok = parsed.filter((p) => p.status === 'ok').length;
    const matched = parsed.filter((p) => p.matched_student_id !== null && p.status !== 'duplicate' && p.checkin_at !== null && p.student_name).length;
    const unmatched = parsed.filter((p) => p.status === 'unmatched').length;
    const dup = parsed.filter((p) => p.status === 'duplicate').length;
    const errors = parsed.filter((p) => p.status === 'no_date' || p.status === 'no_name').length;
    const totalAmount = parsed.filter((p) => p.status !== 'duplicate' && p.amount).reduce((s, p) => s + (p.amount ?? 0), 0);
    return { total, ok, matched, unmatched, dup, errors, totalAmount };
  }, [parsed]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!activeClinicId) throw new Error('Sem clínica ativa');
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Sem usuário');

      await supabase.from('external_pass_column_mappings').upsert(
        {
          clinic_id: activeClinicId,
          platform,
          mapping: mapping as Record<string, string>,
          created_by: userId,
        },
        { onConflict: 'clinic_id,platform' }
      );

      const importable = parsed.filter((p) => p.status === 'ok' || p.status === 'unmatched');
      const totalAmount = importable.reduce((s, p) => s + (p.amount ?? 0), 0);

      const { data: imp, error: impErr } = await supabase
        .from('external_pass_imports')
        .insert({
          clinic_id: activeClinicId,
          platform,
          file_name: fileName,
          total_rows: parsed.length,
          matched_rows: parsed.filter((p) => p.matched_student_id).length,
          unmatched_rows: stats.unmatched,
          duplicate_rows: stats.dup,
          imported_rows: importable.length,
          total_amount: totalAmount || null,
          raw_columns: headers,
          created_by: userId,
        })
        .select()
        .single();
      if (impErr) throw impErr;

      const batchSize = 200;
      for (let i = 0; i < importable.length; i += batchSize) {
        const batch = importable.slice(i, i + batchSize).map((p) => ({
          import_id: imp.id,
          clinic_id: activeClinicId,
          platform,
          student_id: p.matched_student_id,
          external_user_id: p.external_user_id,
          student_name: p.student_name,
          student_email: p.student_email,
          student_document: p.student_document,
          checkin_at: p.checkin_at!.toISOString(),
          amount: p.amount,
          payment_status: p.payment_status,
          raw_row: p.raw as Record<string, unknown> as never,
          dedupe_key: p.dedupe_key,
        }));
        const { error } = await supabase.from('external_pass_checkins').insert(batch);
        if (error) throw error;
      }
      return imp;
    },
    onSuccess: () => {
      toast.success(`${stats.ok + stats.unmatched} check-ins importados!`);
      setRows([]);
      setHeaders([]);
      setFileName('');
      setMapping({});
      queryClient.invalidateQueries({ queryKey: ['external-pass-imports'] });
      queryClient.invalidateQueries({ queryKey: ['epc-dedupe-keys'] });
    },
    onError: (e: Error) => toast.error(`Erro ao importar: ${e.message}`),
  });

  const deleteImport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_pass_imports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Importação removida');
      queryClient.invalidateQueries({ queryKey: ['external-pass-imports'] });
      queryClient.invalidateQueries({ queryKey: ['epc-dedupe-keys'] });
    },
  });

  const reset = () => {
    setRows([]);
    setHeaders([]);
    setFileName('');
    setMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!activeClinic) {
    return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;
  }

  const canImport = parsed.length > 0 && (stats.ok + stats.unmatched) > 0 && !!mapping.student_name && !!mapping.checkin_at;

  return (
    <PageMotion>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <ClinicPageHeader icon={FileUp} title="Importar check-ins" subtitle="Gympass · TotalPass · ClassPass — sincronize as planilhas mensais" />

        <Card className="p-6 mb-6">
          <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-end">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">Plataforma</label>
              <Select value={platform} onValueChange={(v) => { setPlatform(v as Platform); reset(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">Planilha (CSV ou XLSX)</label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  disabled={parsing}
                />
                {fileName && (
                  <Button variant="ghost" size="icon" onClick={reset} title="Limpar">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {parsing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Lendo planilha…
            </div>
          )}
        </Card>

        {headers.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-xl">Mapear colunas</h3>
                <p className="text-sm text-muted-foreground">Escolha qual coluna da planilha corresponde a cada campo do Pilar. Salvamos para a próxima vez.</p>
              </div>
              <Badge variant="secondary"><FileSpreadsheet className="h-3 w-3 mr-1" />{fileName}</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {PILAR_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </label>
                  <Select
                    value={mapping[f.key] ?? '__none__'}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === '__none__' ? undefined : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="— ignorar —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— ignorar —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>
        )}

        {parsed.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="font-serif text-xl mb-4">Pré-visualização</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <Stat label="Total" value={stats.total} />
              <Stat label="Casados" value={stats.matched} className="text-green-700" />
              <Stat label="Não casados" value={stats.unmatched} className="text-amber-700" />
              <Stat label="Duplicados" value={stats.dup} className="text-muted-foreground" />
            </div>
            {stats.totalAmount > 0 && (
              <div className="text-sm text-muted-foreground mb-4">
                Total a receber: <strong className="text-foreground">R$ {stats.totalAmount.toFixed(2)}</strong>
              </div>
            )}

            {stats.errors > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>{stats.errors} linhas serão ignoradas por falta de nome ou data. Confira o mapeamento.</div>
              </div>
            )}

            <div className="border rounded-md overflow-hidden text-sm">
              <div className="max-h-80 overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Aluno</th>
                      <th className="text-left p-2 font-medium">Data</th>
                      <th className="text-right p-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 50).map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2"><StatusBadge status={p.status} /></td>
                        <td className="p-2">{p.student_name || <span className="text-muted-foreground italic">—</span>}</td>
                        <td className="p-2">{p.checkin_at ? format(p.checkin_at, "dd/MM/yy HH:mm", { locale: ptBR }) : <span className="text-destructive">sem data</span>}</td>
                        <td className="p-2 text-right">{p.amount != null ? `R$ ${p.amount.toFixed(2)}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 50 && (
                <div className="p-2 text-xs text-center text-muted-foreground bg-muted/30 border-t">
                  Mostrando 50 de {parsed.length}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={() => importMutation.mutate()} disabled={!canImport || importMutation.isPending}>
                {importMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Importar {stats.ok + stats.unmatched} check-ins
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="font-serif text-xl mb-4">Importações anteriores</h3>
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma importação ainda.</p>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      <Badge variant="outline">{PLATFORM_LABELS[imp.platform as Platform]}</Badge>
                      <span className="truncate">{imp.file_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} ·
                      {' '}{imp.imported_rows} importados · {imp.unmatched_rows} sem aluno · {imp.duplicate_rows} duplicados
                      {imp.total_amount && <> · R$ {Number(imp.total_amount).toFixed(2)}</>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm('Remover essa importação e todos os check-ins relacionados?')) {
                      deleteImport.mutate(imp.id);
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageMotion>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-serif mt-1 ${className ?? ''}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ParsedRow['status'] }) {
  switch (status) {
    case 'ok':
      return <Badge variant="outline" className="border-green-700 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Casado</Badge>;
    case 'unmatched':
      return <Badge variant="outline" className="border-amber-700 text-amber-700">Sem aluno</Badge>;
    case 'duplicate':
      return <Badge variant="outline" className="text-muted-foreground">Duplicado</Badge>;
    case 'no_date':
      return <Badge variant="destructive">Sem data</Badge>;
    case 'no_name':
      return <Badge variant="destructive">Sem nome</Badge>;
  }
}
