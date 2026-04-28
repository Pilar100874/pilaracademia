import React, { useState, useEffect } from 'react';
import { 
  Key, Eye, EyeOff, Save, Trash2, Plus, CheckCircle2, XCircle, AlertCircle, 
  Loader2, ExternalLink, Database, Mail, FileSpreadsheet, FileText, HardDrive, FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IntegrationProvider {
  id: string;
  type: string;
  name: string;
  displayName: string;
  icon: React.ReactNode;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type: 'text' | 'password';
    required?: boolean;
  }[];
  docsUrl?: string;
}

const GOOGLE_PROVIDERS: IntegrationProvider[] = [
  {
    id: 'gmail',
    type: 'google',
    name: 'gmail',
    displayName: 'Gmail',
    icon: <Mail className="h-5 w-5 text-red-500" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//...', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    id: 'google_drive',
    type: 'google',
    name: 'google_drive',
    displayName: 'Google Drive',
    icon: <HardDrive className="h-5 w-5 text-yellow-500" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//...', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    id: 'google_sheets',
    type: 'google',
    name: 'google_sheets',
    displayName: 'Google Sheets',
    icon: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//...', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    id: 'google_docs',
    type: 'google',
    name: 'google_docs',
    displayName: 'Google Docs',
    icon: <FileText className="h-5 w-5 text-blue-500" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//...', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    id: 'google_calendar',
    type: 'google',
    name: 'google_calendar',
    displayName: 'Google Calendar',
    icon: <FolderOpen className="h-5 w-5 text-blue-600" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//...', type: 'password' },
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials'
  },
];

const DATABASE_PROVIDERS: IntegrationProvider[] = [
  {
    id: 'mssql',
    type: 'database',
    name: 'mssql',
    displayName: 'Microsoft SQL Server',
    icon: <Database className="h-5 w-5 text-blue-700" />,
    fields: [
      { key: 'host', label: 'Host/Servidor', placeholder: 'servidor.database.windows.net', type: 'text', required: true },
      { key: 'port', label: 'Porta', placeholder: '1433', type: 'text' },
      { key: 'database', label: 'Database', placeholder: 'meu_banco', type: 'text', required: true },
      { key: 'username', label: 'Usuário', placeholder: 'sa', type: 'text', required: true },
      { key: 'password', label: 'Senha', placeholder: '', type: 'password', required: true },
      { key: 'encrypt', label: 'Encrypt (true/false)', placeholder: 'true', type: 'text' },
    ],
    docsUrl: 'https://docs.microsoft.com/sql/'
  },
  {
    id: 'mysql',
    type: 'database',
    name: 'mysql',
    displayName: 'MySQL',
    icon: <Database className="h-5 w-5 text-orange-500" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Porta', placeholder: '3306', type: 'text' },
      { key: 'database', label: 'Database', placeholder: 'meu_banco', type: 'text', required: true },
      { key: 'username', label: 'Usuário', placeholder: 'root', type: 'text', required: true },
      { key: 'password', label: 'Senha', placeholder: '', type: 'password', required: true },
    ],
  },
  {
    id: 'postgresql',
    type: 'database',
    name: 'postgresql',
    displayName: 'PostgreSQL',
    icon: <Database className="h-5 w-5 text-blue-500" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Porta', placeholder: '5432', type: 'text' },
      { key: 'database', label: 'Database', placeholder: 'meu_banco', type: 'text', required: true },
      { key: 'username', label: 'Usuário', placeholder: 'postgres', type: 'text', required: true },
      { key: 'password', label: 'Senha', placeholder: '', type: 'password', required: true },
      { key: 'ssl', label: 'SSL (true/false)', placeholder: 'false', type: 'text' },
    ],
  },
];

interface SavedCredential {
  id: string;
  integration_type: string;
  integration_name: string;
  display_name: string;
  credentials_json: Record<string, string>;
  is_active: boolean;
  validation_status: string;
}

