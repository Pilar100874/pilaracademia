import React, { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useStrategyProjects } from './hooks/useStrategyProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Loader2, Rocket, Clock, CheckCircle2, AlertCircle, Copy, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NicheTemplates } from './NicheTemplates';

interface Props {
  onSelectProject: (id: string) => void;
}

export function StrategyProjectsList({ onSelectProject }: Props) {
  const [estabId] = useState(() => {
    const stored = localStorage.getItem('estabelecimentoId');
    return stored || undefined;
  });
  const { projects, loading, createProject, deleteProject, refetch } = useStrategyProjects(estabId);
  const [showCreate, setShowCreate] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [creating, setCreating] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (!nome.trim() || !descricao.trim()) {
      toast.error('Preencha nome e descrição do negócio');
      return;
    }
    setCreating(true);
    const userId = localStorage.getItem('usuarioId') || '';
    const project = await createProject(nome, descricao, userId);
    if (project) {
      setShowCreate(false);
      setNome('');
      setDescricao('');
      onSelectProject(project.id);
    }
    setCreating(false);
  };

  const handleClone = async (projectId: string, projectName: string) => {
    setCloning(projectId);
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'clone_project', sourceProjectId: projectId, newName: `${projectName} (Cópia)` }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('Projeto clonado com sucesso!');
      refetch();
    } catch (err: any) {
      toast.error(`Erro ao clonar: ${err.message}`);
    } finally {
      setCloning(null);
    }
  };

  const handleTemplateSelect = (templateNome: string, templateDesc: string) => {
    setNome(templateNome);
    setDescricao(templateDesc);
    setShowCreate(true);
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    draft: { label: 'Rascunho', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
    processing: { label: 'Processando', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { label: 'Concluído', variant: 'outline', icon: <CheckCircle2 className="h-3 w-3 text-green-500" /> },
    failed: { label: 'Falhou', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <NicheTemplates onSelectTemplate={handleTemplateSelect} />
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Projeto Estratégico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium">Nome do Projeto</label>
                <Input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Lançamento Curso de Marketing Digital"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descreva seu Negócio</label>
                <Textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva seu negócio, produto/serviço, público-alvo, e o que você quer alcançar..."
                  rows={6}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
                Criar e Iniciar Estratégia
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto criado</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Descreva seu negócio e nossa IA criará uma estratégia completa de marketing.
            </p>
            <div className="flex gap-2">
              <NicheTemplates onSelectTemplate={handleTemplateSelect} />
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeiro Projeto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            // Treat stuck "processing" projects (>10min) as draft
            const isStuck = project.status === 'processing' && 
              new Date().getTime() - new Date(project.updated_at || project.created_at).getTime() > 10 * 60 * 1000;
            const st = statusConfig[isStuck ? 'draft' : project.status] || statusConfig.draft;
            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => onSelectProject(project.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">{project.nome}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => handleClone(project.id, project.nome)}
                          disabled={cloning === project.id}
                        >
                          {cloning === project.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                          Duplicar Projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget({ id: project.id, name: project.nome })}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs">
                    {project.descricao_negocio}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant={st.variant} className="text-xs flex items-center gap-1">
                      {st.icon}
                      {st.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(project.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Excluir projeto"
        itemName={deleteTarget?.name}
      />
    </div>
  );
}
