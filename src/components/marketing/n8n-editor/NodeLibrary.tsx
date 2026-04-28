import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  Zap, 
  Clock, 
  Globe, 
  Code, 
  GitBranch, 
  Bot, 
  Database,
  Mail,
  MessageSquare,
  Webhook,
  Filter,
  Layers,
  GitMerge,
  Send,
  Settings,
  Link,
  Brain,
  Shuffle,
  Edit,
  Play,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessageCircle,
  HardDrive,
  Cpu,
  Workflow
} from 'lucide-react';
import { N8nNodeType } from './types';

interface NodeLibraryProps {
  nodeTypes: N8nNodeType[];
  onDragStart: (nodeType: N8nNodeType) => void;
}

const iconMap: Record<string, React.ElementType> = {
  webhook: Webhook,
  clock: Clock,
  globe: Globe,
  'git-branch': GitBranch,
  shuffle: Shuffle,
  edit: Edit,
  code: Code,
  'git-merge': GitMerge,
  layers: Layers,
  bot: Bot,
  send: Send,
  hash: MessageSquare,
  mail: Mail,
  database: Database,
  reply: Send,
  brain: Brain,
  link: Link,
  filter: Filter,
  play: Play,
};

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trigger: { label: 'Triggers', icon: Zap, color: '#22c55e' },
  action: { label: 'Ações', icon: Play, color: '#3b82f6' },
  logic: { label: 'Lógica', icon: GitBranch, color: '#f59e0b' },
  transform: { label: 'Transformação', icon: Shuffle, color: '#64748b' },
  ai: { label: 'IA / LLM', icon: Sparkles, color: '#8b5cf6' },
  communication: { label: 'Comunicação', icon: MessageCircle, color: '#06b6d4' },
  data: { label: 'Dados', icon: HardDrive, color: '#10b981' },
  other: { label: 'Outros', icon: Workflow, color: '#6b7280' },
};

const categoryOrder = ['trigger', 'action', 'logic', 'transform', 'ai', 'communication', 'data', 'other'];

const NodeLibrary: React.FC<NodeLibraryProps> = ({ nodeTypes, onDragStart }) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categoryOrder));

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodeTypes;
    const term = search.toLowerCase();
    return nodeTypes.filter(
      (node) =>
        node.nome_display.toLowerCase().includes(term) ||
        node.descricao?.toLowerCase().includes(term) ||
        node.tipo.toLowerCase().includes(term)
    );
  }, [nodeTypes, search]);

  const groupedNodes = useMemo(() => {
    const groups: Record<string, N8nNodeType[]> = {};
    filteredNodes.forEach((node) => {
      const cat = node.categoria || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(node);
    });
    return groups;
  }, [filteredNodes]);

  const handleDragStart = (e: React.DragEvent, nodeType: N8nNodeType) => {
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(nodeType);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(categoryOrder));
  const collapseAll = () => setExpandedCategories(new Set());

  return (
    <div className="h-full flex flex-col border-r bg-background">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nós..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Expandir todos
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Recolher todos
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {categoryOrder.map((category) => {
            const nodes = groupedNodes[category];
            if (!nodes || nodes.length === 0) return null;

            const config = categoryConfig[category] || categoryConfig.other;
            const CategoryIcon = config.icon;
            const isExpanded = expandedCategories.has(category);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors group">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1 rounded text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      <CategoryIcon className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {nodes.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="pl-2 space-y-1 mt-1">
                    {nodes.map((node) => {
                      const IconComponent = iconMap[node.icone || ''] || Zap;
                      const color = node.cor || '#64748b';

                      return (
                        <div
                          key={node.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-grab active:cursor-grabbing transition-colors group border border-transparent hover:border-border"
                        >
                          <div
                            className="p-1.5 rounded text-white flex-shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            <IconComponent className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {node.nome_display}
                            </div>
                            {node.descricao && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {node.descricao}
                              </div>
                            )}
                            {node.credential_type_id && (
                              <Badge variant="outline" className="text-[10px] h-4 mt-0.5">
                                🔑 Credencial
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {Object.keys(groupedNodes).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhum nó encontrado
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NodeLibrary;
