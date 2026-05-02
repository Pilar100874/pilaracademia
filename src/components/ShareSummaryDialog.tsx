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
import { useProfile } from '@/hooks/useProfile';
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
];

const VALIDITY_OPTIONS = [
  { v: 1, l: '1 dia' },
  { v: 7, l: '7 dias' },
  { v: 30, l: '30 dias' },
];

export function ShareSummaryDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
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
        className="max-w-md max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Compartilhar com profissional</DialogTitle>
          <DialogDescription>
            Gere um PDF para baixar ou um link público temporário para enviar ao seu nutricionista
            ou médico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* PDF download */}
          <section className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">PDF resumido</h3>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Baixa um PDF que você pode anexar por email ou WhatsApp. Inclui perfil, peso recente
              e marcadores fora da faixa.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePDF}
              disabled={pdfBusy}
              className="w-full"
            >
              {pdfBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Baixar PDF
                </>
              )}
            </Button>
          </section>

          {/* Public link */}
          <section className="rounded-md border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Link público temporário</h3>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Profissional abre direto no navegador, sem precisar de conta. Você pode revogar a
              qualquer momento.
            </p>

            <div className="space-y-2">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Período de dados
                </Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {PERIOD_OPTIONS.map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setPeriodDays(p.v)}
                      className={cn(
                        'text-xs py-1.5 rounded-md border transition-colors',
                        periodDays === p.v
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Validade do link
                </Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {VALIDITY_OPTIONS.map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setValidityDays(p.v)}
                      className={cn(
                        'text-xs py-1.5 rounded-md border transition-colors',
                        validityDays === p.v
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={creating} size="sm" className="w-full">
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
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
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Links ativos
                </p>
                {activeLinks.map((link) => {
                  const url = `${window.location.origin}/r/${link.token}`;
                  return (
                    <div
                      key={link.id}
                      className="rounded-md border border-border bg-background p-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
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
                      </div>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 text-[10px] truncate bg-muted/40 px-1.5 py-1 rounded">
                          {url}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(link.token)}
                        >
                          {copiedToken === link.token ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRevoke(link.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
