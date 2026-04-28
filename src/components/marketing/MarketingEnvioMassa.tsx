import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Send, MessageCircle, Mail, Users, Clock, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Channel = 'whatsapp' | 'email';
type Step = 'channel' | 'recipients' | 'compose' | 'confirm';

const MarketingEnvioMassa: React.FC = () => {
  const { activeClinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'novo' | 'historico'>('novo');
  const [step, setStep] = useState<Step>('channel');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['marketing-students', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('clinic_students')
        .select('id, full_name, email, phone, active')
        .eq('clinic_id', activeClinicId)
        .eq('active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['marketing-bulk-sends', activeClinicId],
    queryFn: async () => {
      if (!activeClinicId) return [];
      const { data, error } = await supabase
        .from('marketing_bulk_sends')
        .select('*')
        .eq('clinic_id', activeClinicId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeClinicId,
  });

  const validRecipients = useMemo(() => {
    return students.filter(s =>
      channel === 'whatsapp' ? !!s.phone : !!s.email
    );
  }, [students, channel]);

  const selectedRecipients = useMemo(
    () => validRecipients.filter(s => selectedIds.includes(s.id)),
    [validRecipients, selectedIds]
  );

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeClinicId || !user) throw new Error('Sem clínica ativa');

      // Try webhook
      let webhookSuccess = 0;
      if (webhookUrl) {
        for (const r of selectedRecipients) {
          try {
            const personalizedMsg = message
              .replace(/\{\{nome\}\}/gi, r.full_name)
              .replace(/\{\{email\}\}/gi, r.email || '')
              .replace(/\{\{telefone\}\}/gi, r.phone || '');
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel,
                recipient: { id: r.id, name: r.full_name, email: r.email, phone: r.phone },
                message: personalizedMsg,
                timestamp: new Date().toISOString(),
              }),
            });
            webhookSuccess++;
          } catch (err) {
            console.error('Webhook failed for', r.id, err);
          }
        }
      }

      const { error } = await supabase.from('marketing_bulk_sends').insert({
        clinic_id: activeClinicId,
        channel,
        message,
        recipient_count: selectedRecipients.length,
        recipient_filter: { ids: selectedIds },
        status: webhookUrl ? `webhook: ${webhookSuccess}/${selectedRecipients.length}` : 'registered',
        webhook_url: webhookUrl || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Envio registrado!');
      queryClient.invalidateQueries({ queryKey: ['marketing-bulk-sends'] });
      setStep('channel');
      setSelectedIds([]);
      setMessage('');
      setWebhookUrl('');
      setTab('historico');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao enviar'),
  });

  const toggleAll = () => {
    if (selectedIds.length === validRecipients.length) setSelectedIds([]);
    else setSelectedIds(validRecipients.map(s => s.id));
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList>
        <TabsTrigger value="novo">Novo Envio</TabsTrigger>
        <TabsTrigger value="historico">Histórico ({history.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="novo" className="mt-4 space-y-4">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(['channel', 'recipients', 'compose', 'confirm'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <span className={step === s ? 'font-bold text-foreground' : ''}>
                {i + 1}. {s === 'channel' ? 'Canal' : s === 'recipients' ? 'Contatos' : s === 'compose' ? 'Mensagem' : 'Confirmar'}
              </span>
              {i < 3 && <span>→</span>}
            </React.Fragment>
          ))}
        </div>

        {step === 'channel' && (
          <div className="grid grid-cols-2 gap-3">
            {(['whatsapp', 'email'] as Channel[]).map(c => (
              <Card
                key={c}
                onClick={() => { setChannel(c); setStep('recipients'); setSelectedIds([]); }}
                className="p-6 cursor-pointer hover:border-primary transition flex flex-col items-center gap-2"
              >
                {c === 'whatsapp' ? <MessageCircle className="h-8 w-8 text-green-600" /> : <Mail className="h-8 w-8 text-blue-600" />}
                <span className="font-semibold">{c === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</span>
              </Card>
            ))}
          </div>
        )}

        {step === 'recipients' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {selectedIds.length} de {validRecipients.length} selecionados
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedIds.length === validRecipients.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <ScrollArea className="h-80 border rounded-md">
              <div className="p-2 space-y-1">
                {validRecipients.map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedIds.includes(s.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds(prev => checked ? [...prev, s.id] : prev.filter(i => i !== s.id));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {channel === 'whatsapp' ? s.phone : s.email}
                      </div>
                    </div>
                  </label>
                ))}
                {validRecipients.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum aluno com {channel === 'whatsapp' ? 'telefone' : 'e-mail'} cadastrado.
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('channel')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={() => setStep('compose')} disabled={selectedIds.length === 0}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 'compose' && (
          <div className="space-y-3">
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder={`Olá {{nome}}, ...`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis: <code>{'{{nome}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{telefone}}'}</code>
              </p>
            </div>
            <div>
              <Label>Webhook URL (opcional — n8n, Make, Zapier)</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se preenchido, dispara um POST por destinatário com o payload personalizado.
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('recipients')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
              <Button onClick={() => setStep('confirm')} disabled={!message.trim()}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge>{channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</Badge>
                <span>{selectedRecipients.length} destinatários</span>
                {webhookUrl && <Badge variant="outline">Webhook ativo</Badge>}
              </div>
              <div className="border-t pt-2">
                <div className="text-xs uppercase text-muted-foreground mb-1">Mensagem</div>
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              </div>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('compose')} disabled={sendMutation.isPending}>
                <ArrowLeft className="h-4 w-4 mr-1" />Voltar
              </Button>
              <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Enviar
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="historico" className="mt-4">
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {history.map((h: any) => (
              <Card key={h.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{h.channel}</Badge>
                      <Badge variant="secondary">{h.recipient_count} contatos</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{h.message}</p>
                    <div className="text-xs text-muted-foreground mt-1">Status: {h.status}</div>
                  </div>
                </div>
              </Card>
            ))}
            {history.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">Nenhum envio registrado.</div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};

export default MarketingEnvioMassa;
