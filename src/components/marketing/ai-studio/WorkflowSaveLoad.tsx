import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, FolderOpen, Trash2, X, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { StudioNode, StudioEdge, StudioNodeData } from './types';
import { format } from 'date-fns';

interface SavedWorkflow {
  id: string;
  nome: string;
  descricao: string | null;
  nodes_data: any;
  edges_data: any;
  created_at: string;
  updated_at: string;
}

interface WorkflowSaveLoadProps {
  nodes: StudioNode[];
  edges: StudioEdge[];
  onLoad: (nodes: StudioNode[], edges: StudioEdge[]) => void;
  estabelecimentoId: string;
}

const WorkflowSaveLoad: React.FC<WorkflowSaveLoadProps> = ({
  nodes,
  edges,
  onLoad,
  estabelecimentoId,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_studio_workflows')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Erro ao carregar workflows');
    } else {
      setSavedWorkflows((data as SavedWorkflow[]) || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast.error('Digite um nome para o workflow');
      return;
    }
    setSaving(true);

    // Strip results/processing state from nodes before saving
    const cleanNodes = nodes.map(n => {
      const d = n.data as StudioNodeData;
      return {
        ...n,
        data: {
          label: d.label,
          type: d.type,
          config: d.config,
        },
      };
    });

    const { error } = await supabase
      .from('ai_studio_workflows')
      .insert([{
        estabelecimento_id: estabelecimentoId,
        nome: saveName.trim(),
        descricao: saveDesc.trim() || null,
        nodes_data: cleanNodes as any,
        edges_data: edges as any,
      }]);

    if (error) {
      console.error('Error saving workflow:', error);
      toast.error('Erro ao salvar workflow');
    } else {
      toast.success('Workflow salvo com sucesso!');
      setSaveName('');
      setSaveDesc('');
      setShowSaveDialog(false);
    }
    setSaving(false);
  };

  const handleLoad = (workflow: SavedWorkflow) => {
    try {
      const loadedNodes = workflow.nodes_data as StudioNode[];
      const loadedEdges = workflow.edges_data as StudioEdge[];
      onLoad(loadedNodes, loadedEdges);
      setShowLoadDialog(false);
      toast.success(`Workflow "${workflow.nome}" carregado!`);
    } catch (err) {
      toast.error('Erro ao carregar workflow');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    const { error } = await supabase
      .from('ai_studio_workflows')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir workflow');
    } else {
      toast.success(`"${nome}" excluído`);
      setSavedWorkflows(prev => prev.filter(w => w.id !== id));
    }
  };

  useEffect(() => {
    if (showLoadDialog) fetchWorkflows();
  }, [showLoadDialog]);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowSaveDialog(true)}
        disabled={nodes.length === 0}
        className="gap-1.5 text-xs h-8"
      >
        <Save className="h-3.5 w-3.5" />
        Salvar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowLoadDialog(true)}
        className="gap-1.5 text-xs h-8"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        Carregar
      </Button>

      {/* Save Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSaveDialog(false)}
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
                <button onClick={() => setShowSaveDialog(false)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Ex: Campanha de Verão"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                  <Input
                    value={saveDesc}
                    onChange={(e) => setSaveDesc(e.target.value)}
                    placeholder="Descrição opcional..."
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {nodes.length} blocos • {edges.length} conexões
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || !saveName.trim()} className="flex-1 bg-primary text-primary-foreground">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load Dialog */}
      <AnimatePresence>
        {showLoadDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLoadDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Carregar Workflow</h3>
                <button onClick={() => setShowLoadDialog(false)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
                ) : savedWorkflows.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum workflow salvo</p>
                  </div>
                ) : (
                  savedWorkflows.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => handleLoad(w)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{w.nome}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {w.descricao && <span className="truncate">{w.descricao}</span>}
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {format(new Date(w.updated_at), 'dd/MM/yy HH:mm')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(w.id, w.nome);
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WorkflowSaveLoad;
