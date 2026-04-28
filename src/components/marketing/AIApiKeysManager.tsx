import React, { useState, useEffect } from 'react';
import {
  Key, Eye, EyeOff, Save, Trash2, CheckCircle2, XCircle, AlertCircle,
  Loader2, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserClinicRole } from '@/hooks/useUserClinicRole';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  fields: { key: string; label: string; placeholder: string; type: 'apiKey' | 'secret' | 'text'; required?: boolean }[];
  docsUrl?: string;
}

const AI_PROVIDERS: AIProvider[] = [
  { id: 'openai', name: 'openai', displayName: 'OpenAI', icon: '🤖',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'apiKey', required: true },
      { key: 'organization_id', label: 'Organization ID', placeholder: 'org-...', type: 'text' },
      { key: 'project_id', label: 'Project ID', placeholder: 'proj_...', type: 'text' },
    ], docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'anthropic', displayName: 'Anthropic (Claude)', icon: '🧠',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'apiKey', required: true }],
    docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'google', name: 'google', displayName: 'Google AI (Gemini)', icon: '✨',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'AIza...', type: 'apiKey', required: true }],
    docsUrl: 'https://aistudio.google.com/apikey' },
  { id: 'groq', name: 'groq', displayName: 'Groq', icon: '⚡',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'gsk_...', type: 'apiKey', required: true }],
    docsUrl: 'https://console.groq.com/keys' },
  { id: 'mistral', name: 'mistral', displayName: 'Mistral AI', icon: '🌀',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true }],
    docsUrl: 'https://console.mistral.ai/api-keys' },
  { id: 'perplexity', name: 'perplexity', displayName: 'Perplexity', icon: '🔍',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'pplx-...', type: 'apiKey', required: true }],
    docsUrl: 'https://www.perplexity.ai/settings/api' },
  { id: 'replicate', name: 'replicate', displayName: 'Replicate', icon: '🔄',
    fields: [{ key: 'api_key', label: 'API Token', placeholder: 'r8_...', type: 'apiKey', required: true }],
    docsUrl: 'https://replicate.com/account/api-tokens' },
  { id: 'huggingface', name: 'huggingface', displayName: 'Hugging Face', icon: '🤗',
    fields: [{ key: 'api_key', label: 'Access Token', placeholder: 'hf_...', type: 'apiKey', required: true }],
    docsUrl: 'https://huggingface.co/settings/tokens' },
  { id: 'stability', name: 'stability', displayName: 'Stability AI', icon: '🎨',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'apiKey', required: true }],
    docsUrl: 'https://platform.stability.ai/account/keys' },
  { id: 'elevenlabs', name: 'elevenlabs', displayName: 'ElevenLabs', icon: '🎙️',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true }],
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys' },
  { id: 'custom', name: 'custom', displayName: 'API Personalizada', icon: '🔧',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: '', type: 'apiKey', required: true },
      { key: 'api_secret', label: 'API Secret', placeholder: '', type: 'secret' },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://...', type: 'text' },
    ] },
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
  const { user } = useAuth();
  const { data: roleInfo } = useUserClinicRole();
  const clinicId = roleInfo?.clinicId;

  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (clinicId) fetchSavedKeys();
  }, [clinicId]);

  const fetchSavedKeys = async () => {
    if (!clinicId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('marketing_ai_api_keys')
        .select('*')
        .eq('clinic_id', clinicId);
      if (error) throw error;
      setSavedKeys(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar chaves de API');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (provider: string) => setVisibleKeys(p => ({ ...p, [provider]: !p[provider] }));
  const maskKey = (k: string | null) => !k ? '' : k.length <= 8 ? '••••••••' : k.substring(0, 4) + '••••••••' + k.substring(k.length - 4);

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
    if (!user || !clinicId) {
      toast.error('Você precisa estar vinculado a uma clínica');
      return;
    }
    for (const field of provider.fields.filter(f => f.required)) {
      if (!formData[field.key]) {
        toast.error(`${field.label} é obrigatório`);
        return;
      }
    }
    try {
      setIsSaving(true);
      const existing = savedKeys.find(k => k.provider === provider.name);
      const payload = {
        clinic_id: clinicId,
        provider: provider.name,
        provider_display_name: provider.displayName,
        api_key: formData.api_key || null,
        api_secret: formData.api_secret || null,
        organization_id: formData.organization_id || null,
        project_id: formData.project_id || null,
        base_url: formData.base_url || null,
        is_active: true,
        validation_status: 'pending',
        created_by: user.id,
      };
      const { error } = existing
        ? await supabase.from('marketing_ai_api_keys').update(payload).eq('id', existing.id)
        : await supabase.from('marketing_ai_api_keys').insert(payload);
      if (error) throw error;
      toast.success(existing ? 'Chave atualizada' : 'Chave salva');
      setEditingProvider(null);
      setFormData({});
      fetchSavedKeys();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar chave');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (provider: string) => {
    const k = savedKeys.find(k => k.provider === provider);
    if (!k) return;
    try {
      const { error } = await supabase.from('marketing_ai_api_keys').delete().eq('id', k.id);
      if (error) throw error;
      toast.success('Chave removida');
      setDeleteConfirm(null);
      fetchSavedKeys();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover');
    }
  };

  const toggleActive = async (provider: string, isActive: boolean) => {
    const k = savedKeys.find(k => k.provider === provider);
    if (!k) return;
    try {
      const { error } = await supabase.from('marketing_ai_api_keys').update({ is_active: isActive }).eq('id', k.id);
      if (error) throw error;
      fetchSavedKeys();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao atualizar');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'valid') return <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" />Válida</Badge>;
    if (status === 'invalid') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Inválida</Badge>;
    return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Pendente</Badge>;
  };

  if (!clinicId) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Você precisa estar vinculado a uma clínica.</div>;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5" />
        <p className="text-sm text-muted-foreground">Configure as chaves de provedores de IA para usar nas suas automações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AI_PROVIDERS.map(provider => {
          const savedKey = savedKeys.find(k => k.provider === provider.name);
          const isEditing = editingProvider === provider.id;
          const isVisible = visibleKeys[provider.name];

          return (
            <Card key={provider.id} className={savedKey ? 'border-primary/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 font-serif">
                    <span className="text-xl">{provider.icon}</span>
                    {provider.displayName}
                  </CardTitle>
                  {savedKey && (
                    <Switch checked={savedKey.is_active} onCheckedChange={(v) => toggleActive(provider.name, v)} />
                  )}
                </div>
                {provider.docsUrl && (
                  <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />Obter chave
                  </a>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {savedKey && !isEditing ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">API Key</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {isVisible ? savedKey.api_key : maskKey(savedKey.api_key)}
                        </code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleKeyVisibility(provider.name)}>
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      {getStatusBadge(savedKey.validation_status)}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(provider, savedKey)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(provider.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : isEditing ? (
                  <div className="space-y-3">
                    {provider.fields.map(field => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs">
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          type={(field.type === 'apiKey' || field.type === 'secret') && !visibleKeys[`edit-${field.key}`] ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                          autoFocus={false}
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleSave(provider)} disabled={isSaving} className="flex-1">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" />Salvar</>}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingProvider(null); setFormData({}); }}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(provider)}>
                    Configurar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover chave de API?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIApiKeysManager;
