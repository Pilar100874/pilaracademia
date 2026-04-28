import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

import { StepChannel } from "@/components/envio-massa/steps/StepChannel";
import { StepFilter } from "@/components/envio-massa/steps/StepFilter";
import { StepCompose } from "@/components/envio-massa/steps/StepCompose";
import { StepPreview } from "@/components/envio-massa/steps/StepPreview";
import { StepSchedule } from "@/components/envio-massa/steps/StepSchedule";
import { StepConfirm } from "@/components/envio-massa/steps/StepConfirm";
import { useContactsFilterMarketing } from "@/components/envio-massa/hooks/useContactsFilterMarketing";
import { useQuickReplies } from "@/components/envio-massa/hooks/useQuickReplies";
import { useMediaGallery } from "@/components/envio-massa/hooks/useMediaGallery";
import { useEnvioMassaTemplates } from "@/components/envio-massa/hooks/useEnvioMassaTemplates";
import { 
  WizardStep, ContentItem, ContactForBulkSend, 
  EnvioMassaFilters, EnvioMassaState, CanalEnvio 
} from "@/components/envio-massa/types";

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'channel', label: 'Canal', number: 1 },
  { key: 'filter', label: 'Filtrar Contatos', number: 2 },
  { key: 'compose', label: 'Montar Mensagem', number: 3 },
  { key: 'preview', label: 'Preview', number: 4 },
  { key: 'schedule', label: 'Agendar', number: 5 },
  { key: 'confirm', label: 'Confirmar', number: 6 },
];

const getInitialState = (): EnvioMassaState => ({
  step: 'channel',
  canal: null,
  filters: {},
  selectedContacts: [],
  contentItems: [],
  proximaDataContato: addDays(new Date(), 3)
});

