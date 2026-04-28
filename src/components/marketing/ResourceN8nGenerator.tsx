import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Workflow, Wand2, Copy, Check, Loader2, Sparkles, RefreshCw, Download, AlertCircle, Server, FileCode, AtSign, Bot, Database, Hash, Slash, Save, FolderOpen, X, Edit, ExternalLink, Upload, KeyRound, Replace } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MarketingResource, FIELD_TYPE_LABELS, RETURN_TYPE_LABELS, CHANNEL_CONFIG, ResourceField, PublishChannel, PublishChannel as ChannelType } from './types';
import { MessageSquare, Send } from 'lucide-react';
import SavedWorkflowsList from './SavedWorkflowsList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import N8nJsonAdapter from './N8nJsonAdapter';

interface EnvVariable {
  name: string;
  description: string;
  example: string;
}

interface SavedWorkflow {
  id: string;
  nome: string;
  descricao: string | null;
  prompt_original: string;
  workflow_json: any;
  variaveis_ambiente: any;
  created_at: string;
  updated_at: string;
}

interface DBMarketingResource {
  id: string;
  name: string;
  description: string | null;
  return_type: string;
  fields: ResourceField[];
  publish_channels: string[] | null;
  auto_publish_enabled: boolean | null;
}

interface AIProvider {
  id: string;
  provider: string;
  provider_display_name: string;
}

interface Integration {
  id: string;
  name: string;
  database_type: string;
}

interface PublishChannelItem {
  id: string;
  name: string;
  label: string;
}

type MentionType = 'variable' | 'ai' | 'integration' | 'channel';

