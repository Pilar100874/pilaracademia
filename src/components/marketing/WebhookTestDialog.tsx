import React, { useState } from 'react';
import {
  Play,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  ExternalLink,
  Image,
  FileText,
  Music,
  Video,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  MarketingResource,
  ResourceField,
  ReturnType,
  RETURN_TYPE_LABELS,
  CHANNEL_CONFIG,
  PublishChannel,
} from './types';

interface WebhookTestDialogProps {
  open: boolean;
  onClose: () => void;
  resource: MarketingResource;
}

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  requestPayload?: Record<string, any>;
  responseData?: any;
  responseStatus?: number;
  responseTime?: number;
  error?: string;
}

const ReturnTypeIcon: React.FC<{ type: ReturnType }> = ({ type }) => {
  const icons: Record<ReturnType, React.ReactNode> = {
    image: <Image className="h-5 w-5" />,
    audio: <Music className="h-5 w-5" />,
    video: <Video className="h-5 w-5" />,
    text: <FileText className="h-5 w-5" />,
  };
  return <>{icons[type]}</>;
};

export const WebhookTestDialog: React.FC<WebhookTestDialogProps> = ({
  open,
  onClose,
  resource,
}) => {
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generateSampleValue = (field: ResourceField): any => {
    switch (field.type) {
      case 'text':
        return `Texto de exemplo para ${field.label}`;
      case 'textarea':
        return `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
      case 'number':
        return 42;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'checkbox':
        return true;
      case 'media_image':
        return 'https://via.placeholder.com/300x200?text=Imagem+Teste';
      case 'selection_image':
        // Use actual image URL from first option if available
        return field.options?.[0]?.imageUrl || 'https://via.placeholder.com/300x200?text=Imagem+Teste';
      case 'media_audio':
        return 'https://example.com/audio-sample.mp3';
      case 'selection_audio':
        // Use actual audio URL from first option if available
        return field.options?.[0]?.audioUrl || 'https://example.com/audio-sample.mp3';
      case 'media_video':
        return 'https://example.com/video-sample.mp4';
      case 'selection_video':
        // Use actual video URL from first option if available
        return field.options?.[0]?.videoUrl || 'https://example.com/video-sample.mp4';
      case 'radio_selection':
        return field.options?.[0]?.value || 'option1';
      case 'selection_text':
        return field.options?.[0]?.value || 'Opção 1';
      case 'product_name':
        return 'Produto Exemplo XYZ';
      case 'product_image':
        return 'https://via.placeholder.com/300x300?text=Produto';
      default:
        return 'valor_teste';
    }
  };

  const handleRunTest = async () => {
    if (!resource.n8nWebhookUrl) {
      toast.error('URL do webhook não configurada');
      return;
    }

    setTestResult({ status: 'loading' });
    const startTime = Date.now();

    const payload = {
      resourceId: resource.id,
      resourceName: resource.name,
      returnType: resource.returnType,
      fields: resource.fields.map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        value: generateSampleValue(field),
      })),
      channels: resource.publishChannels || [],
      autoPublishEnabled: resource.autoPublishEnabled || false,
      timestamp: new Date().toISOString(),
      isTest: true,
    };

    try {
      const response = await fetch(resource.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;
      let responseData;

      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      setTestResult({
        status: response.ok ? 'success' : 'error',
        requestPayload: payload,
        responseData,
        responseStatus: response.status,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });

      if (response.ok) {
        toast.success('Teste executado com sucesso!');
      } else {
        toast.error(`Erro: HTTP ${response.status}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setTestResult({
        status: 'error',
        requestPayload: payload,
        responseTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      toast.error('Erro ao executar teste');
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copiado!');
  };

  const renderFieldValue = (field: { type: string; value: any; label: string }) => {
    if (field.type === 'media_image' || field.type === 'selection_image' || field.type === 'product_image') {
      return (
        <div className="space-y-2">
          <img
            src={field.value}
            alt={field.label}
            className="max-w-[200px] max-h-[150px] object-contain rounded-lg border"
          />
          <p className="text-xs text-muted-foreground break-all">{field.value}</p>
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <Badge variant={field.value ? 'default' : 'secondary'}>
          {field.value ? 'Sim' : 'Não'}
        </Badge>
      );
    }

    return (
      <p className="text-sm bg-muted/50 p-2 rounded break-all">{String(field.value)}</p>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Play className="h-5 w-5 text-orange-500" />
            </div>
            Teste de Webhook - {resource.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Execute um teste com dados de exemplo para verificar a integração
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="px-6 py-6 space-y-6">
            {/* Webhook URL */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  URL do Webhook
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted p-3 rounded-lg break-all">
                    {resource.n8nWebhookUrl || 'Não configurado'}
                  </code>
                  {resource.n8nWebhookUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(resource.n8nWebhookUrl!, 'url')}
                    >
                      {copiedField === 'url' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resource Config */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ReturnTypeIcon type={resource.returnType} />
                  Configuração do Recurso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo de Retorno:</span>
                    <Badge variant="outline" className="ml-2">
                      {RETURN_TYPE_LABELS[resource.returnType]}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Publicação Automática:</span>
                    <Badge variant={resource.autoPublishEnabled ? 'default' : 'secondary'} className="ml-2">
                      {resource.autoPublishEnabled ? 'Ativada' : 'Desativada'}
                    </Badge>
                  </div>
                </div>
                {resource.publishChannels && resource.publishChannels.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Canais:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {resource.publishChannels.map((channel) => (
                        <Badge
                          key={channel}
                          className={`${CHANNEL_CONFIG[channel].color} text-white text-xs`}
                        >
                          {CHANNEL_CONFIG[channel].label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sample Fields */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dados de Exemplo (Enviados)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resource.fields.map((field) => {
                    const sampleValue = generateSampleValue(field);
                    return (
                      <div key={field.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{field.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {renderFieldValue({ type: field.type, value: sampleValue, label: field.label })}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            {testResult.status !== 'idle' && (
              <>
                <Separator />
                
                <div className="flex items-center gap-4">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Resultado do Teste</span>
                  {testResult.responseTime && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {testResult.responseTime}ms
                    </Badge>
                  )}
                </div>

                <Card className={
                  testResult.status === 'loading' ? 'border-blue-500/50' :
                  testResult.status === 'success' ? 'border-green-500/50' :
                  'border-red-500/50'
                }>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {testResult.status === 'loading' && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span>Executando teste...</span>
                        </>
                      )}
                      {testResult.status === 'success' && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Sucesso</span>
                          <Badge variant="outline" className="ml-2">
                            HTTP {testResult.responseStatus}
                          </Badge>
                        </>
                      )}
                      {testResult.status === 'error' && (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Erro</span>
                          {testResult.responseStatus && (
                            <Badge variant="destructive" className="ml-2">
                              HTTP {testResult.responseStatus}
                            </Badge>
                          )}
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testResult.status === 'loading' ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {testResult.error && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {testResult.error}
                            </p>
                          </div>
                        )}

                        {testResult.responseData && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Resposta:</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  JSON.stringify(testResult.responseData, null, 2),
                                  'response'
                                )}
                              >
                                {copiedField === 'response' ? (
                                  <Check className="h-3 w-3 mr-1 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                Copiar
                              </Button>
                            </div>
                            
                            {/* Render visual result based on return type */}
                            {resource.returnType === 'image' && testResult.responseData?.result && (
                              <div className="mb-4">
                                <img
                                  src={testResult.responseData.result}
                                  alt="Resultado"
                                  className="max-w-full max-h-[300px] object-contain rounded-lg border mx-auto"
                                />
                              </div>
                            )}
                            {resource.returnType === 'audio' && testResult.responseData?.result && (
                              <div className="mb-4">
                                <audio controls src={testResult.responseData.result} className="w-full" />
                              </div>
                            )}
                            {resource.returnType === 'video' && testResult.responseData?.result && (
                              <div className="mb-4">
                                <video controls src={testResult.responseData.result} className="w-full rounded-lg" />
                              </div>
                            )}
                            {resource.returnType === 'text' && testResult.responseData?.result && (
                              <div className="mb-4 p-3 bg-muted rounded-lg">
                                <p className="whitespace-pre-wrap">{testResult.responseData.result}</p>
                              </div>
                            )}

                            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">
                              {typeof testResult.responseData === 'string'
                                ? testResult.responseData
                                : JSON.stringify(testResult.responseData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {testResult.requestPayload && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">
                                Payload Enviado:
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  JSON.stringify(testResult.requestPayload, null, 2),
                                  'payload'
                                )}
                              >
                                {copiedField === 'payload' ? (
                                  <Check className="h-3 w-3 mr-1 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                Copiar
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-[150px]">
                              {JSON.stringify(testResult.requestPayload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            onClick={handleRunTest}
            disabled={!resource.n8nWebhookUrl || testResult.status === 'loading'}
            className="gap-2"
          >
            {testResult.status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Executar Teste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
