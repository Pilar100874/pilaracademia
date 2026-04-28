import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  X, Wand2, Play, Image, Video, Music, Mic, Upload, ChevronDown, ChevronUp,
  Sparkles, Film, Eye, Trash2, GripVertical, PlayCircle, Link2, Check, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { StudioNode, StudioEdge, getNodeMeta } from './types';

export interface StoryboardScene {
  id: string;
  order: number;
  title: string;
  description: string;
  narration: string;
  duration: number;
  cameraMovement: string;
  mood: string;
  mediaType: 'image' | 'video' | 'none';
  mediaUrl?: string;
  mediaPrompt?: string;
  audioType: 'narration' | 'sfx' | 'music' | 'none';
  audioPrompt?: string;
  status: 'pending' | 'generating' | 'ready' | 'error';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateWorkflow: (scenes: StoryboardScene[]) => void;
}

const VIDEO_STYLES = [
  { value: 'cinematic', label: '🎬 Cinematográfico' },
  { value: 'documentary', label: '📹 Documentário' },
  { value: 'commercial', label: '📺 Comercial/Publicitário' },
  { value: 'social-media', label: '📱 Redes Sociais (Reels/TikTok)' },
  { value: 'explainer', label: '💡 Vídeo Explicativo' },
  { value: 'animation', label: '🎨 Animação/Motion Graphics' },
  { value: 'music-video', label: '🎵 Clipe Musical' },
  { value: 'tutorial', label: '📖 Tutorial/How-to' },
  { value: 'product', label: '🛍️ Showcase de Produto' },
  { value: 'storytelling', label: '📚 Narrativa/Storytelling' },
  { value: 'corporate', label: '🏢 Institucional/Corporativo' },
  { value: 'vlog', label: '🎙️ Vlog/Diário' },
];

const CAMERA_MOVEMENTS = [
  'Estático', 'Pan (Horizontal)', 'Tilt (Vertical)', 'Zoom In', 'Zoom Out',
  'Dolly (Avanço)', 'Tracking (Acompanhamento)', 'Órbita 360°', 'Drone Ascendente',
  'Drone Descendente', 'Handheld (Mão)', 'Steadicam', 'Timelapse', 'Slow Motion',
];

const MOODS = [
  'Épico', 'Dramático', 'Alegre', 'Melancólico', 'Misterioso', 'Energético',
  'Calmo', 'Tenso', 'Romântico', 'Nostálgico', 'Futurista', 'Sombrio',
];