const ResourceN8nGenerator: React.FC = () => {
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [promptText, setPromptText] = useState<string>('');
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEnvCopied, setIsEnvCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionType, setMentionType] = useState<MentionType>('variable');
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [publishChannels, setPublishChannels] = useState<PublishChannelItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save/Edit workflow states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<SavedWorkflow | null>(null);
  const [showSavedList, setShowSavedList] = useState(false);
  const [savedListKey, setSavedListKey] = useState(0);

  // Get available publish channels
  const availableChannels: PublishChannelItem[] = [
    { id: 'whatsapp', name: 'whatsapp', label: 'WhatsApp' },
    { id: 'instagram', name: 'instagram', label: 'Instagram' },
    { id: 'facebook', name: 'facebook', label: 'Facebook' },
    { id: 'telegram', name: 'telegram', label: 'Telegram' },
    { id: 'email', name: 'email', label: 'Email' },
    { id: 'sms', name: 'sms', label: 'SMS' },
    { id: 'linkedin', name: 'linkedin', label: 'LinkedIn' },
    { id: 'tiktok', name: 'tiktok', label: 'TikTok' },
  ];

  useEffect(() => {
    loadResources();
    loadAIProviders();
    loadIntegrations();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('marketing_resources')
        .select('id, name, description, return_type, fields, publish_channels, auto_publish_enabled')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('name');

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        returnType: item.return_type as any,
        fields: (item.fields || []) as ResourceField[],
        publishChannels: (item.publish_channels || []) as PublishChannel[],
        autoPublishEnabled: item.auto_publish_enabled || false,
        createdAt: '',
        updatedAt: '',
      }));

      setResources(mapped);
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAIProviders = async () => {
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('id, provider, provider_display_name')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_active', true);

      if (error) throw error;
      setAIProviders(data || []);
    } catch (err) {
      console.error('Error loading AI providers:', err);
    }
  };

  const loadIntegrations = async () => {
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('database_connections')
        .select('id, name, database_type')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (err) {
      console.error('Error loading integrations:', err);
    }
  };

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  // Get available variables from selected resource
  const getAvailableVariables = useCallback(() => {
    if (!selectedResource) return [];
    return selectedResource.fields.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type,
    }));
  }, [selectedResource]);

  // Filter items based on search term and mention type
  const getFilteredItems = useCallback(() => {
    const term = searchTerm.toLowerCase();
    
    if (mentionType === 'variable') {
      return getAvailableVariables().filter(v =>
        v.label.toLowerCase().includes(term) ||
        v.id.toLowerCase().includes(term)
      );
    } else if (mentionType === 'ai') {
      return aiProviders.filter(a =>
        a.provider_display_name.toLowerCase().includes(term) ||
        a.provider.toLowerCase().includes(term)
      );
    } else if (mentionType === 'integration') {
      return integrations.filter(i =>
        i.name.toLowerCase().includes(term) ||
        i.database_type.toLowerCase().includes(term)
      );
    } else {
      // channel
      return availableChannels.filter(c =>
        c.label.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term)
      );
    }
  }, [mentionType, searchTerm, getAvailableVariables, aiProviders, integrations]);

  // Handle text change and detect mentions (@, #, /, %)
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setPromptText(value);
    setCursorPosition(cursorPos);

    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Check for @ (variables), # (ai), / (integrations), % (channels)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    const lastPercentIndex = textBeforeCursor.lastIndexOf('%');
    
    // Find the most recent trigger character
    const triggers = [
      { char: '@', index: lastAtIndex, type: 'variable' as MentionType },
      { char: '#', index: lastHashIndex, type: 'ai' as MentionType },
      { char: '/', index: lastSlashIndex, type: 'integration' as MentionType },
      { char: '%', index: lastPercentIndex, type: 'channel' as MentionType },
    ].filter(t => t.index !== -1);
    
    if (triggers.length > 0) {
      const mostRecent = triggers.reduce((a, b) => a.index > b.index ? a : b);
      const textAfterTrigger = textBeforeCursor.substring(mostRecent.index + 1);
      
      // Only show popover if there's no space after the trigger
      if (!textAfterTrigger.includes(' ') && !textAfterTrigger.includes('\n')) {
        setMentionType(mostRecent.type);
        setSearchTerm(textAfterTrigger);
        setShowMentionPopover(true);
        return;
      }
    }
    
    setShowMentionPopover(false);
    setSearchTerm('');
  };

  // Get trigger character for current mention type
  const getTriggerChar = (type: MentionType): string => {
    switch (type) {
      case 'variable': return '@';
      case 'ai': return '#';
      case 'integration': return '/';
      case 'channel': return '%';
    }
  };

  // Insert mention into prompt
  const insertMention = (item: any) => {
    const textBeforeCursor = promptText.substring(0, cursorPosition);
    const textAfterCursor = promptText.substring(cursorPosition);
    const triggerChar = getTriggerChar(mentionType);
    
    // Find the trigger character position
    const triggerIndex = textBeforeCursor.lastIndexOf(triggerChar);
    
    if (triggerIndex !== -1) {
      let insertText = '';
      
      if (mentionType === 'variable') {
        insertText = `@${item.label}`;
      } else if (mentionType === 'ai') {
        insertText = `#${item.provider_display_name}`;
      } else if (mentionType === 'integration') {
        insertText = `/${item.name}`;
      } else {
        insertText = `%${item.label}`;
      }
      
      const newText = textBeforeCursor.substring(0, triggerIndex) + insertText + textAfterCursor;
      setPromptText(newText);
      
      // Move cursor after the inserted mention
      const newCursorPos = triggerIndex + insertText.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
    
    setShowMentionPopover(false);
    setSearchTerm('');
  };

  // Direct insert (from clicking badges)
  const directInsert = (type: MentionType, item: any) => {
    let insertText = '';
    
    if (type === 'variable') {
      insertText = `@${item.label} `;
    } else if (type === 'ai') {
      insertText = `#${item.provider_display_name} `;
    } else if (type === 'integration') {
      insertText = `/${item.name} `;
    } else {
      insertText = `%${item.label} `;
    }
    
    setPromptText(prev => prev + insertText);
    textareaRef.current?.focus();
  };

  const buildResourceContext = (resource: MarketingResource): string => {
    const fieldsInfo = resource.fields.map(f => 
      `- ${f.label} (ID: ${f.id}, Tipo: ${FIELD_TYPE_LABELS[f.type]}): ${f.required ? 'Obrigatório' : 'Opcional'}${f.placeholder ? ` - "${f.placeholder}"` : ''}`
    ).join('\n');

    const channelsInfo = (resource.publishChannels || []).map(ch => 
      CHANNEL_CONFIG[ch]?.label || ch
    ).join(', ');

    const aiInfo = aiProviders.length > 0 
      ? aiProviders.map(a => `- ${a.provider_display_name} (provider: ${a.provider})`).join('\n')
      : 'Nenhuma IA configurada';

    const integrationsInfo = integrations.length > 0
      ? integrations.map(i => `- ${i.name} (tipo: ${i.database_type})`).join('\n')
      : 'Nenhuma integração configurada';

    const allChannelsInfo = availableChannels.map(c => `- ${c.label} (id: ${c.name})`).join('\n');

    return `
RECURSO DE MARKETING: "${resource.name}"
${resource.description ? `Descrição: ${resource.description}` : ''}

TIPO DE RETORNO: ${RETURN_TYPE_LABELS[resource.returnType]}
- O workflow deve gerar conteúdo do tipo: ${resource.returnType}

CAMPOS DE ENTRADA (variáveis disponíveis para uso com @):
${fieldsInfo}

IAS DISPONÍVEIS (use com #):
${aiInfo}

INTEGRAÇÕES/BANCOS DE DADOS DISPONÍVEIS (use com /):
${integrationsInfo}

CANAIS DE PUBLICAÇÃO DISPONÍVEIS (use com %):
${allChannelsInfo}

${channelsInfo ? `CANAIS CONFIGURADOS NO RECURSO: ${channelsInfo}` : 'SEM CANAIS DE PUBLICAÇÃO CONFIGURADOS'}
${resource.autoPublishEnabled ? '- Publicação automática ATIVADA: o workflow deve publicar automaticamente nos canais acima após gerar o conteúdo' : '- Publicação automática DESATIVADA: gerar apenas o conteúdo sem publicar'}
`;
  };

  // Parse prompt to replace mentions with proper references
  const parsePromptWithMentions = (prompt: string, resource: MarketingResource): string => {
    let parsedPrompt = prompt;
    
    // Replace @variable mentions
    resource.fields.forEach(field => {
      const regex = new RegExp(`@${field.label}`, 'gi');
      parsedPrompt = parsedPrompt.replace(regex, `{{entrada.${field.id}}}`);
    });
    
    // Replace #AI mentions
    aiProviders.forEach(ai => {
      const regex = new RegExp(`#${ai.provider_display_name}`, 'gi');
      parsedPrompt = parsedPrompt.replace(regex, `{{ia.${ai.provider}}}`);
    });
    
    // Replace /integration mentions
    integrations.forEach(int => {
      const regex = new RegExp(`/${int.name}`, 'gi');
      parsedPrompt = parsedPrompt.replace(regex, `{{integracao.${int.name}}}`);
    });
    
    // Replace %channel mentions
    availableChannels.forEach(channel => {
      const regex = new RegExp(`%${channel.label}`, 'gi');
      parsedPrompt = parsedPrompt.replace(regex, `{{canal.${channel.name}}}`);
    });
    
    return parsedPrompt;
  };

  const generateWorkflow = async () => {
    if (!selectedResource) {
      toast.error('Selecione um recurso primeiro');
      return;
    }

    if (!promptText.trim()) {
      toast.error('Descreva o que deseja que o workflow faça');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedJson('');
    setEnvVariables([]);

    try {
      const resourceContext = buildResourceContext(selectedResource);
      const parsedPrompt = parsePromptWithMentions(promptText, selectedResource);
      
      const fullPrompt = `Gere um workflow n8n completo baseado no recurso "${selectedResource.name}".

INSTRUÇÕES DO USUÁRIO:
${parsedPrompt}

O workflow deve:
1. Receber os dados via webhook (com todos os campos do recurso como entrada)
2. Processar conforme as instruções acima
3. Retornar o resultado no formato ${selectedResource.returnType}
${selectedResource.publishChannels && selectedResource.publishChannels.length > 0 && selectedResource.autoPublishEnabled 
  ? `4. Publicar automaticamente nos canais: ${selectedResource.publishChannels.map(ch => CHANNEL_CONFIG[ch]?.label).join(', ')}`
  : ''}`;

      const response = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          prompt: fullPrompt,
          resourceContext
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar workflow');
      }

      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.content) {
        parseGeneratedContent(data.content);
      } else {
        throw new Error('Resposta inválida da API');
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
    const parts = content.split('---ENV_VARS---');
    let jsonPart = parts[0];
    const envPart = parts[1] || '';

    // Remove markdown code blocks if present
    jsonPart = jsonPart.replace(/```json\s*/gi, '');
    jsonPart = jsonPart.replace(/```\s*/g, '');
    jsonPart = jsonPart.trim();

    // Find the JSON object - handle nested braces correctly
    let startIndex = jsonPart.indexOf('{');
    if (startIndex === -1) {
      throw new Error('Não foi possível encontrar o JSON do workflow');
    }

    let braceCount = 0;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < jsonPart.length; i++) {
      if (jsonPart[i] === '{') braceCount++;
      if (jsonPart[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    let jsonStr = jsonPart.substring(startIndex, endIndex + 1);

    // Clean up common JSON issues
    // Remove trailing commas before } or ]
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
    
    // Fix multiline strings by replacing actual newlines in string values
    // This regex finds string values and replaces newlines within them
    jsonStr = jsonStr.replace(/"([^"]*?)[\n\r]+([^"]*?)"/g, (match) => {
      return match.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    });
    
    // Remove control characters except valid ones
    jsonStr = jsonStr.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, ' ');

    // Try to parse, with multiple attempts
    let parsed;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        parsed = JSON.parse(jsonStr);
        break;
      } catch (parseError) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error('JSON parse error after', attempts, 'attempts:', parseError);
          console.error('JSON (first 1000 chars):', jsonStr.substring(0, 1000));
          throw new Error('O JSON gerado está inválido. A IA pode ter gerado strings com quebras de linha. Tente gerar novamente.');
        }
        // Try additional fixes
        // Fix truncated strings by finding unclosed quotes
        const quoteCount = (jsonStr.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          // Odd number of quotes, try to find and fix
          jsonStr = jsonStr.replace(/("[^"]*?)$/, '$1"');
        }
        // Remove any trailing incomplete content
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace > 0 && lastBrace < jsonStr.length - 1) {
          jsonStr = jsonStr.substring(0, lastBrace + 1);
        }
      }
    }

    if (!parsed) {
      throw new Error('O JSON gerado está inválido. Tente gerar novamente.');
    }

    // CRITICAL: Fix empty connections - auto-generate based on node order
    if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.nodes.length > 1) {
      const connections = parsed.connections || {};
      const hasConnections = Object.keys(connections).length > 0;
      
      if (!hasConnections) {
        console.warn('Connections vazias detectadas, gerando automaticamente...');
        const newConnections: Record<string, any> = {};
        
        // Sort nodes by x position (horizontal order)
        const sortedNodes = [...parsed.nodes].sort((a, b) => {
          const posA = a.position?.[0] || 0;
          const posB = b.position?.[0] || 0;
          return posA - posB;
        });
        
        // Create connections between consecutive nodes
        for (let i = 0; i < sortedNodes.length - 1; i++) {
          const currentNode = sortedNodes[i];
          const nextNode = sortedNodes[i + 1];
          
          if (currentNode.name && nextNode.name) {
            newConnections[currentNode.name] = {
              main: [[{ node: nextNode.name, type: "main", index: 0 }]]
            };
          }
        }
        
        parsed.connections = newConnections;
        console.log('Connections geradas:', newConnections);
      }
    }

    const cleanJson = JSON.stringify(parsed, null, 2);
    setGeneratedJson(cleanJson);

    const envVarsFromJson = extractEnvVarsFromJson(cleanJson);
    
    const explicitEnvVars: EnvVariable[] = [];
    if (envPart.trim()) {
      const lines = envPart.trim().split('\n');
      for (const line of lines) {
        const lineParts = line.split('|').map(s => s.trim());
        const name = lineParts[0];
        const description = lineParts[1] || '';
        const example = lineParts[2] || '';
        if (name && !name.startsWith('#') && /^[A-Z_]+$/.test(name)) {
          explicitEnvVars.push({ name, description, example });
        }
      }
    }

    const allEnvVars = [...envVarsFromJson];
    for (const ev of explicitEnvVars) {
      if (!allEnvVars.find(v => v.name === ev.name)) {
        allEnvVars.push(ev);
      }
    }

    setEnvVariables(allEnvVars);
    toast.success('Workflow gerado com sucesso!');
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
      'OPENAI_API_KEY': 'Chave de API da OpenAI',
      'WHATSAPP_TOKEN': 'Token de acesso do WhatsApp Business API',
      'WHATSAPP_PHONE_ID': 'ID do número de telefone WhatsApp',
      'INSTAGRAM_ACCESS_TOKEN': 'Token de acesso da Instagram Graph API',
      'INSTAGRAM_ACCOUNT_ID': 'ID da conta do Instagram Business',
      'FACEBOOK_ACCESS_TOKEN': 'Token de acesso da Facebook Graph API',
      'FACEBOOK_PAGE_ID': 'ID da página do Facebook',
      'TELEGRAM_BOT_TOKEN': 'Token do bot do Telegram',
      'TELEGRAM_CHAT_ID': 'ID do chat/grupo do Telegram',
      'SMTP_HOST': 'Servidor SMTP',
      'SMTP_USER': 'Usuário SMTP',
      'SMTP_PASSWORD': 'Senha SMTP',
      'SMTP_PORT': 'Porta SMTP',
    };
    return descriptions[name] || `Valor para ${name}`;
  };

  const getEnvVarExample = (name: string): string => {
    const examples: Record<string, string> = {
      'OPENAI_API_KEY': 'sk-xxxxxxxxxxxxxxxx',
      'WHATSAPP_TOKEN': 'EAAxxxxxxxxxxxxxxxx',
      'WHATSAPP_PHONE_ID': '123456789012345',
      'INSTAGRAM_ACCESS_TOKEN': 'IGQxxxxxxxxxxx',
      'INSTAGRAM_ACCOUNT_ID': '17841400000000000',
      'FACEBOOK_ACCESS_TOKEN': 'EAAxxxxxxxxxxxxxxxx',
      'FACEBOOK_PAGE_ID': '123456789012345',
      'TELEGRAM_BOT_TOKEN': '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      'TELEGRAM_CHAT_ID': '-1001234567890',
      'SMTP_HOST': 'smtp.gmail.com',
      'SMTP_USER': 'email@gmail.com',
      'SMTP_PASSWORD': '********',
      'SMTP_PORT': '587',
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
    a.download = `n8n-${selectedResource?.name?.toLowerCase().replace(/\s+/g, '-') || 'workflow'}.json`;
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

  // Save workflow functions
  const openSaveDialog = () => {
    if (!generatedJson) {
      toast.error('Gere um workflow primeiro');
      return;
    }
    if (editingWorkflow) {
      setWorkflowName(editingWorkflow.nome);
      setWorkflowDescription(editingWorkflow.descricao || '');
    } else {
      setWorkflowName(selectedResource?.name ? `Workflow - ${selectedResource.name}` : 'Novo Workflow');
      setWorkflowDescription('');
    }
    setShowSaveDialog(true);
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Digite um nome para o workflow');
      return;
    }

    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não identificado');
      return;
    }

    setIsSaving(true);
    try {
      let jsonToSave: any;
      try {
        jsonToSave = JSON.parse(generatedJson);
      } catch {
        jsonToSave = generatedJson;
      }

      const workflowData = {
        estabelecimento_id: estabelecimentoId,
        nome: workflowName.trim(),
        descricao: workflowDescription.trim() || null,
        prompt_original: promptText,
        workflow_json: jsonToSave,
        variaveis_ambiente: JSON.parse(JSON.stringify(envVariables)),
      };

      if (editingWorkflow) {
        const { error } = await supabase
          .from('n8n_workflows_gerados')
          .update(workflowData)
          .eq('id', editingWorkflow.id);

        if (error) throw error;
        toast.success('Workflow atualizado!');
      } else {
        const { error } = await supabase
          .from('n8n_workflows_gerados')
          .insert(workflowData);

        if (error) throw error;
        toast.success('Workflow salvo!');
      }

      setShowSaveDialog(false);
      setWorkflowName('');
      setWorkflowDescription('');
      setSavedListKey(prev => prev + 1); // Refresh saved list
    } catch (err) {
      console.error('Error saving workflow:', err);
      toast.error('Erro ao salvar workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const loadWorkflowForEdit = (workflow: SavedWorkflow) => {
    setEditingWorkflow(workflow);
    setPromptText(workflow.prompt_original);
    
    const jsonStr = typeof workflow.workflow_json === 'string' 
      ? workflow.workflow_json 
      : JSON.stringify(workflow.workflow_json, null, 2);
    setGeneratedJson(jsonStr);
    
    setEnvVariables(workflow.variaveis_ambiente || []);
    setShowSavedList(false);
    toast.success(`Workflow "${workflow.nome}" carregado para edição`);
  };

  const clearEditing = () => {
    setEditingWorkflow(null);
    setPromptText('');
    setGeneratedJson('');
    setEnvVariables([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="generate" className="w-full space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="generate" className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Gerar Workflow
        </TabsTrigger>
        <TabsTrigger value="adapt" className="flex items-center gap-2">
          <Replace className="h-4 w-4" />
          Adaptar JSON Existente
        </TabsTrigger>
      </TabsList>

      <TabsContent value="adapt">
        <N8nJsonAdapter />
      </TabsContent>

      <TabsContent value="generate">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Gerador de Workflows n8n
            {editingWorkflow && (
              <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                <Edit className="h-3 w-3" />
                Editando: {editingWorkflow.nome}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={clearEditing}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Use <code className="bg-muted px-1 rounded">@variável</code>, <code className="bg-muted px-1 rounded">#IA</code> ou <code className="bg-muted px-1 rounded">/integração</code> para referenciar elementos
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/railway-env">
            <Button variant="outline">
              <Server className="h-4 w-4 mr-2" />
              Variáveis Railway
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setShowSavedList(!showSavedList)}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Workflows Salvos
          </Button>
        </div>
      </div>

      {showSavedList && (
        <Card>
          <CardContent className="pt-6">
            <SavedWorkflowsList key={savedListKey} onEdit={loadWorkflowForEdit} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Configuração do Workflow
          </CardTitle>
          <CardDescription>
            Selecione o recurso e descreva o fluxo desejado usando as variáveis disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resources.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum recurso de IA encontrado. Crie um recurso primeiro na aba "Recursos de IA".
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Recurso de IA</label>
                <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um recurso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        <div className="flex items-center gap-2">
                          <span>{resource.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {RETURN_TYPE_LABELS[resource.returnType]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedResource && (
                <>
                  {/* Available mentions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Variables */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AtSign className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Variáveis</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedResource.fields.map((field) => (
                          <Badge 
                            key={field.id} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
                            onClick={() => directInsert('variable', field)}
                          >
                            @{field.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* AI Providers */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">IAs</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {aiProviders.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhuma IA configurada</span>
                        ) : (
                          aiProviders.map((ai) => (
                            <Badge 
                              key={ai.id} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-purple-500 hover:text-white transition-colors"
                              onClick={() => directInsert('ai', ai)}
                            >
                              #{ai.provider_display_name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Integrations */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Integrações</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {integrations.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhuma integração</span>
                        ) : (
                          integrations.map((int) => (
                            <Badge 
                              key={int.id} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-green-500 hover:text-white transition-colors"
                              onClick={() => directInsert('integration', int)}
                            >
                              /{int.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Publish Channels */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Send className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Canais</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {availableChannels.map((channel) => (
                          <Badge 
                            key={channel.id} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-orange-500 hover:text-white transition-colors"
                            onClick={() => directInsert('channel', channel)}
                          >
                            %{channel.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Clique nos itens acima ou digite <code className="bg-muted px-0.5 rounded">@</code> <code className="bg-muted px-0.5 rounded">#</code> <code className="bg-muted px-0.5 rounded">/</code> <code className="bg-muted px-0.5 rounded">%</code> para inserir no prompt
                  </p>

                  {/* Resource info */}
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Tipo de retorno:</span>
                      <Badge className="text-xs">
                        {RETURN_TYPE_LABELS[selectedResource.returnType]}
                      </Badge>
                    </div>

                    {selectedResource.publishChannels && selectedResource.publishChannels.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Canais de publicação:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedResource.publishChannels.map((channel) => (
                            <Badge 
                              key={channel} 
                              variant="outline" 
                              className={`text-xs ${CHANNEL_CONFIG[channel]?.color} text-white`}
                            >
                              {CHANNEL_CONFIG[channel]?.label || channel}
                            </Badge>
                          ))}
                        </div>
                        {selectedResource.autoPublishEnabled && (
                          <p className="text-xs text-green-600 mt-1">✓ Publicação automática ativada</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Prompt input with mention support */}
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Descreva o workflow</label>
                    <Textarea
                      ref={textareaRef}
                      value={promptText}
                      onChange={handlePromptChange}
                      placeholder={`Ex: Crie um workflow que use #OpenAI para processar @${selectedResource.fields[0]?.label || 'campo'} e buscar dados em /Integração, depois publique nos canais`}
                      className="min-h-[120px] resize-none"
                    />
                    
                    {/* Mention autocomplete popover */}
                    {showMentionPopover && getFilteredItems().length > 0 && (
                      <div className="absolute z-50 w-72 mt-1 bg-popover border rounded-md shadow-lg">
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            {mentionType === 'variable' && <><AtSign className="h-3 w-3" /> Selecione uma variável</>}
                            {mentionType === 'ai' && <><Bot className="h-3 w-3" /> Selecione uma IA</>}
                            {mentionType === 'integration' && <><Database className="h-3 w-3" /> Selecione uma integração</>}
                            {mentionType === 'channel' && <><Send className="h-3 w-3" /> Selecione um canal</>}
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {getFilteredItems().map((item: any) => (
                              <button
                                key={item.id}
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center justify-between"
                                onClick={() => insertMention(item)}
                              >
                                <span className="font-medium">
                                  {mentionType === 'variable' && `@${item.label}`}
                                  {mentionType === 'ai' && `#${item.provider_display_name}`}
                                  {mentionType === 'integration' && `/${item.name}`}
                                  {mentionType === 'channel' && `%${item.label}`}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {mentionType === 'variable' && FIELD_TYPE_LABELS[item.type]}
                                  {mentionType === 'ai' && item.provider}
                                  {mentionType === 'integration' && item.database_type}
                                  {mentionType === 'channel' && 'Canal'}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={generateWorkflow} 
                    disabled={isGenerating || !selectedResourceId || !promptText.trim()}
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
                </>
              )}
            </>
          )}
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
                    <Button variant="default" size="sm" onClick={openSaveDialog}>
                      <Save className="h-4 w-4 mr-1" />
                      {editingWorkflow ? 'Atualizar' : 'Salvar'}
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
                    <CardTitle className="text-base">Variáveis de Ambiente</CardTitle>
                    <CardDescription>
                      Configure estas variáveis no Railway para o n8n funcionar
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
                {envVariables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma variável de ambiente necessária
                  </p>
                ) : (
                  <div className="space-y-3">
                    {envVariables.map((env, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono font-semibold text-primary">
                            {env.name}
                          </code>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {env.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Exemplo: <code className="bg-background px-1 rounded">{env.example}</code>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Save Workflow Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'Atualizar Workflow' : 'Salvar Workflow'}
            </DialogTitle>
            <DialogDescription>
              {editingWorkflow 
                ? 'Atualize as informações do workflow salvo'
                : 'Salve este workflow para poder editar ou reutilizar depois'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Workflow</label>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Ex: Gerador de Posts Instagram"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Descreva o que este workflow faz..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveWorkflow} disabled={isSaving || !workflowName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingWorkflow ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      </TabsContent>
    </Tabs>
  );
};

export default ResourceN8nGenerator;
