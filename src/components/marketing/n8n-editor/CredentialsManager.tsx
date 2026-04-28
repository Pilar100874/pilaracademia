import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Trash2, Eye, EyeOff, Bot, Database, Mail, MessageCircle, Lock, Webhook, Brain } from 'lucide-react';
import { N8nCredentialType, N8nCredential, CredentialField } from './types';
import { useCreateCredential, useDeleteCredential } from './hooks/useN8nData';

const iconMap: Record<string, React.ElementType> = {
  bot: Bot,
  database: Database,
  mail: Mail,
  'message-circle': MessageCircle,
  lock: Lock,
  key: Key,
  webhook: Webhook,
  hash: MessageCircle,
  brain: Brain,
};

interface CredentialsManagerProps {
  credentialTypes: N8nCredentialType[];
  credentials: N8nCredential[];
  estabelecimentoId: string;
}

const CredentialsManager: React.FC<CredentialsManagerProps> = ({
  credentialTypes,
  credentials,
  estabelecimentoId,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [credentialName, setCredentialName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const createCredential = useCreateCredential();
  const deleteCredential = useDeleteCredential();

  const selectedTypeData = credentialTypes.find((t) => t.id === selectedType);
  const campos = selectedTypeData?.campos_json || [];

  const handleCreate = async () => {
    if (!selectedType || !credentialName.trim()) return;

    await createCredential.mutateAsync({
      estabelecimento_id: estabelecimentoId,
      credential_type_id: selectedType,
      nome: credentialName,
      valores_criptografados: fieldValues,
      ativo: true,
    });

    setIsDialogOpen(false);
    setSelectedType('');
    setCredentialName('');
    setFieldValues({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta credencial?')) {
      await deleteCredential.mutateAsync(id);
    }
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Credenciais Salvas</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie suas chaves de API e tokens de acesso
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Credencial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Credencial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Credencial</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {credentialTypes.map((type) => {
                      const IconComponent = iconMap[type.icone || ''] || Key;
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {type.nome}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedType && (
                <>
                  <div className="space-y-2">
                    <Label>Nome da Credencial</Label>
                    <Input
                      value={credentialName}
                      onChange={(e) => setCredentialName(e.target.value)}
                      placeholder="Ex: OpenAI Produção"
                    />
                  </div>

                  {campos.map((campo: CredentialField) => (
                    <div key={campo.nome} className="space-y-2">
                      <Label>
                        {campo.label}
                        {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          type={campo.tipo === 'password' && !showPasswords[campo.nome] ? 'password' : 'text'}
                          value={fieldValues[campo.nome] || ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({ ...prev, [campo.nome]: e.target.value }))
                          }
                          placeholder={`Digite ${campo.label.toLowerCase()}...`}
                        />
                        {campo.tipo === 'password' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => togglePasswordVisibility(campo.nome)}
                          >
                            {showPasswords[campo.nome] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={handleCreate}
                    disabled={createCredential.isPending || !credentialName.trim()}
                    className="w-full"
                  >
                    {createCredential.isPending ? 'Salvando...' : 'Salvar Credencial'}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="grid gap-3">
          {credentials.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Key className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma credencial salva
                </p>
              </CardContent>
            </Card>
          ) : (
            credentials.map((cred) => {
              const type = credentialTypes.find((t) => t.id === cred.credential_type_id);
              const IconComponent = iconMap[type?.icone || ''] || Key;

              return (
                <Card key={cred.id}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{cred.nome}</CardTitle>
                          <CardDescription className="text-xs">
                            {type?.nome || 'Tipo desconhecido'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cred.ativo ? 'default' : 'secondary'}>
                          {cred.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cred.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CredentialsManager;