const CreativeAgentPanel: React.FC<Props> = ({ open, onClose, onCreateWorkflow }) => {
  const [step, setStep] = useState<'input' | 'storyboard'>('input');
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [targetDuration, setTargetDuration] = useState('60');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const generateStoryboard = useCallback(async () => {
    if (!theme.trim()) {
      toast.error('Insira o tema do vídeo');
      return;
    }

    setIsGenerating(true);

    // Simulate AI storyboard generation
    await new Promise((r) => setTimeout(r, 2000));

    const totalDuration = parseInt(targetDuration);
    const numScenes = Math.max(3, Math.min(8, Math.ceil(totalDuration / 10)));
    const sceneDuration = Math.round(totalDuration / numScenes);

    const generatedScenes: StoryboardScene[] = [];
    const storyBeats = getStoryBeats(theme, style, numScenes);

    for (let i = 0; i < numScenes; i++) {
      generatedScenes.push({
        id: `scene_${Date.now()}_${i}`,
        order: i + 1,
        title: storyBeats[i]?.title || `Cena ${i + 1}`,
        description: storyBeats[i]?.description || `Descrição da cena ${i + 1}`,
        narration: storyBeats[i]?.narration || '',
        duration: sceneDuration,
        cameraMovement: storyBeats[i]?.camera || 'Estático',
        mood: storyBeats[i]?.mood || 'Épico',
        mediaType: 'none',
        audioType: i === 0 ? 'music' : 'narration',
        audioPrompt: storyBeats[i]?.audioPrompt || '',
        mediaPrompt: storyBeats[i]?.mediaPrompt || '',
        status: 'pending',
      });
    }

    setScenes(generatedScenes);
    setStep('storyboard');
    setIsGenerating(false);
    toast.success(`Storyboard com ${numScenes} cenas gerado!`);
  }, [theme, style, targetDuration]);

  const updateScene = useCallback((sceneId: string, updates: Partial<StoryboardScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)));
  }, []);

  const deleteScene = useCallback((sceneId: string) => {
    setScenes((prev) => {
      const filtered = prev.filter((s) => s.id !== sceneId);
      return filtered.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, []);

  const addScene = useCallback(() => {
    const newScene: StoryboardScene = {
      id: `scene_${Date.now()}`,
      order: scenes.length + 1,
      title: `Nova Cena ${scenes.length + 1}`,
      description: '',
      narration: '',
      duration: 5,
      cameraMovement: 'Estático',
      mood: 'Épico',
      mediaType: 'none',
      audioType: 'none',
      status: 'pending',
    };
    setScenes((prev) => [...prev, newScene]);
  }, [scenes.length]);

  const handleCreateWorkflow = useCallback(() => {
    if (scenes.length === 0) {
      toast.error('Adicione pelo menos uma cena');
      return;
    }
    onCreateWorkflow(scenes);
    toast.success('Workflow criado a partir do storyboard!');
  }, [scenes, onCreateWorkflow]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-5xl max-h-[90vh] bg-[#0f0f1a] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Agente Criativo</h2>
              <p className="text-xs text-white/50">
                {step === 'input' ? 'Defina o tema e estilo do seu vídeo' : `Storyboard • ${scenes.length} cenas`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'storyboard' && (
              <Button
                onClick={() => setStep('input')}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                ← Voltar
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          {step === 'input' ? (
            <div className="p-6 space-y-6">
              {/* Theme */}
              <div className="space-y-2">
                <Label className="text-sm text-white/80 font-medium">🎬 Tema do Vídeo</Label>
                <Textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex: Uma jornada pela história da cafeicultura brasileira, mostrando desde as plantações coloniais até as fazendas modernas de café especial..."
                  rows={4}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                />
              </div>

              {/* Style */}
              <div className="space-y-2">
                <Label className="text-sm text-white/80 font-medium">🎨 Estilo Visual</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-sm text-white/80 font-medium">⏱️ Duração Total (segundos)</Label>
                <Select value={targetDuration} onValueChange={setTargetDuration}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15s (Stories/Reels)</SelectItem>
                    <SelectItem value="30">30s (Comercial curto)</SelectItem>
                    <SelectItem value="60">60s (Padrão)</SelectItem>
                    <SelectItem value="90">90s (Extended)</SelectItem>
                    <SelectItem value="120">2 minutos</SelectItem>
                    <SelectItem value="180">3 minutos</SelectItem>
                    <SelectItem value="300">5 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label className="text-sm text-white/80 font-medium">📝 Notas Adicionais (opcional)</Label>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Detalhes extras sobre público-alvo, marca, referências visuais..."
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateStoryboard}
                disabled={isGenerating || !theme.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-6 text-base font-semibold gap-3 rounded-xl"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gerando Storyboard...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Gerar Storyboard com IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Summary bar */}
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-4 text-xs text-white/60">
                  <span>📽️ {scenes.length} cenas</span>
                  <span>⏱️ {scenes.reduce((a, s) => a + s.duration, 0)}s total</span>
                  <span>🎨 {VIDEO_STYLES.find((s) => s.value === style)?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={addScene}
                    size="sm"
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/10 gap-1 text-xs"
                  >
                    + Adicionar Cena
                  </Button>
                </div>
              </div>

              {/* Scenes */}
              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  isExpanded={expandedScene === scene.id}
                  onToggleExpand={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}
                  onUpdate={(updates) => updateScene(scene.id, updates)}
                  onDelete={() => deleteScene(scene.id)}
                />
              ))}

              {/* Create Workflow */}
              <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                <Button
                  onClick={handleCreateWorkflow}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-5 text-base font-semibold gap-3 rounded-xl"
                >
                  <Film className="h-5 w-5" />
                  Criar Workflow a partir do Storyboard
                </Button>
                <Button
                  onClick={generateStoryboard}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent gap-2 py-5 rounded-xl"
                >
                  <Sparkles className="h-4 w-4" />
                  Regenerar
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
};

/* ---- Scene Card Sub-component ---- */
interface SceneCardProps {
  scene: StoryboardScene;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<StoryboardScene>) => void;
  onDelete: () => void;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, isExpanded, onToggleExpand, onUpdate, onDelete }) => {
  return (
    <motion.div
      layout
      className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/15 transition-colors"
    >
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-bold shrink-0">
          {scene.order}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white/90 truncate">{scene.title}</span>
            <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 shrink-0">
              {scene.duration}s
            </Badge>
            {scene.mediaType !== 'none' && (
              <Badge className="text-[10px] bg-green-500/20 text-green-300 border-0 shrink-0">
                {scene.mediaType === 'image' ? '🖼️' : '🎬'} Mídia
              </Badge>
            )}
            {scene.audioType !== 'none' && (
              <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-0 shrink-0">
                🔊 Áudio
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/40 truncate mt-0.5">{scene.description}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-white/30" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/30" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
              {/* Title & Description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/60">Título da Cena</Label>
                  <Input
                    value={scene.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    className="mt-1 bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/60">Duração (s)</Label>
                  <Input
                    type="number"
                    value={scene.duration}
                    onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 5 })}
                    className="mt-1 bg-white/5 border-white/10 text-white text-sm"
                    min={1}
                    max={60}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-white/60">Descrição Visual</Label>
                <Textarea
                  value={scene.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  rows={2}
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
                  placeholder="Descreva o que acontece visualmente nesta cena..."
                />
              </div>

              <div>
                <Label className="text-xs text-white/60">Narração / Texto em Tela</Label>
                <Textarea
                  value={scene.narration}
                  onChange={(e) => onUpdate({ narration: e.target.value })}
                  rows={2}
                  className="mt-1 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
                  placeholder="Texto que será narrado ou exibido na tela..."
                />
              </div>

              {/* Camera & Mood */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white/60">Movimento de Câmera</Label>
                  <Select value={scene.cameraMovement} onValueChange={(v) => onUpdate({ cameraMovement: v })}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENTS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-white/60">Clima / Mood</Label>
                  <Select value={scene.mood} onValueChange={(v) => onUpdate({ mood: v })}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOODS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Media Attachment */}
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/70 font-medium flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Vincular Mídia
                  </Label>
                  <Select
                    value={scene.mediaType}
                    onValueChange={(v) => onUpdate({ mediaType: v as any })}
                  >
                    <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white text-xs h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="image">🖼️ Imagem</SelectItem>
                      <SelectItem value="video">🎬 Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scene.mediaType !== 'none' && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] text-white/50">Prompt para geração</Label>
                      <Textarea
                        value={scene.mediaPrompt || ''}
                        onChange={(e) => onUpdate({ mediaPrompt: e.target.value })}
                        rows={2}
                        className="mt-1 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20"
                        placeholder={`Prompt para gerar ${scene.mediaType === 'image' ? 'a imagem' : 'o vídeo'} desta cena...`}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-white/50">Ou insira URL de mídia existente</Label>
                      <Input
                        value={scene.mediaUrl || ''}
                        onChange={(e) => onUpdate({ mediaUrl: e.target.value })}
                        className="mt-1 bg-white/5 border-white/10 text-white text-xs"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Attachment */}
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/70 font-medium flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" />
                    Áudio da Cena
                  </Label>
                  <Select
                    value={scene.audioType}
                    onValueChange={(v) => onUpdate({ audioType: v as any })}
                  >
                    <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white text-xs h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="narration">🎙️ Narração</SelectItem>
                      <SelectItem value="sfx">🔊 Efeito Sonoro</SelectItem>
                      <SelectItem value="music">🎵 Música</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scene.audioType !== 'none' && (
                  <div>
                    <Label className="text-[11px] text-white/50">
                      {scene.audioType === 'narration' ? 'Texto para narrar' :
                       scene.audioType === 'music' ? 'Prompt para música' : 'Descrição do efeito sonoro'}
                    </Label>
                    <Textarea
                      value={scene.audioPrompt || (scene.audioType === 'narration' ? scene.narration : '')}
                      onChange={(e) => onUpdate({ audioPrompt: e.target.value })}
                      rows={2}
                      className="mt-1 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20"
                      placeholder="Descreva o áudio desta cena..."
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ---- Story Beat Generator (mock) ---- */
function getStoryBeats(theme: string, style: string, count: number) {
  const beats = [
    {
      title: 'Abertura',
      description: `Plano de abertura estabelecendo o cenário: ${theme}. Tons cinematográficos com iluminação natural.`,
      narration: `Descubra a história por trás de ${theme.slice(0, 50)}...`,
      camera: 'Drone Ascendente',
      mood: 'Épico',
      mediaPrompt: `Establishing shot of ${theme}, cinematic ${style} style, golden hour lighting, 8K`,
      audioPrompt: `Música orquestral épica crescendo, estilo ${style}`,
    },
    {
      title: 'Contexto',
      description: `Contextualização do tema. Detalhes históricos ou explicação inicial sobre "${theme}".`,
      narration: `Para entender o presente, precisamos voltar ao passado...`,
      camera: 'Pan (Horizontal)',
      mood: 'Dramático',
      mediaPrompt: `Close-up details related to ${theme}, documentary style, warm tones`,
      audioPrompt: `Narração dramática sobre a história de ${theme.slice(0, 30)}`,
    },
    {
      title: 'Desenvolvimento',
      description: `O coração da narrativa. Mostrando processos, pessoas e elementos-chave de "${theme}".`,
      narration: `É aqui que a magia acontece...`,
      camera: 'Tracking (Acompanhamento)',
      mood: 'Energético',
      mediaPrompt: `Dynamic shot of main subject of ${theme}, energetic composition, ${style} aesthetic`,
      audioPrompt: `Música energética com batida crescente`,
    },
    {
      title: 'Momento Emocional',
      description: `Ponto emocional da narrativa. Close-ups de detalhes e expressões ligadas a "${theme}".`,
      narration: `Por trás de cada detalhe, há uma história...`,
      camera: 'Zoom In',
      mood: 'Melancólico',
      mediaPrompt: `Emotional close-up moment, ${theme}, intimate lighting, bokeh`,
      audioPrompt: `Piano suave e emotivo, estilo trilha sonora de filme`,
    },
    {
      title: 'Clímax',
      description: `O ponto alto do vídeo. Revelação impactante ou momento decisivo sobre "${theme}".`,
      narration: `E então, tudo muda...`,
      camera: 'Órbita 360°',
      mood: 'Épico',
      mediaPrompt: `Climactic moment of ${theme}, dramatic lighting, epic composition`,
      audioPrompt: `Crescendo orquestral intenso com percussão`,
    },
    {
      title: 'Resolução',
      description: `Desdobramento após o clímax. Mostrando resultados ou consequências ligadas a "${theme}".`,
      narration: `O resultado superou todas as expectativas...`,
      camera: 'Dolly (Avanço)',
      mood: 'Calmo',
      mediaPrompt: `Resolution scene of ${theme}, calm atmosphere, soft lighting`,
      audioPrompt: `Música suave e contemplativa`,
    },
    {
      title: 'Reflexão',
      description: `Momento de reflexão sobre o tema abordado. Imagens poéticas conectadas a "${theme}".`,
      narration: `Cada jornada nos ensina algo novo...`,
      camera: 'Slow Motion',
      mood: 'Nostálgico',
      mediaPrompt: `Reflective montage of ${theme}, poetic imagery, golden tones`,
      audioPrompt: `Melodia nostálgica com violino`,
    },
    {
      title: 'Encerramento',
      description: `Plano final. Call-to-action ou mensagem de encerramento sobre "${theme}".`,
      narration: `Essa é apenas o começo. Junte-se a nós nessa jornada.`,
      camera: 'Drone Descendente',
      mood: 'Épico',
      mediaPrompt: `Closing shot of ${theme}, sunset/sunrise, cinematic final frame`,
      audioPrompt: `Música épica com resolução emocional, fade out`,
    },
  ];

  return beats.slice(0, count);
}

export default CreativeAgentPanel;
