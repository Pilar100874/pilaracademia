import React, { useState, useEffect } from 'react';
import { Upload, KeyRound, Replace, Check, Copy, Download, Loader2, AlertCircle, RefreshCw, Save, Trash2, Eye, EyeOff, Workflow, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import N8nWorkflowVisualizer from './N8nWorkflowVisualizer';

interface ApiKey {
  id: string;
  provider: string;
  provider_display_name: string;
  api_key: string | null;
  organization_id: string | null;
  project_id: string | null;
  base_url: string | null;
}

interface DetectedKey {
  original: string;
  type: string;
  location: string;
  nodeName?: string;
  shouldReplace: boolean;
}

interface KeyMapping {
  pattern: RegExp;
  type: string;
  keyField: 'api_key' | 'organization_id' | 'project_id' | 'base_url';
  providers: string[];
}

const KEY_MAPPINGS: KeyMapping[] = [
  {
    pattern: /sk-[a-zA-Z0-9\-_]{20,}/g,
    type: 'OpenAI API Key',
    keyField: 'api_key',
    providers: ['openai'],
  },
  {
    pattern: /sk-proj-[a-zA-Z0-9\-_]{20,}/g,
    type: 'OpenAI Project Key',
    keyField: 'api_key',
    providers: ['openai'],
  },
  {
    pattern: /org-[a-zA-Z0-9]{10,}/g,
    type: 'OpenAI Organization ID',
    keyField: 'organization_id',
    providers: ['openai'],
  },
  {
    pattern: /proj_[a-zA-Z0-9]{10,}/g,
    type: 'OpenAI Project ID',
    keyField: 'project_id',
    providers: ['openai'],
  },
  {
    pattern: /AIza[a-zA-Z0-9\-_]{35}/g,
    type: 'Google API Key',
    keyField: 'api_key',
    providers: ['google', 'gemini'],
  },
  {
    pattern: /xai-[a-zA-Z0-9\-_]{40,}/g,
    type: 'xAI (Grok) API Key',
    keyField: 'api_key',
    providers: ['xai', 'grok'],
  },
  {
    pattern: /sk-ant-[a-zA-Z0-9\-_]{40,}/g,
    type: 'Anthropic API Key',
    keyField: 'api_key',
    providers: ['anthropic', 'claude'],
  },
  {
    pattern: /EAA[a-zA-Z0-9]{50,}/g,
    type: 'Meta/Facebook Token',
    keyField: 'api_key',
    providers: ['meta', 'facebook', 'whatsapp', 'instagram'],
  },
  {
    pattern: /\d{15,}:\w{35,}/g,
    type: 'Telegram Bot Token',
    keyField: 'api_key',
    providers: ['telegram'],
  },
];

const N8nJsonAdapter: React.FC = () => {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [detectedKeys, setDetectedKeys] = useState<DetectedKey[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOriginalKeys, setShowOriginalKeys] = useState(false);
  const [viewMode, setViewMode] = useState<'json' | 'visual'>('json');
  const [replacementLog, setReplacementLog] = useState<Array<{
    original: string;
    replacement: string;
    type: string;
    provider: string;
    count: number;
  }>>([]);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('id, provider, provider_display_name, api_key, organization_id, project_id, base_url')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_active', true);

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err) {
      console.error('Error loading API keys:', err);
      toast.error('Erro ao carregar chaves de API');
    } finally {
      setLoading(false);
    }
  };

  const detectKeysInJson = (jsonStr: string): DetectedKey[] => {
    const detected: DetectedKey[] = [];
    
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Recursively search for keys in JSON
      const searchInObject = (obj: any, path: string = '', nodeName?: string) => {
        if (!obj || typeof obj !== 'object') return;
        
        // Check if this is a node object
        const currentNodeName = obj.name || nodeName;
        
        for (const key of Object.keys(obj)) {
          const value = obj[key];
          
          if (typeof value === 'string') {
            for (const mapping of KEY_MAPPINGS) {
              const matches = value.match(mapping.pattern);
              if (matches) {
                for (const match of matches) {
                  // Check if already detected
                  if (!detected.find(d => d.original === match)) {
                    detected.push({
                      original: match,
                      type: mapping.type,
                      location: `${path}.${key}`,
                      nodeName: currentNodeName,
                      shouldReplace: true,
                    });
                  }
                }
              }
            }
          } else if (Array.isArray(value)) {
            value.forEach((item, idx) => {
              searchInObject(item, `${path}.${key}[${idx}]`, currentNodeName);
            });
          } else if (typeof value === 'object') {
            searchInObject(value, `${path}.${key}`, currentNodeName);
          }
        }
      };
      
      searchInObject(parsed, 'root');
    } catch (e) {
      console.error('Error parsing JSON for key detection:', e);
    }
    
    return detected;
  };

  const handleInputChange = (value: string) => {
    setInputJson(value);
    setOutputJson('');
    
    if (value.trim()) {
      try {
        // Validate JSON
        JSON.parse(value);
        const keys = detectKeysInJson(value);
        setDetectedKeys(keys);
      } catch (e) {
        setDetectedKeys([]);
      }
    } else {
      setDetectedKeys([]);
    }
  };

  const toggleKeyReplacement = (original: string) => {
    setDetectedKeys(prev => 
      prev.map(k => 
        k.original === original 
          ? { ...k, shouldReplace: !k.shouldReplace }
          : k
      )
    );
  };

  const findReplacementKey = (detectedKey: DetectedKey): { value: string | null; provider: string | null } => {
    for (const mapping of KEY_MAPPINGS) {
      if (detectedKey.original.match(mapping.pattern)) {
        // Find matching API key from configured keys
        for (const provider of mapping.providers) {
          const apiKey = apiKeys.find(k => 
            k.provider.toLowerCase().includes(provider.toLowerCase())
          );
          if (apiKey && apiKey[mapping.keyField]) {
            return { 
              value: apiKey[mapping.keyField], 
              provider: apiKey.provider_display_name 
            };
          }
        }
      }
    }
    return { value: null, provider: null };
  };

  const processJson = () => {
    if (!inputJson.trim()) {
      toast.error('Cole o JSON do workflow primeiro');
      return;
    }

    setIsProcessing(true);
    setReplacementLog([]);

    try {
      let parsed = JSON.parse(inputJson);
      let jsonStr = JSON.stringify(parsed, null, 2);
      let replacementsCount = 0;
      const newReplacementLog: Array<{
        original: string;
        replacement: string;
        type: string;
        provider: string;
        count: number;
      }> = [];

      // Replace detected keys that are marked for replacement
      for (const detectedKey of detectedKeys) {
        if (!detectedKey.shouldReplace) continue;

        const replacement = findReplacementKey(detectedKey);
        if (replacement.value) {
          // Use global replace to replace all occurrences
          const regex = new RegExp(escapeRegExp(detectedKey.original), 'g');
          const count = (jsonStr.match(regex) || []).length;
          jsonStr = jsonStr.replace(regex, replacement.value);
          replacementsCount += count;
          newReplacementLog.push({
            original: detectedKey.original,
            replacement: replacement.value,
            type: detectedKey.type,
            provider: replacement.provider || 'Desconhecido',
            count
          });
        }
      }

      // Re-parse to ensure valid JSON
      parsed = JSON.parse(jsonStr);
      setOutputJson(JSON.stringify(parsed, null, 2));
      setReplacementLog(newReplacementLog);

      if (replacementsCount > 0) {
        toast.success(`${replacementsCount} chave(s) substituída(s)!`);
      } else {
        toast.info('Nenhuma chave foi substituída. Verifique se você tem as chaves configuradas.');
      }
    } catch (e) {
      console.error('Error processing JSON:', e);
      toast.error('Erro ao processar JSON. Verifique se o formato está correto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputJson);
      setIsCopied(true);
      toast.success('JSON copiado para a área de transferência');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n8n-workflow-adapted.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleInputChange(content);
    };
    reader.readAsText(file);
  };

  const clearAll = () => {
    setInputJson('');
    setOutputJson('');
    setDetectedKeys([]);
  };

  const maskKey = (key: string): string => {
    if (key.length <= 8) return '****';
    return key.substring(0, 6) + '...' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Replace className="h-5 w-5 text-primary" />
          Adaptar Workflow Existente
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Cole o JSON de um workflow n8n e substitua automaticamente as chaves de API pelas suas
        </p>
      </div>

      {/* Configured API Keys */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Suas Chaves Configuradas
          </CardTitle>
          <CardDescription className="text-xs">
            Estas chaves serão usadas para substituir as chaves encontradas no workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          {apiKeys.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma chave de API configurada. Configure suas chaves na aba "Chaves IA" primeiro.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap gap-2">
              {apiKeys.map((key) => (
                <Badge key={key.id} variant="secondary" className="text-xs">
                  {key.provider_display_name}
                  {key.api_key && <Check className="h-3 w-3 ml-1 text-green-500" />}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                JSON do Workflow Original
              </CardTitle>
              <CardDescription className="text-xs">
                Cole o JSON ou faça upload de um arquivo .json
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <label htmlFor="json-upload">
                <input
                  id="json-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </span>
                </Button>
              </label>
              {inputJson && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'json' | 'visual')}>
            <TabsList className="mb-2">
              <TabsTrigger value="json" className="gap-1">
                <Code2 className="h-3 w-3" />
                JSON
              </TabsTrigger>
              <TabsTrigger value="visual" className="gap-1">
                <Workflow className="h-3 w-3" />
                Visual
              </TabsTrigger>
            </TabsList>
            <TabsContent value="json" className="mt-0">
              <Textarea
                value={inputJson}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder='{"nodes": [...], "connections": {...}}'
                className="min-h-[200px] font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="visual" className="mt-0">
              <div className="h-[400px] rounded-lg border bg-muted/20 overflow-hidden">
                <N8nWorkflowVisualizer jsonData={inputJson} editable={false} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detected Keys */}
      {detectedKeys.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-yellow-500" />
                  Chaves Detectadas ({detectedKeys.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione quais chaves deseja substituir
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowOriginalKeys(!showOriginalKeys)}
              >
                {showOriginalKeys ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showOriginalKeys ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {detectedKeys.map((key, idx) => {
                const replacement = findReplacementKey(key);
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg border ${key.shouldReplace ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`key-${idx}`}
                          checked={key.shouldReplace}
                          onCheckedChange={() => toggleKeyReplacement(key.original)}
                        />
                        <div className="space-y-1">
                          <Label htmlFor={`key-${idx}`} className="text-sm font-medium cursor-pointer">
                            {key.type}
                          </Label>
                          {key.nodeName && (
                            <p className="text-xs text-muted-foreground">
                              Node: {key.nodeName}
                            </p>
                          )}
                          <p className="text-xs font-mono text-muted-foreground">
                            {showOriginalKeys ? key.original : maskKey(key.original)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {replacement.value ? (
                          <Badge variant="default" className="text-xs bg-green-600">
                            → {replacement.provider}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                            Sem substituto
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button 
              onClick={processJson} 
              disabled={isProcessing || apiKeys.length === 0}
              className="w-full mt-4"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Replace className="h-4 w-4 mr-2" />
                  Substituir Chaves Selecionadas
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Replacement Log Section */}
      {replacementLog.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              Substituições Realizadas ({replacementLog.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Detalhes das chaves que foram substituídas no workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {replacementLog.map((log, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {log.count}x
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">De:</span>
                          <code className="bg-red-500/10 text-red-600 px-1 py-0.5 rounded font-mono text-xs truncate max-w-[200px]">
                            {showOriginalKeys ? log.original : maskKey(log.original)}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Para:</span>
                          <code className="bg-green-500/10 text-green-600 px-1 py-0.5 rounded font-mono text-xs truncate max-w-[200px]">
                            {showOriginalKeys ? log.replacement : maskKey(log.replacement)}
                          </code>
                          <span className="text-muted-foreground">({log.provider})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output Section */}
      {outputJson && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">JSON Adaptado</CardTitle>
                <CardDescription className="text-xs">
                  Workflow com suas chaves de API
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadJson}>
                  <Download className="h-4 w-4 mr-1" />
                  Baixar
                </Button>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
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
          </CardHeader>
          <CardContent className="py-2">
            <Tabs defaultValue="visual">
              <TabsList className="mb-2">
                <TabsTrigger value="visual" className="gap-1">
                  <Workflow className="h-3 w-3" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="json" className="gap-1">
                  <Code2 className="h-3 w-3" />
                  JSON
                </TabsTrigger>
              </TabsList>
              <TabsContent value="visual" className="mt-0">
                <div className="h-[400px] rounded-lg border bg-muted/20 overflow-hidden">
                  <N8nWorkflowVisualizer jsonData={outputJson} onJsonChange={setOutputJson} editable={true} />
                </div>
              </TabsContent>
              <TabsContent value="json" className="mt-0">
                <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {outputJson}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default N8nJsonAdapter;