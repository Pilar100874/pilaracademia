import React from 'react';
import { Node } from '@xyflow/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Save, Trash2, Zap, Key } from 'lucide-react';
import { N8nNodeType, N8nCredential, ParameterSchema } from './types';

interface NodeConfigPanelProps {
  node: Node | null;
  credentials: N8nCredential[];
  onClose: () => void;
  onSave: (nodeId: string, updates: { label: string; parameters: Record<string, any>; credentialId?: string; credentialName?: string }) => void;
  onDelete: (nodeId: string) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  credentials,
  onClose,
  onSave,
  onDelete,
}) => {
  const [label, setLabel] = React.useState('');
  const [parameters, setParameters] = React.useState<Record<string, any>>({});
  const [selectedCredentialId, setSelectedCredentialId] = React.useState<string>('');

  const nodeType = node?.data?.nodeType as N8nNodeType | undefined;
  const schema = nodeType?.parametros_schema || {};

  React.useEffect(() => {
    if (node) {
      setLabel(node.data?.label as string || '');
      setParameters(node.data?.parameters as Record<string, any> || {});
      setSelectedCredentialId(node.data?.credentialId as string || '');
    }
  }, [node]);

  const handleSave = () => {
    if (!node) return;
    
    const selectedCred = credentials.find(c => c.id === selectedCredentialId);
    onSave(node.id, {
      label,
      parameters,
      credentialId: selectedCredentialId || undefined,
      credentialName: selectedCred?.nome,
    });
    onClose();
  };

  const handleParamChange = (key: string, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const renderParameter = (key: string, config: ParameterSchema) => {
    const value = parameters[key] ?? config.default;

    switch (config.type) {
      case 'select':
        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{config.label || key}</Label>
            <Select value={value} onValueChange={(v) => handleParamChange(key, v)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{config.label || key}</Label>
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => handleParamChange(key, parseFloat(e.target.value) || 0)}
              className="h-8"
            />
          </div>
        );

      case 'code':
        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{config.label || key}</Label>
            <Textarea
              value={value || ''}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="font-mono text-xs min-h-[100px]"
              placeholder="Digite o código..."
            />
          </div>
        );

      case 'json':
        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{config.label || key}</Label>
            <Textarea
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
              onChange={(e) => {
                try {
                  handleParamChange(key, JSON.parse(e.target.value));
                } catch {
                  handleParamChange(key, e.target.value);
                }
              }}
              className="font-mono text-xs min-h-[80px]"
              placeholder="{}"
            />
          </div>
        );

      default:
        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{config.label || key}</Label>
            <Input
              value={value || ''}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="h-8"
              placeholder={`Digite ${key}...`}
            />
          </div>
        );
    }
  };

  const relevantCredentials = credentials.filter(
    (c) => c.credential_type_id === nodeType?.credential_type_id
  );

  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <div 
              className="p-2 rounded-md text-white"
              style={{ backgroundColor: nodeType?.cor || '#64748b' }}
            >
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div>{nodeType?.nome_display || 'Nó'}</div>
              <div className="text-xs text-muted-foreground font-normal">
                {nodeType?.tipo}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-4 pr-4">
            {/* Node Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Nó</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-8"
                placeholder="Nome do nó..."
              />
            </div>

            <Separator />

            {/* Credentials */}
            {nodeType?.credential_type_id && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    Credencial
                  </Label>
                  <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione uma credencial..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {relevantCredentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {relevantCredentials.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma credencial disponível. Crie uma na aba Credenciais.
                    </p>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Parameters */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Parâmetros</Label>
              {Object.entries(schema).map(([key, config]) => 
                renderParameter(key, config as ParameterSchema)
              )}
              {Object.keys(schema).length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Este nó não possui parâmetros configuráveis.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 pt-4 border-t mt-4 flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => node && onDelete(node.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigPanel;
