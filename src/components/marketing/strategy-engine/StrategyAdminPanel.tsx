import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AGENT_INFO, AGENT_ORDER, AGENT_DEPENDENCIES } from './types';
import { AGENT_CARDS, AgentCard, agentCardToSystemPrompt, ensureCollaborationDirective } from './agent-cards';
import { useCustomAgents } from './hooks/useCustomAgents';
import { CreateAgentDialog } from './CreateAgentDialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Save, Loader2, RotateCcw, ChevronDown, ChevronRight, Plus, Trash2, Copy, Link2, Upload, FileText, X, Database, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface EditableAgentCard {
  id: string;
  name: string;
  version: string;
  role: string;
  mission: string;
  capabilities: string[];
  non_capabilities: string[];
  inputs: string[];
  context_dependencies: string[];
  reasoning_protocol: string[];
  output_schema: string; // stored as JSON string for editing
  quality_standards: string[];
  anti_patterns: string[];
  error_handling: string;
  handoff: string;
  destino_consumo: string[];
}

interface KBFile {
  name: string;
  path: string;
  size: number;
  uploaded_at: string;
}

interface AgentConfig {
  card: EditableAgentCard;
  active: boolean;
  saved: boolean;
  dbId?: string;
  isCustom?: boolean;
  customAgentId?: string;
  icon?: string;
  color?: string;
  dependencies: string[];
  knowledgeBaseType: 'internal' | 'external';
  knowledgeBaseFiles: KBFile[];
}

function agentCardToEditable(card: AgentCard): EditableAgentCard {
  return {
    id: card.id,
    name: card.name,
    version: card.version,
    role: card.role,
    mission: card.mission,
    capabilities: [...card.capabilities],
    non_capabilities: [...card.non_capabilities],
    inputs: [...card.inputs],
    context_dependencies: [...card.context_dependencies],
    reasoning_protocol: [...card.reasoning_protocol],
    output_schema: JSON.stringify(card.output_schema, null, 2),
    quality_standards: [...card.quality_standards],
    anti_patterns: [...card.anti_patterns],
    error_handling: card.error_handling,
    handoff: card.handoff,
    destino_consumo: card.destino_consumo ? [...card.destino_consumo] : [],
  };
}

function editableToSystemPrompt(editable: EditableAgentCard): string {
  let schema: Record<string, any>;
  try {
    schema = JSON.parse(editable.output_schema);
  } catch {
    schema = {};
  }

  const card: AgentCard = {
    ...editable,
    output_schema: schema,
    destino_consumo: editable.destino_consumo || [],
  };
  return ensureCollaborationDirective(agentCardToSystemPrompt(card));
}

