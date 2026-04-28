import React, { useState, useCallback } from 'react';
import { StrategyArtifact, AGENT_INFO } from './types';
type AgentInfoMap = Record<string, { name: string; icon: string; color: string; description: string }>;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Code, LayoutList, ShieldCheck, Loader2, Check, X, RefreshCw, Pencil, Save, History, ThumbsUp, ThumbsDown, FileDown, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactRenderer } from './renderers/ArtifactRenderer';
import { ArtifactHistory } from './ArtifactHistory';
import { ArtifactABComparison } from './ArtifactABComparison';
import { supabase } from '@/integrations/supabase/client';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface Props {
  artifacts: StrategyArtifact[];
  projectId: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRevise?: (id: string, agentType: string) => void;
  onUpdateContent?: (id: string, content: any) => void;
  onExportSinglePDF?: (artifactType: string) => void;
  onFeedback?: (artifactId: string, feedback: 'positive' | 'negative') => void;
  onDeleteArtifact?: (id: string) => void;
  onRegenerateAgent?: (agentType: string) => void;
  runningAgents?: Set<string>;
  agentInfo?: AgentInfoMap;
}

export function StrategyArtifactViewer({ artifacts, projectId, onApprove, onReject, onRevise, onUpdateContent, onExportSinglePDF, onFeedback, onDeleteArtifact, onRegenerateAgent, runningAgents = new Set(), agentInfo }: Props) {
  const resolvedInfo = agentInfo || AGENT_INFO;
  const [selectedArtifact, setSelectedArtifact] = useState<StrategyArtifact | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'json' | 'history'>('formatted');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const exportJSON = (artifact: StrategyArtifact) => {
    const blob = new Blob([JSON.stringify(artifact.conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.tipo}_v${artifact.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado');
  };

  const exportMarkdown = (artifact: StrategyArtifact) => {
    const md = jsonToMarkdown(artifact.titulo, artifact.conteudo);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.tipo}_v${artifact.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown exportado');
  };

  const handleValidate = async (artifact: StrategyArtifact) => {
    setValidating(artifact.id);
    try {
      const validators = ['clareza', 'especificidade', 'voc', 'diferenciacao', 'consistencia'];
      const results: Record<string, any> = {};

      for (const v of validators) {
        const { data, error } = await supabase.functions.invoke('strategy-engine', {
          body: { action: 'validate', validatorType: v, artifactContent: artifact.conteudo }
        });
        if (data?.success) {
          results[v] = data.validation;
        }
      }

      setValidationResults(prev => ({ ...prev, [artifact.id]: results }));

      // Check if auto-revision needed
      const avgScore = Math.round(
        (Object.values(results) as any[]).reduce((sum: number, v: any) => sum + (v?.pontuacao || 0), 0) / Object.keys(results).length
      );
      if (avgScore < 60) {
        toast.warning(`Score ${avgScore}% - Revisão automática recomendada`);
      } else {
        toast.success(`Validação concluída! Score: ${avgScore}%`);
      }
    } catch (err: any) {
      toast.error(`Erro na validação: ${err.message}`);
    } finally {
      setValidating(null);
    }
  };

  // Removed: handleStartEdit and handleSaveEdit replaced by inline editing

  const handleInlineSave = (artifact: StrategyArtifact) => {
    if (editedContent) {
      onUpdateContent?.(artifact.id, editedContent);
      setSelectedArtifact({ ...artifact, conteudo: editedContent });
      setIsEditing(false);
      setEditedContent(null);
      toast.success('Artefato atualizado');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Aprovado</Badge>;
      case 'rejected': return <Badge className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Rejeitado</Badge>;
      default: return <Badge variant="outline" className="text-xs">Pendente</Badge>;
    }
  };

  if (artifacts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum artefato gerado ainda. Execute o pipeline para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {artifacts.map(artifact => {
          const info = resolvedInfo[artifact.tipo];
          const validation = validationResults[artifact.id];
          const avgScore = validation
            ? Math.round((Object.values(validation) as any[]).reduce((sum: number, v: any) => sum + (v?.pontuacao || 0), 0) / Object.keys(validation).length)
            : null;

          return (
            <Card key={artifact.id} className={`hover:border-primary/30 transition-colors ${artifact.status === 'approved' ? 'border-green-500/30' : artifact.status === 'rejected' ? 'border-red-500/30' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <span className="text-lg">{info?.icon || '📄'}</span>
                    <CardTitle className="text-sm">{info?.name || artifact.titulo}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {avgScore !== null && (
                      <Badge
                        variant={avgScore >= 80 ? 'default' : avgScore >= 60 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {avgScore}%
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">v{artifact.version}</Badge>
                    {getStatusBadge(artifact.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedArtifact(artifact); setViewMode('formatted'); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleValidate(artifact)}
                    disabled={validating === artifact.id}
                  >
                    {validating === artifact.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                    Validar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportJSON(artifact)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    JSON
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportMarkdown(artifact)}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    MD
                  </Button>
                  {onExportSinglePDF && (
                    <Button variant="ghost" size="sm" onClick={() => onExportSinglePDF(artifact.tipo)}>
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      PDF
                    </Button>
                  )}
                  <ArtifactABComparison
                    projectId={projectId}
                    artifactType={artifact.tipo}
                    currentContent={artifact.conteudo}
                    onSelectVariation={(content) => {
                      onUpdateContent?.(artifact.id, content);
                      if (selectedArtifact?.id === artifact.id) {
                        setSelectedArtifact({ ...artifact, conteudo: content });
                      }
                    }}
                  />
                </div>

                {/* Feedback buttons */}
                {onFeedback && (
                  <div className="flex items-center gap-1.5 border-t pt-2">
                    <span className="text-xs text-muted-foreground mr-1">Avaliar:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-green-600 hover:bg-green-500/10"
                      onClick={() => onFeedback(artifact.id, 'positive')}
                    >
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      Útil
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:bg-red-500/10"
                      onClick={() => onFeedback(artifact.id, 'negative')}
                    >
                      <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                      Melhorar
                    </Button>
                  </div>
                )}

                {/* Delete / Regenerate */}
                <div className="flex items-center gap-1.5 border-t pt-2">
                  {onDeleteArtifact && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: artifact.id, name: info.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
                  )}
                  {onRegenerateAgent && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegenerateAgent(artifact.tipo)}
                      disabled={runningAgents.has(artifact.tipo)}
                    >
                      {runningAgents.has(artifact.tipo) ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                      Gerar Novamente
                    </Button>
                  )}
                </div>

                {/* Validation scores inline */}
                {validation && (
                  <div className="grid grid-cols-5 gap-1 border-t pt-2">
                    {Object.entries(validation).map(([key, val]: [string, any]) => (
                      <div key={key} className="text-center">
                        <div className={`text-xs font-bold ${val?.pontuacao >= 80 ? 'text-primary' : val?.pontuacao >= 60 ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {val?.pontuacao || 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground capitalize truncate">{key}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedArtifact} onOpenChange={() => setSelectedArtifact(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{resolvedInfo[selectedArtifact?.tipo || '']?.icon || '📄'}</span>
              {resolvedInfo[selectedArtifact?.tipo || '']?.name || selectedArtifact?.titulo}
              <Badge variant="outline" className="text-xs ml-2">v{selectedArtifact?.version}</Badge>
              {selectedArtifact && getStatusBadge(selectedArtifact.status)}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={viewMode} onValueChange={v => {
            setViewMode(v as any);
            if (v !== 'formatted') {
              handleCancelEdit();
            }
          }}>
            <div className="flex items-center justify-between">
              <TabsList className="w-fit">
                <TabsTrigger value="formatted" className="text-xs">
                  <LayoutList className="h-3 w-3 mr-1" />
                  Formatado
                </TabsTrigger>
                <TabsTrigger value="json" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  JSON
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {viewMode === 'formatted' && selectedArtifact && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCancelEdit}>
                        <X className="h-3 w-3 mr-1" /> Cancelar
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleInlineSave(selectedArtifact)}>
                        <Save className="h-3 w-3 mr-1" /> Salvar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                      setIsEditing(true);
                      setEditedContent(JSON.parse(JSON.stringify(selectedArtifact.conteudo)));
                    }}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                </div>
              )}
            </div>

            <TabsContent value="formatted" className="mt-3 flex-1 min-h-0">
              <ScrollArea className="h-[55vh]">
                <div className="pr-4 pb-6">
                  {selectedArtifact && (
                    <ArtifactRenderer
                      tipo={selectedArtifact.tipo}
                      conteudo={isEditing && editedContent ? editedContent : selectedArtifact.conteudo}
                      editable={isEditing}
                      onChange={newContent => setEditedContent(newContent)}
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="json" className="mt-3">
              <ScrollArea className="h-[55vh]">
                <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap break-words pr-4">
                  {JSON.stringify(
                    isEditing && editedContent ? editedContent : selectedArtifact?.conteudo,
                    null, 2
                  )}
                </pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="history" className="mt-3">
              <ScrollArea className="h-[55vh]">
                <div className="pr-4">
                  {selectedArtifact && (
                    <ArtifactHistory projectId={projectId} artifactType={selectedArtifact.tipo} />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Validation in dialog */}
          {selectedArtifact && validationResults[selectedArtifact.id] && (
            <div className="border-t pt-3 mt-2">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Resultados da Validação
              </h4>
              <div className="space-y-2">
                {Object.entries(validationResults[selectedArtifact.id]).map(([key, val]: [string, any]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize">{key}</span>
                      <Badge
                        variant={val?.pontuacao >= 80 ? 'default' : val?.pontuacao >= 60 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {val?.pontuacao}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{val?.diagnostico}</p>
                    {val?.sugestoes?.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {val.sugestoes.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">💡 {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => {
          if (deleteTarget && onDeleteArtifact) {
            onDeleteArtifact(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        title="Excluir artefato"
        itemName={deleteTarget?.name}
      />
    </>
  );
}

function jsonToMarkdown(title: string, data: any, level = 1): string {
  let md = `${'#'.repeat(Math.min(level, 6))} ${title}\n\n`;
  if (typeof data === 'string') return md + data + '\n\n';
  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      if (typeof item === 'object') {
        md += jsonToMarkdown(`Item ${i + 1}`, item, level + 1);
      } else {
        md += `- ${item}\n`;
      }
    });
    md += '\n';
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        md += jsonToMarkdown(key, value, level + 1);
      } else {
        md += `**${key}**: ${value}\n\n`;
      }
    });
  }
  return md;
}
