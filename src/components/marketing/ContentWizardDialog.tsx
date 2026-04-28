import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Send,
  Image,
  Music,
  Video,
  FileText,
  MessageCircle,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Info,
  RefreshCw,
  X,
  Upload,
  Save,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import {
  MarketingResource,
  PublishChannel,
  CHANNEL_CONFIG,
  ReturnType,
  RETURN_TYPE_LABELS,
  FormStep,
} from './types';


interface ContentWizardDialogProps {
  open: boolean;
  onClose: () => void;
  resource: MarketingResource;
  initialFieldValues?: Record<string, any>;
  presetId?: string;
  presetName?: string;
}

const ChannelIcon: React.FC<{ channel: PublishChannel }> = ({ channel }) => {
  const icons: Record<PublishChannel, React.ReactNode> = {
    whatsapp: <MessageCircle className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    twitter: <span className="text-lg font-bold">𝕏</span>,
    linkedin: <Linkedin className="h-5 w-5" />,
    telegram: <Send className="h-5 w-5" />,
    email: <Mail className="h-5 w-5" />,
  };
  return <>{icons[channel]}</>;
};

const ReturnTypeIcon: React.FC<{ type: ReturnType }> = ({ type }) => {
  const icons: Record<ReturnType, React.ReactNode> = {
    image: <Image className="h-8 w-8" />,
    audio: <Music className="h-8 w-8" />,
    video: <Video className="h-8 w-8" />,
    text: <FileText className="h-8 w-8" />,
  };
  return <>{icons[type]}</>;
};

