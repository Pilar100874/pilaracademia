import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image, Music, Video, FileText, Play, Loader2, FolderOpen, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
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
import { MarketingResource, ReturnType, RETURN_TYPE_LABELS, CHANNEL_CONFIG } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Preset {
  id: string;
  nome: string;
  descricao: string | null;
  field_values: Record<string, any>;
  created_at: string;
}

interface ResourcesListProps {
  resources: MarketingResource[];
  onCreateNew: () => void;
  onEdit: (resource: MarketingResource) => void;
  onDelete: (resourceId: string) => void;
  onUseResource: (resource: MarketingResource, preset?: Preset) => void;
}

const ReturnTypeIcon: React.FC<{ type: ReturnType }> = ({ type }) => {
  const icons: Record<ReturnType, React.ReactNode> = {
    image: <Image className="h-4 w-4" />,
    audio: <Music className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    text: <FileText className="h-4 w-4" />,
  };
  return <>{icons[type]}</>;
};

const returnTypeColors: Record<ReturnType, string> = {
  image: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  audio: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  video: 'bg-red-500/10 text-red-600 border-red-500/20',
  text: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const ResourceCard: React.FC<{
  resource: MarketingResource;
  onEdit: (resource: MarketingResource) => void;
  onDelete: (resourceId: string) => void;
  onUseResource: (resource: MarketingResource, preset?: Preset) => void;
  estabelecimentoId: string | null;
}> = ({ resource, onEdit, onDelete, onUseResource, estabelecimentoId }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null);
  const [deleteResourceOpen, setDeleteResourceOpen] = useState(false);

  const loadPresets = async () => {
    if (!estabelecimentoId || !resource.id) return;
    
    setLoadingPresets(true);
    try {
      const { data, error } = await supabase
        .from('marketing_resource_presets')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('resource_id', resource.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPresets((data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        field_values: p.field_values as Record<string, any>,
        created_at: p.created_at,
      })));
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoadingPresets(false);
    }
  };

  const confirmDeletePreset = async () => {
    if (!deletePresetId) return;
    
    try {
      const { error } = await supabase
        .from('marketing_resource_presets')
        .delete()
        .eq('id', deletePresetId);

      if (error) throw error;

      toast.success('Preset excluído');
      setPresets(prev => prev.filter(p => p.id !== deletePresetId));
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('Erro ao excluir preset');
    } finally {
      setDeletePresetId(null);
    }
  };

  const handleDeletePresetClick = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletePresetId(presetId);
  };

  const handleDeleteResourceClick = () => {
    setDeleteResourceOpen(true);
  };

  const confirmDeleteResource = () => {
    onDelete(resource.id);
    setDeleteResourceOpen(false);
  };

  const handleRenamePreset = async (presetId: string) => {
    if (!editingPresetName.trim()) {
      toast.error('Digite um nome para o preset');
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_resource_presets')
        .update({ nome: editingPresetName.trim() })
        .eq('id', presetId);

      if (error) throw error;

      toast.success('Preset renomeado');
      setPresets(prev => prev.map(p => 
        p.id === presetId ? { ...p, nome: editingPresetName.trim() } : p
      ));
      setEditingPresetId(null);
      setEditingPresetName('');
    } catch (error) {
      console.error('Error renaming preset:', error);
      toast.error('Erro ao renomear preset');
    }
  };

  const startEditing = (preset: Preset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.nome);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  useEffect(() => {
    if (presetsOpen && presets.length === 0) {
      loadPresets();
    }
  }, [presetsOpen]);

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base line-clamp-1">{resource.name}</CardTitle>
            {resource.description && (
              <CardDescription className="line-clamp-2 text-xs">
                {resource.description}
              </CardDescription>
            )}
          </div>
          <Badge variant="outline" className={returnTypeColors[resource.returnType]}>
            <ReturnTypeIcon type={resource.returnType} />
            <span className="ml-1">{RETURN_TYPE_LABELS[resource.returnType]}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Channels badges */}
        {resource.publishChannels && resource.publishChannels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.publishChannels.slice(0, 3).map((channel) => (
              <Badge
                key={channel}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {CHANNEL_CONFIG[channel].label}
              </Badge>
            ))}
            {resource.publishChannels.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{resource.publishChannels.length - 3}
              </Badge>
            )}
            {resource.autoPublishEnabled && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-500">
                Auto
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {resource.fields.length} campo{resource.fields.length !== 1 ? 's' : ''}
          </span>
          <TooltipProvider delayDuration={0}>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(resource)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteResourceClick}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                onClick={() => onUseResource(resource)}
                className="h-8"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Usar
              </Button>
            </div>
          </TooltipProvider>
        </div>

        {/* Presets section */}
        <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-7 text-xs text-muted-foreground hover:text-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              Presets Salvos
              {presets.length > 0 && (
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                  {presets.length}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {loadingPresets ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : presets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum preset salvo
              </p>
            ) : (
              <div className="space-y-1.5">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group/preset"
                  >
                    <div className="flex-1 min-w-0">
                      {editingPresetId === preset.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            className="h-6 text-xs"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenamePreset(preset.id);
                              if (e.key === 'Escape') cancelEditing(e as any);
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenamePreset(preset.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={cancelEditing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-medium truncate">{preset.nome}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(preset.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </>
                      )}
                    </div>
                    {editingPresetId !== preset.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover/preset:opacity-100 transition-opacity"
                          onClick={(e) => startEditing(preset, e)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover/preset:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={(e) => handleDeletePresetClick(preset.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-[10px] px-2"
                          onClick={() => onUseResource(resource, preset)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Usar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={deleteResourceOpen} onOpenChange={setDeleteResourceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Recurso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o recurso "{resource.name}"? Esta ação não pode ser desfeita e todos os presets associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteResource} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Preset Confirmation */}
      <AlertDialog open={!!deletePresetId} onOpenChange={(open) => !open && setDeletePresetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este preset? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePreset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
export const ResourcesList: React.FC<ResourcesListProps> = ({
  resources,
  onCreateNew,
  onEdit,
  onDelete,
  onUseResource,
}) => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('estabelecimentoId');
    if (cached) {
      setEstabelecimentoId(cached);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Meus Recursos</h3>
          <p className="text-sm text-muted-foreground">
            Configure os recursos para criar conteúdo com IA
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Recurso
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Nenhum recurso criado</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie seu primeiro recurso para começar a gerar conteúdo com IA
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Recurso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onEdit={onEdit}
              onDelete={onDelete}
              onUseResource={onUseResource}
              estabelecimentoId={estabelecimentoId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
