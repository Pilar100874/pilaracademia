import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AGENT_INFO } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Columns, Trophy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ArtifactRenderer } from './renderers/ArtifactRenderer';

interface Props {
  projectId: string;
  artifactType: string;
  currentContent: any;
  onSelectVariation: (content: any) => void;
}

export function ArtifactABComparison({ projectId, artifactType, currentContent, onSelectVariation }: Props) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const generateVariations = async () => {
    setGenerating(true);
    setVariations([]);
    try {
      const results: any[] = [];
      // Generate 2 alternative variations with different styles
      const styles = [
        'Use um tom mais EMOCIONAL, provocativo e direto. Foque em storytelling e linguagem coloquial.',
        'Use um tom mais TÉCNICO, analítico e sofisticado. Foque em dados, frameworks e terminologia especializada.'
      ];
      for (let i = 0; i < 2; i++) {
        const { data, error } = await supabase.functions.invoke('strategy-engine', {
          body: {
            action: 'generate_variation',
            projectId,
            agentType: artifactType,
            variationIndex: i + 1,
            variationStyle: styles[i]
          }
        });
        if (error) throw error;
        if (data?.success) {
          results.push(data.result);
        }
      }
      setVariations(results);
      if (results.length > 0) {
        toast.success(`${results.length} variações geradas!`);
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar variações: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelect = () => {
    if (selectedIdx === null) return;
    const selected = selectedIdx === 0 ? currentContent : variations[selectedIdx - 1];
    onSelectVariation(selected);
    setOpen(false);
    toast.success('Variação selecionada!');
  };

  const info = AGENT_INFO[artifactType];
  const allOptions = [currentContent, ...variations];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); if (variations.length === 0) generateVariations(); }}
      >
        <Columns className="h-3.5 w-3.5 mr-1" />
        Teste A/B
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              Comparação A/B — {info?.icon} {info?.name}
            </DialogTitle>
          </DialogHeader>

          {generating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Gerando variações alternativas...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {allOptions.map((content, idx) => (
                    <Card
                      key={idx}
                      className={`cursor-pointer transition-all ${
                        selectedIdx === idx
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-primary/40'
                      }`}
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={idx === 0 ? 'secondary' : 'outline'} className="text-xs">
                            {idx === 0 ? 'Original' : `Variação ${idx}`}
                          </Badge>
                          {selectedIdx === idx && (
                            <Trophy className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          <ArtifactRenderer tipo={artifactType} conteudo={content} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateVariations}
                  disabled={generating}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Regenerar Variações
                </Button>
                <Button
                  size="sm"
                  disabled={selectedIdx === null}
                  onClick={handleSelect}
                >
                  <Trophy className="h-3.5 w-3.5 mr-1" />
                  Usar Selecionada
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
