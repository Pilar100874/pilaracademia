import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Save, Trash2, CheckCircle2, XCircle, AlertCircle,
  Loader2, ExternalLink, Database, Mail, FileSpreadsheet, FileText, HardDrive, FolderOpen,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IntegrationProvider {
  id: string;
  type: string;
  name: string;
  displayName: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; placeholder: string; type: 'text' | 'password'; required?: boolean }[];
  docsUrl?: string;
}

const GOOGLE_PROVIDERS: IntegrationProvider[] = [
  { id: 'gmail', type: 'google', name: 'gmail', displayName: 'Gmail',
    icon: <Mail className="h-5 w-5" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//...', type: 'password' },
    ], docsUrl: 'https://console.cloud.google.com/apis/credentials' },
  { id: 'google_drive', type: 'google', name: 'google_drive', displayName: 'Google Drive',
    icon: <HardDrive className="h-5 w-5" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: '', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: '', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '', type: 'password' },
    ] },
  { id: 'google_sheets', type: 'google', name: 'google_sheets', displayName: 'Google Sheets',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: '', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: '', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '', type: 'password' },
    ] },
  { id: 'google_docs', type: 'google', name: 'google_docs', displayName: 'Google Docs',
    icon: <FileText className="h-5 w-5" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: '', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: '', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '', type: 'password' },
    ] },
  { id: 'google_calendar', type: 'google', name: 'google_calendar', displayName: 'Google Calendar',
    icon: <FolderOpen className="h-5 w-5" />,
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: '', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: '', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '', type: 'password' },
    ] },
];

