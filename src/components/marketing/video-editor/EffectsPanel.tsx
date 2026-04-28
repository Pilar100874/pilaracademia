import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimelineClip, EFFECT_PRESETS, TRANSITION_PRESETS, VideoFilter, TransitionType, ClipTransition, FilterType } from './types';
import { Sparkles, Wand2, X, ArrowRightToLine, ArrowLeftFromLine, Eye, ChevronDown, ChevronRight, Zap, Clock, Plus, RotateCcw, Search } from 'lucide-react';
import TransitionPreviewThumb from './TransitionPreviewThumb';

interface Props {
  selectedClip?: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onPreviewTransition?: (clipId: string, phase: 'entrance' | 'exit') => void;
  onToggleFilterPreview?: (active: boolean) => void;
}

const TRANSITION_CATEGORIES = [
  { id: 'cinematic', label: '🎬 Cinematográfico', icon: '🎬', types: ['cinematic-fade', 'dolly-zoom', 'lens-flare', 'anamorphic-wipe', 'rack-focus', 'letterbox-reveal', 'speed-ramp', 'film-grain-fade', 'smoke-reveal', 'prism-shift'] as TransitionType[] },
  { id: 'ugc', label: '📱 UGC / Social', icon: '📱', types: ['snap-cut', 'phone-swipe-up', 'phone-swipe-left', 'tiktok-zoom', 'vlog-jump', 'selfie-flip', 'story-slide', 'boomerang', 'hand-block', 'quick-pan'] as TransitionType[] },
  { id: 'brands', label: '🏆 Marcas Famosas', icon: '🏆', types: ['nike-swoosh', 'apple-fade', 'netflix-punch', 'adidas-stripe', 'coca-wave', 'samsung-fold', 'google-morph', 'disney-sparkle', 'supreme-drop', 'luxury-curtain'] as TransitionType[] },
  { id: 'basic', label: 'Básicas', icon: '✨', types: ['fade', 'dissolve', 'crossfade', 'fade-blur', 'luma-fade'] as TransitionType[] },
  { id: 'movement', label: 'Movimento', icon: '🔀', types: ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'roll-left', 'roll-right', 'whip-pan'] as TransitionType[] },
  { id: 'push-cover', label: 'Push/Cover', icon: '📑', types: ['push-left', 'push-right', 'push-up', 'push-down', 'cover-left', 'cover-right', 'reveal-left', 'reveal-right'] as TransitionType[] },
  { id: 'scale', label: 'Escala & Rotação', icon: '🔍', types: ['zoom-in', 'zoom-out', 'scale-up', 'scale-down', 'morph-scale', 'rotate-in', 'rotate-out', 'spiral', 'flip-x', 'flip-y', 'cross-zoom', 'cross-spin'] as TransitionType[] },
  { id: 'dynamic', label: 'Dinâmicas', icon: '🎢', types: ['bounce', 'elastic', 'swing', 'shake', 'drop', 'tumble'] as TransitionType[] },
  { id: 'reveal', label: 'Revelação & Wipe', icon: '🎭', types: ['wipe-left', 'wipe-right', 'wipe-up', 'wipe-down', 'wipe-circle', 'wipe-diamond', 'iris-open', 'iris-close', 'split-horizontal', 'split-vertical', 'clock-wipe', 'radial-wipe', 'blinds-h', 'blinds-v', 'color-wipe'] as TransitionType[] },
  { id: '3d', label: '3D & Perspectiva', icon: '🧊', types: ['cube-left', 'cube-right', 'page-curl', 'door-open', 'door-close', 'stretch-h', 'stretch-v', 'fly-in', 'fly-out'] as TransitionType[] },
  { id: 'special', label: 'Efeitos Especiais', icon: '⚡', types: ['blur-transition', 'flash', 'glitch', 'pixelate', 'light-leak', 'film-burn', 'ripple', 'mosaic', 'spin-out'] as TransitionType[] },
];

const FILTER_CATEGORIES = [
  { id: 'cor', label: 'Cor', presets: ['cinematic', 'cinematic-teal', 'vintage', 'vivid', 'warm', 'cold', 'sunset', 'bw', 'noir'] },
  { id: 'estilo', label: 'Estilo', presets: ['dreamy', 'hdr', 'matte', 'bleach', 'lomo', 'retro-vhs'] },
  { id: 'especial', label: 'Especial', presets: ['negative', 'xray', 'cyberpunk'] },
];

