import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Check, Loader2, Trash2, Share2, Calendar, Eye, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { collectUserData, downloadPDF } from '@/lib/exportUserData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareLink {
  id: string;
  token: string;
  period_days: number;
  expires_at: string;
  view_count: number;
  last_viewed_at: string | null;
  revoked: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERIOD_OPTIONS = [
  { v: 7, l: '7 dias' },
  { v: 30, l: '30 dias' },
  { v: 90, l: '90 dias' },
  { v: 365, l: '1 ano' },
];

const VALIDITY_OPTIONS = [
  { v: 1, l: '1 dia' },
  { v: 7, l: '7 dias' },
  { v: 30, l: '30 dias' },
];

export function ShareSummaryDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  
  const [periodDays, setPeriodDays] = useState(30);
  const [validityDays, setValidityDays] = useState(7);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchLinks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('share_summaries' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLinks((data as unknown as ShareLink[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchLinks();
  }, [open, user?.id]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);
      const { data, error } = await supabase
        .from('share_summaries' as any)
        .insert({
          user_id: user.id,
          period_days: periodDays,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Link criado');
      await fetchLinks();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar link');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from('share_summaries' as any)
      .update({ revoked: true })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao revogar');
    } else {
      toast.success('Link revogado');
      fetchLinks();
    }
  };

  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/r/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast.success('Link copiado');
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const handlePDF = async () => {
    if (!user) return;
    setPdfBusy(true);
    try {
      const data = await collectUserData(user.id, user.email ?? null);
      await downloadPDF(data);
      toast.success('PDF gerado');
    } catch (e) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const activeLinks = links.filter(
    (l) => !l.revoked && new Date(l.expires_at) > new Date(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-[calc(100vw-1rem)] min-w-0 max-w-md flex-col overflow-hidden p-0 sm:max-w-lg max-h-[92vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 px-5 pt-5 pr-10 text-left">
          <DialogTitle className="text-lg sm:text-xl">Compartilhar com profissional</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Compartilhe seus registros pessoais por PDF ou link temporário. Quem tiver o link poderá
            consultar os dados de saúde até expirar ou você revogar o acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-5 py-4">
          {/* PDF download */}
          <section className="rounded-md border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="text-sm font-semibold">Relatório completo em PDF</h3>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Inclui todo o histórico: perfil e metas, alimentação, líquidos, atividades, peso,
              glicemia, medidas, sinais vitais e relógio, bioimpedância, todos os marcadores dos
              exames, treinos com exercícios, preferências, cardápios, produtos e kits.
              Fotos, vídeos e arquivos originais permanecem no aplicativo; seus registros e resultados são incluídos.
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={handlePDF}
              disabled={pdfBusy}
              className="w-full h-11"
            >
              {pdfBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando…
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar relatório PDF
                </>
              )}
            </Button>
          </section>

          {/* Public link */}
          <section className="rounded-md border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="text-sm font-semibold">Link público temporário</h3>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Inclui as mesmas áreas do relatório, com os registros do período escolhido e os
              cadastros atuais. Abre sem conta e pode ser revogado a qualquer momento.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Período de dados
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                  {PERIOD_OPTIONS.map((p) => (
                    <Button
                      key={p.v}
                      variant="outline"
                      aria-pressed={periodDays === p.v}
                      onClick={() => setPeriodDays(p.v)}
                      className={cn(
                        'h-10 text-sm rounded-md border transition-colors active:scale-[0.98]',
                        periodDays === p.v
                          ? 'border-primary bg-primary/5 text-foreground font-medium'
                          : 'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {p.l}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Validade do link
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {VALIDITY_OPTIONS.map((p) => (
                    <Button
                      key={p.v}
                      variant="outline"
                      aria-pressed={validityDays === p.v}
                      onClick={() => setValidityDays(p.v)}
                      className={cn(
                        'h-10 text-sm rounded-md border transition-colors active:scale-[0.98]',
                        validityDays === p.v
                          ? 'border-primary bg-primary/5 text-foreground font-medium'
                          : 'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {p.l}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={creating} size="lg" className="w-full h-11">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando…
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Gerar link
                </>
              )}
            </Button>

            {/* Existing links */}
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                Carregando…
              </p>
            ) : activeLinks.length > 0 ? (
              <div className="space-y-2 pt-3 border-t border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Links ativos
                </p>
                {activeLinks.map((link) => {
                  const url = `${window.location.origin}/r/${link.token}`;
                  return (
                    <div
                      key={link.id}
                      className="rounded-md border border-border bg-background p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {link.period_days}d de dados
                        </span>
                        <span>·</span>
                        <span>
                          expira{' '}
                          {format(parseISO(link.expires_at), "d 'de' MMM", {
                            locale: ptBR,
                          })}
                        </span>
                        {link.view_count > 0 && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {link.view_count}
                            </span>
                          </>
                        )}
                      </div>
                      <code className="block w-full text-[11px] break-all bg-muted/40 px-2 py-1.5 rounded">
                        {url}
                      </code>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => handleCopy(link.token)}
                        >
                          {copiedToken === link.token ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copiar link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-destructive hover:text-destructive"
                          onClick={() => handleRevoke(link.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Revogar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border p-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full h-10">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
