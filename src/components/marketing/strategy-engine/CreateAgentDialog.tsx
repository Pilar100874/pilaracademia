import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Trash2, Copy, Sparkles, Database, Globe } from 'lucide-react';
import { AGENT_ORDER, AGENT_INFO, AGENT_DEPENDENCIES } from './types';
import { agentCardToSystemPrompt, AgentCard, ensureCollaborationDirective } from './agent-cards';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ICON_OPTIONS = ['🤖', '🧠', '📊', '🎯', '💡', '🔬', '📈', '🛠️', '🎨', '📝', '🔍', '⚡', '🌟', '🏆', '📦', '🗂️', '💬', '🎪'];
const COLOR_OPTIONS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#A855F7'];

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
  output_schema: string;
  quality_standards: string[];
  anti_patterns: string[];
  error_handling: string;
  handoff: string;
  destino_consumo: string[];
}

function editableToSystemPrompt(editable: EditableAgentCard): string {
  let schema: Record<string, any>;
  try { schema = JSON.parse(editable.output_schema); } catch { schema = {}; }
  const card: AgentCard = { ...editable, output_schema: schema };
  return ensureCollaborationDirective(agentCardToSystemPrompt(card));
}

// ─── Editable List ──────────────────────────────────────────────────────────
function EditableList({ items, onChange, placeholder, ordered = false }: {
  items: string[]; onChange: (items: string[]) => void; placeholder?: string; ordered?: boolean;
}) {
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n); };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          {ordered && <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>}
          <Input value={item} onChange={e => update(i, e.target.value)} className="text-xs h-7" placeholder={placeholder} />
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