const IntegrationCredentialsManager: React.FC = () => {
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('google');

  useEffect(() => {
    fetchSavedCredentials();
  }, []);

  const fetchSavedCredentials = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('integration_credentials')
        .select('*');

      if (error) throw error;
      
      // Type assertion since credentials_json comes as Json type from database
      const typedData = (data || []).map(item => ({
        ...item,
        credentials_json: (item.credentials_json || {}) as Record<string, string>
      }));
      
      setSavedCredentials(typedData);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Erro ao carregar credenciais');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const maskValue = (value: string | null) => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  };

  const handleEdit = (provider: IntegrationProvider, savedCred?: SavedCredential) => {
    setEditingProvider(provider.id);
    const initialData: Record<string, string> = {};
    provider.fields.forEach(field => {
      initialData[field.key] = savedCred?.credentials_json?.[field.key] || '';
    });
    setFormData(initialData);
  };

  const handleSave = async (provider: IntegrationProvider) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('estabelecimento_id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !usuario?.estabelecimento_id) {
      toast.error('Usuário não vinculado a um estabelecimento');
      return;
    }

    const requiredFields = provider.fields.filter(f => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key]) {
        toast.error(`${field.label} é obrigatório`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const existingCred = savedCredentials.find(c => c.integration_name === provider.name);

      const payload = {
        estabelecimento_id: usuario.estabelecimento_id,
        integration_type: provider.type,
        integration_name: provider.name,
        display_name: provider.displayName,
        credentials_json: formData,
        is_active: true,
        validation_status: 'pending',
      };

      if (existingCred) {
        const { error } = await supabase
          .from('integration_credentials')
          .update(payload)
          .eq('id', existingCred.id);

        if (error) throw error;
        toast.success('Credenciais atualizadas');
      } else {
        const { error } = await supabase
          .from('integration_credentials')
          .insert(payload);

        if (error) throw error;
        toast.success('Credenciais salvas');
      }

      setEditingProvider(null);
      setFormData({});
      fetchSavedCredentials();
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast.error('Erro ao salvar credenciais');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (providerName: string) => {
    const savedCred = savedCredentials.find(c => c.integration_name === providerName);
    if (!savedCred) return;

    try {
      const { error } = await supabase
        .from('integration_credentials')
        .delete()
        .eq('id', savedCred.id);

      if (error) throw error;
      toast.success('Credenciais removidas');
      setDeleteConfirm(null);
      fetchSavedCredentials();
    } catch (error) {
      console.error('Error deleting credentials:', error);
      toast.error('Erro ao remover credenciais');
    }
  };

  const toggleActive = async (providerName: string, isActive: boolean) => {
    const savedCred = savedCredentials.find(c => c.integration_name === providerName);
    if (!savedCred) return;

    try {
      const { error } = await supabase
        .from('integration_credentials')
        .update({ is_active: isActive })
        .eq('id', savedCred.id);

      if (error) throw error;
      toast.success(isActive ? 'Integração ativada' : 'Integração desativada');
      fetchSavedCredentials();
    } catch (error) {
      console.error('Error toggling credential:', error);
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

  const renderProviderCard = (provider: IntegrationProvider) => {
    const savedCred = savedCredentials.find(c => c.integration_name === provider.name);
    const isEditing = editingProvider === provider.id;

    return (
      <Card key={provider.id} className={savedCred ? 'border-primary/30' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {provider.icon}
              {provider.displayName}
            </CardTitle>
            {savedCred && (
              <Switch
                checked={savedCred.is_active}
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
              Documentação
            </a>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {savedCred && !isEditing ? (
            <>
              <div className="space-y-2">
                {provider.fields.slice(0, 2).map(field => (
                  <div key={field.key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {visibleFields[`${provider.id}-${field.key}`] 
                          ? savedCred.credentials_json[field.key] 
                          : maskValue(savedCred.credentials_json[field.key])}
                      </code>
                      {field.type === 'password' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFieldVisibility(`${provider.id}-${field.key}`)}
                          className="h-6 w-6 p-0"
                        >
                          {visibleFields[`${provider.id}-${field.key}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                {getStatusBadge(savedCred.validation_status)}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(provider, savedCred)}>
                    Editar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(provider.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : isEditing ? (
            <div className="space-y-3">
              {provider.fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`${provider.id}-${field.key}`} className="text-xs">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${provider.id}-${field.key}`}
                      type={field.type === 'password' && !visibleFields[`${provider.id}-${field.key}`] ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="pr-10"
                    />
                    {field.type === 'password' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFieldVisibility(`${provider.id}-${field.key}`)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      >
                        {visibleFields[`${provider.id}-${field.key}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
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
                  size="sm" 
                  variant="outline"
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
              className="w-full" 
              onClick={() => handleEdit(provider)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          )}
        </CardContent>
      </Card>
    );
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
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Credenciais de Integração
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure credenciais do Google e bancos de dados para uso no n8n
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Google
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Bancos de Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {GOOGLE_PROVIDERS.map(renderProviderCard)}
          </div>
        </TabsContent>

        <TabsContent value="database" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DATABASE_PROVIDERS.map(renderProviderCard)}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover credenciais?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As credenciais serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IntegrationCredentialsManager;