// ─── Editable List Component ────────────────────────────────────────────────
function EditableList({
  items,
  onChange,
  placeholder,
  ordered = false,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  ordered?: boolean;
}) {
  const update = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, '']);

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          {ordered && <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>}
          <Input
            value={item}
            onChange={e => update(i, e.target.value)}
            className="text-xs h-7"
            placeholder={placeholder}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar
      </Button>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function FieldSection({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold uppercase tracking-wide">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
// ─── KB File Manager Component ──────────────────────────────────────────────
const ACCEPTED_KB_FORMATS = '.pdf,.txt,.md,.csv,.json,.xlsx,.docx';

function KBFileManager({
  agentKey,
  files,
  onFilesChange,
  estabId,
}: {
  agentKey: string;
  files: KBFile[];
  onFilesChange: (files: KBFile[]) => void;
  estabId?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !estabId) return;

    setUploading(true);
    const newFiles: KBFile[] = [...files];

    try {
      for (const file of Array.from(selectedFiles)) {
        const path = `${estabId}/${agentKey}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('agent-knowledge-base')
          .upload(path, file);

        if (error) {
          toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
          continue;
        }

        newFiles.push({
          name: file.name,
          path,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        });
      }
      onFilesChange(newFiles);
      toast.success(`${selectedFiles.length} arquivo(s) enviado(s)`);
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (index: number) => {
    const file = files[index];
    await supabase.storage.from('agent-knowledge-base').remove([file.path]);
    const next = files.filter((_, i) => i !== index);
    onFilesChange(next);
    toast.success(`"${file.name}" removido`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-medium">
          📂 Arquivos da Base de Conhecimento
        </p>
        <span className="text-[9px] text-muted-foreground">
          PDF, TXT, MD, CSV, JSON, XLSX, DOCX
        </span>
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1">
              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] flex-1 truncate">{file.name}</span>
              <span className="text-[9px] text-muted-foreground shrink-0">{formatSize(file.size)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => handleRemove(i)}
              >
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_KB_FORMATS}
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[10px] w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
        {uploading ? 'Enviando...' : 'Enviar Arquivos'}
      </Button>
    </div>
  );
}
export function StrategyAdminPanel() {
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [estabId, setEstabId] = useState<string | undefined>(() => localStorage.getItem('estabelecimentoId') || undefined);
  const { customAgents, loading: customLoading, createAgent, updateAgent: updateCustomAgent, deleteAgent: deleteCustomAgent, refetch: refetchCustomAgents } = useCustomAgents(estabId);

  // Resolve estabelecimento_id from auth if not in localStorage
  useEffect(() => {
    if (estabId) return;
    const resolve = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (data?.estabelecimento_id) {
        setEstabId(data.estabelecimento_id);
        localStorage.setItem('estabelecimentoId', data.estabelecimento_id);
      }
    };
    resolve();
  }, [estabId]);

  // Build unified agent list: built-in + custom (deduplicated)
  const allAgentKeys = React.useMemo(() => {
    const keys = [...AGENT_ORDER];
    for (const ca of customAgents) {
      if (!keys.includes(ca.agent_key)) keys.push(ca.agent_key);
    }
    return keys;
  }, [customAgents]);

  useEffect(() => {
    const loadConfigs = async () => {
      const initial: Record<string, AgentConfig> = {};
      AGENT_ORDER.forEach(key => {
        const card = AGENT_CARDS[key];
        const info = AGENT_INFO[key];
        initial[key] = {
          card: card ? agentCardToEditable(card) : agentCardToEditable({ id: key, name: key, version: '1.0', role: '', mission: '', capabilities: [], non_capabilities: [], inputs: [], context_dependencies: [], reasoning_protocol: [], output_schema: {}, quality_standards: [], anti_patterns: [], error_handling: '', handoff: '', destino_consumo: [] }),
          active: true,
          saved: true,
          isCustom: false,
          icon: info?.icon || '🤖',
          color: info?.color,
          dependencies: AGENT_DEPENDENCIES[key] ?? [],
          knowledgeBaseType: 'internal',
          knowledgeBaseFiles: [],
        };
      });

      const { data } = await supabase
        .from('strategy_agent_configs')
        .select('*')
        .order('created_at');

      if (data) {
        for (const row of data as any[]) {
          if (initial[row.agent_type]) {
            const storedCard = (row as any).agent_card_json;
            initial[row.agent_type] = {
              card: storedCard ? { ...initial[row.agent_type].card, ...storedCard } : initial[row.agent_type].card,
              active: row.is_active ?? true,
              saved: true,
              dbId: row.id,
              isCustom: false,
              dependencies: storedCard?.dependencies ?? initial[row.agent_type]?.dependencies ?? AGENT_DEPENDENCIES[row.agent_type] ?? [],
              knowledgeBaseType: (row as any).knowledge_base_type || 'internal',
              knowledgeBaseFiles: (row as any).knowledge_base_files || [],
            };
          }
        }
      }

      setConfigs(initial);
      setLoading(false);
    };
    loadConfigs();
  }, []);

  // Merge custom agents into configs whenever they change — synchronous via useMemo-like pattern
  const configsWithCustom = React.useMemo(() => {
    const next = { ...configs };
    for (const ca of customAgents) {
      const storedCard = (ca as any).agent_card_json;
      const cardData: EditableAgentCard = storedCard ? {
        id: storedCard.id || ca.agent_key,
        name: storedCard.name || ca.name,
        version: storedCard.version || '1.0',
        role: storedCard.role || '',
        mission: storedCard.mission || ca.description || '',
        capabilities: storedCard.capabilities || [],
        non_capabilities: storedCard.non_capabilities || [],
        inputs: storedCard.inputs || [],
        context_dependencies: storedCard.context_dependencies || [],
        reasoning_protocol: storedCard.reasoning_protocol || [],
        output_schema: typeof storedCard.output_schema === 'string' ? storedCard.output_schema : JSON.stringify(storedCard.output_schema || ca.output_schema || {}, null, 2),
        quality_standards: storedCard.quality_standards || [],
        anti_patterns: storedCard.anti_patterns || [],
        error_handling: storedCard.error_handling || '',
        handoff: storedCard.handoff || '',
        destino_consumo: storedCard.destino_consumo || [],
      } : {
        id: ca.agent_key,
        name: ca.name,
        version: '1.0',
        role: '',
        mission: ca.description || '',
        capabilities: [],
        non_capabilities: [],
        inputs: [],
        context_dependencies: [],
        reasoning_protocol: [],
        output_schema: JSON.stringify(ca.output_schema || {}, null, 2),
        quality_standards: [],
        anti_patterns: [],
        error_handling: '',
        handoff: '',
        destino_consumo: [],
      };

      // Only set if not already modified by user in this session
      if (!next[ca.agent_key] || next[ca.agent_key]?.saved !== false) {
        next[ca.agent_key] = {
          card: cardData,
          active: ca.ativo,
          saved: true,
          isCustom: true,
          customAgentId: ca.id,
          icon: ca.icon,
          color: ca.color,
          dependencies: ca.dependencies || [],
          knowledgeBaseType: (ca as any).knowledge_base_type || 'internal',
          knowledgeBaseFiles: (ca as any).knowledge_base_files || [],
        };
      }
    }
    return next;
  }, [configs, customAgents]);

  const updateCard = useCallback((agentKey: string, field: keyof EditableAgentCard, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [agentKey]: {
        ...prev[agentKey],
        card: { ...prev[agentKey].card, [field]: value },
        saved: false,
      },
    }));
  }, []);

  const handleSave = async (agentKey: string) => {
    setSaving(agentKey);
    const config = configsWithCustom[agentKey];
    const systemPrompt = editableToSystemPrompt(config.card);

    try {
      if (config.isCustom && config.customAgentId) {
        // Save custom agent via strategy_custom_agents table
        await updateCustomAgent(config.customAgentId, {
          name: config.card.name,
          description: config.card.mission,
          system_prompt: systemPrompt,
          ativo: config.active,
          agent_card_json: { ...config.card, dependencies: config.dependencies },
          dependencies: config.dependencies,
          knowledge_base_type: config.knowledgeBaseType,
          knowledge_base_files: config.knowledgeBaseFiles,
        } as any);
      } else {
        // Save built-in agent via strategy_agent_configs table
        const cardWithDeps = { ...config.card, dependencies: config.dependencies };
        const payload: any = {
          system_prompt: systemPrompt,
          is_active: config.active,
          agent_card_json: cardWithDeps,
          knowledge_base_type: config.knowledgeBaseType,
          knowledge_base_files: config.knowledgeBaseFiles,
        };

        if (config.dbId) {
          await supabase
            .from('strategy_agent_configs')
            .update(payload)
            .eq('id', config.dbId);
        } else {
          const info = AGENT_INFO[agentKey];
          const { data } = await supabase
            .from('strategy_agent_configs')
            .insert({
              agent_type: agentKey,
              agent_name: info?.name || agentKey,
              ...payload,
            } as any)
            .select()
            .single();

          if (data) {
            setConfigs(prev => ({
              ...prev,
              [agentKey]: { ...prev[agentKey], dbId: (data as any).id },
            }));
          }
        }
      }

      setConfigs(prev => ({ ...prev, [agentKey]: { ...prev[agentKey], saved: true } }));
      toast.success(`Agent Card "${config.card.name}" salvo com sucesso`);
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (agentKey: string) => {
    const card = AGENT_CARDS[agentKey];
    if (!card) {
      toast.info('Agentes personalizados não possuem configuração padrão');
      return;
    }
    setConfigs(prev => ({
      ...prev,
      [agentKey]: {
        ...prev[agentKey],
        card: agentCardToEditable(card),
        active: true,
        saved: false,
        dependencies: AGENT_DEPENDENCIES[agentKey] ?? [],
        knowledgeBaseType: 'internal',
        knowledgeBaseFiles: [],
      },
    }));
    toast.info('Agent Card restaurado ao padrão');
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const agentKey = deleteTarget;
    const config = configsWithCustom[agentKey];
    setDeleteLoading(true);

    try {
      if (config.isCustom && config.customAgentId) {
        const success = await deleteCustomAgent(config.customAgentId);
        if (success) {
          setConfigs(prev => {
            const next = { ...prev };
            delete next[agentKey];
            return next;
          });
        }
      } else if (config.dbId) {
        const { error } = await supabase
          .from('strategy_agent_configs')
          .delete()
          .eq('id', config.dbId);
        if (error) {
          toast.error(`Erro ao excluir: ${error.message}`);
          return;
        }
        setConfigs(prev => {
          const next = { ...prev };
          delete next[agentKey];
          return next;
        });
        toast.success(`Agente "${config.card.name}" excluído`);
      }
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const copyPrompt = (agentKey: string) => {
    const config = configsWithCustom[agentKey];
    if (!config) return;
    const prompt = editableToSystemPrompt(config.card);
    navigator.clipboard.writeText(prompt);
    toast.success('System prompt copiado!');
  };

  if (loading || (estabId && customLoading)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

   return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">🏗️ Agent Card Architecture v1.0</CardTitle>
            <CreateAgentDialog
              onCreate={async (agent) => {
                const result = await createAgent(agent);
                if (result) await refetchCustomAgents();
                return result;
              }}
              existingKeys={allAgentKeys}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Edite, ative/desative ou exclua agentes. Todos os agentes seguem a mesma estrutura Agent Card.
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="h-[650px] pr-2">
        <div className="space-y-2">
          {allAgentKeys.map((agentKey, index) => {
            const config = configsWithCustom[agentKey];
            if (!config) return null;
            const { card } = config;
            const isExpanded = expandedAgent === agentKey;
            const agentIcon = config.icon || AGENT_INFO[agentKey]?.icon || '🤖';

            return (
              <Card key={agentKey} className={`${!config.saved ? 'ring-1 ring-primary/50' : ''} ${!config.active ? 'opacity-60' : ''}`}>
                <Collapsible open={isExpanded} onOpenChange={() => setExpandedAgent(isExpanded ? null : agentKey)}>
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-lg">{agentIcon}</span>
                          <CardTitle className="text-sm group-hover:underline">{card.name || agentKey}</CardTitle>
                          <Badge variant="outline" className="text-[10px]">v{card.version}</Badge>
                          <Badge variant="outline" className="text-[10px]">#{index + 1}</Badge>
                          {config.knowledgeBaseType === 'external' && (
                            <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-500/50 text-amber-600">
                              <Globe className="h-2.5 w-2.5" /> KB Externa
                            </Badge>
                          )}
                          {!config.saved && <Badge className="text-[10px] bg-primary/20 text-primary">Modificado</Badge>}
                        </div>
                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(agentKey)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                          <span className="text-xs text-muted-foreground">Ativo</span>
                          <Switch
                            checked={config.active}
                            onCheckedChange={v => setConfigs(prev => ({
                              ...prev,
                              [agentKey]: { ...prev[agentKey], active: v, saved: false },
                            }))}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    {!isExpanded && (
                      <div className="ml-9 space-y-1">
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{card.mission}</p>
                        {(config.dependencies ?? []).length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground">Depende de:</span>
                            {(config.dependencies ?? []).map(dep => {
                              const depInfo = AGENT_INFO[dep] || configsWithCustom[dep]?.card;
                              const depIcon = configsWithCustom[dep]?.icon || AGENT_INFO[dep]?.icon || '🤖';
                              const depName = depInfo?.name?.split(' ')[0] || dep;
                              return (
                                <Badge key={dep} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                  {depIcon} {depName}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Tabs defaultValue="identity" className="w-full">
                        <TabsList className="w-full grid grid-cols-5 h-8">
                          <TabsTrigger value="identity" className="text-[10px]">Identidade</TabsTrigger>
                          <TabsTrigger value="contracts" className="text-[10px]">Contratos</TabsTrigger>
                          <TabsTrigger value="reasoning" className="text-[10px]">Raciocínio</TabsTrigger>
                          <TabsTrigger value="quality" className="text-[10px]">Qualidade</TabsTrigger>
                          <TabsTrigger value="prompt" className="text-[10px] gap-1">
                            Prompt
                            {!config.saved && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                          </TabsTrigger>
                        </TabsList>

                        {/* ─── IDENTITY TAB ─── */}
                        <TabsContent value="identity" className="space-y-3 mt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <FieldSection label="Nome">
                              <Input value={card.name} onChange={e => updateCard(agentKey, 'name', e.target.value)} className="text-xs h-8" />
                            </FieldSection>
                            <FieldSection label="Versão">
                              <Input value={card.version} onChange={e => updateCard(agentKey, 'version', e.target.value)} className="text-xs h-8" />
                            </FieldSection>
                          </div>

                          <FieldSection label="Papel" hint="Descrição clara do papel do agente no sistema">
                            <Textarea value={card.role} onChange={e => updateCard(agentKey, 'role', e.target.value)} rows={2} className="text-xs" />
                          </FieldSection>

                          <FieldSection label="Missão" hint="Resultado estratégico que o agente deve produzir">
                            <Textarea value={card.mission} onChange={e => updateCard(agentKey, 'mission', e.target.value)} rows={2} className="text-xs" />
                          </FieldSection>

                          {/* ─── Knowledge Base Config ─── */}
                          <FieldSection label="Base de Conhecimento" hint="Define se o agente usa dados internos (memória estratégica) ou uma base externa de arquivos">
                            <div className="space-y-3">
                              <Select
                                value={config.knowledgeBaseType}
                                onValueChange={(v: 'internal' | 'external') => {
                                  setConfigs(prev => ({
                                    ...prev,
                                    [agentKey]: { ...prev[agentKey], knowledgeBaseType: v, saved: false },
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="internal">
                                    <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> Interna (Memória Estratégica)</span>
                                  </SelectItem>
                                  <SelectItem value="external">
                                    <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Externa (Arquivos do Usuário)</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              {config.knowledgeBaseType === 'external' && (
                                <KBFileManager
                                  agentKey={agentKey}
                                  files={config.knowledgeBaseFiles}
                                  onFilesChange={(files) => {
                                    setConfigs(prev => ({
                                      ...prev,
                                      [agentKey]: { ...prev[agentKey], knowledgeBaseFiles: files, saved: false },
                                    }));
                                  }}
                                  estabId={estabId}
                                />
                              )}
                            </div>
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Dependências de Execução" hint="Clique para adicionar/remover. Agentes que DEVEM ser concluídos antes deste poder executar.">
                            <div className="flex flex-wrap gap-1">
                              {allAgentKeys.filter(k => k !== agentKey).map(dep => {
                                const currentDeps = config.dependencies || [];
                                const isSelected = currentDeps.includes(dep);
                                const depIcon = configsWithCustom[dep]?.icon || AGENT_INFO[dep]?.icon || '🤖';
                                const depName = configsWithCustom[dep]?.card?.name?.split(' ')[0] || AGENT_INFO[dep]?.name?.split(' ')[0] || dep;
                                return (
                                  <Badge
                                    key={dep}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="text-[10px] cursor-pointer gap-0.5 hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      const newDeps = isSelected
                                        ? currentDeps.filter((d: string) => d !== dep)
                                        : [...currentDeps, dep];
                                      setConfigs(prev => ({
                                        ...prev,
                                        [agentKey]: { ...prev[agentKey], dependencies: newDeps, saved: false },
                                      }));
                                    }}
                                  >
                                    {depIcon} {depName}
                                  </Badge>
                                );
                              })}
                            </div>
                          </FieldSection>
                        </TabsContent>

                        {/* ─── CONTRACTS TAB ─── */}
                        <TabsContent value="contracts" className="space-y-3 mt-3">
                          <FieldSection label="Capacidades" hint="Lista de tarefas que o agente é capaz de executar">
                            <EditableList items={card.capabilities} onChange={v => updateCard(agentKey, 'capabilities', v)} placeholder="Capacidade..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Restrições" hint="Lista explícita do que o agente NÃO deve fazer">
                            <EditableList items={card.non_capabilities} onChange={v => updateCard(agentKey, 'non_capabilities', v)} placeholder="Restrição..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Entradas" hint="Tipos de dados aceitos pelo agente">
                            <EditableList items={card.inputs} onChange={v => updateCard(agentKey, 'inputs', v)} placeholder="Tipo de dado..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Dependências de Contexto" hint="Dados da memória estratégica necessários">
                            <EditableList items={card.context_dependencies} onChange={v => updateCard(agentKey, 'context_dependencies', v)} placeholder="Dependência..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Esquema de Saída" hint="JSON schema obrigatório para a saída do agente">
                            <Textarea
                              value={card.output_schema}
                              onChange={e => updateCard(agentKey, 'output_schema', e.target.value)}
                              rows={8}
                              className="text-xs font-mono"
                              placeholder='{ "campo": "tipo" }'
                            />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── REASONING TAB ─── */}
                        <TabsContent value="reasoning" className="space-y-3 mt-3">
                          <FieldSection label="Protocolo de Raciocínio" hint="Passos ordenados que o agente deve seguir ao executar">
                            <EditableList items={card.reasoning_protocol} onChange={v => updateCard(agentKey, 'reasoning_protocol', v)} placeholder="Passo..." ordered />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Tratamento de Erros" hint="Como o agente reage quando dados são insuficientes">
                            <Textarea value={card.error_handling} onChange={e => updateCard(agentKey, 'error_handling', e.target.value)} rows={2} className="text-xs" />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── QUALITY TAB ─── */}
                        <TabsContent value="quality" className="space-y-3 mt-3">
                          <FieldSection label="Padrões de Qualidade" hint="Critérios que definem se o output é aceitável">
                            <EditableList items={card.quality_standards} onChange={v => updateCard(agentKey, 'quality_standards', v)} placeholder="Padrão de qualidade..." />
                          </FieldSection>

                          <Separator />

                          <FieldSection label="Anti-Padrões" hint="Comportamentos proibidos que devem ser evitados">
                            <EditableList items={card.anti_patterns} onChange={v => updateCard(agentKey, 'anti_patterns', v)} placeholder="Anti-padrão..." />
                          </FieldSection>
                        </TabsContent>

                        {/* ─── PROMPT PREVIEW TAB ─── */}
                        <TabsContent value="prompt" className="space-y-3 mt-3">
                          <FieldSection label="Prompt do Sistema (Gerado)" hint="Prompt gerado automaticamente a partir dos campos do Agent Card. Atualiza em tempo real.">
                            {!config.saved && (
                              <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 mb-1 animate-pulse">
                                🔄 Prompt atualizado — salve para aplicar
                              </Badge>
                            )}
                            <Textarea
                              value={editableToSystemPrompt(card)}
                              readOnly
                              rows={15}
                              className="text-xs font-mono bg-muted/50"
                            />
                          </FieldSection>
                          <Button variant="outline" size="sm" onClick={() => copyPrompt(agentKey)}>
                            <Copy className="h-3 w-3 mr-1" /> Copiar Prompt
                          </Button>
                        </TabsContent>
                      </Tabs>

                      {/* ─── Actions ─── */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="flex gap-2">
                          {AGENT_CARDS[agentKey] && (
                            <Button variant="ghost" size="sm" onClick={() => handleReset(agentKey)}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Resetar ao Padrão
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(agentKey)}>
                            <Trash2 className="h-3 w-3 mr-1" /> Excluir Agente
                          </Button>
                        </div>
                        <Button size="sm" onClick={() => handleSave(agentKey)} disabled={config.saved || saving === agentKey}>
                          {saving === agentKey ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          Salvar Agent Card
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? configsWithCustom[deleteTarget]?.card?.name : undefined}
        isLoading={deleteLoading}
      />
    </div>
  );
}