const INDIVIDUAL_FILTERS: { type: FilterType; label: string; icon: string; defaultValue: number }[] = [
  { type: 'brightness', label: 'Brilho', icon: '☀️', defaultValue: 50 },
  { type: 'contrast', label: 'Contraste', icon: '◐', defaultValue: 50 },
  { type: 'saturation', label: 'Saturação', icon: '🎨', defaultValue: 50 },
  { type: 'hue-rotate', label: 'Matiz', icon: '🌈', defaultValue: 0 },
  { type: 'blur', label: 'Desfoque', icon: '💫', defaultValue: 0 },
  { type: 'grayscale', label: 'Escala Cinza', icon: '⬜', defaultValue: 0 },
  { type: 'sepia', label: 'Sépia', icon: '📜', defaultValue: 0 },
  { type: 'invert', label: 'Inverter', icon: '🔄', defaultValue: 0 },
  { type: 'opacity', label: 'Opacidade', icon: '👁️', defaultValue: 100 },
  { type: 'drop-shadow', label: 'Sombra', icon: '🌑', defaultValue: 0 },
];

const EASING_OPTIONS = [
  { value: 'ease-out', label: 'Suave (Ease Out)' },
  { value: 'ease-in', label: 'Acelerado (Ease In)' },
  { value: 'ease-in-out', label: 'Suave Duplo' },
  { value: 'linear', label: 'Linear' },
  { value: 'elastic', label: 'Elástico' },
];

