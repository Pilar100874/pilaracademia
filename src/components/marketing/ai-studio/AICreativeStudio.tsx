import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Panel,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Play, Trash2, Clapperboard, Film, Image, Music, Mic, Type, Wand2, Sparkles, Video, ChevronRight, Settings2, SkipForward, Bot, Maximize, Minimize, Copy, Pause, PlayCircle, Save, Plus, X, ArrowLeft, Images, Square, FolderPlus, Folder, FolderOpen, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StudioNode, StudioEdge, StudioNodeData, NODE_CATEGORIES, getNodeMeta } from './types';
import StudioNodeComponent from './StudioNodeComponent';
import StudioCustomEdge from './StudioCustomEdge';
import StudioNodeLibrary from './StudioNodeLibrary';
import StudioNodeConfigPanel from './StudioNodeConfigPanel';
import { useStudioExecution } from './useStudioExecution';
import PresetsGallery, { Preset } from './PresetsGallery';
import AISettingsPanel, { getStudioDefaults } from './AISettingsPanel';
import CreativeAgentPanel, { StoryboardScene } from './CreativeAgentPanel';

import ExecutionLogPanel from './ExecutionLogPanel';
import StudioGalleryManager from './StudioGalleryManager';
import { nodeResultStore } from './useNodeResults';
import BatchReviewDialog from './BatchReviewDialog';
import { WorkflowCard, WorkflowCardGrid } from '@/components/ui/workflow-card';
import { format } from 'date-fns';

interface SavedWorkflow {
  id: string;
  nome: string;
  descricao: string | null;
  nodes_data: any;
  edges_data: any;
  created_at: string;
  updated_at: string;
  pasta: string | null;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

const nodeTypes = {
  studioNode: StudioNodeComponent,
};

const edgeTypes = {
  studioEdge: StudioCustomEdge,
};

const initialNodes: StudioNode[] = [];
const initialEdges: StudioEdge[] = [];

const EDGE_STYLE = { stroke: 'hsl(var(--primary) / 0.5)', strokeWidth: 1.5, cursor: 'pointer' };

const QUICK_TOOLS = [
  { id: 'text-to-video', icon: Video, label: 'Texto p/ Vídeo', desc: 'Gere vídeos a partir de prompts', nodeType: 'videoGen' as const },
  { id: 'image-to-video', icon: Film, label: 'Imagem p/ Vídeo', desc: 'Anime imagens em vídeos', nodeType: 'videoGen' as const },
  { id: 'image-gen', icon: Image, label: 'Gerar Imagem', desc: 'Crie imagens com IA', nodeType: 'imageGen' as const },
  { id: 'music-gen', icon: Music, label: 'Criar Música', desc: 'Compose músicas originais', nodeType: 'musicGen' as const },
  { id: 'audio-gen', icon: Mic, label: 'Gerar Áudio', desc: 'Narração e efeitos sonoros', nodeType: 'audioGen' as const },
  { id: 'text-gen', icon: Type, label: 'Texto com IA', desc: 'Processar com LLM', nodeType: 'llmProcess' as const },
  { id: 'edit-image', icon: Wand2, label: 'Editar Imagem', desc: 'Edite com instruções', nodeType: 'imageEdit' as const },
  { id: 'lip-sync', icon: Sparkles, label: 'Lip Sync', desc: 'Sincronismo labial', nodeType: 'lipSync' as const },
];

const AICreativeStudioInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<StudioNode | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [presetInitialSelections, setPresetInitialSelections] = useState<Record<string, string[]> | undefined>(undefined);
  const [reloadingPresetNodeId, setReloadingPresetNodeId] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  
  const [showCreativeAgent, setShowCreativeAgent] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<Preset | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const { screenToFlowPosition } = useReactFlow();
  const { executeWorkflow, isExecuting, executionLog, currentNodeId, clearLog, cancelExecution, batchReviewResults, setBatchReviewResults } = useStudioExecution();

