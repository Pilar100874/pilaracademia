import { reportLabel } from '../../supabase/functions/_shared/professionalReport';

const values: Record<string, string> = { male: 'Masculino', female: 'Feminino', lose: 'Perder peso', maintain: 'Manter peso', gain: 'Ganhar massa', samsung_health: 'Samsung Health', heart_rate: 'Frequência cardíaca', resting_heart_rate: 'Frequência cardíaca em repouso', blood_pressure: 'Pressão arterial', oxygen_saturation: 'Oxigenação', body_fat: 'Gordura corporal', steps: 'Passos', sleep: 'Sono', normal: 'Dentro da referência', high: 'Acima da referência', low: 'Abaixo da referência', borderline: 'Limítrofe' };
function Value({ value }: { value: any }) {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  if (Array.isArray(value)) return value.length ? <div className="space-y-3">{value.map((item, index) => <div key={index} className="border-l border-border pl-3"><Value value={item} /></div>)}</div> : <span className="text-muted-foreground">—</span>;
  if (typeof value === 'object') return <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(value).map(([key, item]) => <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{reportLabel(key)}</dt><dd className="mt-1 break-words text-sm"><Value value={item} /></dd></div>)}</dl>;
  if (typeof value === 'boolean') return <span>{value ? 'Sim' : 'Não'}</span>;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(text)) return <span>{new Date(text.length === 10 ? `${text}T12:00:00` : text).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>;
  return <span className="whitespace-pre-wrap">{values[text] ?? text}</span>;
}
export function ProfessionalReportRecords({ records }: { records: any[] }) {
  if (!records.length) return <p className="py-3 text-sm text-muted-foreground">Sem registros neste período.</p>;
  return <div className="divide-y divide-border">{records.map((record, index) => <article key={index} className="py-5"><p className="mb-4 text-xs font-medium text-muted-foreground">Registro {index + 1} de {records.length}</p><Value value={record} /></article>)}</div>;
}
