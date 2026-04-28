import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, GripVertical, Copy, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AGENT_META: Record<string, { icon: string; label: string }> = {
  vox: { icon: '🎯', label: 'Voz do Cliente' },
  cipher: { icon: '🔍', label: 'Inteligência Competitiva' },
  positioning: { icon: '📍', label: 'Posicionamento' },
  funnel: { icon: '🔄', label: 'Arquiteto de Funil' },
  vsl: { icon: '🎬', label: 'Roteirista de Vídeo' },
  landing_page: { icon: '📄', label: 'Landing Page' },
  creative: { icon: '🎨', label: 'Criativos' },
  email: { icon: '📧', label: 'Email Marketing' },
  reel: { icon: '📱', label: 'Roteirista de Reels' },
  seo: { icon: '🔎', label: 'SEO & Conteúdo' },
  paid_media: { icon: '💰', label: 'Mídia Paga' },
  social_media: { icon: '📣', label: 'Social Media' },
  site_builder: { icon: '🌐', label: 'Site Builder' },
  video_producer: { icon: '🎥', label: 'Produtor de Vídeo' },
  influencer_content: { icon: '⭐', label: 'Influencer & Imagens' },
};

interface TextSnippet {
  id: string;
  text: string;
  label: string;
  agentKey: string;
}

function extractKeyTexts(obj: any, prefix = '', maxDepth = 4): { label: string; text: string }[] {
  const results: { label: string; text: string }[] = [];
  if (!obj || maxDepth <= 0) return results;

  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix} › ${key}` : key;
    if (typeof val === 'string' && val.length >= 15 && val.length < 1500) {
      results.push({ label: path, text: val });
    } else if (Array.isArray(val)) {
      for (let i = 0; i < Math.min(val.length, 5); i++) {
        const item = val[i];
        if (typeof item === 'string' && item.length >= 10) {
          results.push({ label: `${path}[${i + 1}]`, text: item });
        } else if (typeof item === 'object' && item !== null) {
          results.push(...extractKeyTexts(item, `${path}[${i + 1}]`, maxDepth - 1));
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      results.push(...extractKeyTexts(val, path, maxDepth - 1));
    }
  }
  return results;
}

const DraggableSnippet: React.FC<{ snippet: TextSnippet; onCopy: (text: string) => void }> = ({ snippet, onCopy }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', snippet.text);
    e.dataTransfer.setData('application/x-agent-text', JSON.stringify(snippet));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex items-start gap-1.5 p-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/60 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-all text-left"
    >
      <GripVertical className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-primary/60" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium truncate mb-0.5">{snippet.label}</p>
        <p className="text-xs text-foreground leading-relaxed line-clamp-3">{snippet.text}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onCopy(snippet.text); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background transition-all"
        title="Copiar texto"
      >
        <Copy className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
};

export const AgentTextBank: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [memory, setMemory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }
      const { data } = await supabase
        .from('strategy_projects')
        .select('id, nome, strategic_memory')
        .eq('estabelecimento_id', estabId)
        .order('updated_at', { ascending: false })
        .limit(10);
      const list = data || [];
      setProjects(list);
      if (list[0]) {
        setSelectedProject(list[0].id);
        setMemory((list[0].strategic_memory as Record<string, any>) || {});
      }
      setLoading(false);
    })();
  }, []);

  const handleProjectChange = (id: string) => {
    setSelectedProject(id);
    const p = projects.find(p => p.id === id);
    setMemory((p?.strategic_memory as Record<string, any>) || {});
    setExpandedAgents(new Set());
  };

  const toggleAgent = (key: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const agentSnippets = useMemo(() => {
    const result: Record<string, TextSnippet[]> = {};
    const agentKeys = Object.keys(memory);

    for (const agentKey of agentKeys) {
      const texts = extractKeyTexts(memory[agentKey]);
      if (texts.length === 0) continue;

      result[agentKey] = texts.slice(0, 10).map((t, i) => ({
        id: `${agentKey}-${i}`,
        text: t.text,
        label: t.label,
        agentKey,
      }));
    }
    return result;
  }, [memory]);

  const filteredAgents = useMemo(() => {
    const agents = Object.keys(agentSnippets);
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(key => {
      const meta = AGENT_META[key];
      if (meta?.label.toLowerCase().includes(q)) return true;
      if (key.toLowerCase().includes(q)) return true;
      return agentSnippets[key].some(s => s.text.toLowerCase().includes(q));
    });
  }, [agentSnippets, search]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Texto copiado!');
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (Object.keys(agentSnippets).length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm text-muted-foreground">Nenhum dado de agente disponível.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Execute agentes no Motor de Estratégia primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.length > 1 && (
        <Select value={selectedProject || ''} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar textos..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
        <GripVertical className="h-3 w-3" /> Arraste os textos para os campos do editor
      </p>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-1.5 pr-1">
          {filteredAgents.map(agentKey => {
            const meta = AGENT_META[agentKey] || { icon: '🤖', label: agentKey };
            const snippets = agentSnippets[agentKey];
            const isExpanded = expandedAgents.has(agentKey);

            return (
              <div key={agentKey} className="rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleAgent(agentKey)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-base">{meta.icon}</span>
                  <span className="text-xs font-medium flex-1 text-left">{meta.label}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{snippets.length}</Badge>
                  <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1.5">
                    {snippets
                      .filter(s => !search.trim() || s.text.toLowerCase().includes(search.toLowerCase()) || s.label.toLowerCase().includes(search.toLowerCase()))
                      .map(snippet => (
                        <DraggableSnippet key={snippet.id} snippet={snippet} onCopy={handleCopy} />
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
