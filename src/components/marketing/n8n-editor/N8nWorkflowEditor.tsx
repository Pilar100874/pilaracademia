import React, { useState, useCallback, useMemo } from 'react';
import { Node, Edge, addEdge, Connection, useNodesState, useEdgesState } from '@xyflow/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Save, Download, Upload, Plus, Trash2, Key, Workflow, 
  FolderOpen, FileJson, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import NodeLibrary from './NodeLibrary';
import EditorCanvas from './EditorCanvas';
import NodeConfigPanel from './NodeConfigPanel';
import CredentialsManager from './CredentialsManager';
import { useNodeTypes, useCredentialTypes, useCredentials, useWorkflows, useSaveWorkflow, useDeleteWorkflow } from './hooks/useN8nData';
import { N8nNodeType, N8nWorkflow, WorkflowData, WorkflowNode } from './types';

interface N8nWorkflowEditorProps {
  estabelecimentoId?: string;
}

const N8nWorkflowEditor: React.FC<N8nWorkflowEditorProps> = ({ estabelecimentoId = '' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('Novo Workflow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [copied, setCopied] = useState(false);

  const { data: nodeTypes = [] } = useNodeTypes();
  const { data: credentialTypes = [] } = useCredentialTypes();
  const { data: credentials = [] } = useCredentials(estabelecimentoId);
  const { data: workflows = [] } = useWorkflows(estabelecimentoId);
  const saveWorkflow = useSaveWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/json');
      if (!data) return;

      const nodeType: N8nNodeType = JSON.parse(data);
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left - 75,
        y: event.clientY - rect.top - 25,
      };

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'customNode',
        position,
        data: {
          label: nodeType.nome_display,
          nodeType,
          parameters: Object.fromEntries(
            Object.entries(nodeType.parametros_schema || {}).map(([key, config]: [string, any]) => [
              key,
              config.default,
            ])
          ),
          onDelete: handleDeleteNode,
          onEdit: handleEditNode,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleEditNode = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) setSelectedNode(node);
  }, [nodes]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: { label: string; parameters: Record<string, any>; credentialId?: string; credentialName?: string }) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: updates.label,
                  parameters: updates.parameters,
                  credentialId: updates.credentialId,
                  credentialName: updates.credentialName,
                },
              }
            : n
        )
      );
    },
    [setNodes]
  );

  // Convert editor state to n8n format
  const exportToN8nFormat = useCallback((): WorkflowData => {
    const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
      id: node.id,
      name: node.data.label as string,
      type: (node.data.nodeType as N8nNodeType)?.tipo || 'unknown',
      position: [node.position.x, node.position.y],
      parameters: node.data.parameters as Record<string, any>,
      credentials: node.data.credentialId
        ? {
            [((node.data.nodeType as N8nNodeType)?.credential_type?.nome || 'default')]: {
              id: node.data.credentialId as string,
              name: node.data.credentialName as string || 'Credential',
            },
          }
        : undefined,
    }));

    const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) return;

      const sourceName = sourceNode.data.label as string;
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!targetNode) return;

      if (!connections[sourceName]) {
        connections[sourceName] = { main: [[]] };
      }

      connections[sourceName].main[0].push({
        node: targetNode.data.label as string,
        type: 'main',
        index: 0,
      });
    });

    return { nodes: workflowNodes, connections };
  }, [nodes, edges]);

  // Load workflow from n8n format
  const importFromN8nFormat = useCallback(
    (data: WorkflowData) => {
      const newNodes: Node[] = data.nodes.map((n, idx) => {
        const nodeType = nodeTypes.find((nt) => nt.tipo === n.type);
        return {
          id: n.id || `node-${idx}`,
          type: 'customNode',
          position: { x: n.position[0], y: n.position[1] },
          data: {
            label: n.name,
            nodeType: nodeType || { tipo: n.type, nome_display: n.type, cor: '#64748b' },
            parameters: n.parameters,
            onDelete: handleDeleteNode,
            onEdit: handleEditNode,
          },
        };
      });

      const newEdges: Edge[] = [];
      let edgeId = 0;
      Object.entries(data.connections).forEach(([sourceName, connData]) => {
        const sourceNode = newNodes.find((n) => n.data.label === sourceName);
        if (!sourceNode || !connData.main) return;

        connData.main.forEach((outputs) => {
          outputs.forEach((conn) => {
            const targetNode = newNodes.find((n) => n.data.label === conn.node);
            if (targetNode) {
              newEdges.push({
                id: `edge-${edgeId++}`,
                source: sourceNode.id,
                target: targetNode.id,
                type: 'smoothstep',
                animated: true,
              });
            }
          });
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    },
    [nodeTypes, setNodes, setEdges, handleDeleteNode, handleEditNode]
  );

  const handleSaveWorkflow = async () => {
    const flowData = exportToN8nFormat();
    await saveWorkflow.mutateAsync({
      id: currentWorkflowId || undefined,
      estabelecimento_id: estabelecimentoId,
      nome: workflowName,
      flow_data: flowData,
      ativo: false,
    });
  };

  const handleLoadWorkflow = (workflow: N8nWorkflow) => {
    setCurrentWorkflowId(workflow.id);
    setWorkflowName(workflow.nome);
    importFromN8nFormat(workflow.flow_data);
    setActiveTab('editor');
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este workflow?')) {
      await deleteWorkflow.mutateAsync(id);
      if (currentWorkflowId === id) {
        setCurrentWorkflowId(null);
        setWorkflowName('Novo Workflow');
        setNodes([]);
        setEdges([]);
      }
    }
  };

  const handleNewWorkflow = () => {
    setCurrentWorkflowId(null);
    setWorkflowName('Novo Workflow');
    setNodes([]);
    setEdges([]);
  };

  const handleExportJson = () => {
    const flowData = exportToN8nFormat();
    const json = JSON.stringify(flowData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exportado!');
  };

  const handleCopyJson = async () => {
    const flowData = exportToN8nFormat();
    const json = JSON.stringify(flowData, null, 2);
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('JSON copiado!');
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        importFromN8nFormat(data);
        toast.success('Workflow importado!');
      } catch (error) {
        toast.error('Erro ao importar JSON');
      }
    };
    reader.readAsText(file);
  };

  // Add callbacks to all nodes
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: handleDeleteNode,
        onEdit: handleEditNode,
      },
    }));
  }, [nodes, handleDeleteNode, handleEditNode]);

  return (
    <div className="h-[700px] flex flex-col border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-8 w-48"
          />
          <Button size="sm" variant="outline" onClick={handleNewWorkflow}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyJson}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copiado!' : 'Copiar JSON'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportJson}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
            <Button size="sm" variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-1" />
                Importar
              </span>
            </Button>
          </label>
          <Button size="sm" onClick={handleSaveWorkflow} disabled={saveWorkflow.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {saveWorkflow.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit mx-2 mt-2">
          <TabsTrigger value="editor">
            <Workflow className="h-4 w-4 mr-1" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <FolderOpen className="h-4 w-4 mr-1" />
            Meus Workflows
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Key className="h-4 w-4 mr-1" />
            Credenciais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 m-0 mt-2">
          <div className="flex h-full">
            {/* Node Library */}
            <div className="w-56 flex-shrink-0">
              <NodeLibrary nodeTypes={nodeTypes} onDragStart={() => {}} />
            </div>

            {/* Canvas */}
            <EditorCanvas
              nodes={nodesWithCallbacks}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="flex-1 m-0 p-4">
          <ScrollArea className="h-full">
            <div className="grid gap-3">
              {workflows.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Workflow className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum workflow salvo
                    </p>
                  </CardContent>
                </Card>
              ) : (
                workflows.map((wf) => (
                  <Card key={wf.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div onClick={() => handleLoadWorkflow(wf)}>
                          <CardTitle className="text-sm">{wf.nome}</CardTitle>
                          <CardDescription className="text-xs">
                            {wf.flow_data.nodes?.length || 0} nós • Atualizado em{' '}
                            {new Date(wf.updated_at).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={wf.ativo ? 'default' : 'secondary'}>
                            {wf.ativo ? 'Ativo' : 'Rascunho'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkflow(wf.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="credentials" className="flex-1 m-0">
          <CredentialsManager
            credentialTypes={credentialTypes}
            credentials={credentials}
            estabelecimentoId={estabelecimentoId}
          />
        </TabsContent>
      </Tabs>

      {/* Node Config Panel */}
      <NodeConfigPanel
        node={selectedNode}
        credentials={credentials}
        onClose={() => setSelectedNode(null)}
        onSave={handleNodeUpdate}
        onDelete={handleDeleteNode}
      />
    </div>
  );
};

export default N8nWorkflowEditor;
