import React, { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Zap, 
  Mail, 
  MessageSquare, 
  Database, 
  Globe, 
  Code, 
  Clock, 
  FileText,
  Send,
  Bot,
  Webhook,
  Settings,
  Play,
  Filter,
  GitBranch,
  Repeat,
  PlusCircle,
  X,
  Save
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface N8nWorkflowVisualizerProps {
  jsonData: string;
  onJsonChange?: (newJson: string) => void;
  editable?: boolean;
}

// Icon mapping for n8n node types
const getNodeIcon = (type: string) => {
  const typeLC = type.toLowerCase();
  if (typeLC.includes('trigger') || typeLC.includes('start')) return <Play className="h-4 w-4" />;
  if (typeLC.includes('webhook')) return <Webhook className="h-4 w-4" />;
  if (typeLC.includes('http') || typeLC.includes('request')) return <Globe className="h-4 w-4" />;
  if (typeLC.includes('openai') || typeLC.includes('ai') || typeLC.includes('gpt')) return <Bot className="h-4 w-4" />;
  if (typeLC.includes('email') || typeLC.includes('gmail') || typeLC.includes('smtp')) return <Mail className="h-4 w-4" />;
  if (typeLC.includes('slack') || typeLC.includes('discord') || typeLC.includes('telegram')) return <MessageSquare className="h-4 w-4" />;
  if (typeLC.includes('postgres') || typeLC.includes('mysql') || typeLC.includes('database') || typeLC.includes('supabase')) return <Database className="h-4 w-4" />;
  if (typeLC.includes('code') || typeLC.includes('function') || typeLC.includes('javascript')) return <Code className="h-4 w-4" />;
  if (typeLC.includes('schedule') || typeLC.includes('cron') || typeLC.includes('interval')) return <Clock className="h-4 w-4" />;
  if (typeLC.includes('if') || typeLC.includes('switch') || typeLC.includes('filter')) return <Filter className="h-4 w-4" />;
  if (typeLC.includes('merge') || typeLC.includes('split')) return <GitBranch className="h-4 w-4" />;
  if (typeLC.includes('loop') || typeLC.includes('batch')) return <Repeat className="h-4 w-4" />;
  if (typeLC.includes('set') || typeLC.includes('edit')) return <Settings className="h-4 w-4" />;
  if (typeLC.includes('send') || typeLC.includes('respond')) return <Send className="h-4 w-4" />;
  if (typeLC.includes('google') || typeLC.includes('sheet')) return <FileText className="h-4 w-4" />;
  return <Zap className="h-4 w-4" />;
};

// Get node color based on type
const getNodeColor = (type: string) => {
  const typeLC = type.toLowerCase();
  if (typeLC.includes('trigger') || typeLC.includes('start') || typeLC.includes('webhook')) return '#22c55e';
  if (typeLC.includes('openai') || typeLC.includes('ai') || typeLC.includes('gpt') || typeLC.includes('anthropic')) return '#8b5cf6';
  if (typeLC.includes('http') || typeLC.includes('request')) return '#3b82f6';
  if (typeLC.includes('if') || typeLC.includes('switch') || typeLC.includes('filter')) return '#f59e0b';
  if (typeLC.includes('code') || typeLC.includes('function')) return '#6366f1';
  if (typeLC.includes('email') || typeLC.includes('gmail')) return '#ef4444';
  if (typeLC.includes('database') || typeLC.includes('postgres') || typeLC.includes('supabase')) return '#06b6d4';
  if (typeLC.includes('slack') || typeLC.includes('discord')) return '#ec4899';
  return '#64748b';
};

// Custom node component
const N8nNode = ({ data, selected }: NodeProps) => {
  const color = getNodeColor(data.type as string || '');
  
  return (
    <div 
      className={`px-3 py-2 shadow-lg rounded-lg border-2 bg-background min-w-[150px] max-w-[200px] cursor-pointer transition-all ${selected ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-xl'}`}
      style={{ borderColor: color }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      
      <div className="flex items-center gap-2">
        <div 
          className="p-1.5 rounded-md text-white"
          style={{ backgroundColor: color }}
        >
          {getNodeIcon(data.type as string || '')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" title={data.label as string}>
            {data.label as string}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title={data.type as string}>
            {data.type as string}
          </div>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
};

const nodeTypes = {
  n8nNode: N8nNode,
};

// Parameter editor component
const ParameterEditor: React.FC<{
  params: Record<string, any>;
  path?: string;
  onChange: (path: string, value: any) => void;
  editable: boolean;
}> = ({ params, path = '', onChange, editable }) => {
  const renderValue = (key: string, value: any, currentPath: string) => {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    
    if (value === null || value === undefined) {
      return (
        <div key={fullPath} className="flex items-center gap-2 py-1">
          <span className="text-xs text-muted-foreground min-w-[100px]">{key}:</span>
          <span className="text-xs italic text-muted-foreground">null</span>
        </div>
      );
    }
    
    if (typeof value === 'boolean') {
      return (
        <div key={fullPath} className="flex items-center gap-2 py-1">
          <span className="text-xs text-muted-foreground min-w-[100px]">{key}:</span>
          <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
            {value ? 'true' : 'false'}
          </Badge>
        </div>
      );
    }
    
    if (typeof value === 'number') {
      return (
        <div key={fullPath} className="flex items-center gap-2 py-1">
          <Label className="text-xs text-muted-foreground min-w-[100px]">{key}:</Label>
          {editable ? (
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(fullPath, parseFloat(e.target.value) || 0)}
              className="h-7 text-xs flex-1"
            />
          ) : (
            <span className="text-xs font-mono">{value}</span>
          )}
        </div>
      );
    }
    
    if (typeof value === 'string') {
      const isLongText = value.length > 50 || value.includes('\n');
      const isSensitive = key.toLowerCase().includes('key') || 
                          key.toLowerCase().includes('token') || 
                          key.toLowerCase().includes('secret') ||
                          key.toLowerCase().includes('password');
      
      return (
        <div key={fullPath} className="flex flex-col gap-1 py-1">
          <Label className="text-xs text-muted-foreground">{key}:</Label>
          {editable ? (
            isLongText ? (
              <Textarea
                value={value}
                onChange={(e) => onChange(fullPath, e.target.value)}
                className="text-xs font-mono min-h-[60px]"
              />
            ) : (
              <Input
                type={isSensitive ? 'password' : 'text'}
                value={value}
                onChange={(e) => onChange(fullPath, e.target.value)}
                className="h-7 text-xs font-mono"
              />
            )
          ) : (
            <span className={`text-xs font-mono break-all ${isSensitive ? 'blur-sm hover:blur-none transition-all' : ''}`}>
              {isSensitive ? value.substring(0, 10) + '...' : value}
            </span>
          )}
        </div>
      );
    }
    
    if (Array.isArray(value)) {
      return (
        <div key={fullPath} className="py-1">
          <Label className="text-xs text-muted-foreground">{key}: (Array [{value.length}])</Label>
          <div className="ml-3 mt-1 pl-2 border-l-2 border-muted">
            {value.map((item, idx) => renderValue(`[${idx}]`, item, fullPath))}
          </div>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div key={fullPath} className="py-1">
          <Label className="text-xs text-muted-foreground font-semibold">{key}:</Label>
          <div className="ml-3 mt-1 pl-2 border-l-2 border-muted">
            {Object.entries(value).map(([k, v]) => renderValue(k, v, fullPath))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (!params || Object.keys(params).length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum parâmetro</p>;
  }

  return (
    <div className="space-y-1">
      {Object.entries(params).map(([key, value]) => renderValue(key, value, path))}
    </div>
  );
};

const N8nWorkflowVisualizer: React.FC<N8nWorkflowVisualizerProps> = ({ 
  jsonData, 
  onJsonChange,
  editable = false 
}) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editedParams, setEditedParams] = useState<Record<string, any>>({});

  const { nodes, edges, error, originalData } = useMemo(() => {
    if (!jsonData.trim()) {
      return { nodes: [], edges: [], error: null, originalData: null };
    }

    try {
      const parsed = JSON.parse(jsonData);
      const n8nNodes = parsed.nodes || [];
      const n8nConnections = parsed.connections || {};

      // Convert n8n nodes to React Flow nodes
      const flowNodes: Node[] = n8nNodes.map((node: any, index: number) => {
        let x = 100 + (index % 4) * 250;
        let y = 100 + Math.floor(index / 4) * 150;
        
        if (node.position && typeof node.position === 'object') {
          x = node.position[0] || node.position.x || x;
          y = node.position[1] || node.position.y || y;
        }

        return {
          id: node.id || node.name || `node-${index}`,
          type: 'n8nNode',
          position: { x, y },
          data: {
            label: node.name || node.displayName || `Node ${index + 1}`,
            type: node.type || 'Unknown',
            parameters: node.parameters || {},
            credentials: node.credentials || {},
            originalNode: node,
            originalIndex: index,
          },
        };
      });

      // Convert n8n connections to React Flow edges
      const flowEdges: Edge[] = [];
      let edgeId = 0;

      Object.entries(n8nConnections).forEach(([sourceNodeName, connectionData]: [string, any]) => {
        const sourceNode = flowNodes.find(n => n.data.label === sourceNodeName);
        if (!sourceNode) return;

        if (connectionData.main) {
          connectionData.main.forEach((outputs: any[], outputIndex: number) => {
            if (Array.isArray(outputs)) {
              outputs.forEach((conn: any) => {
                const targetNode = flowNodes.find(n => n.data.label === conn.node);
                if (targetNode) {
                  flowEdges.push({
                    id: `edge-${edgeId++}`,
                    source: sourceNode.id,
                    target: targetNode.id,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#64748b', strokeWidth: 2 },
                  });
                }
              });
            }
          });
        }
      });

      return { nodes: flowNodes, edges: flowEdges, error: null, originalData: parsed };
    } catch (e) {
      return { nodes: [], edges: [], error: 'JSON inválido', originalData: null };
    }
  }, [jsonData]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setEditedParams(JSON.parse(JSON.stringify(node.data.parameters || {})));
  }, []);

  const handleParamChange = useCallback((path: string, value: any) => {
    setEditedParams(prev => {
      const newParams = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newParams;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.startsWith('[') && key.endsWith(']')) {
          const idx = parseInt(key.slice(1, -1));
          current = current[idx];
        } else {
          current = current[key];
        }
      }
      
      const lastKey = keys[keys.length - 1];
      if (lastKey.startsWith('[') && lastKey.endsWith(']')) {
        const idx = parseInt(lastKey.slice(1, -1));
        current[idx] = value;
      } else {
        current[lastKey] = value;
      }
      
      return newParams;
    });
  }, []);

  const handleSaveNode = useCallback(() => {
    if (!selectedNode || !originalData || !onJsonChange) return;

    const newData = JSON.parse(JSON.stringify(originalData));
    const nodeIndex = selectedNode.data.originalIndex as number;
    
    if (newData.nodes && newData.nodes[nodeIndex]) {
      newData.nodes[nodeIndex].parameters = editedParams;
    }

    onJsonChange(JSON.stringify(newData, null, 2));
    setSelectedNode(null);
  }, [selectedNode, originalData, editedParams, onJsonChange]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <PlusCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Cole um JSON de workflow para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background color="#333" gap={16} size={1} />
        <Controls className="!bg-background !border !rounded-lg" />
        <MiniMap 
          className="!bg-background !border !rounded-lg"
          nodeColor={(node) => getNodeColor(node.data?.type as string || '')}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>

      <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <div 
                className="p-2 rounded-md text-white"
                style={{ backgroundColor: getNodeColor(selectedNode?.data?.type as string || '') }}
              >
                {getNodeIcon(selectedNode?.data?.type as string || '')}
              </div>
              <div>
                <div>{selectedNode?.data?.label as string}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {selectedNode?.data?.type as string}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-4 pr-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Parâmetros
                </h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <ParameterEditor 
                    params={editable ? editedParams : (selectedNode?.data?.parameters as Record<string, any> || {})}
                    onChange={handleParamChange}
                    editable={editable && !!onJsonChange}
                  />
                </div>
              </div>

              {selectedNode?.data?.credentials && Object.keys(selectedNode.data.credentials as object).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Credenciais
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    {Object.entries(selectedNode.data.credentials as Record<string, any>).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 py-1">
                        <span className="text-xs text-muted-foreground">{key}:</span>
                        <Badge variant="outline" className="text-xs">
                          {typeof value === 'object' ? value.name || value.id : value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {editable && onJsonChange && (
            <div className="flex-shrink-0 pt-4 border-t mt-4">
              <Button onClick={handleSaveNode} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default N8nWorkflowVisualizer;
