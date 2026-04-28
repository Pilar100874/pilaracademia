import React, { useState, useEffect } from 'react';
import { Workflow, Wand2, Copy, Check, Loader2, Sparkles, RefreshCw, Download, AlertCircle, Server, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SavedCredential {
  integration_name: string;
  display_name: string;
  is_active: boolean;
}

interface EnvVariable {
  name: string;
  description: string;
  example: string;
}

const N8nWorkflowGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEnvCopied, setIsEnvCopied] = useState(false);
  const [availableCredentials, setAvailableCredentials] = useState<SavedCredential[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const { data: integrationCreds } = await supabase
        .from('integration_credentials')
        .select('integration_name, display_name, is_active')
        .eq('is_active', true);

      const { data: aiKeys } = await supabase
        .from('ai_api_keys')
        .select('provider, provider_display_name, is_active')
        .eq('is_active', true);

      const allCreds: SavedCredential[] = [
        ...(integrationCreds || []).map(c => ({
          integration_name: c.integration_name,
          display_name: c.display_name,
          is_active: c.is_active ?? true
        })),
        ...(aiKeys || []).map(k => ({
          integration_name: k.provider,
          display_name: k.provider_display_name,
          is_active: k.is_active ?? true
        }))
      ];

      setAvailableCredentials(allCreds);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  const generateWorkflow = async () => {
    if (!prompt.trim()) {
      toast.error('Descreva o workflow que deseja criar');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedJson('');
    setEnvVariables([]);

    try {
      const credentialsList = availableCredentials.map(c => c.display_name).join(', ');
      
      const systemPrompt = `Você é um especialista em n8n workflow automation. Sua tarefa é gerar workflows n8n válidos em formato JSON que podem ser importados diretamente no n8n, usando variáveis de ambiente para credenciais.

REGRAS IMPORTANTES:
1. Gere APENAS o JSON válido do workflow, sem explicações antes ou depois
2. O JSON deve seguir a estrutura exata do n8n v1.0+
3. Use nodes oficiais do n8n
4. Inclua todas as conexões necessárias entre nodes
5. Configure os parâmetros dos nodes de forma realista

REGRA CRÍTICA - VARIÁVEIS DE AMBIENTE:
- NUNCA use credenciais hardcoded
- Use expressões n8n para referenciar variáveis de ambiente: ={{$env.NOME_VARIAVEL}}
- Para OAuth (Google, etc), use:
  - ={{$env.GOOGLE_CLIENT_ID}}
  - ={{$env.GOOGLE_CLIENT_SECRET}}
  - ={{$env.GOOGLE_REFRESH_TOKEN}}
- Para APIs, use:
  - ={{$env.OPENAI_API_KEY}}
  - ={{$env.WHATSAPP_TOKEN}}
  - etc.
- Para databases, use:
  - ={{$env.MSSQL_HOST}}
  - ={{$env.MSSQL_DATABASE}}
  - ={{$env.MSSQL_USER}}
  - ={{$env.MSSQL_PASSWORD}}

Credenciais disponíveis do usuário: ${credentialsList || 'Nenhuma configurada'}

ESTRUTURA DO WORKFLOW:
{
  "name": "Nome do Workflow",
  "nodes": [...],
  "connections": {...},
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1",
  "id": "1"
}

EXEMPLO DE NODE COM ENV VARS:
{
  "parameters": {
    "authentication": "oAuth2",
    "resource": "message",
    "operation": "send"
  },
  "credentials": {
    "googleOAuth2Api": {
      "id": "1",
      "name": "Google OAuth2",
      "type": "googleOAuth2Api",
      "data": {
        "clientId": "={{$env.GOOGLE_CLIENT_ID}}",
        "clientSecret": "={{$env.GOOGLE_CLIENT_SECRET}}"
      }
    }
  },
  "id": "uuid-here",
  "name": "Gmail",
  "type": "n8n-nodes-base.gmail",
  "typeVersion": 2.1,
  "position": [250, 300]
}

Após o JSON, adicione uma seção separada por "---ENV_VARS---" listando todas as variáveis de ambiente necessárias no formato:
NOME_VARIAVEL|Descrição|Exemplo de valor`;

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Crie um workflow n8n para: ${prompt}` }
          ]
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar workflow');
      }

      const reader = response.data?.body?.getReader?.();
      
      if (reader) {
        const decoder = new TextDecoder();
        let fullContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }

        parseGeneratedContent(fullContent);
      } else {
        const data = response.data;
        if (typeof data === 'string') {
          parseGeneratedContent(data);
        }
      }
    } catch (err) {
      console.error('Error generating workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar workflow';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseGeneratedContent = (content: string) => {
    // Split by ENV_VARS marker if present
    const parts = content.split('---ENV_VARS---');
    const jsonPart = parts[0];
    const envPart = parts[1] || '';

    // Extract JSON
    const jsonMatch = jsonPart.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      JSON.parse(jsonStr); // Validate
      setGeneratedJson(jsonStr);

      // Extract env variables from the JSON itself
      const envVarsFromJson = extractEnvVarsFromJson(jsonStr);
      
      // Parse explicit env vars section
      const explicitEnvVars: EnvVariable[] = [];
      if (envPart.trim()) {
        const lines = envPart.trim().split('\n');
        for (const line of lines) {
          const [name, description, example] = line.split('|').map(s => s.trim());
          if (name && !name.startsWith('#')) {
            explicitEnvVars.push({ name, description: description || '', example: example || '' });
          }
        }
      }

      // Merge and deduplicate
      const allEnvVars = [...envVarsFromJson];
      for (const ev of explicitEnvVars) {
        if (!allEnvVars.find(v => v.name === ev.name)) {
          allEnvVars.push(ev);
        }
      }

      setEnvVariables(allEnvVars);
      toast.success('Workflow gerado com sucesso!');
    } else {
      throw new Error('Não foi possível extrair o JSON do workflow');
    }
  };

  const extractEnvVarsFromJson = (jsonStr: string): EnvVariable[] => {
    const envVars: EnvVariable[] = [];
    const regex = /\{\{\$env\.([A-Z_]+)\}\}/g;
    let match;
    const seen = new Set<string>();

    while ((match = regex.exec(jsonStr)) !== null) {
      const varName = match[1];
      if (!seen.has(varName)) {
        seen.add(varName);
        envVars.push({
          name: varName,
          description: getEnvVarDescription(varName),
          example: getEnvVarExample(varName)
        });
      }
    }

    return envVars;
  };

  const getEnvVarDescription = (name: string): string => {
    const descriptions: Record<string, string> = {
      'GOOGLE_CLIENT_ID': 'Client ID do Google Cloud Console',
      'GOOGLE_CLIENT_SECRET': 'Client Secret do Google Cloud Console',
      'GOOGLE_REFRESH_TOKEN': 'Refresh Token OAuth2 do Google',
      'OPENAI_API_KEY': 'Chave de API da OpenAI',
      'WHATSAPP_TOKEN': 'Token de acesso do WhatsApp Business API',
      'WHATSAPP_PHONE_ID': 'ID do número de telefone WhatsApp',
      'MSSQL_HOST': 'Endereço do servidor MS SQL',
      'MSSQL_DATABASE': 'Nome do banco de dados',
      'MSSQL_USER': 'Usuário do banco de dados',
      'MSSQL_PASSWORD': 'Senha do banco de dados',
      'MSSQL_PORT': 'Porta do MS SQL (padrão: 1433)',
      'TELEGRAM_BOT_TOKEN': 'Token do bot do Telegram',
      'SLACK_TOKEN': 'Token OAuth do Slack',
      'SMTP_HOST': 'Servidor SMTP',
      'SMTP_USER': 'Usuário SMTP',
      'SMTP_PASSWORD': 'Senha SMTP',
    };
    return descriptions[name] || `Valor para ${name}`;
  };

  const getEnvVarExample = (name: string): string => {
    const examples: Record<string, string> = {
      'GOOGLE_CLIENT_ID': '123456789.apps.googleusercontent.com',
      'GOOGLE_CLIENT_SECRET': 'GOCSPX-xxxxxxxxxxxxx',
      'GOOGLE_REFRESH_TOKEN': '1//xxxxxxxxxxxxx',
      'OPENAI_API_KEY': 'sk-xxxxxxxxxxxxxxxx',
      'WHATSAPP_TOKEN': 'EAAxxxxxxxxxxxxxxxx',
      'WHATSAPP_PHONE_ID': '123456789012345',
      'MSSQL_HOST': 'servidor.database.windows.net',
      'MSSQL_DATABASE': 'nome_do_banco',
      'MSSQL_USER': 'usuario',
      'MSSQL_PASSWORD': '********',
      'MSSQL_PORT': '1433',
      'TELEGRAM_BOT_TOKEN': '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      'SLACK_TOKEN': 'xoxb-xxxxxxxxxxxxx',
      'SMTP_HOST': 'smtp.gmail.com',
      'SMTP_USER': 'email@gmail.com',
      'SMTP_PASSWORD': '********',
    };
    return examples[name] || 'seu_valor_aqui';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedJson);
      setIsCopied(true);
      toast.success('JSON copiado para a área de transferência');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const copyEnvTemplate = async () => {
    const template = envVariables.map(v => `${v.name}=${v.example}`).join('\n');
    try {
      await navigator.clipboard.writeText(template);
      setIsEnvCopied(true);
      toast.success('Template de variáveis copiado!');
      setTimeout(() => setIsEnvCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([generatedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'n8n-workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado');
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(generatedJson);
      setGeneratedJson(JSON.stringify(parsed, null, 2));
    } catch {
      toast.error('JSON inválido');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Gerador de Workflows n8n
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Descreva o que precisa automatizar e receba um JSON pronto com variáveis de ambiente para o Railway
        </p>
      </div>

      {availableCredentials.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credenciais Disponíveis</CardTitle>
            <CardDescription className="text-xs">
              Estas credenciais serão consideradas na geração do workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableCredentials.map((cred, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {cred.display_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Descreva seu Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">O que você quer automatizar?</Label>
            <Textarea
              id="prompt"
              placeholder="Ex: Quando receber um email no Gmail com 'Pedido' no assunto, extrair os dados e salvar em uma planilha do Google Sheets, depois enviar uma mensagem no WhatsApp confirmando o recebimento."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              O JSON será gerado com variáveis de ambiente para você configurar no Railway
            </p>
          </div>

          <Button 
            onClick={generateWorkflow} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando workflow...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Workflow
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedJson && (
        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Workflow JSON
            </TabsTrigger>
            <TabsTrigger value="env" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Variáveis Railway
              {envVariables.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {envVariables.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">JSON do Workflow</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={formatJson}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Formatar
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadJson}>
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                    <Button variant="default" size="sm" onClick={copyToClipboard}>
                      {isCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Importe no n8n via Menu → Import from File/URL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {generatedJson}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="env">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Variáveis de Ambiente para Railway
                    </CardTitle>
                    <CardDescription>
                      Configure estas variáveis no Railway/n8n para o workflow funcionar
                    </CardDescription>
                  </div>
                  <Button variant="default" size="sm" onClick={copyEnvTemplate}>
                    {isEnvCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar Template
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {envVariables.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">Variável</th>
                            <th className="text-left p-3 font-medium">Descrição</th>
                            <th className="text-left p-3 font-medium">Exemplo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {envVariables.map((envVar, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-3">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {envVar.name}
                                </code>
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {envVar.description}
                              </td>
                              <td className="p-3">
                                <code className="text-xs text-muted-foreground">
                                  {envVar.example}
                                </code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Alert>
                      <Server className="h-4 w-4" />
                      <AlertDescription>
                        <strong>No Railway:</strong> Vá em Variables e adicione cada variável acima.
                        <br />
                        <strong>No n8n:</strong> As variáveis do Railway são automaticamente disponibilizadas como {`$env.NOME`}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma variável de ambiente detectada no workflow
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Como usar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Gere o workflow descrevendo sua automação</li>
            <li>Copie as variáveis e configure no Railway</li>
            <li>Importe o JSON no n8n</li>
            <li>As credenciais já estarão referenciando as variáveis do Railway automaticamente via <code className="bg-muted px-1 rounded">$env.NOME</code></li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default N8nWorkflowGenerator;
