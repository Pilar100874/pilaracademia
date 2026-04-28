import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Trash2, Plus, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, Gauge } from 'lucide-react';
import AICreditsMonitor from './AICreditsMonitor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type: 'apiKey' | 'secret' | 'text';
    required?: boolean;
  }[];
  docsUrl?: string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI',
    icon: '🤖',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'apiKey', required: true },
      { key: 'organization_id', label: 'Organization ID', placeholder: 'org-...', type: 'text' },
      { key: 'project_id', label: 'Project ID', placeholder: 'proj_...', type: 'text' },
    ],
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    name: 'anthropic',
    displayName: 'Anthropic (Claude)',
    icon: '🧠',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  {
    id: 'google',
    name: 'google',
    displayName: 'Google AI (Gemini)',
    icon: '✨',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'AIza...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://aistudio.google.com/apikey'
  },
  {
    id: 'groq',
    name: 'groq',
    displayName: 'Groq',
    icon: '⚡',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'gsk_...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'mistral',
    name: 'mistral',
    displayName: 'Mistral AI',
    icon: '🌀',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://console.mistral.ai/api-keys'
  },
  {
    id: 'perplexity',
    name: 'perplexity',
    displayName: 'Perplexity',
    icon: '🔍',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'pplx-...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://www.perplexity.ai/settings/api'
  },
  {
    id: 'cohere',
    name: 'cohere',
    displayName: 'Cohere',
    icon: '💎',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://dashboard.cohere.com/api-keys'
  },
  {
    id: 'deepseek',
    name: 'deepseek',
    displayName: 'DeepSeek',
    icon: '🌊',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://api.deepseek.com', type: 'text' },
    ],
    docsUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'together',
    name: 'together',
    displayName: 'Together AI',
    icon: '🤝',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://api.together.xyz/settings/api-keys'
  },
  {
    id: 'replicate',
    name: 'replicate',
    displayName: 'Replicate',
    icon: '🔄',
    fields: [
      { key: 'api_key', label: 'API Token', placeholder: 'r8_...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://replicate.com/account/api-tokens'
  },
  {
    id: 'huggingface',
    name: 'huggingface',
    displayName: 'Hugging Face',
    icon: '🤗',
    fields: [
      { key: 'api_key', label: 'Access Token', placeholder: 'hf_...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://huggingface.co/settings/tokens'
  },
  {
    id: 'stability',
    name: 'stability',
    displayName: 'Stability AI',
    icon: '🎨',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://platform.stability.ai/account/keys'
  },
  {
    id: 'elevenlabs',
    name: 'elevenlabs',
    displayName: 'ElevenLabs',
    icon: '🎙️',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
    ],
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys'
  },
  {
    id: 'veo3',
    name: 'veo3',
    displayName: 'Google Veo 3 (Vídeo)',
    icon: '🎬',
    fields: [
      { key: 'api_key', label: 'API Key (Vertex AI)', placeholder: '', type: 'apiKey', required: true },
      { key: 'project_id', label: 'Project ID (GCP)', placeholder: 'my-project-123', type: 'text', required: true },
      { key: 'base_url', label: 'Region Endpoint', placeholder: 'us-central1-aiplatform.googleapis.com', type: 'text' },
    ],
    docsUrl: 'https://console.cloud.google.com/vertex-ai'
  },
  {
    id: 'seedream',
    name: 'seedream',
    displayName: 'Seedream (ByteDance)',
    icon: '🌱',
    fields: [
      { key: 'api_key', label: 'Access Key ID', placeholder: 'AKLT...', type: 'apiKey', required: true },
      { key: 'api_secret', label: 'Secret Access Key', placeholder: '', type: 'secret', required: true },
      { key: 'base_url', label: 'Endpoint', placeholder: 'https://visual.volcengineapi.com', type: 'text' },
    ],
    docsUrl: 'https://www.volcengine.com/docs/6791/1347773'
  },
  {
    id: 'custom',
    name: 'custom',
    displayName: 'API Personalizada',
    icon: '🔧',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
      { key: 'api_secret', label: 'API Secret', placeholder: '', type: 'secret' },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://...', type: 'text' },
    ],
  },
];

interface SavedKey {
  id: string;
  provider: string;
  provider_display_name: string;
  api_key: string | null;
  api_secret: string | null;
  organization_id: string | null;
  project_id: string | null;
  base_url: string | null;
  is_active: boolean;
  validation_status: string;
}

const AIApiKeysManager: React.FC = () => {
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstabelecimentoId = async () => {
      // First try from localStorage
      const storedId = localStorage.getItem('estabelecimentoId');
      if (storedId) {
        setEstabelecimentoId(storedId);
        return;
      }

      // If not in localStorage, fetch from authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('id', user.id)
          .single();
        
        if (usuario?.estabelecimento_id) {
          setEstabelecimentoId(usuario.estabelecimento_id);
          localStorage.setItem('estabelecimentoId', usuario.estabelecimento_id);
        }
      }
    };

    fetchEstabelecimentoId();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      fetchSavedKeys();
    }
  }, [estabelecimentoId]);

  const fetchSavedKeys = async () => {
    if (!estabelecimentoId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;
      setSavedKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Erro ao carregar chaves de API');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (provider: string) => {
    setVisibleKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const maskKey = (key: string | null) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const handleEdit = (provider: AIProvider, savedKey?: SavedKey) => {
    setEditingProvider(provider.id);
    setFormData({
      api_key: savedKey?.api_key || '',
      api_secret: savedKey?.api_secret || '',
      organization_id: savedKey?.organization_id || '',
      project_id: savedKey?.project_id || '',
      base_url: savedKey?.base_url || '',
    });
  };

  const handleSave = async (provider: AIProvider) => {
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Você precisa estar logado para salvar chaves de API');
      return;
    }

    // Get estabelecimento_id from the authenticated user's record (by auth_user_id)
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('estabelecimento_id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !usuario?.estabelecimento_id) {
      toast.error('Usuário não vinculado a um estabelecimento');
      return;
    }

    const userEstabelecimentoId = usuario.estabelecimento_id;

    const requiredFields = provider.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key]) {
        toast.error(`${field.label} é obrigatório`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const existingKey = savedKeys.find(k => k.provider === provider.name);

      const payload = {
        estabelecimento_id: userEstabelecimentoId,
        provider: provider.name,
        provider_display_name: provider.displayName,
        api_key: formData.api_key || null,
        api_secret: formData.api_secret || null,
        organization_id: formData.organization_id || null,
        project_id: formData.project_id || null,
        base_url: formData.base_url || null,
        is_active: true,
        validation_status: 'pending',
      };

      if (existingKey) {
        const { error } = await supabase
          .from('ai_api_keys')
          .update(payload)
          .eq('id', existingKey.id);

        if (error) throw error;
        toast.success('Chave atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('ai_api_keys')
          .insert(payload);

        if (error) throw error;
        toast.success('Chave salva com sucesso');
      }

      setEditingProvider(null);
      setFormData({});
      fetchSavedKeys();
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Erro ao salvar chave');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (provider: string) => {
    const savedKey = savedKeys.find(k => k.provider === provider);
    if (!savedKey) return;

    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .delete()
        .eq('id', savedKey.id);

      if (error) throw error;
      toast.success('Chave removida com sucesso');
      setDeleteConfirm(null);
      fetchSavedKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Erro ao remover chave');
    }
  };

  const toggleActive = async (provider: string, isActive: boolean) => {
    const savedKey = savedKeys.find(k => k.provider === provider);
    if (!savedKey) return;

    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .update({ is_active: isActive })
        .eq('id', savedKey.id);

      if (error) throw error;
      toast.success(isActive ? 'Chave ativada' : 'Chave desativada');
      fetchSavedKeys();
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3" />Válida</Badge>;
      case 'invalid':
        return <Badge className="gap-1 bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3" />Inválida</Badge>;
      default:
        return <Badge className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="h-3 w-3" />Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Chaves de API - Inteligência Artificial
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as chaves de acesso para integração com n8n via Railway
          </p>
        </div>
      </div>

      {/* Monitor de Créditos */}
      <AICreditsMonitor savedKeys={savedKeys} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AI_PROVIDERS.map((provider) => {
          const savedKey = savedKeys.find(k => k.provider === provider.name);
          const isEditing = editingProvider === provider.id;
          const isVisible = visibleKeys[provider.name];

          return (
            <Card key={provider.id} className={savedKey ? 'border-primary/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-xl">{provider.icon}</span>
                    {provider.displayName}
                  </CardTitle>
                  {savedKey && (
                    <Switch
                      checked={savedKey.is_active}
                      onCheckedChange={(checked) => toggleActive(provider.name, checked)}
                    />
                  )}
                </div>
                {provider.docsUrl && (
                  <a 
                    href={provider.docsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Obter chave
                  </a>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {savedKey && !isEditing ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">API Key</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(provider.name)}
                          className="h-6 w-6 p-0"
                        >
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {isVisible ? savedKey.api_key : maskKey(savedKey.api_key)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(savedKey.validation_status)}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(provider, savedKey)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(provider.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : isEditing ? (
                  <div className="space-y-3">
                    {provider.fields.map((field) => (
                      <div key={field.key}>
                        <Label className="text-xs">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                          type={field.type === 'apiKey' || field.type === 'secret' ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(provider)}
                        disabled={isSaving}
                        className="flex-1"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Salvar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(null);
                          setFormData({});
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(provider)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Integração com n8n via Railway</CardTitle>
          <CardDescription>
            As chaves configuradas acima estarão disponíveis para o n8n buscar diretamente desta tabela.
            Configure as variáveis de ambiente no Railway para acessar o banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs font-mono bg-background p-3 rounded border space-y-1">
            <p className="text-muted-foreground"># Variáveis Railway para conexão</p>
            <p>DATABASE_URL=postgresql://...</p>
            <p>SUPABASE_URL={import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co'}</p>
            <p>SUPABASE_ANON_KEY=sua_anon_key</p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover chave de API?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A chave será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIApiKeysManager;
