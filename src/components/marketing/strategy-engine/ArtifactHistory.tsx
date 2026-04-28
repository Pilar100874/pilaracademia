import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AGENT_INFO } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, ArrowRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ArtifactVersion {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: any;
  version: number;
  status: string;
  created_at: string;
  execution_id: string | null;
}

interface Props {
  projectId: string;
  artifactType: string;
}

export function ArtifactHistory({ projectId, artifactType }: Props) {
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareA, setCompareA] = useState<ArtifactVersion | null>(null);
  const [compareB, setCompareB] = useState<ArtifactVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [projectId, artifactType]);

  const fetchVersions = async () => {
    const { data } = await (supabase
      .from('strategy_artifact_versions' as any)
      .select('*')
      .eq('project_id', projectId)
      .eq('tipo', artifactType)
      .order('version', { ascending: false }) as any);
    setVersions((data || []) as unknown as ArtifactVersion[]);
    setLoading(false);
  };

  const info = AGENT_INFO[artifactType];

  const getDiffKeys = (a: any, b: any): string[] => {
    if (!a || !b) return [];
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Array.from(allKeys).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
  };

  if (loading) return null;
  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">Sem histórico de versões para este artefato.</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <History className="h-4 w-4" />
          Histórico de Revisões — {info?.icon} {info?.name}
        </h4>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-3">
            {versions.map((v, idx) => (
              <div key={v.id} className="flex items-start gap-3 relative pl-7">
                <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                  idx === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'
                }`} />
                <Card className={`flex-1 ${idx === 0 ? 'border-primary/30' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={idx === 0 ? 'default' : 'outline'} className="text-xs">
                          v{v.version}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{v.status}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          setCompareA(v);
                          setCompareB(null);
                          setShowDiff(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      {idx < versions.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            setCompareA(versions[idx + 1]);
                            setCompareB(v);
                            setShowDiff(true);
                          }}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Comparar com v{versions[idx + 1].version}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diff Dialog */}
      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {compareB ? (
                <>Comparação: v{compareA?.version} → v{compareB?.version}</>
              ) : (
                <>Versão {compareA?.version}</>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            {compareB && compareA ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">v{compareA.version} (anterior)</h4>
                  <DiffContent data={compareA.conteudo} changedKeys={getDiffKeys(compareA.conteudo, compareB.conteudo)} side="old" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-primary">v{compareB.version} (nova)</h4>
                  <DiffContent data={compareB.conteudo} changedKeys={getDiffKeys(compareA.conteudo, compareB.conteudo)} side="new" />
                </div>
              </div>
            ) : compareA ? (
              <pre className="text-xs bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {JSON.stringify(compareA.conteudo, null, 2)}
              </pre>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DiffContent({ data, changedKeys, side }: { data: any; changedKeys: string[]; side: 'old' | 'new' }) {
  if (!data || typeof data !== 'object') {
    return <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>;
  }

  return (
    <div className="space-y-1.5">
      {Object.entries(data).map(([key, value]) => {
        const isChanged = changedKeys.includes(key);
        return (
          <div
            key={key}
            className={`p-2 rounded text-xs ${
              isChanged
                ? side === 'old'
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-green-500/10 border border-green-500/20'
                : 'bg-muted/50'
            }`}
          >
            <span className="font-semibold">{key}:</span>{' '}
            <span className="whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 1) : String(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