const DATABASE_PROVIDERS: IntegrationProvider[] = [
  { id: 'mssql', type: 'database', name: 'mssql', displayName: 'Microsoft SQL Server',
    icon: <Database className="h-5 w-5" />,
    fields: [
      { key: 'host', label: 'Host/Servidor', placeholder: 'servidor.database.windows.net', type: 'text', required: true },
      { key: 'port', label: 'Porta', placeholder: '1433', type: 'text' },
      { key: 'database', label: 'Database', placeholder: 'meu_banco', type: 'text', required: true },
      { key: 'username', label: 'Usuário', placeholder: 'sa', type: 'text', required: true },
      { key: 'password', label: 'Senha', placeholder: '', type: 'password', required: true },
    ] },
  { id: 'mysql', type: 'database', name: 'mysql', displayName: 'MySQL',
    icon: <Database className="h-5 w-5" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Porta', placeholder: '3306', type: 'text' },
      { key: 'database', label: 'Database', placeholder: '', type: 'text', required: true },
      { key: 'username', label: 'Usuário', placeholder: 'root', type: 'text', required: true },
      { key: 'password', label: 'Senha', placeholder: '', type: 'password', required: true },
    ] },
  { id: 'postgresql', type: 'database', name: 'postgresql', displayName: 'PostgreSQL',
    icon: <Database className="h-5 w-5" />,
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Porta', placeholder: '5432', type: 'text' },
      { key: 'database', label: 'Database', placeholder: '', type: 'text', required: true },
      { key: 'username', label: 'Usuário', placeholder: 'postgres', type: 'text', required: true },
      { key: 'password', label: 'Senha', placeholder: '', type: 'password', required: true },
    ] },
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
  const { user } = useAuth();
  const { data: roleInfo } = useUserClinicRole();
  const clinicId = roleInfo?.clinicId;

  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('google');

  useEffect(() => { if (clinicId) fetchSavedCredentials(); }, [clinicId]);

  const fetchSavedCredentials = async () => {
    if (!clinicId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('marketing_integration_credentials')
        .select('*')
        .eq('clinic_id', clinicId);
      if (error) throw error;
      const typed = (data || []).map(item => ({
        ...item,
        credentials_json: (item.credentials_json || {}) as Record<string, string>,
      }));
      setSavedCredentials(typed as SavedCredential[]);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar credenciais');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFieldVisibility = (k: string) => setVisibleFields(p => ({ ...p, [k]: !p[k] }));
  const maskValue = (v: string | null) => !v ? '' : v.length <= 8 ? '••••••••' : v.substring(0, 4) + '••••••••' + v.substring(v.length - 4);

  const handleEdit = (provider: IntegrationProvider, savedCred?: SavedCredential) => {
    setEditingProvider(provider.id);
    const initial: Record<string, string> = {};
    provider.fields.forEach(f => { initial[f.key] = savedCred?.credentials_json?.[f.key] || ''; });
    setFormData(initial);
  };

  const handleSave = async (provider: IntegrationProvider) => {
    if (!user || !clinicId) {
      toast.error('Você precisa estar vinculado a uma clínica');
      return;
    }
    for (const f of provider.fields.filter(f => f.required)) {
      if (!formData[f.key]) {
        toast.error(`${f.label} é obrigatório`);
        return;
      }
    }
    try {
      setIsSaving(true);
      const existing = savedCredentials.find(c => c.integration_name === provider.name);
      const payload = {
        clinic_id: clinicId,
        integration_type: provider.type,
        integration_name: provider.name,
        display_name: provider.displayName,
        credentials_json: formData,
        is_active: true,
        validation_status: 'pending',
        created_by: user.id,
      };
      const { error } = existing
        ? await supabase.from('marketing_integration_credentials').update(payload).eq('id', existing.id)
        : await supabase.from('marketing_integration_credentials').insert(payload);
      if (error) throw error;
      toast.success(existing ? 'Credenciais atualizadas' : 'Credenciais salvas');
      setEditingProvider(null);
      setFormData({});
      fetchSavedCredentials();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    const c = savedCredentials.find(c => c.integration_name === name);
    if (!c) return;
    try {
      const { error } = await supabase.from('marketing_integration_credentials').delete().eq('id', c.id);
      if (error) throw error;
      toast.success('Credenciais removidas');
      setDeleteConfirm(null);
      fetchSavedCredentials();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover');
    }
  };

  const toggleActive = async (name: string, isActive: boolean) => {
    const c = savedCredentials.find(c => c.integration_name === name);
    if (!c) return;
    try {
      const { error } = await supabase.from('marketing_integration_credentials').update({ is_active: isActive }).eq('id', c.id);
      if (error) throw error;
      fetchSavedCredentials();
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

  const renderProviderCard = (provider: IntegrationProvider) => {
    const savedCred = savedCredentials.find(c => c.integration_name === provider.name);
    const isEditing = editingProvider === provider.id;
    return (
      <Card key={provider.id} className={savedCred ? 'border-primary/30' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-serif">
              {provider.icon}
              {provider.displayName}
            </CardTitle>
            {savedCred && (
              <Switch checked={savedCred.is_active} onCheckedChange={(v) => toggleActive(provider.name, v)} />
            )}
          </div>
          {provider.docsUrl && (
            <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />Documentação
            </a>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {savedCred && !isEditing ? (
            <>
              <div className="space-y-2">
                {provider.fields.slice(0, 2).map(field => (
                  <div key={field.key} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {visibleFields[`${provider.id}-${field.key}`]
                          ? savedCred.credentials_json[field.key]
                          : maskValue(savedCred.credentials_json[field.key])}
                      </code>
                      {field.type === 'password' && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => toggleFieldVisibility(`${provider.id}-${field.key}`)}>
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
                  <Button variant="outline" size="sm" onClick={() => handleEdit(provider, savedCred)}>Editar</Button>
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
                    type={field.type === 'password' && !visibleFields[`edit-${provider.id}-${field.key}`] ? 'password' : 'text'}
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
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(provider)}>Configurar</Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!clinicId) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Você precisa estar vinculado a uma clínica.</div>;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="database">Bancos de Dados</TabsTrigger>
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover credenciais?</AlertDialogTitle>
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

export default IntegrationCredentialsManager;
