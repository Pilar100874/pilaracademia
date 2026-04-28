import React, { useState, useEffect } from 'react';
import { Workflow, Edit, Trash2, Copy, Check, Loader2, Download, Search, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface SavedWorkflowsListProps {
  onEdit: (workflow: SavedWorkflow) => void;
}

const SavedWorkflowsList: React.FC<SavedWorkflowsListProps> = ({ onEdit }) => {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<SavedWorkflow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('n8n_workflows_gerados')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (err) {
      console.error('Error loading workflows:', err);
      toast.error('Erro ao carregar workflows salvos');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (workflow: SavedWorkflow) => {
    try {
      const jsonStr = typeof workflow.workflow_json === 'string' 
        ? workflow.workflow_json 
        : JSON.stringify(workflow.workflow_json, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setCopiedId(workflow.id);
      toast.success('JSON copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadWorkflow = (workflow: SavedWorkflow) => {
    const jsonStr = typeof workflow.workflow_json === 'string' 
      ? workflow.workflow_json 
      : JSON.stringify(workflow.workflow_json, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n8n-${workflow.nome.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado');
  };

  const confirmDelete = (workflow: SavedWorkflow) => {
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!workflowToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('n8n_workflows_gerados')
        .delete()
        .eq('id', workflowToDelete.id);

      if (error) throw error;

      setWorkflows(prev => prev.filter(w => w.id !== workflowToDelete.id));
      toast.success('Workflow excluído');
    } catch (err) {
      console.error('Error deleting workflow:', err);
      toast.error('Erro ao excluir workflow');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const filteredWorkflows = workflows.filter(w =>
    w.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.prompt_original.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Workflows Salvos
        </h3>
        <Badge variant="secondary">{workflows.length} workflow(s)</Badge>
      </div>

      {workflows.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum workflow salvo ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gere um workflow e clique em "Salvar" para guardar aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{workflow.nome}</h4>
                      {workflow.descricao && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {workflow.descricao}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        Prompt: {workflow.prompt_original}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(workflow.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </Badge>
                        {workflow.variaveis_ambiente && Array.isArray(workflow.variaveis_ambiente) && workflow.variaveis_ambiente.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {workflow.variaveis_ambiente.length} variável(is)
                          </Badge>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(workflow)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(workflow)}>
                          {copiedId === workflow.id ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          Copiar JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadWorkflow(workflow)}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => confirmDelete(workflow)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O workflow "{workflowToDelete?.nome}" será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SavedWorkflowsList;
