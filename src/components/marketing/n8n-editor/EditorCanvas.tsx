import React, { useCallback, useRef } from 'react';
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
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Zap, Clock, Globe, Code, GitBranch, Bot, Database, Mail, 
  MessageSquare, Webhook, Filter, Layers, GitMerge, Send, 
  Settings, Link, Brain, Shuffle, Edit, Play, Trash2
} from 'lucide-react';
import { N8nNodeType, EditorNode, EditorEdge } from './types';
import { Button } from '@/components/ui/button';

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

interface CustomNodeData {
  label: string;
  nodeType: N8nNodeType;
  parameters: Record<string, any>;
  credentialId?: string;
  credentialName?: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  [key: string]: unknown;
}

const CustomNode = ({ data, id, selected }: NodeProps<Node<CustomNodeData>>) => {
  const nodeType = data.nodeType;
  const IconComponent = iconMap[nodeType?.icone || ''] || Zap;
  const color = nodeType?.cor || '#64748b';

  return (
    <div 
      className={`relative px-3 py-2 shadow-lg rounded-lg border-2 bg-background min-w-[160px] max-w-[220px] transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={{ borderColor: color }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      
      <div className="flex items-center gap-2">
        <div 
          className="p-1.5 rounded-md text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" title={data.label}>
            {data.label}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title={nodeType?.nome_display}>
            {nodeType?.nome_display}
          </div>
        </div>
      </div>

      {data.credentialName && (
        <div className="mt-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 truncate">
          🔑 {data.credentialName}
        </div>
      )}

      {selected && (
        <div className="absolute -top-8 left-0 right-0 flex justify-center gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.(id);
            }}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

interface EditorCanvasProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<CustomNodeData>>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: OnConnect;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onNodeClick,
  onPaneClick,
}) => {
  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#333" gap={16} size={1} />
        <Controls className="!bg-background !border !rounded-lg" />
        <MiniMap 
          className="!bg-background !border !rounded-lg"
          nodeColor={(node) => {
            const data = node.data as CustomNodeData;
            return data?.nodeType?.cor || '#64748b';
          }}
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
};

export default EditorCanvas;