function FieldSection({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold uppercase tracking-wide">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

const defaultCard: EditableAgentCard = {
  id: '', name: '', version: '1.0', role: '', mission: '',
  capabilities: [], non_capabilities: [], inputs: [], context_dependencies: [],
  reasoning_protocol: [], output_schema: '{}', quality_standards: [], anti_patterns: [],
  error_handling: '', handoff: '', destino_consumo: [],
};

interface Props {
  onCreate: (agent: any) => Promise<any>;
  existingKeys: string[];
}

export function CreateAgentDialog({ onCreate, existingKeys }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [color, setColor] = useState('#8B5CF6');
  const [agentKey, setAgentKey] = useState('');
  const [description, setDescription] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [card, setCard] = useState<EditableAgentCard>({ ...defaultCard });
  const [knowledgeBaseType, setKnowledgeBaseType] = useState<'internal' | 'external'>('internal');

  const updateCard = useCallback((field: keyof EditableAgentCard, value: any) => {
    setCard(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleDep = (dep: string) => {
    setDependencies(prev =>
      prev.includes(dep) ? prev.filter(d => d !== dep) : [...prev, dep]
    );
  };

  const generatedPrompt = editableToSystemPrompt(card);

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast.success('System prompt copiado!');
  };

  const resetForm = () => {
    setCard({ ...defaultCard });
    setAgentKey('');
    setDescription('');
    setIcon('🤖');
    setColor('#8B5CF6');
    
    setDependencies([]);
    setAiDescription('');
    setKnowledgeBaseType('internal');
  };

  const handleGenerateWithAI = async () => {
    if (!aiDescription.trim()) {
      toast.error('Descreva o agente que deseja criar');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-card', {
        body: { description: aiDescription },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Fill all fields from AI response
      setAgentKey(data.agent_key || '');
      setDescription(data.description || '');
      setIcon(data.icon || '🤖');
      setColor(data.color || '#8B5CF6');

      setCard({
        id: data.agent_key || '',
        name: data.name || '',
        version: '1.0',
        role: data.role || '',
        mission: data.mission || '',
        capabilities: data.capabilities || [],
        non_capabilities: data.non_capabilities || [],
        inputs: data.inputs || [],
        context_dependencies: data.context_dependencies || [],
        reasoning_protocol: data.reasoning_protocol || [],
        output_schema: data.output_schema ? JSON.stringify(data.output_schema, null, 2) : '{}',
        quality_standards: data.quality_standards || [],
        anti_patterns: data.anti_patterns || [],
        error_handling: data.error_handling || '',
        handoff: data.handoff || '',
        destino_consumo: data.destino_consumo || [],
      });

      toast.success('✨ Agent Card gerado com IA! Revise e ajuste os campos antes de criar.');
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error(`Erro ao gerar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!card.name.trim()) { toast.error('Informe o nome do agente'); return; }

    // Auto-generate key from name
    const generatedKey = agentKey.trim() || card.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (existingKeys.includes(generatedKey)) { toast.error('Já existe um agente com esse nome/chave. Escolha outro nome.'); return; }

    // Auto-calculate ordem based on dependencies
    const ordem = AGENT_ORDER.length + existingKeys.length + 1;

    setSaving(true);
    let schema = {};
    try { schema = JSON.parse(card.output_schema); } catch { /* empty */ }

    const result = await onCreate({
      agent_key: generatedKey,
      name: card.name,
      icon,
      color,
      description,
      system_prompt: generatedPrompt,
      dependencies,
      output_schema: schema,
      ordem,
      agent_card_json: card,
      knowledge_base_type: knowledgeBaseType,
    });

    setSaving(false);
    if (result) {
      setOpen(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            Criar Novo Agente
          </DialogTitle>
        </DialogHeader>

        {/* ─── AI Generation Section ─── */}
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Label className="text-sm font-semibold text-primary">Gerar com IA</Label>
            <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Descreva o agente que deseja criar e a IA preencherá automaticamente todos os campos do Agent Card.
          </p>
          <div className="flex gap-2">
            <Textarea
              value={aiDescription}
              onChange={e => setAiDescription(e.target.value)}
              placeholder="Ex: Um agente especialista em análise de concorrência que mapeia os principais competidores do negócio, analisa seus pontos fortes/fracos e sugere diferenciais estratégicos..."
              rows={3}
              className="text-sm flex-1"
            />
          </div>
          <Button
            onClick={handleGenerateWithAI}
            disabled={generating || !aiDescription.trim()}
            className="gap-2"
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando Agent Card...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Agent Card com IA
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* ─── Meta fields ─── */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição Curta</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="O que este agente faz..." className="text-sm h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Ícone</Label>
              <div className="flex flex-wrap gap-1">
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)}
                    className={`text-lg p-1 rounded cursor-pointer hover:bg-muted ${icon === ic ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                  >{ic}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cor</Label>
              <div className="flex flex-wrap gap-1">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full cursor-pointer ${color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Dependências de Execução</Label>
            <p className="text-[10px] text-muted-foreground">Agentes que devem ser concluídos antes deste poder executar</p>
            <div className="flex flex-wrap gap-1">
              {[...AGENT_ORDER, ...existingKeys.filter(k => !AGENT_ORDER.includes(k))].map(dep => {
                const depInfo = AGENT_INFO[dep];
                const depIcon = depInfo?.icon || '🤖';
                const depName = depInfo?.name?.split(' ')[0] || dep;
                return (
                  <Badge key={dep} variant={dependencies.includes(dep) ? 'default' : 'outline'}
                    className="text-xs cursor-pointer gap-1" onClick={() => toggleDep(dep)}
                  >
                    <span>{depIcon}</span> {depName}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <Separator />

        {/* ─── Tabbed Agent Card editing ─── */}
        <Tabs defaultValue="identity" className="w-full mt-2">
          <TabsList className="w-full grid grid-cols-5 h-8">
            <TabsTrigger value="identity" className="text-[10px]">Identidade</TabsTrigger>
            <TabsTrigger value="contracts" className="text-[10px]">Contratos</TabsTrigger>
            <TabsTrigger value="reasoning" className="text-[10px]">Raciocínio</TabsTrigger>
            <TabsTrigger value="quality" className="text-[10px]">Qualidade</TabsTrigger>
            <TabsTrigger value="prompt" className="text-[10px]">Prompt</TabsTrigger>
          </TabsList>

          {/* ─── IDENTITY TAB ─── */}
          <TabsContent value="identity" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <FieldSection label="Nome">
                <Input value={card.name} onChange={e => updateCard('name', e.target.value)} className="text-xs h-8" placeholder="Nome do Agente" />
              </FieldSection>
              <FieldSection label="Versão">
                <Input value={card.version} onChange={e => updateCard('version', e.target.value)} className="text-xs h-8" />
              </FieldSection>
            </div>

            <FieldSection label="Papel" hint="Descrição clara do papel do agente no sistema">
              <Textarea value={card.role} onChange={e => updateCard('role', e.target.value)} rows={2} className="text-xs" placeholder="Ex: Especialista em análise de mercado..." />
            </FieldSection>

            <FieldSection label="Missão" hint="Resultado estratégico que o agente deve produzir">
              <Textarea value={card.mission} onChange={e => updateCard('mission', e.target.value)} rows={2} className="text-xs" placeholder="Ex: Gerar relatório detalhado de..." />
            </FieldSection>

            <Separator />

            <FieldSection label="Base de Conhecimento" hint="Define se o agente usa dados internos (memória estratégica) ou uma base externa de arquivos">
              <Select value={knowledgeBaseType} onValueChange={(v: 'internal' | 'external') => setKnowledgeBaseType(v)}>
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
              {knowledgeBaseType === 'external' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  📂 Após criar o agente, você poderá enviar arquivos na edição do Agent Card.
                </p>
              )}
            </FieldSection>
          </TabsContent>

          {/* ─── CONTRACTS TAB ─── */}
          <TabsContent value="contracts" className="space-y-3 mt-3">
            <FieldSection label="Capacidades" hint="Lista de tarefas que o agente é capaz de executar">
              <EditableList items={card.capabilities} onChange={v => updateCard('capabilities', v)} placeholder="Capacidade..." />
            </FieldSection>

            <Separator />

            <FieldSection label="Restrições" hint="Lista explícita do que o agente NÃO deve fazer">
              <EditableList items={card.non_capabilities} onChange={v => updateCard('non_capabilities', v)} placeholder="Restrição..." />
            </FieldSection>

            <Separator />

            <FieldSection label="Entradas" hint="Tipos de dados aceitos pelo agente">
              <EditableList items={card.inputs} onChange={v => updateCard('inputs', v)} placeholder="Tipo de dado..." />
            </FieldSection>

            <Separator />

            <FieldSection label="Dependências de Contexto" hint="Dados da memória estratégica necessários">
              <EditableList items={card.context_dependencies} onChange={v => updateCard('context_dependencies', v)} placeholder="Dependência..." />
            </FieldSection>

            <Separator />

            <FieldSection label="Esquema de Saída" hint="JSON schema obrigatório para a saída do agente">
              <Textarea value={card.output_schema} onChange={e => updateCard('output_schema', e.target.value)} rows={8} className="text-xs font-mono" placeholder='{ "campo": "tipo" }' />
            </FieldSection>
          </TabsContent>

          {/* ─── REASONING TAB ─── */}
          <TabsContent value="reasoning" className="space-y-3 mt-3">
            <FieldSection label="Protocolo de Raciocínio" hint="Passos ordenados que o agente deve seguir ao executar">
              <EditableList items={card.reasoning_protocol} onChange={v => updateCard('reasoning_protocol', v)} placeholder="Passo..." ordered />
            </FieldSection>

            <Separator />

            <FieldSection label="Tratamento de Erros" hint="Como o agente reage quando dados são insuficientes">
              <Textarea value={card.error_handling} onChange={e => updateCard('error_handling', e.target.value)} rows={2} className="text-xs" placeholder="Ex: Se dados insuficientes, retornar campo 'warnings' com..." />
            </FieldSection>
          </TabsContent>

          {/* ─── QUALITY TAB ─── */}
          <TabsContent value="quality" className="space-y-3 mt-3">
            <FieldSection label="Padrões de Qualidade" hint="Critérios que definem se o output é aceitável">
              <EditableList items={card.quality_standards} onChange={v => updateCard('quality_standards', v)} placeholder="Padrão de qualidade..." />
            </FieldSection>

            <Separator />

            <FieldSection label="Anti-Padrões" hint="Comportamentos proibidos que devem ser evitados">
              <EditableList items={card.anti_patterns} onChange={v => updateCard('anti_patterns', v)} placeholder="Anti-padrão..." />
            </FieldSection>
          </TabsContent>

          {/* ─── PROMPT PREVIEW TAB ─── */}
          <TabsContent value="prompt" className="space-y-3 mt-3">
            <FieldSection label="Prompt do Sistema (Gerado)" hint="Prompt gerado automaticamente a partir dos campos do Agent Card. Atualiza em tempo real.">
              <Textarea value={generatedPrompt} readOnly rows={15} className="text-xs font-mono bg-muted/50" />
            </FieldSection>
            <Button variant="outline" size="sm" onClick={copyPrompt}>
              <Copy className="h-3 w-3 mr-1" /> Copiar Prompt
            </Button>
          </TabsContent>
        </Tabs>

        {/* ─── Actions ─── */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar Agente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