const EffectsPanel: React.FC<Props> = ({ selectedClip, onUpdateClip, onPreviewTransition, onToggleFilterPreview }) => {
  const [activeTab, setActiveTab] = useState<'transitions' | 'filters'>('transitions');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ basic: true, movement: false, scale: false, dynamic: false, reveal: false, special: false });
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPreviewActive, setFilterPreviewActive] = useState(false);
  const [expandedFilterCats, setExpandedFilterCats] = useState<Record<string, boolean>>({ cor: true, estilo: true, especial: true });

  if (!selectedClip) {
    return null;
  }

  const isVisual = ['video', 'image', 'canvas'].includes(selectedClip.type);
  const entranceTransition = selectedClip.transitions?.entrance;
  const exitTransition = selectedClip.transitions?.exit;

  const setTransition = (phase: 'entrance' | 'exit', type: TransitionType) => {
    const current = selectedClip.transitions || {};
    if (type === 'none') {
      onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
    } else {
      onUpdateClip(selectedClip.id, {
        transitions: { ...current, [phase]: { type, duration: current[phase]?.duration || 0.5, easing: current[phase]?.easing || 'ease-out' } },
      });
    }
  };

  const setTransitionDuration = (phase: 'entrance' | 'exit', duration: number) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: { ...current[phase]!, duration } } });
  };

  const setTransitionEasing = (phase: 'entrance' | 'exit', easing: string) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: { ...current[phase]!, easing } } });
  };

  const removeTransition = (phase: 'entrance' | 'exit') => {
    const current = selectedClip.transitions || {};
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
  };

  const toggleCategory = (id: string) => setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));

  const applyPreset = (presetId: string) => {
    const preset = EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const filters: VideoFilter[] = preset.filters.map((f, i) => ({ ...f, id: `f_${Date.now()}_${i}` }));
    onUpdateClip(selectedClip.id, { filters });
  };

  const addFilter = (type: FilterType) => {
    const def = INDIVIDUAL_FILTERS.find(f => f.type === type);
    if (!def) return;
    const existing = selectedClip.filters || [];
    if (existing.some(f => f.type === type)) return;
    onUpdateClip(selectedClip.id, {
      filters: [...existing, { id: `f_${Date.now()}`, type, label: def.label, value: def.defaultValue, enabled: true }],
    });
  };

  const updateFilter = (filterId: string, updates: Partial<VideoFilter>) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).map((f) => f.id === filterId ? { ...f, ...updates } : f),
    });
  };

  const removeFilter = (filterId: string) => {
    onUpdateClip(selectedClip.id, { filters: (selectedClip.filters || []).filter((f) => f.id !== filterId) });
  };

  const resetFilters = () => {
    onUpdateClip(selectedClip.id, { filters: [] });
  };

  const toggleFilterPreview = () => {
    const next = !filterPreviewActive;
    setFilterPreviewActive(next);
    onToggleFilterPreview?.(next);
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full shrink-0 h-9 rounded-none bg-muted/40 px-1">
          <TabsTrigger value="transitions" className="text-[11px] gap-1.5 flex-1 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
            <Zap className="h-3.5 w-3.5" /> Transições
          </TabsTrigger>
          <TabsTrigger value="filters" className="text-[11px] gap-1.5 flex-1 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
            <Wand2 className="h-3.5 w-3.5" /> Filtros
          </TabsTrigger>
        </TabsList>

        {/* === TRANSITIONS TAB === */}
        <TabsContent value="transitions" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!isVisual ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs">Transições visuais apenas para vídeo, imagem e canvas</p>
                </div>
              ) : (
                <>
                  <ActiveTransitionBar
                    label="Entrada" icon={<ArrowRightToLine className="h-3 w-3 text-emerald-500" />}
                    transition={entranceTransition} color="emerald"
                    onDurationChange={(d) => setTransitionDuration('entrance', d)}
                    onEasingChange={(e) => setTransitionEasing('entrance', e)}
                    onRemove={() => removeTransition('entrance')}
                    onPreview={() => onPreviewTransition?.(selectedClip.id, 'entrance')}
                  />
                  <ActiveTransitionBar
                    label="Saída" icon={<ArrowLeftFromLine className="h-3 w-3 text-amber-500" />}
                    transition={exitTransition} color="amber"
                    onDurationChange={(d) => setTransitionDuration('exit', d)}
                    onEasingChange={(e) => setTransitionEasing('exit', e)}
                    onRemove={() => removeTransition('exit')}
                    onPreview={() => onPreviewTransition?.(selectedClip.id, 'exit')}
                    isExit
                  />
                  <TransitionPhasePicker
                    entranceType={entranceTransition?.type} exitType={exitTransition?.type}
                    expandedCategories={expandedCategories} onToggleCategory={toggleCategory}
                    onSelectEntrance={(t) => setTransition('entrance', t)}
                    onSelectExit={(t) => setTransition('exit', t)}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* === FILTERS TAB === */}
        <TabsContent value="filters" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Top toolbar */}
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant={filterPreviewActive ? 'default' : 'outline'} className="text-[9px] h-7 gap-1 flex-1" onClick={toggleFilterPreview}>
                  <Eye className="h-3 w-3" />
                  {filterPreviewActive ? 'Preview ON' : 'Simular'}
                </Button>
                <Button size="sm" variant="outline" className="text-[9px] h-7 gap-1" onClick={resetFilters} disabled={!selectedClip.filters?.length}>
                  <RotateCcw className="h-3 w-3" /> Resetar
                </Button>
              </div>

              {/* Filter Presets by Category */}
              {FILTER_CATEGORIES.map(cat => {
                const isExpanded = expandedFilterCats[cat.id] !== false;
                const presets = EFFECT_PRESETS.filter(p => cat.presets.includes(p.id));
                return (
                  <div key={cat.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFilterCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-[10px] font-semibold flex-1">{cat.label}</span>
                      <span className="text-[8px] text-muted-foreground">{presets.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="grid grid-cols-3 gap-1 p-1.5">
                        {presets.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => applyPreset(preset.id)}
                            className="flex flex-col items-center gap-0.5 p-1.5 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                            title={preset.description}
                          >
                            <span className="text-sm leading-none">{preset.icon}</span>
                            <span className="text-[8px] font-medium leading-tight">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add individual filter */}
              <div>
                <Label className="text-[10px] font-semibold flex items-center gap-1 mb-1.5">
                  <Plus className="h-3 w-3" /> Adicionar Filtro Individual
                </Label>
                <div className="grid grid-cols-2 gap-1">
                  {INDIVIDUAL_FILTERS.map(f => {
                    const alreadyAdded = selectedClip.filters?.some(ef => ef.type === f.type);
                    return (
                      <button
                        key={f.type}
                        onClick={() => addFilter(f.type)}
                        disabled={alreadyAdded}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium border transition-all ${
                          alreadyAdded ? 'opacity-40 cursor-not-allowed border-border/30' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs">{f.icon}</span>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active filters with sliders */}
              {(selectedClip.filters?.length ?? 0) > 0 && (
                <div>
                  <Label className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                    <Wand2 className="h-3 w-3" /> Filtros Ativos ({selectedClip.filters?.length})
                  </Label>
                  <div className="space-y-1.5">
                    {selectedClip.filters!.map((filter) => {
                      const def = INDIVIDUAL_FILTERS.find(f => f.type === filter.type);
                      return (
                        <div key={filter.id} className="border rounded-lg p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{def?.icon || '🔧'}</span>
                              <span className="text-[10px] font-medium">{filter.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-muted-foreground tabular-nums w-7 text-right">{filter.value}%</span>
                              <Switch checked={filter.enabled} onCheckedChange={(v) => updateFilter(filter.id, { enabled: v })} />
                              <button onClick={() => removeFilter(filter.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <Slider
                            value={[filter.value]}
                            onValueChange={([v]) => updateFilter(filter.id, { value: v })}
                            min={0} max={100} step={1}
                            disabled={!filter.enabled}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* =================== ActiveTransitionBar =================== */

interface ActiveTransitionBarProps {
  label: string;
  icon: React.ReactNode;
  transition?: ClipTransition;
  color: 'emerald' | 'amber';
  onDurationChange: (d: number) => void;
  onEasingChange: (e: string) => void;
  onRemove: () => void;
  onPreview: () => void;
  isExit?: boolean;
}

const ActiveTransitionBar: React.FC<ActiveTransitionBarProps> = ({
  label, icon, transition, color, onDurationChange, onEasingChange, onRemove, onPreview, isExit,
}) => {
  if (!transition || transition.type === 'none') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-border/60 bg-muted/20">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
          <p className="text-[8px] text-muted-foreground/60">Selecione uma transição abaixo</p>
        </div>
      </div>
    );
  }

  const preset = TRANSITION_PRESETS.find(p => p.type === transition.type);
  const borderClass = color === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5';

  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${borderClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <TransitionPreviewThumb type={transition.type} isExit={isExit} isActive size={30} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold">{preset?.label || transition.type}</p>
            <p className="text-[7px] text-muted-foreground leading-tight">{preset?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onPreview} title="Simular"><Eye className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onRemove} title="Remover"><X className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[9px] text-muted-foreground shrink-0 w-7">{transition.duration.toFixed(1)}s</span>
        <Slider value={[transition.duration]} onValueChange={([v]) => onDurationChange(v)} min={0.1} max={3} step={0.1} className="flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
        <Select value={transition.easing || 'ease-out'} onValueChange={onEasingChange}>
          <SelectTrigger className="h-6 text-[9px] flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EASING_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-[10px]">{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

/* =================== TransitionPhasePicker =================== */

interface TransitionPhasePickerProps {
  entranceType?: TransitionType;
  exitType?: TransitionType;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (id: string) => void;
  onSelectEntrance: (type: TransitionType) => void;
  onSelectExit: (type: TransitionType) => void;
}

const TransitionPhasePicker: React.FC<TransitionPhasePickerProps> = ({
  entranceType, exitType, expandedCategories, onToggleCategory, onSelectEntrance, onSelectExit,
}) => {
  const [phase, setPhase] = useState<'entrance' | 'exit'>('entrance');
  const activeType = phase === 'entrance' ? entranceType : exitType;
  const onSelect = phase === 'entrance' ? onSelectEntrance : onSelectExit;

  return (
    <div className="space-y-2">
      <div className="flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setPhase('entrance')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors border-r ${
            phase === 'entrance' ? 'bg-emerald-500/15 text-emerald-600' : 'hover:bg-muted/50'
          }`}
        >
          <ArrowRightToLine className="h-3 w-3" /> Entrada
          {entranceType && entranceType !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>
        <button
          onClick={() => setPhase('exit')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
            phase === 'exit' ? 'bg-amber-500/15 text-amber-600' : 'hover:bg-muted/50'
          }`}
        >
          <ArrowLeftFromLine className="h-3 w-3" /> Saída
          {exitType && exitType !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>
      </div>

      {TRANSITION_CATEGORIES.map(cat => {
        const isExpanded = expandedCategories[cat.id] !== false;
        const presets = TRANSITION_PRESETS.filter(p => cat.types.includes(p.type));
        const hasActive = presets.some(p => p.type === activeType);

        return (
          <div key={cat.id} className={`border rounded-lg overflow-hidden ${hasActive ? 'border-primary/30' : ''}`}>
            <button
              onClick={() => onToggleCategory(cat.id)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span className="text-xs">{cat.icon}</span>
              <span className="text-[10px] font-semibold flex-1">{cat.label}</span>
              {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              <span className="text-[8px] text-muted-foreground">{presets.length}</span>
            </button>
            {isExpanded && (
              <div className="grid grid-cols-3 gap-1 p-1.5">
                {presets.map(preset => {
                  const isActive = activeType === preset.type;
                  return (
                    <button
                      key={preset.type}
                      onClick={() => onSelect(preset.type)}
                      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-all ${
                        isActive ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <TransitionPreviewThumb type={preset.type} isExit={phase === 'exit'} isActive={isActive} size={40} />
                      <span className="text-[8px] font-medium leading-tight">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EffectsPanel;