export const ContentWizardDialog: React.FC<ContentWizardDialogProps> = ({
  open,
  onClose,
  resource,
  initialFieldValues,
  presetId: initialPresetId,
  presetName: initialPresetName,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(initialFieldValues || {});
  const [selectedChannels, setSelectedChannels] = useState<PublishChannel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState<{ type: ReturnType; content: string } | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  // Preset states
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showNewPresetInput, setShowNewPresetInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Função para converter URL de produção para teste
  const getWebhookUrl = (url: string | undefined, testMode: boolean): string => {
    if (!url) return '';
    if (testMode) {
      // Converter /webhook/ para /webhook-test/
      return url.replace('/webhook/', '/webhook-test/');
    }
    return url;
  };

  // Verifica se está usando URL de teste
  const isUsingTestUrl = (url: string | undefined): boolean => {
    return url?.includes('/webhook-test/') || false;
  };

  // Estado para canais ativos do sistema
  const [activeSystemChannels, setActiveSystemChannels] = useState<string[]>([]);

  // Load estabelecimento_id e canais ativos
  useEffect(() => {
    const storedId = localStorage.getItem('estabelecimentoId');
    if (storedId) {
      setEstabelecimentoId(storedId);
      
      // Buscar canais ativos
      const fetchActiveChannels = async () => {
        const { data } = await supabase
          .from('canais_atendimento')
          .select('whatsapp_enabled, telegram_enabled, webchat_enabled')
          .eq('estabelecimento_id', storedId)
          .single();
        
        if (data) {
          const active: string[] = [];
          if (data.whatsapp_enabled) active.push('whatsapp');
          if (data.telegram_enabled) active.push('telegram');
          if (data.webchat_enabled) active.push('webchat');
          setActiveSystemChannels(active);
        }
      };
      
      fetchActiveChannels();
    }
  }, []);

  // Reset field values when opening with initial values
  useEffect(() => {
    if (open && initialFieldValues) {
      setFieldValues(initialFieldValues);
    }
  }, [open, initialFieldValues]);

  const handleSavePreset = async () => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    setIsSavingPreset(true);
    try {
      if (initialPresetId) {
        // Update existing preset
        const { error } = await supabase
          .from('marketing_resource_presets')
          .update({ field_values: fieldValues })
          .eq('id', initialPresetId);

        if (error) throw error;
        toast.success('Preset atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('Erro ao salvar preset');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleSaveNewPreset = async () => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não encontrado');
      return;
    }

    if (!newPresetName.trim()) {
      toast.error('Digite um nome para o preset');
      return;
    }

    setIsSavingPreset(true);
    try {
      const { error } = await supabase
        .from('marketing_resource_presets')
        .insert({
          estabelecimento_id: estabelecimentoId,
          resource_id: resource.id,
          nome: newPresetName.trim(),
          field_values: fieldValues,
        });

      if (error) throw error;
      toast.success('Preset criado com sucesso!');
      setShowNewPresetInput(false);
      setNewPresetName('');
    } catch (error) {
      console.error('Error creating preset:', error);
      toast.error('Erro ao criar preset');
    } finally {
      setIsSavingPreset(false);
    }
  };

  // Build wizard steps: form steps → review → result → channels (if has publish channels)
  const wizardSteps = useMemo(() => {
    const steps: { id: string; type: 'form' | 'channels' | 'review' | 'result' | 'publish'; label: string; formStep?: FormStep }[] = [];
    
    // Add form steps
    if (resource.steps && resource.steps.length > 0) {
      resource.steps.forEach((formStep) => {
        steps.push({
          id: `form-${formStep.id}`,
          type: 'form',
          label: formStep.title,
          formStep,
        });
      });
    } else if (resource.fields.length > 0) {
      // If no steps defined but has fields, show all fields in one step
      steps.push({
        id: 'form-all',
        type: 'form',
        label: 'Preencher Campos',
      });
    }
    
    // Add review step (shows JSON of 1st webhook)
    steps.push({ id: 'review', type: 'review', label: 'Revisar' });
    
    // Add result step (content generation)
    steps.push({ id: 'result', type: 'result', label: 'Resultado' });
    
    // Add channels + publish step (only if has publish channels configured AND at least one is active in the system)
    const configuredChannels = resource.publishChannels || [];
    const hasActivePublishChannels = configuredChannels.some(channel => 
      activeSystemChannels.includes(channel)
    );
    if (hasActivePublishChannels) {
      steps.push({ id: 'publish', type: 'publish', label: 'Publicar' });
    }
    
    return steps;
  }, [resource.steps, resource.fields.length, resource.publishChannels, activeSystemChannels]);

  const currentStep = wizardSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / wizardSteps.length) * 100;

  // Generate payload for 1st webhook (generation) - includes hidden fields with default values
  const generatePayload = useMemo(() => ({
    resourceId: resource.id,
    resourceName: resource.name,
    returnType: resource.returnType,
    fields: resource.fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      value: field.hidden ? (fieldValues[field.id] ?? field.defaultValue ?? '') : fieldValues[field.id],
      hidden: field.hidden || false,
    })),
    timestamp: new Date().toISOString(),
  }), [resource, fieldValues]);

  // Generate payload for 2nd webhook (publishing)
  const publishPayload = useMemo(() => ({
    resourceId: resource.id,
    resourceName: resource.name,
    returnType: resource.returnType,
    content: result?.content || '',
    contentType: result?.type || resource.returnType,
    channels: selectedChannels,
    fields: resource.fields.map((field) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      value: fieldValues[field.id],
    })),
    timestamp: new Date().toISOString(),
  }), [resource, result, selectedChannels, fieldValues]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleChannel = (channel: PublishChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const getFieldsForCurrentStep = () => {
    if (currentStep?.type !== 'form') return [];
    
    if (currentStep.formStep) {
      // Return visible fields belonging to this step (exclude hidden fields)
      return resource.fields.filter((f) => f.stepId === currentStep.formStep?.id && !f.hidden);
    }
    
    // Return all visible fields (no steps defined, exclude hidden fields)
    return resource.fields.filter((f) => !f.hidden);
  };

  const validateCurrentStep = () => {
    if (currentStep?.type !== 'form') return true;
    
    const stepFields = getFieldsForCurrentStep();
    const missingRequired = stepFields.filter(
      (field) => field.required && !fieldValues[field.id]
    );
    return missingRequired.length === 0;
  };

  const goToNextStep = () => {
    if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!resource.n8nWebhookUrl) {
      toast.error('URL do webhook n8n não configurada neste recurso');
      return;
    }

    setIsProcessing(true);
    goToNextStep(); // Go to result step

    try {
      // Prepare payload - include hidden fields with their default values
      const payload = {
        resourceId: resource.id,
        resourceName: resource.name,
        returnType: resource.returnType,
        fields: resource.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          value: field.hidden ? (fieldValues[field.id] ?? field.defaultValue ?? '') : fieldValues[field.id],
          hidden: field.hidden || false,
        })),
        channels: selectedChannels,
        autoPublishEnabled: resource.autoPublishEnabled || false,
        timestamp: new Date().toISOString(),
      };

      // Check if webhook has response enabled
      const webhookHasResponse = resource.webhookHasResponse ?? true;

      // Get the correct webhook URL (test or production)
      const webhookUrl = getWebhookUrl(resource.n8nWebhookUrl, isTestMode);

      // Use Edge Function proxy to avoid CORS issues
      const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('n8n-proxy', {
        body: {
          webhookUrl,
          payload,
          expectResponse: webhookHasResponse,
        },
      });

      if (proxyError) {
        throw new Error(proxyError.message || 'Erro ao chamar proxy');
      }

      if (webhookHasResponse) {
        if (!proxyResponse?.success) {
          throw new Error(proxyResponse?.error || 'Erro ao enviar para n8n');
        }

        const data = proxyResponse.data;
        const contentResult = data?.result || data?.url || data?.text || (typeof data === 'string' ? data : '');

        // Set result based on return type
        setResult({
          type: resource.returnType,
          content: contentResult,
        });

        toast.success('Conteúdo gerado com sucesso!');
      } else {
        // No response expected, just show success
        setResult({
          type: resource.returnType,
          content: '',
        });
        toast.success('Dados enviados com sucesso!');
      }
    } catch (error) {
      console.error('Error sending to n8n:', error);
      
      // If webhook has no response, treat network errors differently
      const webhookHasResponse = resource.webhookHasResponse ?? true;
      if (!webhookHasResponse) {
        // Even if there's an error, the request might have been sent
        setResult({
          type: resource.returnType,
          content: '',
        });
        toast.success('Dados enviados!');
      } else {
        toast.error('Erro ao gerar conteúdo. Verifique a URL do webhook.');
        setResult(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!result) return;

    setIsPublishing(true);

    try {
      // If there's a publish webhook, call it first
      if (resource.n8nPublishWebhookUrl && selectedChannels.length > 0) {
        const publishPayload = {
          resourceId: resource.id,
          resourceName: resource.name,
          returnType: resource.returnType,
          content: result.content,
          contentType: result.type,
          channels: selectedChannels,
          fields: resource.fields.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type,
            value: fieldValues[field.id],
          })),
          timestamp: new Date().toISOString(),
        };

        const response = await fetch(resource.n8nPublishWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(publishPayload),
        });

        if (!response.ok) {
          throw new Error('Erro ao publicar via n8n');
        }
      }

      // Get user's estabelecimento_id and save to database
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('auth_user_id', userData.user.id)
          .maybeSingle();

        if (usuarioData?.estabelecimento_id) {
          // Save to marketing_content table
          await supabase.from('marketing_content').insert({
            estabelecimento_id: usuarioData.estabelecimento_id,
            resource_id: resource.id,
            resource_name: resource.name,
            content_type: resource.returnType,
            content_url: resource.returnType !== 'text' ? result.content : null,
            text_content: resource.returnType === 'text' ? result.content : null,
            input_data: resource.fields.map((field) => ({
              name: field.name,
              label: field.label,
              type: field.type,
              value: fieldValues[field.id],
            })),
            channels: selectedChannels,
            status: 'completed',
            created_by: userData.user.id,
          });
        }
      }

      setIsPublished(true);
      toast.success('Conteúdo publicado com sucesso!');
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar conteúdo');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    setResult(null);
    setIsPublished(false);
    // Call submit again to regenerate
    await handleSubmit();
  };

  const handleClose = () => {
    setCurrentStepIndex(0);
    setFieldValues({});
    setSelectedChannels([]);
    setResult(null);
    setIsPublished(false);
    onClose();
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.type) {
      case 'form':
        const stepFields = getFieldsForCurrentStep();
        const formStep = currentStep.formStep;
        
        return (
          <div className="space-y-4">
            {formStep?.description && (
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{formStep.description}</p>
              </div>
            )}
            
            {stepFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum campo configurado nesta etapa</p>
              </div>
            ) : (
              stepFields.map((field) => (
                <DynamicFieldRenderer
                  key={field.id}
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              ))
            )}
          </div>
        );


      case 'review':
        const getFieldValue = (fieldId: string) => {
          const val = fieldValues[fieldId];
          if (!val) return '-';
          if (typeof val === 'object') {
            if (val.productName) return val.productName;
            if (val.file?.name) return val.file.name;
            if (val.url) return val.url;
            if (val.value) return val.value;
            return 'Arquivo selecionado';
          }
          return val;
        };

        const getFieldPreviewUrl = (field: typeof resource.fields[0]) => {
          const val = fieldValues[field.id];
          if (!val) return null;
          
          const mediaTypes = ['media_image', 'media_audio', 'media_video', 'selection_image', 'selection_audio', 'selection_video', 'product_image'];
          if (!mediaTypes.includes(field.type)) return null;
          
          if (typeof val === 'string') return val;
          if (typeof val === 'object') {
            return val.previewUrl || val.url || val.imageUrl || val.audioUrl || val.videoUrl || val.value;
          }
          return null;
        };

        const getPreviewType = (field: typeof resource.fields[0]): 'image' | 'audio' | 'video' | null => {
          if (['media_image', 'selection_image', 'product_image'].includes(field.type)) return 'image';
          if (['media_audio', 'selection_audio'].includes(field.type)) return 'audio';
          if (['media_video', 'selection_video'].includes(field.type)) return 'video';
          return null;
        };

        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Dados Preenchidos</h4>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Variável</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Valor</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resource.fields.map((field) => {
                          const previewUrl = getFieldPreviewUrl(field);
                          const previewType = getPreviewType(field);
                          
                          return (
                            <tr key={field.id} className="border-b last:border-0">
                              <td className="p-3">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {field.name || field.id}
                                </code>
                              </td>
                              <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                                {getFieldValue(field.id)}
                              </td>
                              <td className="p-3">
                                {previewUrl && previewType === 'image' && (
                                  <img 
                                    src={previewUrl} 
                                    alt="Preview" 
                                    className="w-16 h-16 object-cover rounded-lg border"
                                  />
                                )}
                                {previewUrl && previewType === 'audio' && (
                                  <audio controls src={previewUrl} className="h-8 w-32" />
                                )}
                                {previewUrl && previewType === 'video' && (
                                  <video 
                                    controls 
                                    src={previewUrl} 
                                    className="w-24 h-16 object-cover rounded-lg"
                                  />
                                )}
                                {!previewUrl && (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Tipo de Retorno</h4>
              <Badge variant="outline" className="flex items-center gap-2 w-fit">
                <ReturnTypeIcon type={resource.returnType} />
                {RETURN_TYPE_LABELS[resource.returnType]}
              </Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Send className="h-4 w-4" />
                JSON - Webhook de Geração (1º)
              </h4>
              <Card>
                <CardContent className="p-3">
                  <ScrollArea className="h-48">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(generatePayload, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              {resource.n8nWebhookUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground truncate">
                    URL: {getWebhookUrl(resource.n8nWebhookUrl, isTestMode)}
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTestMode}
                      onChange={(e) => setIsTestMode(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span className="text-xs text-muted-foreground">
                      Modo Teste (usa webhook-test)
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        );

      case 'result':
        const hasPublishStep = wizardSteps.some(s => s.type === 'publish');
        
        return (
          <div className="flex flex-col items-center justify-center py-8">
            {isProcessing ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Gerando conteúdo...</p>
                <p className="text-xs text-muted-foreground">
                  Enviando para n8n e aguardando resposta
                </p>
                {isTestMode && (
                  <div className="pt-2">
                    <p className="text-xs text-amber-600 mb-2">
                      Modo Teste: Clique em "Listen for test event" no n8n
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsProcessing(false);
                        setResult(null);
                        goToPrevStep();
                        setTimeout(() => handleSubmit(), 100);
                      }}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>
            ) : result ? (
              <div className="w-full space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 bg-green-100 text-green-600">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">Conteúdo Gerado com Sucesso!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasPublishStep 
                      ? 'Revise o resultado e prossiga para selecionar os canais de publicação'
                      : 'Revise o resultado abaixo'}
                  </p>
                </div>

                <Card>
                  <CardContent className="p-4">
                    {result.type === 'image' && result.content && (
                      <img
                        src={result.content}
                        alt="Generated"
                        className="w-full max-h-96 object-contain rounded-lg"
                      />
                    )}
                    {result.type === 'audio' && result.content && (
                      <audio controls src={result.content} className="w-full" />
                    )}
                    {result.type === 'video' && result.content && (
                      <video controls src={result.content} className="w-full rounded-lg" />
                    )}
                    {result.type === 'text' && (
                      <p className="whitespace-pre-wrap">{result.content}</p>
                    )}
                    {!result.content && (
                      <p className="text-muted-foreground text-center py-4">
                        Aguardando resultado do n8n...
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Erro ao gerar conteúdo</p>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  className="mt-4"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        );

      case 'publish':
        const availableChannels = resource.publishChannels || [];
        
        return (
          <div className="space-y-6">
            {/* Content preview */}
            {result && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Conteúdo Gerado</h4>
                <Card>
                  <CardContent className="p-3">
                    {result.type === 'image' && result.content && (
                      <img src={result.content} alt="Generated" className="w-full max-h-40 object-contain rounded-lg" />
                    )}
                    {result.type === 'audio' && result.content && (
                      <audio controls src={result.content} className="w-full" />
                    )}
                    {result.type === 'video' && result.content && (
                      <video controls src={result.content} className="w-full max-h-40 rounded-lg" />
                    )}
                    {result.type === 'text' && (
                      <p className="whitespace-pre-wrap text-sm line-clamp-3">{result.content}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Channel selection */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Selecione os Canais de Publicação</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableChannels.map((channel) => {
                  const config = CHANNEL_CONFIG[channel];
                  const isSelected = selectedChannels.includes(channel);
                  return (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 relative ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${config.color} text-white`}>
                        <ChannelIcon channel={channel} />
                      </div>
                      <span className="text-sm font-medium">{config.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* JSON preview for 2nd webhook */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                JSON - Webhook de Publicação (2º)
              </h4>
              <Card>
                <CardContent className="p-3">
                  <ScrollArea className="h-40">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(publishPayload, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              {resource.n8nPublishWebhookUrl && (
                <p className="text-xs text-muted-foreground truncate">
                  URL: {resource.n8nPublishWebhookUrl}
                </p>
              )}
            </div>

            {isPublished && (
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-700">Conteúdo Publicado com Sucesso!</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (!currentStep) return false;
    
    switch (currentStep.type) {
      case 'form':
        return validateCurrentStep();
      case 'review':
        return true;
      case 'result':
        return !!result;
      case 'publish':
        return true;
      default:
        return false;
    }
  };

  const isReviewStep = currentStep?.type === 'review';
  const isResultStep = currentStep?.type === 'result';
  const isPublishStep = currentStep?.type === 'publish';
  const hasPublishStep = wizardSteps.some(s => s.type === 'publish');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b pr-12">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 min-w-0 flex-shrink">
              <ReturnTypeIcon type={resource.returnType} />
              <span className="truncate">{resource.name}</span>
            </DialogTitle>
            
            {/* Save preset button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {initialPresetId ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Preset: {initialPresetName}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={handleSavePreset}
                    disabled={isSavingPreset || Object.keys(fieldValues).length === 0}
                  >
                    {isSavingPreset ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </>
              ) : showNewPresetInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nome do preset"
                    className="h-8 w-40 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNewPreset();
                      if (e.key === 'Escape') {
                        setShowNewPresetInput(false);
                        setNewPresetName('');
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveNewPreset}
                    disabled={isSavingPreset || !newPresetName.trim()}
                  >
                    {isSavingPreset ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewPresetInput(false);
                      setNewPresetName('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => setShowNewPresetInput(true)}
                  disabled={Object.keys(fieldValues).length === 0}
                >
                  <Save className="h-4 w-4" />
                  Salvar Preset
                </Button>
              )}
            </div>
          </div>
          <div className="pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="text-primary font-medium">
                {currentStep?.label} ({currentStepIndex + 1}/{wizardSteps.length})
              </span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="px-6 py-6">{renderStepContent()}</div>
        </ScrollArea>

        {!isResultStep && !isPublishStep && (
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? handleClose : goToPrevStep}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStepIndex === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            
            {isReviewStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gerar Conteúdo
              </Button>
            ) : (
              <Button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className="gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {isResultStep && (
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-end">
            {hasPublishStep ? (
              <Button
                onClick={goToNextStep}
                disabled={!result}
                className="gap-2"
              >
                Selecionar Canais
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleClose} className="gap-2">
                <Check className="h-4 w-4" />
                Concluir
              </Button>
            )}
          </div>
        )}

        {isPublishStep && (
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between">
            {!isPublished ? (
              <>
                <Button
                  variant="outline"
                  onClick={goToPrevStep}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  onClick={handlePublish} 
                  disabled={isPublishing || selectedChannels.length === 0}
                  className="gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Publicar ({selectedChannels.length} canal{selectedChannels.length !== 1 ? 'is' : ''})
                </Button>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <Button onClick={handleClose} className="gap-2">
                  <Check className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};