  // Listen for reopen batch review event from loopOutput node
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.length > 0) setBatchReviewResults(e.detail);
    };
    window.addEventListener('studio-reopen-batch', handler as EventListener);
    return () => window.removeEventListener('studio-reopen-batch', handler as EventListener);
  }, [setBatchReviewResults]);

  // Listen for reload preset event from textInput node config panel
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { selections, nodeId } = e.detail || {};
      if (selections) {
        setPresetInitialSelections(selections);
        setReloadingPresetNodeId(nodeId || null);
        setShowPresets(true);
      }
    };
    window.addEventListener('studio-reload-preset', handler as EventListener);
    return () => window.removeEventListener('studio-reload-preset', handler as EventListener);
  }, []);

  // Workflow management state
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState('');
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ id: string; nome: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveToFolderWorkflow, setMoveToFolderWorkflow] = useState<SavedWorkflow | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [isCreatingFolderInline, setIsCreatingFolderInline] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [draggingWorkflowId, setDraggingWorkflowId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [manualFolders, setManualFolders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`studio_folders_${localStorage.getItem('estabelecimentoId') || ''}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  // Helper to apply saved negative prompt defaults to node configs
  const applyNegativeDefaults = useCallback((nodeType: string, config: Record<string, any>): Record<string, any> => {
    const defaults = getStudioDefaults(estabelecimentoId);
    const imageTypes = ['imageGen', 'imageEdit', 'productComposite'];
    const videoTypes = ['videoGen'];
    if (imageTypes.includes(nodeType)) {
      return { ...config, negativePrompt: config.negativePrompt || defaults.imageNegativePrompt };
    }
    if (videoTypes.includes(nodeType)) {
      return { ...config, videoNegativePrompt: config.videoNegativePrompt || defaults.videoNegativePrompt };
    }
    return config;
  }, [estabelecimentoId]);

  // Fetch saved workflows on mount and when returning to landing
  const fetchWorkflows = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoadingWorkflows(true);
    const { data, error } = await supabase
      .from('ai_studio_workflows')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('updated_at', { ascending: false });
    if (!error) setSavedWorkflows((data as SavedWorkflow[]) || []);
    setLoadingWorkflows(false);
  }, [estabelecimentoId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: EDGE_STYLE, type: 'studioEdge' }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/studioNodeType');
    if (!type) return;
    const meta = getNodeMeta(type as any);
    if (!meta) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: StudioNode = {
      id: `${type}_${Date.now()}`,
      type: 'studioNode',
      position,
      data: { label: meta.label, type: type as any, config: applyNegativeDefaults(type, { ...meta.defaultConfig }) },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node as StudioNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    setSelectedNode(node as StudioNode);
  }, []);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const nd = node.data as StudioNodeData;
    const newNode: StudioNode = {
      id: `${nd.type}_${Date.now()}`,
      type: 'studioNode',
      position: { x: (node.position?.x ?? 0) + 50, y: (node.position?.y ?? 0) + 80 },
      data: { ...nd, config: { ...nd.config }, result: undefined, error: undefined, isProcessing: false },
    };
    setNodes((nds) => [...nds, newNode as any]);
    setContextMenu(null);
    toast.success('Bloco duplicado!');
  }, [nodes, setNodes]);

  const togglePauseNode = useCallback((nodeId: string) => {
    // Get all downstream node IDs (descendants)
    const getDescendants = (startId: string, edgeList: StudioEdge[]): Set<string> => {
      const descendants = new Set<string>();
      const queue = [startId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        edgeList.filter(e => e.source === current).forEach(e => {
          if (!descendants.has(e.target)) {
            descendants.add(e.target);
            queue.push(e.target);
          }
        });
      }
      return descendants;
    };

    setNodes((nds) => {
      const targetNode = nds.find(n => n.id === nodeId);
      if (!targetNode) return nds;
      const targetData = targetNode.data as StudioNodeData;
      const newPaused = !targetData.config?._paused;

      // Also affect all descendants (pause or unpause together)
      const affectedIds = new Set<string>([nodeId]);
      const descendants = getDescendants(nodeId, edges);
      descendants.forEach(id => affectedIds.add(id));

      return nds.map((n) => {
        if (affectedIds.has(n.id)) {
          const d = n.data as StudioNodeData;
          return { ...n, data: { ...d, config: { ...d.config, _paused: newPaused } } };
        }
        return n;
      });
    });
    setContextMenu(null);
    toast.info('Estado do bloco alterado');
  }, [setNodes]);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        const d = n.data as StudioNodeData;
        return { ...n, data: { ...d, config: { ...d.config, ...config } } };
      }
      return n;
    }));
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, config: { ...prev.data.config, ...config } } } : null);
    }
  }, [setNodes, selectedNode]);

  // Listen for inline config updates from nodes
  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId, config } = (e as CustomEvent).detail;
      updateNodeConfig(nodeId, config);
    };
    window.addEventListener('studio-node-config-update', handler);
    return () => window.removeEventListener('studio-node-config-update', handler);
  }, [updateNodeConfig]);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const handleExecute = useCallback(async (startFromNodeId?: string) => {
    // Validate blocks before execution
    const GALLERY_TYPES = ['galleryInfluencer', 'galleryAmbiente', 'galleryEstilo', 'galleryPaleta', 'galleryTextura', 'galleryLogo', 'galleryPose', 'galleryRoupa', 'gallerySalvas'];
    const missingBlocks: string[] = [];
    for (const n of nodes) {
      const nd = n.data as StudioNodeData;
      if (nd.config?._paused) continue;
      if (GALLERY_TYPES.includes(nd.type) && !nd.config?.selectedImageUrl) {
        missingBlocks.push(nd.label || nd.type);
      }
      if (nd.type === 'productImageSelect' && !nd.config?.selectedImageUrl) {
        missingBlocks.push(nd.label || 'Produto');
      }
      if (nd.type === 'imageInput' && (!nd.config?.images || nd.config.images.length === 0) && !nd.config?.selectedImageUrl) {
        missingBlocks.push(nd.label || 'Imagem de Referência');
      }
    }
    if (missingBlocks.length > 0) {
      toast.error(`Blocos sem conteúdo selecionado: ${missingBlocks.join(', ')}. Selecione uma imagem em cada bloco antes de executar.`);
      return;
    }

    // ── Validate AI model providers are active ──────────────────────────
    try {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (estabId) {
        const { data: activeKeys } = await supabase
          .from('ai_api_keys')
          .select('provider, is_active')
          .eq('estabelecimento_id', estabId)
          .eq('is_active', true);

        const LOVABLE_PREFIXES = ['google/', 'openai/', 'free/'];
        const isLovableModel = (m: string) => LOVABLE_PREFIXES.some(p => m.startsWith(p));
        const UNIFIED_PREFIXES = ['apiframe/', 'aimlapi/', 'polloai/'];
        const normalizeP = (p: string) => {
          const c = p.toLowerCase().trim().replace(/[\s._-]/g, '');
          if (c === 'apiframe' || c === 'apiframeai') return 'apiframe';
          if (c === 'aimlapi' || c === 'aiml') return 'aimlapi';
          if (c === 'polloai' || c === 'pollo') return 'polloai';
          return c;
        };
        const activeProviders = (activeKeys || []).map(k => normalizeP(k.provider));

        const MODEL_TYPES_WITH_PROVIDER = ['imageGen', 'imageEdit', 'imageAnalysis', 'imageComposite', 'videoGen', 'textGen', 'audioGen', 'musicGen'];
        const inactiveModelNodes: string[] = [];

        for (const n of nodes) {
          const nd = n.data as StudioNodeData;
          if (nd.config?._paused) continue;
          if (!MODEL_TYPES_WITH_PROVIDER.includes(nd.type)) continue;

          const modelValue = nd.type === 'videoGen'
            ? (nd.config?.videoModel || 'free/gif-animated')
            : (nd.config?.model || '');

          if (!modelValue || modelValue === 'auto') continue;
          if (isLovableModel(modelValue)) continue;

          // Check unified prefixes
          const unifiedPrefix = UNIFIED_PREFIXES.find(p => modelValue.startsWith(p));
          if (unifiedPrefix) {
            const providerName = normalizeP(unifiedPrefix.replace('/', ''));
            if (!activeProviders.includes(providerName)) {
              inactiveModelNodes.push(`${nd.label || nd.type} (${modelValue})`);
            }
            continue;
          }

          // Check by model prefix
          const prefix = normalizeP(modelValue.split('/')[0] || '');
          if (prefix && !activeProviders.includes(prefix)) {
            inactiveModelNodes.push(`${nd.label || nd.type} (${modelValue})`);
          }
        }

        if (inactiveModelNodes.length > 0) {
          toast.error(
            `Modelos inativos ou sem chave de API configurada: ${inactiveModelNodes.join(', ')}. Vá em Config APIs para ativar os provedores necessários, ou altere o modelo nos blocos.`,
            { duration: 8000 }
          );
          return;
        }
      }
    } catch (e) {
      console.warn('[Studio] Error validating model providers:', e);
      // Don't block execution on validation error
    }

    try {
      const updatedNodes = await executeWorkflow(
        nodes as StudioNode[],
        edges,
        startFromNodeId,
        (realtimeNodes) => {
          setNodes(() => realtimeNodes.map(n => ({ ...n, data: { ...n.data } })) as any);
        }
      );
      setNodes(() => updatedNodes.map(n => ({ ...n, data: { ...n.data } })) as any);
      toast.success(startFromNodeId ? 'Execução parcial concluída!' : 'Workflow executado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar workflow');
    }
  }, [nodes, edges, executeWorkflow, setNodes]);

  const handleExecuteFromNode = useCallback(() => {
    if (selectedNode) {
      handleExecute(selectedNode.id);
    }
  }, [selectedNode, handleExecute]);

  const handleStoryboardToWorkflow = useCallback((scenes: StoryboardScene[]) => {
    const newNodes: StudioNode[] = [];
    const newEdges: StudioEdge[] = [];
    let x = 100;
    const yBase = 150;

    scenes.forEach((scene, i) => {
      const promptId = `prompt_${Date.now()}_${i}`;
      newNodes.push({
        id: promptId,
        type: 'studioNode',
        position: { x, y: yBase },
        data: {
          label: `📝 ${scene.title}`,
          type: 'textInput',
          config: { text: `${scene.description}\n\nNarração: ${scene.narration}\nCâmera: ${scene.cameraMovement}\nMood: ${scene.mood}` },
        },
      });

      if (scene.mediaType !== 'none') {
        const mediaId = `media_${Date.now()}_${i}`;
        const mediaType = scene.mediaType === 'video' ? 'videoGen' : 'imageGen';
        const meta = getNodeMeta(mediaType);
        newNodes.push({
          id: mediaId,
          type: 'studioNode',
          position: { x: x + 380, y: yBase - 60 },
          data: {
            label: scene.mediaType === 'video' ? `🎬 Vídeo: ${scene.title}` : `🖼️ Imagem: ${scene.title}`,
            type: mediaType,
            config: applyNegativeDefaults(mediaType, { ...meta?.defaultConfig, ...(scene.mediaType === 'video' ? { duration: scene.duration } : {}) }),
          },
        });
        newEdges.push({ id: `e_${promptId}_${mediaId}`, source: promptId, target: mediaId, animated: true, style: EDGE_STYLE, type: 'studioEdge' });
      }

      if (scene.audioType !== 'none') {
        const audioId = `audio_${Date.now()}_${i}`;
        const audioType = scene.audioType === 'music' ? 'musicGen' : 'audioGen';
        const meta = getNodeMeta(audioType);
        newNodes.push({
          id: audioId,
          type: 'studioNode',
          position: { x: x + 380, y: yBase + 80 },
          data: {
            label: scene.audioType === 'music' ? `🎵 Música: ${scene.title}` :
                   scene.audioType === 'narration' ? `🎙️ Narração: ${scene.title}` :
                   `🔊 SFX: ${scene.title}`,
            type: audioType,
            config: { ...meta?.defaultConfig, duration: scene.duration, ...(scene.audioType === 'narration' ? { type: 'narration' } : {}), ...(scene.audioType === 'sfx' ? { type: 'sfx' } : {}) },
          },
        });
        newEdges.push({ id: `e_${promptId}_${audioId}`, source: promptId, target: audioId, animated: true, style: EDGE_STYLE, type: 'studioEdge' });
      }

      x += 750;
    });

    const outputId = `output_${Date.now()}`;
    newNodes.push({
      id: outputId,
      type: 'studioNode',
      position: { x, y: yBase },
      data: { label: 'Resultado Final', type: 'output', config: { format: 'auto' } },
    });

    setNodes(newNodes as any);
    setEdges(newEdges as any);
    setShowCreativeAgent(false);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName('');
    setShowCanvas(true);
  }, [setNodes, setEdges]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    nodeResultStore.clearAll();
  }, [setNodes, setEdges]);

  // --- Workflow CRUD ---

  const getCleanNodes = useCallback(() => {
    return (nodes as StudioNode[]).map(n => {
      const d = n.data as StudioNodeData;
      return {
        ...n,
        data: { label: d.label, type: d.type, config: d.config },
      };
    });
  }, [nodes]);

  const handleSaveWorkflow = useCallback(async () => {
    if (!currentWorkflowId) {
      // No current workflow — show new dialog
      setShowNewDialog(true);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('ai_studio_workflows')
      .update({
        nodes_data: getCleanNodes() as any,
        edges_data: edges as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentWorkflowId);
    if (error) {
      toast.error('Erro ao salvar workflow');
    } else {
      toast.success('Workflow salvo!');
      setHasUnsavedChanges(false);
      fetchWorkflows();
    }
    setSaving(false);
  }, [currentWorkflowId, getCleanNodes, edges, fetchWorkflows]);

  const handleCreateWorkflow = useCallback(async () => {
    if (!newName.trim()) {
      toast.error('Digite um nome para o workflow');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('ai_studio_workflows')
      .insert([{
        estabelecimento_id: estabelecimentoId,
        nome: newName.trim(),
        descricao: newDesc.trim() || null,
        nodes_data: getCleanNodes() as any,
        edges_data: edges as any,
      }])
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar workflow');
    } else {
      toast.success('Workflow criado e salvo!');
      setCurrentWorkflowId(data.id);
      setCurrentWorkflowName(data.nome);
      setShowNewDialog(false);
      setNewName('');
      setNewDesc('');
      setHasUnsavedChanges(false);
      fetchWorkflows();
    }
    setSaving(false);
  }, [newName, newDesc, estabelecimentoId, getCleanNodes, edges, fetchWorkflows]);

  const handleOpenWorkflow = useCallback((workflow: SavedWorkflow) => {
    nodeResultStore.clearAll();
    setNodes((workflow.nodes_data as StudioNode[]) as any);
    setEdges((workflow.edges_data as StudioEdge[]) as any);
    setSelectedNode(null);
    setCurrentWorkflowId(workflow.id);
    setCurrentWorkflowName(workflow.nome);
    setShowCanvas(true);
    setHasUnsavedChanges(false);
  }, [setNodes, setEdges]);

  const handleDeleteWorkflow = useCallback(async (id: string, nome: string) => {
    const { error } = await supabase
      .from('ai_studio_workflows')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao excluir workflow');
    } else {
      toast.success(`"${nome}" excluído`);
      fetchWorkflows();
    }
    setDeleteConfirm(null);
  }, [fetchWorkflows]);

  const handleRenameWorkflow = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from('ai_studio_workflows')
      .update({ nome: newName.trim() })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao renomear workflow');
    } else {
      toast.success('Workflow renomeado');
      fetchWorkflows();
    }
    setRenameDialog(null);
  }, [fetchWorkflows]);

  const handleDuplicateWorkflow = useCallback(async (w: SavedWorkflow) => {
    const { error } = await supabase
      .from('ai_studio_workflows')
      .insert({
        nome: `${w.nome} (Cópia)`,
        descricao: w.descricao,
        nodes_data: w.nodes_data,
        edges_data: w.edges_data,
        estabelecimento_id: estabelecimentoId,
      });
    if (error) {
      toast.error('Erro ao duplicar workflow');
    } else {
      toast.success('Workflow duplicado');
      fetchWorkflows();
    }
  }, [fetchWorkflows, estabelecimentoId]);

  // Helper: detect media types from workflow nodes
  const getWorkflowMediaTypes = useCallback((nodesData: any): ('image' | 'video')[] => {
    if (!Array.isArray(nodesData)) return [];
    const types = new Set<'image' | 'video'>();
    for (const node of nodesData) {
      const nodeType = node?.data?.type || node?.type || '';
      if (['imageGen', 'imageEdit', 'productComposite'].includes(nodeType)) types.add('image');
      if (nodeType === 'videoGen') types.add('video');
    }
    return Array.from(types);
  }, []);

  // Get unique folders from workflows + manually created ones
  const folders = Array.from(new Set([
    ...savedWorkflows.map(w => w.pasta).filter(Boolean),
    ...manualFolders
  ])) as string[];

  const saveManualFolders = useCallback((newFolders: string[]) => {
    setManualFolders(newFolders);
    localStorage.setItem(`studio_folders_${estabelecimentoId}`, JSON.stringify(newFolders));
  }, [estabelecimentoId]);

  // Filtered workflows based on active folder
  const filteredWorkflows = activeFolder
    ? savedWorkflows.filter(w => w.pasta === activeFolder)
    : savedWorkflows.filter(w => !w.pasta);

  const handleMoveToFolder = useCallback(async (workflowId: string, folder: string | null) => {
    const { error } = await supabase
      .from('ai_studio_workflows')
      .update({ pasta: folder } as any)
      .eq('id', workflowId);
    if (error) {
      toast.error('Erro ao mover workflow');
    } else {
      toast.success(folder ? `Movido para "${folder}"` : 'Removido da pasta');
      fetchWorkflows();
    }
    setShowMoveDialog(false);
    setMoveToFolderWorkflow(null);
  }, [fetchWorkflows]);

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    // Folder is created implicitly by assigning a workflow to it
    // But we can pre-create by moving current moveToFolderWorkflow
    if (moveToFolderWorkflow) {
      handleMoveToFolder(moveToFolderWorkflow.id, newFolderName.trim());
    }
    setShowFolderDialog(false);
    setNewFolderName('');
  }, [newFolderName, moveToFolderWorkflow, handleMoveToFolder]);

  const handleCreateStandaloneFolder = useCallback(() => {
    const folderName = createFolderName.trim();
    if (!folderName) return;

    if (folders.includes(folderName)) {
      toast.error('Pasta já existe');
      setActiveFolder(folderName);
    } else {
      saveManualFolders([...manualFolders, folderName]);
      setActiveFolder(folderName);
      toast.success(`Pasta "${folderName}" criada!`);
    }

    setIsCreatingFolderInline(false);
    setShowCreateFolderDialog(false);
    setCreateFolderName('');
  }, [createFolderName, folders, manualFolders, saveManualFolders]);

  const handleFolderDrop = useCallback(async (folder: string | null) => {
    if (!draggingWorkflowId) return;
    setDragOverFolder(null);
    await handleMoveToFolder(draggingWorkflowId, folder);
    setDraggingWorkflowId(null);
  }, [draggingWorkflowId, handleMoveToFolder]);

  const handleDeleteFolder = useCallback(async (folder: string) => {
    const workflowsInFolder = savedWorkflows.filter(w => w.pasta === folder);
    for (const w of workflowsInFolder) {
      await supabase
        .from('ai_studio_workflows')
        .update({ pasta: null } as any)
        .eq('id', w.id);
    }
    // Also remove from manual folders
    saveManualFolders(manualFolders.filter(f => f !== folder));
    toast.success(`Pasta "${folder}" excluída. Workflows movidos para raiz.`);
    setDeleteFolderConfirm(null);
    if (activeFolder === folder) setActiveFolder(null);
    fetchWorkflows();
  }, [savedWorkflows, activeFolder, fetchWorkflows, manualFolders, saveManualFolders]);


  const handleCloseCanvas = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
      return;
    }
    clearAll();
    setShowCanvas(false);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName('');
    setHasUnsavedChanges(false);
    fetchWorkflows();
  }, [clearAll, fetchWorkflows, hasUnsavedChanges]);

  const handleForceClose = useCallback(() => {
    setShowCloseConfirm(false);
    clearAll();
    setShowCanvas(false);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName('');
    setHasUnsavedChanges(false);
    fetchWorkflows();
  }, [clearAll, fetchWorkflows]);

  const handleSaveAndClose = useCallback(async () => {
    setShowCloseConfirm(false);
    await handleSaveWorkflow();
    clearAll();
    setShowCanvas(false);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName('');
    setHasUnsavedChanges(false);
    fetchWorkflows();
  }, [handleSaveWorkflow, clearAll, fetchWorkflows]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    // If reloading an existing preset node, just update its config in-place
    if (reloadingPresetNodeId) {
      const newRefBlocks = preset.referenceBlocks || [];

      const BLOCK_META: Record<string, { labelPrefix: string; type: string }> = {
        'productImageSelect': { labelPrefix: '📦 Produto', type: 'productImageSelect' },
        'galleryInfluencer': { labelPrefix: '👤 Influencer', type: 'galleryInfluencer' },
        'galleryLogo': { labelPrefix: '🏷️ Logo', type: 'galleryLogo' },
        'galleryRoupa': { labelPrefix: '👗 Roupa', type: 'galleryRoupa' },
        'galleryPose': { labelPrefix: '🤸 Pose', type: 'galleryPose' },
        'galleryAmbiente': { labelPrefix: '🏔️ Ambiente', type: 'galleryAmbiente' },
        'galleryEstilo': { labelPrefix: '🎨 Estilo', type: 'galleryEstilo' },
        'galleryTextura': { labelPrefix: '🧱 Textura', type: 'galleryTextura' },
        'galleryPaleta': { labelPrefix: '🎨 Paleta', type: 'galleryPaleta' },
        'imageInput': { labelPrefix: '🖼️ Referência', type: 'imageInput' },
      };

      // Find the process node connected to this textInput (use ref for fresh state)
      const currentEdges = edgesRef.current;
      const currentNodes = nodesRef.current;
      const connectedEdge = currentEdges.find(e => e.source === reloadingPresetNodeId);
      const processNodeId = connectedEdge?.target;

      setNodes((nds) => {
        // Get existing ref block types connected to the same process node
        const existingRefNodeIds = new Set<string>();
        const existingRefTypes = new Set<string>();
        if (processNodeId) {
          const refEdges = currentEdges.filter(e => e.target === processNodeId && e.source !== reloadingPresetNodeId);
          for (const re of refEdges) {
            const refNode = nds.find(n => n.id === re.source);
            if (refNode) {
              const nodeType = (refNode.data as any).type;
              if (BLOCK_META[nodeType]) {
                existingRefNodeIds.add(refNode.id);
                existingRefTypes.add(nodeType);
              }
            }
          }
        }

        // Remove ref blocks that are no longer selected
        const blocksToRemove = new Set<string>();
        for (const nodeId of existingRefNodeIds) {
          const node = nds.find(n => n.id === nodeId);
          if (node) {
            const nodeType = (node.data as any).type;
            if (!newRefBlocks.includes(nodeType)) {
              blocksToRemove.add(nodeId);
            }
          }
        }

        // Blocks to add (not already present)
        const blocksToAdd = newRefBlocks.filter(bt => !existingRefTypes.has(bt));

        let updatedNodes = nds
          .filter(n => !blocksToRemove.has(n.id))
          .map(n => {
            if (n.id === reloadingPresetNodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  label: `Preset: ${preset.name}`,
                  config: {
                    ...(n.data as any).config,
                    text: preset.prompt,
                    presetLayerSelections: preset.layerSelections,
                    presetName: preset.name,
                  },
                },
              };
            }
            // Also update the connected process node's type and config if toolType changed
            if (processNodeId && n.id === processNodeId) {
              const newTargetType = (preset.toolType || 'videoGen') as StudioNodeData['type'];
              const currentType = (n.data as any).type;
              if (currentType !== newTargetType) {
                const newMeta = getNodeMeta(newTargetType);
                const newDefaultConfig: Record<string, any> = newMeta?.defaultConfig ? { ...newMeta.defaultConfig } : {};
                if (newTargetType === 'videoGen') {
                  newDefaultConfig.duration = preset.duration || newDefaultConfig.duration || 5;
                  newDefaultConfig.resolution = newDefaultConfig.resolution || '1080p';
                  newDefaultConfig.aspectRatio = newDefaultConfig.aspectRatio || '16:9';
                  newDefaultConfig.videoModel = preset.videoModel || newDefaultConfig.videoModel || 'openai/sora-2';
                }
                if (newTargetType === 'imageGen') {
                  newDefaultConfig.imageModel = preset.imageModel || newDefaultConfig.imageModel;
                }
                return {
                  ...n,
                  data: {
                    ...n.data,
                    label: newMeta?.label || n.data.label,
                    type: newTargetType,
                    config: applyNegativeDefaults(newTargetType, newDefaultConfig),
                  },
                };
              }
              // Same type but update specific config (like videoModel, duration)
              const updatedConfig = { ...(n.data as any).config };
              if (newTargetType === 'videoGen') {
                if (preset.videoModel) updatedConfig.videoModel = preset.videoModel;
                if (preset.duration) updatedConfig.duration = preset.duration;
              }
              if (newTargetType === 'imageGen' && preset.imageModel) {
                updatedConfig.imageModel = preset.imageModel;
              }
              return {
                ...n,
                data: { ...n.data, config: updatedConfig },
              };
            }
            return n;
          });

        // Add new ref blocks
        const ts = Date.now();
        const addedNodes: StudioNode[] = [];
        blocksToAdd.forEach((blockType, idx) => {
          const bm = BLOCK_META[blockType];
          if (!bm) return;
          const nodeMeta = getNodeMeta(bm.type as any);
          const refNode: StudioNode = {
            id: `${bm.type}_${ts}_${idx}`,
            type: 'studioNode',
            position: { x: 100, y: 400 + (existingRefNodeIds.size + idx) * 200 },
            data: { label: bm.labelPrefix, type: bm.type as any, config: nodeMeta?.defaultConfig ? { ...nodeMeta.defaultConfig } : {} },
          };
          addedNodes.push(refNode);
        });

        return [...updatedNodes, ...addedNodes];
      });

      // Update edges: remove edges from removed blocks, add edges for new blocks
      setEdges((eds) => {
        const existingRefNodeIds = new Set<string>();
        if (processNodeId) {
          const refEdges = eds.filter(e => e.target === processNodeId && e.source !== reloadingPresetNodeId);
          for (const re of refEdges) {
            const refNode = currentNodes.find(n => n.id === re.source);
            if (refNode) {
              const nodeType = (refNode.data as any).type;
              if (BLOCK_META[nodeType] && !newRefBlocks.includes(nodeType)) {
                existingRefNodeIds.add(refNode.id);
              }
            }
          }
        }

        let updatedEdges = eds.filter(e => !existingRefNodeIds.has(e.source));

        // Add edges for new blocks
        const ts = Date.now();
        const blocksToAdd = newRefBlocks.filter(bt => {
          if (!processNodeId) return false;
          const refEdges = eds.filter(e => e.target === processNodeId && e.source !== reloadingPresetNodeId);
          return !refEdges.some(re => {
            const refNode = currentNodes.find(n => n.id === re.source);
            return refNode && (refNode.data as any).type === bt;
          });
        });

        blocksToAdd.forEach((blockType, idx) => {
          const bm = BLOCK_META[blockType];
          if (!bm || !processNodeId) return;
          const newNodeId = `${bm.type}_${ts}_${idx}`;
          updatedEdges.push({
            id: `e_${newNodeId}_${processNodeId}`,
            source: newNodeId,
            target: processNodeId,
            animated: true,
            style: EDGE_STYLE,
            type: 'studioEdge',
          } as any);
        });

        return updatedEdges;
      });

      setReloadingPresetNodeId(null);
      setPresetInitialSelections(undefined);
      setShowPresets(false);
      setHasUnsavedChanges(true);
      toast.success(`Preset "${preset.name}" atualizado no workflow!`);
      return;
    }

    const targetType = (preset.toolType || 'videoGen') as StudioNodeData['type'];
    const meta = getNodeMeta(targetType);
    const ts = Date.now();

    const defaultConfig: Record<string, any> = meta?.defaultConfig ? { ...meta.defaultConfig } : {};
    if (targetType === 'videoGen') {
      defaultConfig.duration = preset.duration || defaultConfig.duration || 5;
      defaultConfig.resolution = defaultConfig.resolution || '1080p';
      defaultConfig.aspectRatio = defaultConfig.aspectRatio || '16:9';
      defaultConfig.videoModel = preset.videoModel || defaultConfig.videoModel || 'openai/sora-2';
    }
    if (targetType === 'imageGen') {
      defaultConfig.imageModel = preset.imageModel || defaultConfig.imageModel;
    }
    if (targetType === 'productComposite') {
      const modeMap: Record<string, string> = {
        'clothing-tryon': 'clothing',
        'accessory-tryon': 'wearing',
        'product-in-hand': 'holding',
        'scene-placement': 'scene',
      };
      const matchedMode = Object.entries(modeMap).find(([key]) => preset.id.includes(key));
      if (matchedMode) defaultConfig.compositeMode = matchedMode[1];
      defaultConfig.prompt = preset.prompt;
    }

    // Apply saved negative prompt defaults
    const finalConfig = applyNegativeDefaults(targetType, defaultConfig);

    const newNodes: StudioNode[] = [];
    const newEdges: any[] = [];

    if (targetType === 'productComposite') {
      const personNode: StudioNode = {
        id: `imageInput_person_${ts}`,
        type: 'studioNode',
        position: { x: 50, y: 100 },
        data: { label: '📷 Foto da Pessoa', type: 'imageInput', config: {} },
      };
      const productNode: StudioNode = {
        id: `imageInput_product_${ts}`,
        type: 'studioNode',
        position: { x: 50, y: 350 },
        data: { label: '🛍️ Foto do Produto', type: 'imageInput', config: {} },
      };
      const promptNode: StudioNode = {
        id: `textInput_${ts}`,
        type: 'studioNode',
        position: { x: 50, y: 550 },
        data: { label: `Preset: ${preset.name}`, type: 'textInput', config: { text: preset.prompt } },
      };
      const compositeNode: StudioNode = {
        id: `productComposite_${ts}`,
        type: 'studioNode',
        position: { x: 500, y: 250 },
        data: { label: meta?.label || 'Produto em Pessoa', type: 'productComposite', config: finalConfig },
      };
      newNodes.push(personNode, productNode, promptNode, compositeNode);
      newEdges.push(
        { id: `e_${personNode.id}_${compositeNode.id}`, source: personNode.id, target: compositeNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
        { id: `e_${productNode.id}_${compositeNode.id}`, source: productNode.id, target: compositeNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
        { id: `e_${promptNode.id}_${compositeNode.id}`, source: promptNode.id, target: compositeNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
      );
    } else if (preset.variationPrompts && preset.variationPrompts.length > 0) {
      // Create 5 parallel chains — one for each variation
      const variationCount = preset.variationPrompts.length;
      const rowHeight = 300;
      const startY = 50;

      preset.variationPrompts.forEach((varPrompt, vIdx) => {
        const yPos = startY + vIdx * rowHeight;
        const inputNode: StudioNode = {
          id: `textInput_v${vIdx}_${ts}`,
          type: 'studioNode',
          position: { x: 100, y: yPos },
          data: { label: `Variação ${vIdx + 1}`, type: 'textInput', config: { text: varPrompt, presetLayerSelections: preset.layerSelections, presetName: `${preset.name} — V${vIdx + 1}` } },
        };
        const processNode: StudioNode = {
          id: `${targetType}_v${vIdx}_${ts}`,
          type: 'studioNode',
          position: { x: 600, y: yPos },
          data: { label: `${meta?.label || preset.name} V${vIdx + 1}`, type: targetType, config: { ...finalConfig } },
        };
        newNodes.push(inputNode, processNode);
        newEdges.push(
          { id: `e_${inputNode.id}_${processNode.id}`, source: inputNode.id, target: processNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
        );

        // Add reference blocks for each variation
        if (targetType === 'imageGen' || targetType === 'videoGen') {
          const refBlocks = preset.referenceBlocks || [];
          const blockMeta: Record<string, { labelPrefix: string; type: string }> = {
            'productImageSelect': { labelPrefix: '📦 Produto', type: 'productImageSelect' },
            'galleryInfluencer': { labelPrefix: '👤 Influencer', type: 'galleryInfluencer' },
            'galleryLogo': { labelPrefix: '🏷️ Logo', type: 'galleryLogo' },
            'galleryRoupa': { labelPrefix: '👗 Roupa', type: 'galleryRoupa' },
            'galleryPose': { labelPrefix: '🤸 Pose', type: 'galleryPose' },
            'galleryAmbiente': { labelPrefix: '🏔️ Ambiente', type: 'galleryAmbiente' },
            'galleryEstilo': { labelPrefix: '🎨 Estilo', type: 'galleryEstilo' },
            'galleryTextura': { labelPrefix: '🧱 Textura', type: 'galleryTextura' },
            'galleryPaleta': { labelPrefix: '🎨 Paleta', type: 'galleryPaleta' },
            'imageInput': { labelPrefix: '🖼️ Referência', type: 'imageInput' },
          };
          refBlocks.forEach((blockType, idx) => {
            const bm = blockMeta[blockType];
            if (!bm) return;
            const nodeMeta = getNodeMeta(bm.type as any);
            const refNode: StudioNode = {
              id: `${bm.type}_v${vIdx}_${ts}_${idx}`,
              type: 'studioNode',
              position: { x: 100, y: yPos + 120 + idx * 100 },
              data: { label: bm.labelPrefix, type: bm.type as any, config: nodeMeta?.defaultConfig ? { ...nodeMeta.defaultConfig } : {} },
            };
            newNodes.push(refNode);
            newEdges.push(
              { id: `e_${refNode.id}_${processNode.id}`, source: refNode.id, target: processNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
            );
          });
        }
      });
    } else {
      const inputNode: StudioNode = {
        id: `textInput_${ts}`,
        type: 'studioNode',
        position: { x: 100, y: 200 },
        data: { label: `Preset: ${preset.name}`, type: 'textInput', config: { text: preset.prompt, presetLayerSelections: preset.layerSelections, presetName: preset.name } },
      };
      const processNode: StudioNode = {
        id: `${targetType}_${ts}`,
        type: 'studioNode',
        position: { x: 600, y: 200 },
        data: { label: meta?.label || preset.name, type: targetType, config: finalConfig },
      };
      newNodes.push(inputNode, processNode);
      newEdges.push(
        { id: `e_${inputNode.id}_${processNode.id}`, source: inputNode.id, target: processNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
      );

      if (targetType === 'imageGen' || targetType === 'videoGen') {
        const refBlocks = preset.referenceBlocks || [];
        
        const blockMeta: Record<string, { labelPrefix: string; type: string }> = {
          'productImageSelect': { labelPrefix: '📦 Produto', type: 'productImageSelect' },
          'galleryInfluencer': { labelPrefix: '👤 Influencer', type: 'galleryInfluencer' },
          'galleryLogo': { labelPrefix: '🏷️ Logo', type: 'galleryLogo' },
          'galleryRoupa': { labelPrefix: '👗 Roupa', type: 'galleryRoupa' },
          'galleryPose': { labelPrefix: '🤸 Pose', type: 'galleryPose' },
          'galleryAmbiente': { labelPrefix: '🏔️ Ambiente', type: 'galleryAmbiente' },
          'galleryEstilo': { labelPrefix: '🎨 Estilo', type: 'galleryEstilo' },
          'galleryTextura': { labelPrefix: '🧱 Textura', type: 'galleryTextura' },
          'galleryPaleta': { labelPrefix: '🎨 Paleta', type: 'galleryPaleta' },
          'imageInput': { labelPrefix: '🖼️ Referência', type: 'imageInput' },
        };

        refBlocks.forEach((blockType, idx) => {
          const bm = blockMeta[blockType];
          if (!bm) return;
          const nodeMeta = getNodeMeta(bm.type as any);
          const refNode: StudioNode = {
            id: `${bm.type}_${ts}_${idx}`,
            type: 'studioNode',
            position: { x: 100, y: 400 + idx * 200 },
            data: { label: bm.labelPrefix, type: bm.type as any, config: nodeMeta?.defaultConfig ? { ...nodeMeta.defaultConfig } : {} },
          };
          newNodes.push(refNode);
          newEdges.push(
            { id: `e_${refNode.id}_${processNode.id}`, source: refNode.id, target: processNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
          );
        });
      }
    }

    applyPresetToCanvas(newNodes, newEdges, preset.name, false);
  }, [setNodes, setEdges, reloadingPresetNodeId]);

  // Apply preset nodes/edges to canvas (append or replace)
  const applyPresetToCanvas = useCallback((newNodes: StudioNode[], newEdges: any[], presetName: string, clearFirst: boolean) => {
    if (clearFirst) {
      nodeResultStore.clearAll();
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);
    }
    setShowPresets(false);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName('');
    setShowCanvas(true);
    setHasUnsavedChanges(true);
    toast.success(`Preset "${presetName}" aplicado ao workflow!`);
  }, [setNodes, setEdges]);

  // Wrapper that checks if canvas has existing nodes before applying
  const handlePresetSelectWithCheck = useCallback((preset: Preset) => {
    // If reloading, delegate directly (no clearing needed)
    if (reloadingPresetNodeId) {
      handlePresetSelect(preset);
      return;
    }

    // Build the preset nodes/edges first via handlePresetSelect logic
    // but check if canvas already has nodes
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0) {
      setPendingPreset(preset);
      return;
    }

    handlePresetSelect(preset);
  }, [handlePresetSelect, reloadingPresetNodeId]);

  const handleQuickTool = useCallback((toolId: string, nodeType: string) => {
    const meta = getNodeMeta(nodeType as any);
    if (!meta) return;

    const inputNode: StudioNode = {
      id: `textInput_${Date.now()}`,
      type: 'studioNode',
      position: { x: 100, y: 200 },
      data: { label: 'Prompt', type: 'textInput', config: { text: '' } },
    };
    const processNode: StudioNode = {
      id: `${nodeType}_${Date.now()}`,
      type: 'studioNode',
      position: { x: 500, y: 200 },
      data: { label: meta.label, type: nodeType as any, config: applyNegativeDefaults(nodeType, { ...meta.defaultConfig }) },
    };
    const outputNode: StudioNode = {
      id: `output_${Date.now()}`,
      type: 'studioNode',
      position: { x: 900, y: 200 },
      data: { label: 'Resultado Final', type: 'output', config: { format: 'auto' } },
    };

    setNodes([inputNode, processNode, outputNode]);
    setEdges([
      { id: `e1_${Date.now()}`, source: inputNode.id, target: processNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
      { id: `e2_${Date.now()}`, source: processNode.id, target: outputNode.id, animated: true, style: EDGE_STYLE, type: 'studioEdge' },
    ]);
    setCurrentWorkflowId(null);
    setCurrentWorkflowName('');
    setShowCanvas(true);
    toast.success(`Workflow "${meta.label}" criado!`);
  }, [setNodes, setEdges]);

  // Landing page — only show when user has NOT entered the canvas editor
  if (!showCanvas) {
    return (
      <div className="h-[calc(100vh-180px)] min-h-[350px] md:min-h-[600px] rounded-xl overflow-hidden bg-card border border-border text-card-foreground flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-start px-3 sm:px-6 relative overflow-y-auto pt-4 sm:pt-8 md:pt-12 pb-20 lg:pb-16">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center max-w-3xl w-full"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3 sm:mb-5 text-[9px] sm:text-xs text-muted-foreground">
              <Sparkles className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
              Powered by Veo 3.1, Sora 3, Gemini & mais
            </div>

            <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-2 sm:mb-4">
              <span className="text-foreground">AI Creative</span>
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> </span>
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Studio</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-lg text-muted-foreground mb-4 sm:mb-8 max-w-xl mx-auto leading-relaxed px-2">
              Crie vídeos, imagens, músicas e áudio com IA.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-8 px-1">
              <Button onClick={() => { setCurrentWorkflowId(null); setCurrentWorkflowName(''); setShowCanvas(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
                <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Novo Workflow
              </Button>
              <Button onClick={() => setShowGallery(true)} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
                <Images className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Galeria
              </Button>
            </div>
          </motion.div>

          {/* Saved Workflows with Folders */}
          {savedWorkflows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 w-full max-w-5xl mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Meus Workflows</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs rounded-full"
                  onClick={() => {
                    setCreateFolderName('');
                    setIsCreatingFolderInline((prev) => !prev);
                  }}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Nova Pasta
                </Button>
              </div>

              {isCreatingFolderInline && (
                <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center">
                  <Input
                    value={createFolderName}
                    onChange={(e) => setCreateFolderName(e.target.value)}
                    placeholder="Nome da nova pasta..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateStandaloneFolder();
                      if (e.key === 'Escape') {
                        setIsCreatingFolderInline(false);
                        setCreateFolderName('');
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreatingFolderInline(false);
                        setCreateFolderName('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateStandaloneFolder} disabled={!createFolderName.trim()} className="gap-1">
                      <FolderPlus className="h-4 w-4" />
                      Criar Pasta
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Folder navigation with drop targets */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Button
                  variant={activeFolder === null ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full gap-1.5 text-xs transition-all",
                    dragOverFolder === '__root__' && "ring-2 ring-primary scale-105"
                  )}
                  onClick={() => setActiveFolder(null)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder('__root__'); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => { e.preventDefault(); handleFolderDrop(null); }}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Raiz
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {savedWorkflows.filter(w => !w.pasta).length}
                  </Badge>
                </Button>
                {folders.map((folder) => (
                  <div key={folder} className="relative group/folder">
                    <Button
                      variant={activeFolder === folder ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full gap-1.5 text-xs transition-all pr-7",
                        dragOverFolder === folder && "ring-2 ring-primary scale-105 bg-primary/10"
                      )}
                      onClick={() => setActiveFolder(folder)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder); }}
                      onDragLeave={() => setDragOverFolder(null)}
                      onDrop={(e) => { e.preventDefault(); handleFolderDrop(folder); }}
                    >
                      <Folder className="h-3.5 w-3.5" />
                      {folder}
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                        {savedWorkflows.filter(w => w.pasta === folder).length}
                      </Badge>
                    </Button>
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 transition-opacity h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteFolderConfirm(folder); }}
                      title="Excluir pasta"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Active folder breadcrumb */}
              {activeFolder && (
                <div className="flex items-center gap-2 mb-3">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => setActiveFolder(null)}>
                    <ChevronLeft className="h-3 w-3" />
                    Voltar
                  </Button>
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Folder className="h-4 w-4 text-primary" />
                    {activeFolder}
                  </span>
                </div>
              )}

              <WorkflowCardGrid>
                {filteredWorkflows.map((w) => {
                  const nodesCount = Array.isArray(w.nodes_data) ? w.nodes_data.length : 0;
                  const mediaTypes = getWorkflowMediaTypes(w.nodes_data);
                  return (
                    <WorkflowCard
                      key={w.id}
                      id={w.id}
                      title={w.nome}
                      description={w.descricao}
                      isActive={true}
                      blocksCount={nodesCount}
                      createdAt={w.created_at}
                      mediaTypes={mediaTypes}
                      draggable
                      onDragStart={(e) => {
                        setDraggingWorkflowId(w.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', w.id);
                      }}
                      onOpenEditor={() => handleOpenWorkflow(w)}
                      onRename={() => { setRenameDialog({ id: w.id, nome: w.nome }); setRenameValue(w.nome); }}
                      onDuplicate={() => handleDuplicateWorkflow(w)}
                      onDelete={() => setDeleteConfirm({ id: w.id, nome: w.nome })}
                      onMoveToFolder={() => { setMoveToFolderWorkflow(w); setShowMoveDialog(true); }}
                    />
                  );
                })}
              </WorkflowCardGrid>

              {filteredWorkflows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {activeFolder ? `Nenhum workflow na pasta "${activeFolder}"` : 'Nenhum workflow sem pasta'}
                </p>
              )}
            </motion.div>
          )}

          {loadingWorkflows && savedWorkflows.length === 0 && (
            <p className="text-sm text-muted-foreground">Carregando workflows...</p>
          )}

        </div>

        <CreativeAgentPanel open={showCreativeAgent} onClose={() => setShowCreativeAgent(false)} onCreateWorkflow={handleStoryboardToWorkflow} />
        <StudioGalleryManager open={showGallery} onClose={() => setShowGallery(false)} />

        {/* Delete workflow confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o workflow "{deleteConfirm?.nome}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirm && handleDeleteWorkflow(deleteConfirm.id, deleteConfirm.nome)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename workflow dialog */}
        {renameDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => setRenameDialog(null)}>
            <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-1">Renomear workflow</h3>
              <p className="text-sm text-muted-foreground mb-4">Digite o novo nome para o workflow.</p>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Nome do workflow"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRenameWorkflow(renameDialog.id, renameValue)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancelar</Button>
                <Button onClick={() => handleRenameWorkflow(renameDialog.id, renameValue)}>Renomear</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col border border-border rounded-xl overflow-hidden bg-background transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-0'
          : 'h-[calc(100vh-180px)] min-h-[300px] md:min-h-[600px]'
      }`}
    >
      {/* Header Toolbar */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur border-b border-border">
        {/* Progress bar */}
        {isExecuting && executionLog.length > 0 && (() => {
          const total = executionLog.filter(e => e.status !== 'skipped').length;
          const done = executionLog.filter(e => e.status === 'success' || e.status === 'error').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const currentLabel = executionLog.find(e => e.status === 'running')?.nodeLabel;
          return (
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">
                  {currentLabel ? `⚡ ${currentLabel}` : 'Processando...'}
                </span>
                <span className="text-[10px] font-bold text-primary">{pct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })()}
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 overflow-x-auto scrollbar-hide">
          <Button
            size="sm"
            onClick={() => handleExecute()}
            disabled={isExecuting || nodes.length === 0}
            className="gap-1.5 sm:gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-lg text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 shrink-0"
          >
            <Play className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            <span className="hidden xs:inline">{isExecuting ? 'Executando...' : 'Executar'}</span>
            <span className="xs:hidden">{isExecuting ? '...' : '▶'}</span>
          </Button>
          {isExecuting && (
            <Button
              size="sm"
              onClick={cancelExecution}
              variant="destructive"
              className="gap-1.5 sm:gap-2 rounded-lg text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 shrink-0 animate-pulse cursor-pointer"
            >
              <Square className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              <span className="hidden xs:inline">Cancelar</span>
              <span className="xs:hidden">⏹</span>
            </Button>
          )}
          {selectedNode && (
            <Button
              size="sm"
              onClick={handleExecuteFromNode}
              disabled={isExecuting}
              className="gap-1.5 bg-warning hover:bg-warning/90 text-warning-foreground border-0 rounded-lg text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 shrink-0"
            >
              <SkipForward className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              <span className="hidden sm:inline">Daqui</span>
            </Button>
          )}
          <div className="w-px h-4 sm:h-5 bg-border shrink-0" />
          <Button size="icon" variant="ghost" onClick={deleteSelected} disabled={!selectedNode} title="Excluir" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
            <Trash2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={clearAll} title="Limpar" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive/60 hover:text-destructive shrink-0">
            <Trash2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          </Button>
          <div className="w-px h-4 sm:h-5 bg-border shrink-0" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSaveWorkflow}
            disabled={nodes.length === 0 || saving}
            className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 shrink-0"
          >
            <Save className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar'}</span>
          </Button>
          {currentWorkflowName && (
            <span className="text-[10px] sm:text-[11px] text-muted-foreground max-w-[80px] sm:max-w-[120px] truncate shrink-0 hidden md:inline" title={currentWorkflowName}>
              {currentWorkflowName}
            </span>
          )}
          <Button size="icon" variant="ghost" onClick={() => setShowPresets(true)} className="h-7 w-7 sm:hidden shrink-0" title="Presets">
            <Clapperboard className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPresets(true)} className="gap-1.5 text-xs h-8 px-3 shrink-0 hidden sm:flex">
            <Clapperboard className="h-3.5 w-3.5" />
            Presets
          </Button>
          <div className="w-px h-4 sm:h-5 bg-border shrink-0 hidden sm:block" />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Sair do Fullscreen' : 'Tela Cheia'}
            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
          >
            {isFullscreen ? <Minimize className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> : <Maximize className="h-3 sm:h-3.5 w-3 sm:w-3.5" />}
          </Button>
          <div className="flex-1 min-w-0" />
          <Button size="sm" variant="ghost" onClick={handleCloseCanvas} className="text-[10px] sm:text-xs h-7 sm:h-8 gap-1 sm:gap-1.5 px-2 sm:px-3 shrink-0">
            <ArrowLeft className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            <span className="hidden sm:inline">Fechar</span>
          </Button>
        </div>
      </div>

      {/* Canvas + Config Panel row */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          {/* Node Library (floating, collapsible) */}
          <StudioNodeLibrary />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => { onNodesChange(changes); setHasUnsavedChanges(true); }}
            onEdgesChange={(changes) => { onEdgesChange(changes); setHasUnsavedChanges(true); }}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            className="bg-background"
            deleteKeyCode={["Delete", "Backspace"]}
            defaultEdgeOptions={{ animated: true, style: EDGE_STYLE, type: 'studioEdge', interactionWidth: 20, focusable: true, selectable: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} color="hsl(var(--muted-foreground) / 0.1)" />
            <Controls
              showInteractive={false}
              className="!bg-card/80 !backdrop-blur-md !border-border/50 !shadow-lg !rounded-xl [&>button]:!bg-transparent [&>button]:!border-border/30 [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent/50 [&>button]:!rounded-lg [&>button]:!transition-colors"
            />
            <MiniMap
              className="!bg-card/60 !backdrop-blur-md !border-border/30 !rounded-xl !shadow-lg"
              nodeColor={() => 'hsl(var(--primary))'}
              maskColor="hsl(var(--background) / 0.75)"
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="!top-1/2 !-translate-y-1/2 !left-1/2 !-translate-x-1/2">
                <div className="text-center p-8 flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground/80">Arraste blocos para começar</h3>
                  <p className="text-sm max-w-md text-muted-foreground">
                    Clique no botão <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">+</span> para adicionar blocos ao canvas.
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>

          <AnimatePresence>
            {showPresets && (
              <PresetsGallery onSelectPreset={handlePresetSelectWithCheck} onClose={() => { setShowPresets(false); setPresetInitialSelections(undefined); setReloadingPresetNodeId(null); }} estabelecimentoId={estabelecimentoId} initialSelections={presetInitialSelections} />
            )}
          </AnimatePresence>

          {/* Context Menu */}
          <AnimatePresence>
            {contextMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[100] min-w-[180px] rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const ctxNode = nodes.find(n => n.id === contextMenu.nodeId);
                  const isPaused = (ctxNode?.data as StudioNodeData)?.config?._paused;
                  return (
                    <>
                      <button
                        onClick={() => { handleExecute(contextMenu.nodeId); setContextMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <PlayCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-foreground">Executar daqui</span>
                      </button>
                      <button
                        onClick={() => duplicateNode(contextMenu.nodeId)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <Copy className="h-4 w-4 text-sky-500" />
                        <span className="text-foreground">Duplicar</span>
                      </button>
                      <button
                        onClick={() => togglePauseNode(contextMenu.nodeId)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <Pause className="h-4 w-4 text-amber-500" />
                        <span className="text-foreground">{isPaused ? 'Ativar bloco' : 'Pausar bloco'}</span>
                      </button>
                      <div className="h-px bg-border mx-2" />
                      <button
                        onClick={() => {
                          setNodes((nds) => nds.filter(n => n.id !== contextMenu.nodeId));
                          setEdges((eds) => eds.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId));
                          if (selectedNode?.id === contextMenu.nodeId) setSelectedNode(null);
                          setContextMenu(null);
                          toast.success('Bloco excluído');
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-destructive/10 transition-colors text-left"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="text-destructive">Excluir</span>
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Execution Log Panel */}
          <AnimatePresence>
            {executionLog.length > 0 && (
              <ExecutionLogPanel
                log={executionLog}
                isExecuting={isExecuting}
                currentNodeId={currentNodeId}
                onClear={clearLog}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Config Panel - right side (overlay on mobile, side panel on desktop) */}
        {selectedNode && (
          <>
            {/* Mobile overlay backdrop */}
            <div className="absolute inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSelectedNode(null)} />
            <div className="absolute right-0 top-0 bottom-0 z-40 lg:relative lg:z-auto">
              <StudioNodeConfigPanel
                node={selectedNode}
                onUpdateConfig={updateNodeConfig}
                onClose={() => setSelectedNode(null)}
                onExecuteFromNode={(nodeId) => handleExecute(nodeId)}
                allNodes={nodes as StudioNode[]}
                allEdges={edges}
              />
            </div>
          </>
        )}
      </div>

      
      <CreativeAgentPanel open={showCreativeAgent} onClose={() => setShowCreativeAgent(false)} onCreateWorkflow={handleStoryboardToWorkflow} />
      <StudioGalleryManager open={showGallery} onClose={() => setShowGallery(false)} />


      {/* New Workflow Dialog */}
      <AnimatePresence>
        {showNewDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNewDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Salvar Workflow</h3>
                <button onClick={() => setShowNewDialog(false)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Campanha de Verão"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Descrição opcional..."
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {nodes.length} blocos • {edges.length} conexões
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" onClick={() => setShowNewDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleCreateWorkflow} disabled={saving || !newName.trim()} className="flex-1 bg-primary text-primary-foreground">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que não foram salvas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleForceClose}>Sair sem salvar</Button>
            <AlertDialogAction onClick={handleSaveAndClose}>Salvar e sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete workflow confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDeleteWorkflow(deleteConfirm.id, deleteConfirm.nome)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename workflow dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear workflow</DialogTitle>
            <DialogDescription>
              Digite o novo nome para o workflow.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nome do workflow"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && renameDialog && handleRenameWorkflow(renameDialog.id, renameValue)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancelar</Button>
            <Button onClick={() => renameDialog && handleRenameWorkflow(renameDialog.id, renameValue)}>
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Review Dialog */}
      <BatchReviewDialog
        open={batchReviewResults.length > 0}
        onClose={() => setBatchReviewResults([])}
        results={batchReviewResults}
      />

      {/* Preset canvas conflict dialog */}
      <AlertDialog open={!!pendingPreset} onOpenChange={(open) => !open && setPendingPreset(null)}>
        <AlertDialogContent className="z-[10001] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Canvas já possui blocos</AlertDialogTitle>
            <AlertDialogDescription>
              O canvas já contém blocos. Deseja adicionar o preset junto com os blocos existentes ou limpar o canvas e criar um novo workflow?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <AlertDialogAction
                className="bg-primary hover:bg-primary/90 flex-1"
                onClick={() => {
                  if (pendingPreset) {
                    handlePresetSelect(pendingPreset);
                    setPendingPreset(null);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1 shrink-0" /> Adicionar ao existente
              </AlertDialogAction>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground flex-1"
                onClick={() => {
                  if (pendingPreset) {
                    nodeResultStore.clearAll();
                    setNodes([]);
                    setEdges([]);
                    setTimeout(() => handlePresetSelect(pendingPreset), 50);
                    setPendingPreset(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1 shrink-0" /> Limpar e criar novo
              </AlertDialogAction>
            </div>
            <AlertDialogCancel className="sm:mt-0" onClick={() => setPendingPreset(null)}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Move to Folder dialog */}
      <Dialog open={showMoveDialog} onOpenChange={(open) => { if (!open) { setShowMoveDialog(false); setMoveToFolderWorkflow(null); } }}>
        <DialogContent className="z-[10001]">
          <DialogHeader>
            <DialogTitle>Mover para Pasta</DialogTitle>
            <DialogDescription>
              Escolha uma pasta existente ou crie uma nova.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {/* Remove from folder option */}
            {moveToFolderWorkflow?.pasta && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => moveToFolderWorkflow && handleMoveToFolder(moveToFolderWorkflow.id, null)}
              >
                <X className="h-4 w-4 text-destructive" />
                Remover da pasta
              </Button>
            )}
            {/* Existing folders */}
            {folders.map((folder) => (
              <Button
                key={folder}
                variant={moveToFolderWorkflow?.pasta === folder ? "default" : "outline"}
                className="w-full justify-start gap-2 text-sm"
                onClick={() => moveToFolderWorkflow && handleMoveToFolder(moveToFolderWorkflow.id, folder)}
                disabled={moveToFolderWorkflow?.pasta === folder}
              >
                <Folder className="h-4 w-4" />
                {folder}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da nova pasta..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} size="sm" className="gap-1">
              <FolderPlus className="h-4 w-4" />
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Create Folder dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent className="z-[10001]">
          <DialogHeader>
            <DialogTitle>Criar Nova Pasta</DialogTitle>
            <DialogDescription>
              Crie uma pasta para organizar seus workflows. Você pode arrastar e soltar workflows nas pastas.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={createFolderName}
            onChange={(e) => setCreateFolderName(e.target.value)}
            placeholder="Nome da pasta..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateStandaloneFolder();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateStandaloneFolder}
              disabled={!createFolderName.trim()}
              className="gap-1"
            >
              <FolderPlus className="h-4 w-4" />
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Folder confirm */}
      <AlertDialog open={!!deleteFolderConfirm} onOpenChange={(open) => !open && setDeleteFolderConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{deleteFolderConfirm}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os workflows dentro dela serão movidos para a raiz. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteFolderConfirm && handleDeleteFolder(deleteFolderConfirm)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AICreativeStudio: React.FC = () => (
  <ReactFlowProvider>
    <AICreativeStudioInner />
  </ReactFlowProvider>
);

export default AICreativeStudio;