export function EnvioMassaMarketing() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>('');
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [state, setState] = useState<EnvioMassaState>(getInitialState());
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Load estabelecimento and usuario
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      setEstabelecimentoId(estabId);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Get usuario.id from usuarios table
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (usuarioData) {
        setUsuarioId(usuarioData.id);
      }
    }
  };

  // Hooks for data - uses Marketing version (all contacts)
  const { 
    contacts,
    contactsByChannel,
    segmentos, 
    loading: loadingContacts,
    filters,
    applyFilters 
  } = useContactsFilterMarketing(estabelecimentoId, state.canal);

  const { 
    replies: quickReplies, 
    getGroupedReplies,
    loading: loadingReplies 
  } = useQuickReplies(estabelecimentoId);

  const { 
    templates: envioMassaTemplates,
    loading: loadingTemplates
  } = useEnvioMassaTemplates(estabelecimentoId);

  const { 
    media, 
    uploadMedia,
    loading: loadingMedia 
  } = useMediaGallery(estabelecimentoId);

  // Navigation
  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, step }));
  };

  const handleCanalChange = (canal: CanalEnvio) => {
    setState(prev => ({ 
      ...prev, 
      canal,
      selectedContacts: [] // Reset selected contacts when changing channel
    }));
  };

  const handleFilterChange = (newFilters: EnvioMassaFilters) => {
    applyFilters(newFilters);
    setState(prev => ({ ...prev, filters: newFilters }));
  };

  const handleSelectContacts = (contacts: ContactForBulkSend[]) => {
    setState(prev => ({ ...prev, selectedContacts: contacts }));
  };

  const handleContentChange = (items: ContentItem[]) => {
    setState(prev => ({ ...prev, contentItems: items }));
  };

  const handleDateChange = (date: Date) => {
    setState(prev => ({ ...prev, proximaDataContato: date }));
  };

  // Replace variables in content
  const replaceVariables = (text: string, contact: ContactForBulkSend) => {
    return text
      .replace(/\{\{contato\}\}/gi, contact.nome)
      .replace(/\{\{empresa\}\}/gi, contact.empresa || 'N/A')
      .replace(/\{\{whatsapp\}\}/gi, contact.telefone || 'N/A')
      .replace(/\{\{email\}\}/gi, contact.email || 'N/A');
  };

  // Get webhook config
  const getWebhookConfig = async () => {
    const { data: configData } = await supabase
      .from('envio_massa_config' as any)
      .select('webhook_id')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle() as any;

    if (!configData?.webhook_id) return null;

    const { data: webhookData } = await supabase
      .from('webhooks')
      .select('id, name, url, method')
      .eq('id', configData.webhook_id)
      .eq('active', true)
      .maybeSingle();

    return webhookData;
  };

  // Call webhook via n8n-proxy
  const callWebhook = async (webhookUrl: string, webhookMethod: string, payload: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          webhookUrl,
          payload,
          expectResponse: false,
          httpMethod: webhookMethod || 'POST'
        }
      });

      if (error) {
        console.error('Error calling webhook:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error calling webhook:', err);
      return false;
    }
  };

  // Send
  const handleConfirm = async () => {
    if (!usuarioId || !estabelecimentoId) {
      toast.error('Dados do usuário não encontrados');
      return;
    }

    setIsSending(true);
    setSendProgress(0);

    try {
      const webhook = await getWebhookConfig();
      
      const total = state.selectedContacts.length;
      let completed = 0;
      let webhookSuccess = 0;

      for (const contact of state.selectedContacts) {
        const description = state.contentItems
          .map((item, idx) => {
            const content = item.type === 'image' || item.type === 'video' 
              ? `[${item.type === 'video' ? 'Vídeo' : 'Imagem'}] ${item.content}`
              : replaceVariables(item.content, contact);
            return `${idx + 1}. ${content}`;
          })
          .join('\n');

        const { error } = await supabase
          .from('calendario_tarefas')
          .insert({
            user_id: usuarioId,
            estabelecimento_id: estabelecimentoId,
            contact_id: contact.id,
            contact_name: contact.nome,
            title: `Retorno: Envio em massa (${state.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'})`,
            description: description.substring(0, 1000),
            date: format(state.proximaDataContato, 'yyyy-MM-dd'),
            origem: 'envio_massa',
            origem_sub_item: state.canal,
            status: 'pendente'
          });

        if (error) {
          console.error('Error creating task:', error);
        }

        // Call webhook with full data payload for n8n
        if (webhook?.url) {
          const processedContentItems = state.contentItems.map(item => ({
            id: item.id,
            type: item.type,
            content: replaceVariables(item.content, contact),
            originalContent: item.content,
            mediaUrl: item.mediaUrl || null,
            mediaThumbnail: item.mediaThumbnail || null,
            mediaDuration: item.mediaDuration || null,
            quickReplyId: item.quickReplyId || null,
            quickReplyTitle: item.quickReplyTitle || null,
            catalogId: item.catalogId || null,
            catalogName: item.catalogName || null,
            fileType: item.fileType || null
          }));

          const webhookPayload = {
            contato: {
              id: contact.id,
              nome: contact.nome,
              telefone: contact.telefone,
              email: contact.email,
              empresa: contact.empresa || null,
              tags: contact.tags || []
            },
            canal: state.canal,
            estabelecimentoId: estabelecimentoId,
            usuarioId: usuarioId,
            contentItems: processedContentItems,
            mensagem: description,
            telefone: contact.telefone,
            email: contact.email,
            empresa: contact.empresa || null,
            mensagemPrincipal: state.contentItems.find(i => i.type === 'text' || i.type === 'quick_reply')
              ? replaceVariables(state.contentItems.find(i => i.type === 'text' || i.type === 'quick_reply')!.content, contact)
              : null,
            midia: state.contentItems
              .filter(i => i.type === 'image' || i.type === 'video')
              .map(i => ({
                type: i.type,
                url: i.mediaUrl,
                thumbnail: i.mediaThumbnail,
                duration: i.mediaDuration,
                caption: i.content
              })),
            catalogo: state.contentItems
              .filter(i => i.type === 'catalog')
              .map(i => ({
                id: i.catalogId,
                name: i.catalogName,
                url: i.mediaUrl
              })),
            arquivos: state.contentItems
              .filter(i => i.type === 'file')
              .map(i => ({
                type: i.fileType,
                url: i.mediaUrl,
                content: i.content
              })),
            proximaDataContato: format(state.proximaDataContato, 'yyyy-MM-dd'),
            proximaDataContatoISO: state.proximaDataContato.toISOString(),
            timestamp: new Date().toISOString(),
            totalContatos: total,
            contatoAtual: completed + 1,
            filtrosAplicados: state.filters
          };

          const success = await callWebhook(webhook.url, webhook.method, webhookPayload);
          if (success) webhookSuccess++;
        }

        completed++;
        setSendProgress((completed / total) * 100);
      }

      if (webhook?.url) {
        toast.success(`${completed} tarefas criadas e ${webhookSuccess} webhooks disparados!`);
      } else {
        toast.success(`${completed} tarefas criadas com sucesso!`);
      }
      
      // Reset wizard
      setState(getInitialState());
    } catch (error: any) {
      console.error('Error in bulk send:', error);
      toast.error('Erro ao processar envio em massa');
    } finally {
      setIsSending(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === state.step);

  return (
    <div className="flex flex-col h-full">
      {/* Header with channel badge */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Envio em Massa</h2>
          {state.canal && (
            <Badge variant="secondary">
              {state.canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
            </Badge>
          )}
        </div>
        <Badge variant="outline">
          Etapa {currentStepIndex + 1} de {STEPS.length}
        </Badge>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center py-3 px-2 overflow-x-auto border-b bg-muted/30 rounded-lg mb-4">
        {STEPS.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div 
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0
                ${index <= currentStepIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}
            >
              {step.number}
            </div>
            <span 
              className={`
                hidden sm:block ml-2 text-sm whitespace-nowrap
                ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div 
                className={`
                  w-4 sm:w-6 md:w-8 h-0.5 mx-1 sm:mx-2 shrink-0
                  ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        {state.step === 'channel' && (
          <StepChannel
            selectedCanal={state.canal}
            onSelectCanal={handleCanalChange}
            onNext={() => goToStep('filter')}
          />
        )}

        {state.step === 'filter' && (
          <StepFilter
            contacts={contacts}
            selectedContacts={state.selectedContacts}
            segmentos={segmentos}
            filters={state.filters}
            onFilterChange={handleFilterChange}
            onSelectContacts={handleSelectContacts}
            onBack={() => goToStep('channel')}
            onNext={() => goToStep('compose')}
            canal={state.canal}
          />
        )}

        {state.step === 'compose' && (
          <StepCompose
            contentItems={state.contentItems}
            quickReplies={quickReplies}
            groupedReplies={getGroupedReplies()}
            templates={envioMassaTemplates}
            media={media}
            onContentChange={handleContentChange}
            onUploadMedia={uploadMedia}
            onBack={() => goToStep('filter')}
            onNext={() => goToStep('preview')}
          />
        )}

        {state.step === 'preview' && (
          <StepPreview
            contentItems={state.contentItems}
            selectedContacts={state.selectedContacts}
            onBack={() => goToStep('compose')}
            onNext={() => goToStep('schedule')}
          />
        )}

        {state.step === 'schedule' && (
          <StepSchedule
            proximaDataContato={state.proximaDataContato}
            onDateChange={handleDateChange}
            onBack={() => goToStep('preview')}
            onNext={() => goToStep('confirm')}
          />
        )}

        {state.step === 'confirm' && (
          <StepConfirm
            contentItems={state.contentItems}
            selectedContacts={state.selectedContacts}
            proximaDataContato={state.proximaDataContato}
            isSending={isSending}
            progress={sendProgress}
            onBack={() => goToStep('schedule')}
            onConfirm={handleConfirm}
            canal={state.canal}
          />
        )}
      </div>
    </div>
  );
}
