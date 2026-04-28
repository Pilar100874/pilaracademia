import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, TrendingUp, ExternalLink, Zap, Image, Film, Music, Mic, Type, ScanEye, Wand2, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AIProvider {
  id: string;
  name: string;
  logo: string;
  totalCredits: number;
  usedCredits: number;
  color: string;
  resources: {
    resource: string;
    count: number;
    cost: number;
    icon: React.ElementType;
    color: string;
    costPerUse: string;
  }[];
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '🤖',
    totalCredits: 50,
    usedCredits: 18.5,
    color: '#10a37f',
    resources: [
      { resource: 'GPT-5 (Texto)', count: 85, cost: 8.50, icon: Type, color: '#10a37f', costPerUse: '~0.05-0.15' },
      { resource: 'GPT-5 Mini', count: 40, cost: 2.00, icon: Type, color: '#10a37f', costPerUse: '~0.02-0.08' },
      { resource: 'DALL·E (Imagem)', count: 20, cost: 4.00, icon: Image, color: '#10a37f', costPerUse: '~0.04-0.20' },
      { resource: 'Whisper (Transcrição)', count: 15, cost: 1.50, icon: Mic, color: '#10a37f', costPerUse: '~0.01-0.10' },
      { resource: 'TTS (Voz)', count: 25, cost: 2.50, icon: Mic, color: '#10a37f', costPerUse: '~0.01-0.15' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    logo: '✨',
    totalCredits: 30,
    usedCredits: 9.2,
    color: '#4285f4',
    resources: [
      { resource: 'Gemini 2.5 Pro', count: 30, cost: 3.00, icon: Type, color: '#4285f4', costPerUse: '~0.05-0.12' },
      { resource: 'Gemini 2.5 Flash', count: 60, cost: 1.80, icon: Zap, color: '#4285f4', costPerUse: '~0.01-0.05' },
      { resource: 'Gemini Flash Lite', count: 100, cost: 1.00, icon: Zap, color: '#4285f4', costPerUse: '~0.005-0.02' },
      { resource: 'Gemini Imagem', count: 12, cost: 2.40, icon: Image, color: '#4285f4', costPerUse: '~0.10-0.25' },
      { resource: 'Gemini Visão', count: 20, cost: 1.00, icon: ScanEye, color: '#4285f4', costPerUse: '~0.01-0.05' },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    logo: '🔊',
    totalCredits: 15,
    usedCredits: 5.8,
    color: '#f97316',
    resources: [
      { resource: 'Text-to-Speech', count: 35, cost: 3.50, icon: Mic, color: '#f97316', costPerUse: '~0.05-0.15' },
      { resource: 'Voice Clone', count: 3, cost: 1.50, icon: Mic, color: '#f97316', costPerUse: '~0.30-0.60' },
      { resource: 'Sound Effects', count: 8, cost: 0.80, icon: Music, color: '#f97316', costPerUse: '~0.05-0.15' },
    ],
  },
  {
    id: 'runway',
    name: 'Runway / Vídeo IA',
    logo: '🎬',
    totalCredits: 25,
    usedCredits: 12.0,
    color: '#8b5cf6',
    resources: [
      { resource: 'Gerar Vídeo (curto)', count: 5, cost: 5.00, icon: Film, color: '#8b5cf6', costPerUse: '~0.50-2.00' },
      { resource: 'Gerar Vídeo (longo)', count: 2, cost: 4.00, icon: Film, color: '#8b5cf6', costPerUse: '~1.00-5.00' },
      { resource: 'Lip Sync', count: 4, cost: 2.00, icon: Zap, color: '#8b5cf6', costPerUse: '~0.20-1.00' },
      { resource: 'Unir Vídeos', count: 3, cost: 1.00, icon: Link2, color: '#8b5cf6', costPerUse: '~0.10-0.50' },
    ],
  },
  {
    id: 'suno',
    name: 'Suno / Música IA',
    logo: '🎵',
    totalCredits: 10,
    usedCredits: 3.5,
    color: '#ec4899',
    resources: [
      { resource: 'Criar Música', count: 7, cost: 2.80, icon: Music, color: '#ec4899', costPerUse: '~0.20-0.60' },
      { resource: 'Criar Jingle', count: 3, cost: 0.70, icon: Music, color: '#ec4899', costPerUse: '~0.10-0.30' },
    ],
  },
];

const StudioCreditsPanel: React.FC<Props> = ({ open, onClose }) => {
  const [expandedProvider, setExpandedProvider] = useState<string | null>('openai');

  const totalCredits = AI_PROVIDERS.reduce((s, p) => s + p.totalCredits, 0);
  const totalUsed = AI_PROVIDERS.reduce((s, p) => s + p.usedCredits, 0);
  const totalRemaining = totalCredits - totalUsed;
  const totalPercent = (totalUsed / totalCredits) * 100;

  const getProgressColor = (pct: number) => {
    if (pct > 80) return '#ef4444';
    if (pct > 50) return '#f59e0b';
    return '#22c55e';
  };

  const handleAddCredits = () => {
    window.open('https://docs.lovable.dev/features/ai', '_blank');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Créditos por IA</h2>
                <p className="text-xs text-muted-foreground">Consumo detalhado por provedor</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="max-h-[75vh]">
            <div className="p-5 space-y-4">
              {/* Global summary */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Saldo Total</span>
                  <span className="text-xl font-bold text-foreground">
                    ${totalRemaining.toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground"> / ${totalCredits.toFixed(2)}</span>
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{ width: `${totalPercent}%`, background: getProgressColor(totalPercent) }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{totalPercent.toFixed(0)}% utilizado</span>
                  <span>${totalUsed.toFixed(2)} consumido</span>
                </div>
                <Button onClick={handleAddCredits} className="w-full gap-2" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Adicionar Créditos
                </Button>
              </div>

              {/* Per-provider cards */}
              <div className="space-y-2">
                {AI_PROVIDERS.map((provider) => {
                  const pct = (provider.usedCredits / provider.totalCredits) * 100;
                  const remaining = provider.totalCredits - provider.usedCredits;
                  const isExpanded = expandedProvider === provider.id;

                  return (
                    <div
                      key={provider.id}
                      className="rounded-xl border border-border overflow-hidden transition-all"
                      style={{ borderLeftWidth: 3, borderLeftColor: provider.color }}
                    >
                      <button
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                      >
                        <span className="text-xl">{provider.logo}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                            <span className="text-xs font-bold text-foreground">${remaining.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: provider.color }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 space-y-1.5 border-t border-border/50 pt-2">
                              {provider.resources.map((res, i) => {
                                const Icon = res.icon;
                                const resPct = provider.usedCredits > 0 ? (res.cost / provider.usedCredits) * 100 : 0;
                                return (
                                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                                    <div
                                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                      style={{ background: `${res.color}15`, border: `1px solid ${res.color}20` }}
                                    >
                                      <Icon className="h-3 w-3" style={{ color: res.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-medium text-foreground truncate">{res.resource}</span>
                                        <span className="text-[11px] font-bold text-foreground">${res.cost.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[9px] text-muted-foreground">
                                          {res.count} uso{res.count > 1 ? 's' : ''} · {res.costPerUse}/uso
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">{resPct.toFixed(0)}%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-muted-foreground text-center pt-1">
                * Valores simulados. O custo real depende do modelo e parâmetros selecionados.
              </p>
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StudioCreditsPanel;
