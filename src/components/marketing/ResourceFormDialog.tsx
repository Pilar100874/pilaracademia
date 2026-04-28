import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Wand2, Image, FileText, List, Package, Sparkles, Share2, Check, MessageCircle, Instagram, Facebook, Linkedin, Mail, Send, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ResourceFieldEditor } from './ResourceFieldEditor';
import { FormStepsManager } from './FormStepsManager';
import { 
  MarketingResource, 
  ResourceField, 
  ReturnType, 
  FieldType,
  PublishChannel,
  FormStep,
  RETURN_TYPE_LABELS, 
  FIELD_TYPE_LABELS,
  FIELD_TYPE_DESCRIPTIONS,
  FIELD_TYPE_CATEGORIES,
  CHANNEL_CONFIG
} from './types';

interface ResourceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (resource: MarketingResource) => void;
  resource?: MarketingResource;
}

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const icons: Record<string, React.ReactNode> = {
    basic: <FileText className="h-4 w-4" />,
    media: <Image className="h-4 w-4" />,
    selection: <List className="h-4 w-4" />,
    product: <Package className="h-4 w-4" />,
  };
  return <>{icons[category] || <FileText className="h-4 w-4" />}</>;
};

const ChannelIcon: React.FC<{ channel: PublishChannel }> = ({ channel }) => {
  const icons: Record<PublishChannel, React.ReactNode> = {
    whatsapp: <MessageCircle className="h-4 w-4" />,
    instagram: <Instagram className="h-4 w-4" />,
    facebook: <Facebook className="h-4 w-4" />,
    twitter: <span className="text-sm font-bold">𝕏</span>,
    linkedin: <Linkedin className="h-4 w-4" />,
    telegram: <Send className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
  };
  return <>{icons[channel]}</>;
};

export const ResourceFormDialog: React.FC<ResourceFormDialogProps> = ({
  open,
  onClose,
  onSave,
  resource,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<ResourceField[]>([]);
  const [steps, setSteps] = useState<FormStep[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>('text');
  const [saveLocation, setSaveLocation] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [n8nPublishWebhookUrl, setN8nPublishWebhookUrl] = useState('');
  const [activeFieldTab, setActiveFieldTab] = useState('basic');
  const [publishChannels, setPublishChannels] = useState<PublishChannel[]>([]);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [webhookHasResponse, setWebhookHasResponse] = useState(true);

  useEffect(() => {
    if (resource) {
      setName(resource.name);
      setDescription(resource.description || '');
      setFields(resource.fields);
      setSteps(resource.steps || []);
      setReturnType(resource.returnType);
      setSaveLocation(resource.saveLocation || '');
      setN8nWebhookUrl(resource.n8nWebhookUrl || '');
      setN8nPublishWebhookUrl(resource.n8nPublishWebhookUrl || '');
      setPublishChannels(resource.publishChannels || []);
      setAutoPublishEnabled(resource.autoPublishEnabled || false);
      setWebhookHasResponse(resource.webhookHasResponse ?? true);
    } else {
      setName('');
      setDescription('');
      setFields([]);
      setSteps([]);
      setReturnType('text');
      setSaveLocation('');
      setN8nWebhookUrl('');
      setN8nPublishWebhookUrl('');
      setPublishChannels([]);
      setAutoPublishEnabled(false);
      setWebhookHasResponse(true);
    }
  }, [resource, open]);


  const togglePublishChannel = (channel: PublishChannel) => {
    setPublishChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleAddField = (type: FieldType) => {
    const newField: ResourceField = {
      id: crypto.randomUUID(),
      name: '',
      label: FIELD_TYPE_LABELS[type],
      type,
      required: false,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, updatedField: ResourceField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newResource: MarketingResource = {
      id: resource?.id || crypto.randomUUID(),
      name,
      description,
      fields,
      steps,
      returnType,
      saveLocation,
      n8nWebhookUrl,
      n8nPublishWebhookUrl,
      publishChannels,
      autoPublishEnabled,
      webhookHasResponse,
      createdAt: resource?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(newResource);
    onClose();
  };

  const isValid = name.trim() && fields.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            {resource ? 'Editar Recurso' : 'Novo Recurso de Marketing'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os campos que serão usados para gerar conteúdo com IA
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-6 space-y-8">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome do Recurso *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Gerador de Posts para Instagram"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de Retorno *</Label>
                  <Select value={returnType} onValueChange={(v: ReturnType) => setReturnType(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RETURN_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que este recurso faz e como ele ajuda na criação de conteúdo..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">URL Webhook n8n (Geração)</Label>
                  <Input
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="https://n8n.exemplo.com/webhook/gerar..."
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Webhook para gerar o conteúdo
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">URL Webhook n8n (Publicação)</Label>
                  <Input
                    value={n8nPublishWebhookUrl}
                    onChange={(e) => setN8nPublishWebhookUrl(e.target.value)}
                    placeholder="https://n8n.exemplo.com/webhook/publicar..."
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Webhook para publicar nos canais (opcional)
                  </p>
                </div>
              </div>

              {/* Webhook Has Response Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div>
                  <Label className="text-sm font-medium">Webhook tem retorno</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desabilite se o webhook de geração não retorna dados (ex: apenas dispara uma automação)
                  </p>
                </div>
                <Switch
                  checked={webhookHasResponse}
                  onCheckedChange={setWebhookHasResponse}
                />
              </div>
            </div>

            {/* Publish Channels Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Canais de Publicação</h3>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div>
                  <Label className="text-sm font-medium">Habilitar Publicação Automática</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando ativado, o conteúdo gerado será publicado automaticamente nos canais selecionados
                  </p>
                </div>
                <Switch
                  checked={autoPublishEnabled}
                  onCheckedChange={setAutoPublishEnabled}
                />
              </div>

              {autoPublishEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selecione os canais para publicação automática:</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {(Object.keys(CHANNEL_CONFIG) as PublishChannel[]).map((channel) => {
                      const config = CHANNEL_CONFIG[channel];
                      const isSelected = publishChannels.includes(channel);
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => togglePublishChannel(channel)}
                          className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 relative ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-full ${config.color} text-white`}>
                            <ChannelIcon channel={channel} />
                          </div>
                          <span className="text-sm font-medium">{config.label}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary absolute top-1 right-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {publishChannels.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {publishChannels.length} canal(is) selecionado(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Form Steps Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Etapas do Formulário</h3>
                {steps.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {steps.length} etapa{steps.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <FormStepsManager
                steps={steps}
                fields={fields}
                onStepsChange={setSteps}
                onFieldsChange={setFields}
              />
            </div>

            {/* Info when steps are used */}
            {steps.length > 0 && fields.length > 0 && (
              <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg">
                <Badge variant="secondary">
                  {fields.length} campo{fields.length !== 1 ? 's' : ''} configurado{fields.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Recurso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
