import React, { useState, useEffect, useMemo } from 'react';
import { StudioNode, StudioEdge, getNodeMeta, StudioNodeType } from './types';
import { useNodeResult } from './useNodeResults';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Play, SkipForward, Settings2, Sparkles, RotateCcw, AlertTriangle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  node: StudioNode;
  onUpdateConfig: (nodeId: string, config: Record<string, any>) => void;
  onClose: () => void;
  onExecuteFromNode?: (nodeId: string) => void;
  allNodes?: StudioNode[];
  allEdges?: StudioEdge[];
}

type ModelInfo = { value: string; label: string; provider: string; cost: '$' | '$$' | '$$$' | '$$$$' | 'GRÁTIS'; quality: 1 | 2 | 3 | 4 | 5; tip: string; supportsMultiRef?: boolean };

const LLM_MODELS: ModelInfo[] = [
  { value: 'google/gemini-2.5-flash', label: '🟦 Gemini 2.5 Flash', provider: 'Google', cost: '$', quality: 4, tip: 'Rápido e econômico, ótimo custo-benefício' },
  { value: 'google/gemini-2.5-flash-lite', label: '🟦 Gemini 2.5 Flash Lite', provider: 'Google', cost: '$', quality: 3, tip: 'Mais barato, bom para tarefas simples' },
  { value: 'google/gemini-2.5-pro', label: '🟦 Gemini 2.5 Pro', provider: 'Google', cost: '$$$', quality: 5, tip: 'Top de linha Google, melhor raciocínio' },
  { value: 'google/gemini-3-flash-preview', label: '🟦 Gemini 3 Flash', provider: 'Google', cost: '$', quality: 4, tip: 'Nova geração, rápido e capaz' },
  { value: 'google/gemini-3-pro-preview', label: '🟦 Gemini 3 Pro', provider: 'Google', cost: '$$$', quality: 5, tip: 'Nova geração Pro, máxima qualidade' },
  { value: 'openai/gpt-5', label: '🟢 GPT-5', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Poderoso, caro, excelente raciocínio' },
  { value: 'openai/gpt-5-mini', label: '🟢 GPT-5 Mini', provider: 'OpenAI', cost: '$$', quality: 4, tip: 'Bom equilíbrio custo vs qualidade' },
  { value: 'openai/gpt-5-nano', label: '🟢 GPT-5 Nano', provider: 'OpenAI', cost: '$', quality: 3, tip: 'Econômico, tarefas simples e rápidas' },
  { value: 'openai/gpt-5.2', label: '🟢 GPT-5.2', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Mais recente OpenAI, raciocínio avançado' },
];

// Image models: supportsMultiRef = true means the model can accept multiple reference images (product + person) and compose them.
// Models that only generate from text prompts (no image input) or single-image-only cannot reliably compose two subjects.
const IMAGE_MODELS: ModelInfo[] = [
  { value: 'google/imagefx', label: '🟦 Google ImageFX', provider: 'Google', cost: '$', quality: 3, tip: 'Gratuito, qualidade básica', supportsMultiRef: false },
  { value: 'google/gemini-2.5-flash-image', label: '🟦 Gemini Flash Image', provider: 'Google', cost: '$', quality: 4, tip: 'Rápido e econômico para imagens', supportsMultiRef: true },
  { value: 'google/gemini-3-pro-image-preview', label: '🟦 Gemini 3 Pro Image', provider: 'Google', cost: '$$', quality: 5, tip: 'Nova geração, alta qualidade', supportsMultiRef: true },
  { value: 'openai/dall-e-4', label: '🟢 DALL·E 4', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Máxima qualidade, mais caro', supportsMultiRef: true },
  { value: 'openai/dall-e-3', label: '🟢 DALL·E 3', provider: 'OpenAI', cost: '$$$', quality: 4, tip: 'Boa qualidade, custo moderado', supportsMultiRef: false },
  { value: 'stability/sd3.5-turbo', label: '🟣 SD 3.5 Turbo', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Rápido e barato', supportsMultiRef: false },
  { value: 'stability/sd3', label: '🟣 Stable Diffusion 3', provider: 'Stability AI', cost: '$$', quality: 4, tip: 'Boa qualidade, open source', supportsMultiRef: false },
  { value: 'stability/sdxl', label: '🟣 Stable Diffusion XL', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Versátil, custo baixo', supportsMultiRef: false },
  { value: 'midjourney/v7', label: '🔵 Midjourney v7', provider: 'Midjourney', cost: '$$$$', quality: 5, tip: 'Líder em estética, premium', supportsMultiRef: false },
  { value: 'midjourney/v6.1', label: '🔵 Midjourney v6.1', provider: 'Midjourney', cost: '$$$', quality: 5, tip: 'Excelente qualidade artística', supportsMultiRef: false },
  { value: 'flux/1.1-pro', label: '⚡ Flux 1.1 Pro', provider: 'Black Forest Labs', cost: '$$', quality: 4, tip: 'Alta qualidade, boa velocidade', supportsMultiRef: false },
  { value: 'flux/schnell', label: '⚡ Flux Schnell', provider: 'Black Forest Labs', cost: '$', quality: 3, tip: 'Ultra rápido, qualidade OK', supportsMultiRef: false },
  { value: 'ideogram/v3', label: '🎨 Ideogram v3', provider: 'Ideogram', cost: '$$', quality: 4, tip: 'Excelente com texto em imagens', supportsMultiRef: false },
  { value: 'adobe/firefly-3', label: '🔥 Adobe Firefly 3', provider: 'Adobe', cost: '$$$', quality: 4, tip: 'Comercialmente seguro, boa qualidade', supportsMultiRef: false },
  // Apiframe image models
  { value: 'apiframe/midjourney', label: '⚡ AF: Midjourney', provider: 'Apiframe', cost: '$$', quality: 5, tip: 'Via Apiframe, 4-6 créditos', supportsMultiRef: false },
  { value: 'apiframe/flux-schnell', label: '⚡ AF: Flux Schnell', provider: 'Apiframe', cost: '$', quality: 3, tip: 'Via Apiframe, 1 crédito', supportsMultiRef: false },
  { value: 'apiframe/flux-pro', label: '⚡ AF: Flux Pro', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe, 1 crédito', supportsMultiRef: false },
  { value: 'apiframe/flux-dev', label: '⚡ AF: Flux Dev', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe', supportsMultiRef: false },
  { value: 'apiframe/ideogram', label: '⚡ AF: Ideogram v3', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe, 3 créditos', supportsMultiRef: false },
  { value: 'apiframe/dall-e', label: '⚡ AF: DALL-E', provider: 'Apiframe', cost: '$$', quality: 5, tip: 'Via Apiframe', supportsMultiRef: false },
  { value: 'apiframe/gpt-image', label: '⚡ AF: GPT Image', provider: 'Apiframe', cost: '$$', quality: 5, tip: 'Via Apiframe', supportsMultiRef: true },
  { value: 'apiframe/nano-banana', label: '⚡ AF: Nano Banana', provider: 'Apiframe', cost: '$', quality: 3, tip: 'Via Apiframe', supportsMultiRef: false },
  { value: 'apiframe/seedream', label: '⚡ AF: Seedream', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe', supportsMultiRef: false },
  { value: 'apiframe/reve', label: '⚡ AF: Reve', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe', supportsMultiRef: false },
  { value: 'apiframe/kling-image', label: '⚡ AF: Kling Image', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe', supportsMultiRef: false },
  { value: 'apiframe/faceswap', label: '⚡ AF: Faceswap', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe, 2 créditos', supportsMultiRef: false },
  // AIML API image models
  { value: 'aimlapi/flux-schnell', label: '🤖 ML: Flux Schnell', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API, $0.003' },
  { value: 'aimlapi/flux-pro', label: '🤖 ML: Flux Pro', provider: 'AIML API', cost: '$$', quality: 4, tip: 'Via AIML API, $0.05' },
  { value: 'aimlapi/flux-dev', label: '🤖 ML: Flux Dev', provider: 'AIML API', cost: '$', quality: 4, tip: 'Via AIML API' },
  { value: 'aimlapi/dall-e-3', label: '🤖 ML: DALL-E 3', provider: 'AIML API', cost: '$$', quality: 5, tip: 'Via AIML API, $0.04' },
  { value: 'aimlapi/sd3', label: '🤖 ML: Stable Diffusion 3', provider: 'AIML API', cost: '$', quality: 4, tip: 'Via AIML API, $0.035' },
  { value: 'aimlapi/sdxl', label: '🤖 ML: SDXL', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API' },
  { value: 'aimlapi/midjourney', label: '🤖 ML: Midjourney', provider: 'AIML API', cost: '$$$', quality: 5, tip: 'Via AIML API' },
  { value: 'aimlapi/ideogram', label: '🤖 ML: Ideogram', provider: 'AIML API', cost: '$$', quality: 4, tip: 'Via AIML API' },
  { value: 'aimlapi/recraft-v3', label: '🤖 ML: Recraft V3', provider: 'AIML API', cost: '$$', quality: 4, tip: 'Via AIML API' },
  { value: 'aimlapi/playground-v3', label: '🤖 ML: Playground v3', provider: 'AIML API', cost: '$', quality: 4, tip: 'Via AIML API' },
  // Pollo AI image models
  { value: 'polloai/flux-schnell', label: '🐔 PL: Flux Schnell', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI, 1 crédito' },
  { value: 'polloai/flux-pro', label: '🐔 PL: Flux Pro', provider: 'Pollo AI', cost: '$$', quality: 4, tip: 'Via Pollo AI, 5 créditos' },
  { value: 'polloai/ideogram', label: '🐔 PL: Ideogram v2', provider: 'Pollo AI', cost: '$', quality: 4, tip: 'Via Pollo AI, 2 créditos' },
  { value: 'polloai/recraft-v3', label: '🐔 PL: Recraft V3', provider: 'Pollo AI', cost: '$$', quality: 4, tip: 'Via Pollo AI' },
  { value: 'polloai/kolors', label: '🐔 PL: Kolors', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI' },
  { value: 'polloai/sdxl', label: '🐔 PL: SDXL', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI' },
];

// Models that support composing multiple distinct visual references (product + person) in one video.
// Most single-shot video models can only handle one subject reference well.
// supportsMultiRef = true means the model can receive multiple image refs and compose them together.
const VIDEO_MODELS: ModelInfo[] = [
  { value: 'free/gif-animated', label: '🎞️ GIF Animado (Gratuito)', provider: 'Lovable AI', cost: 'GRÁTIS', quality: 3, tip: 'Gera múltiplos frames animados, sem custo', supportsMultiRef: true },
  { value: 'google/veo-3.1', label: '🟦 Veo 3.1 (Flow)', provider: 'Google', cost: '$$$$', quality: 5, tip: 'Melhor vídeo Google, com áudio', supportsMultiRef: true },
  { value: 'google/veo-3.1-fast', label: '🟦 Veo 3.1 Fast', provider: 'Google', cost: '$$$', quality: 4, tip: 'Versão rápida do Veo 3.1', supportsMultiRef: true },
  { value: 'google/veo-3', label: '🟦 Veo 3', provider: 'Google', cost: '$$$', quality: 5, tip: 'Alta qualidade com diálogos', supportsMultiRef: true },
  { value: 'google/veo-2', label: '🟦 Veo 2', provider: 'Google', cost: '$$', quality: 4, tip: 'Bom custo-benefício em vídeo', supportsMultiRef: true },
  { value: 'openai/sora-3', label: '🟢 Sora 3', provider: 'OpenAI', cost: '$$$$', quality: 5, tip: 'Referência em vídeo IA, premium', supportsMultiRef: true },
  { value: 'openai/sora-2', label: '🟢 Sora 2', provider: 'OpenAI', cost: '$$$', quality: 4, tip: 'Boa qualidade, custo alto', supportsMultiRef: true },
  { value: 'runway/gen4', label: '🎬 Gen-4', provider: 'Runway', cost: '$$$$', quality: 5, tip: 'Cinematográfico, controle preciso', supportsMultiRef: true },
  { value: 'runway/gen3-alpha-turbo', label: '🎬 Gen-3 Alpha Turbo', provider: 'Runway', cost: '$$', quality: 4, tip: 'Rápido, bom para iteração', supportsMultiRef: true },
  { value: 'kling/v2.1', label: '🎥 Kling 2.1', provider: 'Kuaishou', cost: '$$', quality: 4, tip: 'Bom com movimento, acessível', supportsMultiRef: true },
  { value: 'kling/v1.6', label: '🎥 Kling 1.6', provider: 'Kuaishou', cost: '$', quality: 3, tip: 'Econômico, qualidade aceitável', supportsMultiRef: false },
  { value: 'pika/v2.2', label: '🌊 Pika 2.2', provider: 'Pika', cost: '$$', quality: 4, tip: 'Criativo, bom para efeitos', supportsMultiRef: true },
  { value: 'minimax/video-01', label: '🟠 Hailuo MiniMax', provider: 'MiniMax', cost: '$', quality: 3, tip: 'Barato, vídeos curtos', supportsMultiRef: false },
  { value: 'luma/dream-machine-1.5', label: '🌙 Dream Machine 1.5', provider: 'Luma', cost: '$$', quality: 4, tip: 'Boa física e movimentos', supportsMultiRef: true },
  { value: 'stability/stable-video', label: '🟣 Stable Video Diffusion', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Open source, econômico', supportsMultiRef: false },
  { value: 'bytedance/seedvideo', label: '🎯 Seed Video', provider: 'ByteDance', cost: '$', quality: 3, tip: 'Emergente, custo baixo', supportsMultiRef: false },
  { value: 'replicate/ltx-video', label: '🔮 LTX-Video 2 (Replicate)', provider: 'Replicate', cost: '$', quality: 4, tip: 'Open source, custo muito baixo (~$0.02/vídeo)', supportsMultiRef: false },
  // Apiframe video models — these support prompt-based multi-subject composition
  { value: 'apiframe/midjourney-video', label: '⚡ AF: Midjourney Video', provider: 'Apiframe', cost: '$$', quality: 5, tip: 'Via Apiframe', supportsMultiRef: true },
  { value: 'apiframe/runway-gen4', label: '⚡ AF: Runway Gen-4', provider: 'Apiframe', cost: '$$$', quality: 5, tip: 'Via Apiframe', supportsMultiRef: true },
  { value: 'apiframe/runway', label: '⚡ AF: Runway Gen-3', provider: 'Apiframe', cost: '$$', quality: 5, tip: 'Via Apiframe, 4 créditos', supportsMultiRef: true },
  { value: 'apiframe/kling-2.6', label: '⚡ AF: Kling 2.6', provider: 'Apiframe', cost: '$$', quality: 4, tip: 'Via Apiframe, 10-20 créditos', supportsMultiRef: true },
  { value: 'apiframe/kling-2.5', label: '⚡ AF: Kling 2.5 Turbo', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe, 10 créditos', supportsMultiRef: true },
  { value: 'apiframe/luma', label: '⚡ AF: Luma AI', provider: 'Apiframe', cost: '$$', quality: 4, tip: 'Via Apiframe, 6 créditos', supportsMultiRef: true },
  // AIML API video models
  { value: 'aimlapi/runway-gen3', label: '🤖 ML: Runway Gen-3', provider: 'AIML API', cost: '$$', quality: 5, tip: 'Via AIML API, $0.25', supportsMultiRef: false },
  { value: 'aimlapi/kling-v2', label: '🤖 ML: Kling v2', provider: 'AIML API', cost: '$$', quality: 4, tip: 'Via AIML API, $0.28', supportsMultiRef: false },
  { value: 'aimlapi/luma', label: '🤖 ML: Luma Dream Machine', provider: 'AIML API', cost: '$$', quality: 4, tip: 'Via AIML API, $0.20', supportsMultiRef: false },
  { value: 'aimlapi/minimax', label: '🤖 ML: Minimax Video', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API', supportsMultiRef: false },
  { value: 'aimlapi/cogvideox', label: '🤖 ML: CogVideoX', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API', supportsMultiRef: false },
  { value: 'aimlapi/haiper', label: '🤖 ML: Haiper 2.0', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API', supportsMultiRef: false },
  { value: 'aimlapi/pika', label: '🤖 ML: Pika', provider: 'AIML API', cost: '$$', quality: 4, tip: 'Via AIML API', supportsMultiRef: false },
  { value: 'aimlapi/wan-video', label: '🤖 ML: Wan Video', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API', supportsMultiRef: false },
  { value: 'aimlapi/stable-video', label: '🤖 ML: Stable Video', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API', supportsMultiRef: false },
  // Pollo AI video models
  { value: 'polloai/runway', label: '🐔 PL: Runway Gen-3', provider: 'Pollo AI', cost: '$$', quality: 5, tip: 'Via Pollo AI, 10 créditos', supportsMultiRef: false },
  { value: 'polloai/kling-v2', label: '🐔 PL: Kling v2', provider: 'Pollo AI', cost: '$$', quality: 4, tip: 'Via Pollo AI, 8 créditos', supportsMultiRef: false },
  { value: 'polloai/kling-v1.5', label: '🐔 PL: Kling v1.5', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI', supportsMultiRef: false },
  { value: 'polloai/luma', label: '🐔 PL: Luma Dream Machine', provider: 'Pollo AI', cost: '$$', quality: 4, tip: 'Via Pollo AI, 6 créditos', supportsMultiRef: false },
  { value: 'polloai/minimax', label: '🐔 PL: Minimax Video', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI, 5 créditos', supportsMultiRef: false },
  { value: 'polloai/hunyuan', label: '🐔 PL: Hunyuan Video', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI', supportsMultiRef: false },
  { value: 'polloai/cogvideox', label: '🐔 PL: CogVideoX', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI', supportsMultiRef: false },
  { value: 'polloai/pika', label: '🐔 PL: Pika', provider: 'Pollo AI', cost: '$$', quality: 4, tip: 'Via Pollo AI', supportsMultiRef: false },
  { value: 'polloai/wan-video', label: '🐔 PL: Wan Video', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI', supportsMultiRef: false },
];

// Helper to check if a model supports multiple reference images
export const isMultiRefModel = (modelValue: string): boolean => {
  const videoModel = VIDEO_MODELS.find(m => m.value === modelValue);
  if (videoModel) return videoModel.supportsMultiRef ?? false;
  const imageModel = IMAGE_MODELS.find(m => m.value === modelValue);
  if (imageModel) return imageModel.supportsMultiRef ?? false;
  return false;
};

// Reference node types that count as distinct visual subjects
const MULTI_REF_NODE_TYPES: StudioNodeType[] = [
  'productImageSelect', 'multiProductSelect', 'galleryInfluencer', 'imageInput', 'multiImageRef',
  'galleryAmbiente', 'galleryEstilo', 'galleryPose', 'galleryRoupa', 'gallerySalvas',
];

// Types that represent distinct "subjects" (product vs person) — having 2+ of these = multi-ref
const SUBJECT_REF_TYPES: StudioNodeType[] = [
  'productImageSelect', 'multiProductSelect', 'galleryInfluencer',
];

const AUDIO_MODELS: ModelInfo[] = [
  { value: 'elevenlabs/v3', label: '🔊 ElevenLabs v3', provider: 'ElevenLabs', cost: '$$$', quality: 5, tip: 'Melhor qualidade de voz, realista' },
  { value: 'elevenlabs/turbo-v2.5', label: '🔊 ElevenLabs Turbo', provider: 'ElevenLabs', cost: '$$', quality: 4, tip: 'Rápido, boa qualidade' },
  { value: 'openai/tts-1-hd', label: '🟢 OpenAI TTS HD', provider: 'OpenAI', cost: '$$', quality: 4, tip: 'HD, vozes naturais' },
  { value: 'openai/tts-1', label: '🟢 OpenAI TTS', provider: 'OpenAI', cost: '$', quality: 3, tip: 'Econômico, qualidade boa' },
  { value: 'google/wavenet', label: '🟦 Google WaveNet', provider: 'Google', cost: '$', quality: 4, tip: 'Bom PT-BR, acessível' },
  { value: 'google/neural2', label: '🟦 Google Neural2', provider: 'Google', cost: '$', quality: 4, tip: 'Neural, natural em PT-BR' },
  { value: 'google/studio', label: '🟦 Google Studio', provider: 'Google', cost: '$$', quality: 5, tip: 'Máxima qualidade Google' },
  { value: 'suno/bark', label: '🐕 Bark', provider: 'Suno', cost: '$', quality: 3, tip: 'Open source, expressivo' },
  { value: 'microsoft/azure-tts', label: '🔵 Azure Neural TTS', provider: 'Microsoft', cost: '$$', quality: 4, tip: 'Muitas vozes, boa qualidade' },
  { value: 'amazon/polly-neural', label: '🟡 Amazon Polly Neural', provider: 'AWS', cost: '$', quality: 3, tip: 'Estável, integração AWS' },
  // AIML API audio models
  { value: 'aimlapi/elevenlabs-tts', label: '🤖 ML: ElevenLabs TTS', provider: 'AIML API', cost: '$$', quality: 5, tip: 'Via AIML API, $0.30/1k chars' },
  { value: 'aimlapi/openai-tts', label: '🤖 ML: OpenAI TTS', provider: 'AIML API', cost: '$', quality: 4, tip: 'Via AIML API' },
  { value: 'aimlapi/xtts-v2', label: '🤖 ML: Xtts-v2', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API, open source' },
  { value: 'aimlapi/bark', label: '🤖 ML: Bark', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API' },
  // Pollo AI audio models
  { value: 'polloai/fish-speech', label: '🐔 PL: Fish Speech TTS', provider: 'Pollo AI', cost: '$', quality: 3, tip: 'Via Pollo AI' },
];

const MUSIC_MODELS: ModelInfo[] = [
  { value: 'suno/v4', label: '🎵 Suno v4', provider: 'Suno', cost: '$$$', quality: 5, tip: 'Líder em música IA, com vocal' },
  { value: 'suno/v3.5', label: '🎵 Suno v3.5', provider: 'Suno', cost: '$$', quality: 4, tip: 'Boa qualidade, mais barato' },
  { value: 'udio/v2', label: '🎶 Udio v2', provider: 'Udio', cost: '$$$', quality: 5, tip: 'Alta fidelidade, produção pro' },
  { value: 'udio/v1.5', label: '🎶 Udio v1.5', provider: 'Udio', cost: '$$', quality: 4, tip: 'Bom para prototipagem' },
  { value: 'stability/stable-audio-2', label: '🟣 Stable Audio 2.0', provider: 'Stability AI', cost: '$', quality: 3, tip: 'Open source, instrumental' },
  { value: 'google/musicfx', label: '🟦 MusicFX', provider: 'Google', cost: '$', quality: 3, tip: 'Gratuito, experimental' },
  { value: 'meta/musicgen-large', label: '🔵 MusicGen Large', provider: 'Meta', cost: '$', quality: 3, tip: 'Open source, versátil' },
  { value: 'meta/musicgen-melody', label: '🔵 MusicGen Melody', provider: 'Meta', cost: '$', quality: 3, tip: 'Segue melodias de referência' },
  // Apiframe music models
  { value: 'apiframe/suno', label: '⚡ AF: Suno AI', provider: 'Apiframe', cost: '$', quality: 5, tip: 'Via Apiframe, 2 créditos' },
  { value: 'apiframe/udio', label: '⚡ AF: Udio', provider: 'Apiframe', cost: '$', quality: 5, tip: 'Via Apiframe, 1-2 créditos' },
  { value: 'apiframe/producer-ai', label: '⚡ AF: Producer AI', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe, instrumental' },
  { value: 'apiframe/eleven-music', label: '⚡ AF: Eleven Music', provider: 'Apiframe', cost: '$', quality: 4, tip: 'Via Apiframe, ElevenLabs' },
  // AIML API music models
  { value: 'aimlapi/suno-v4', label: '🤖 ML: Suno v4', provider: 'AIML API', cost: '$$', quality: 5, tip: 'Via AIML API, $0.05' },
  { value: 'aimlapi/udio-v2', label: '🤖 ML: Udio v2', provider: 'AIML API', cost: '$$', quality: 5, tip: 'Via AIML API' },
  { value: 'aimlapi/musicgen', label: '🤖 ML: MusicGen', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API' },
  { value: 'aimlapi/stable-audio', label: '🤖 ML: Stable Audio', provider: 'AIML API', cost: '$', quality: 3, tip: 'Via AIML API' },
];

// Voices / Locutores
const ELEVENLABS_VOICES = [
  { value: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger (Masculino)', lang: 'en' },
  { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Feminino)', lang: 'en' },
  { value: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura (Feminino)', lang: 'en' },
  { value: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie (Masculino)', lang: 'en' },
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Masculino)', lang: 'en' },
  { value: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum (Masculino)', lang: 'en' },
  { value: 'SAz9YHcvj6GT2YYXdXww', label: 'River (Não-binário)', lang: 'en' },
  { value: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Masculino)', lang: 'en' },
  { value: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Feminino)', lang: 'en' },
  { value: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Feminino)', lang: 'en' },
  { value: 'bIHbv24MWmeRgasZH58o', label: 'Will (Masculino)', lang: 'en' },
  { value: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Feminino)', lang: 'en' },
  { value: 'cjVigY5qzO86Huf0OWal', label: 'Eric (Masculino)', lang: 'en' },
  { value: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Masculino)', lang: 'en' },
  { value: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Masculino)', lang: 'en' },
  { value: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Masculino)', lang: 'en' },
  { value: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Feminino)', lang: 'en' },
  { value: 'pqHfZKP75CvOlQylNhV4', label: 'Bill (Masculino)', lang: 'en' },
];

const OPENAI_VOICES = [
  { value: 'alloy', label: 'Alloy (Neutro)' },
  { value: 'ash', label: 'Ash (Masculino)' },
  { value: 'ballad', label: 'Ballad (Masculino)' },
  { value: 'coral', label: 'Coral (Feminino)' },
  { value: 'echo', label: 'Echo (Masculino)' },
  { value: 'fable', label: 'Fable (Masculino)' },
  { value: 'nova', label: 'Nova (Feminino)' },
  { value: 'onyx', label: 'Onyx (Masculino)' },
  { value: 'sage', label: 'Sage (Feminino)' },
  { value: 'shimmer', label: 'Shimmer (Feminino)' },
];

const GOOGLE_VOICES_PT = [
  { value: 'pt-BR-Wavenet-A', label: 'Feminino A (WaveNet)' },
  { value: 'pt-BR-Wavenet-B', label: 'Masculino B (WaveNet)' },
  { value: 'pt-BR-Wavenet-C', label: 'Feminino C (WaveNet)' },
  { value: 'pt-BR-Neural2-A', label: 'Feminino A (Neural2)' },
  { value: 'pt-BR-Neural2-B', label: 'Masculino B (Neural2)' },
  { value: 'pt-BR-Neural2-C', label: 'Feminino C (Neural2)' },
  { value: 'pt-BR-Studio-A', label: 'Feminino A (Studio)' },
  { value: 'pt-BR-Studio-B', label: 'Masculino B (Studio)' },
];

const LANGUAGES = [
  { value: 'pt-BR', label: '🇧🇷 Português (BR)' },
  { value: 'pt-PT', label: '🇵🇹 Português (PT)' },
  { value: 'en-US', label: '🇺🇸 Inglês (US)' },
  { value: 'en-GB', label: '🇬🇧 Inglês (UK)' },
  { value: 'es-ES', label: '🇪🇸 Espanhol' },
  { value: 'fr-FR', label: '🇫🇷 Francês' },
  { value: 'de-DE', label: '🇩🇪 Alemão' },
  { value: 'it-IT', label: '🇮🇹 Italiano' },
  { value: 'ja-JP', label: '🇯🇵 Japonês' },
  { value: 'ko-KR', label: '🇰🇷 Coreano' },
  { value: 'zh-CN', label: '🇨🇳 Chinês (Simplificado)' },
  { value: 'ar-SA', label: '🇸🇦 Árabe' },
  { value: 'hi-IN', label: '🇮🇳 Hindi' },
  { value: 'ru-RU', label: '🇷🇺 Russo' },
];

const IMAGE_STYLES = [
  { value: 'natural', label: 'Natural / Fotorrealista' },
  { value: 'vivid', label: 'Vívido / Saturado' },
  { value: 'anime', label: 'Anime / Mangá' },
  { value: 'digital-art', label: 'Arte Digital' },
  { value: 'oil-painting', label: 'Pintura a Óleo' },
  { value: 'watercolor', label: 'Aquarela' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: '3d-render', label: 'Render 3D' },
  { value: 'cinematic', label: 'Cinematográfico' },
  { value: 'comic', label: 'Quadrinhos / HQ' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'sketch', label: 'Esboço / Rascunho' },
  { value: 'fantasy', label: 'Fantasia' },
  { value: 'isometric', label: 'Isométrico' },
  { value: 'neon', label: 'Neon / Cyberpunk' },
];

const IMAGE_SIZES = [
  { value: '1024x1024', label: '1024×1024 (1:1)' },
  { value: '1792x1024', label: '1792×1024 (16:9)' },
  { value: '1024x1792', label: '1024×1792 (9:16)' },
  { value: '1536x1024', label: '1536×1024 (3:2)' },
  { value: '1024x1536', label: '1024×1536 (2:3)' },
  { value: '512x512', label: '512×512 (Rápido)' },
  { value: '2048x2048', label: '2048×2048 (Ultra HD)' },
];

const CAMERA_MOVEMENTS = [
  { value: 'none', label: 'Nenhum (Estático)' },
  { value: 'pan-left', label: 'Pan Esquerda' },
  { value: 'pan-right', label: 'Pan Direita' },
  { value: 'pan-up', label: 'Tilt Cima' },
  { value: 'pan-down', label: 'Tilt Baixo' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'orbit', label: 'Órbita' },
  { value: 'dolly-forward', label: 'Dolly Forward' },
  { value: 'dolly-backward', label: 'Dolly Backward' },
  { value: 'crane-up', label: 'Grua Subindo' },
  { value: 'crane-down', label: 'Grua Descendo' },
  { value: 'tracking', label: 'Tracking (Seguir Objeto)' },
  { value: 'handheld', label: 'Câmera na Mão' },
  { value: 'steadicam', label: 'Steadicam' },
];

const VIDEO_STYLES = [
  { value: 'realistic', label: 'Realista' },
  { value: 'cinematic', label: 'Cinematográfico' },
  { value: 'anime', label: 'Anime' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: '3d-animation', label: 'Animação 3D' },
  { value: 'stop-motion', label: 'Stop Motion' },
  { value: 'slow-motion', label: 'Câmera Lenta' },
  { value: 'timelapse', label: 'Timelapse' },
  { value: 'noir', label: 'Film Noir' },
  { value: 'vintage', label: 'Vintage / Retro' },
  { value: 'documentary', label: 'Documentário' },
  { value: 'music-video', label: 'Clipe Musical' },
];

const VIDEO_FPS = [
  { value: '24', label: '24 fps (Cinema)' },
  { value: '25', label: '25 fps (PAL)' },
  { value: '30', label: '30 fps (Padrão)' },
  { value: '48', label: '48 fps (Alta)' },
  { value: '60', label: '60 fps (Smooth)' },
];

const AUDIO_FORMATS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV (Lossless)' },
  { value: 'ogg', label: 'OGG Vorbis' },
  { value: 'flac', label: 'FLAC (Lossless)' },
  { value: 'aac', label: 'AAC' },
];

const AUDIO_SAMPLE_RATES = [
  { value: '22050', label: '22.05 kHz (Leve)' },
  { value: '44100', label: '44.1 kHz (CD Quality)' },
  { value: '48000', label: '48 kHz (Studio)' },
];

const MUSIC_MOODS = [
  { value: 'happy', label: 'Alegre' },
  { value: 'sad', label: 'Triste' },
  { value: 'energetic', label: 'Energético' },
  { value: 'calm', label: 'Calmo' },
  { value: 'dark', label: 'Sombrio' },
  { value: 'epic', label: 'Épico' },
  { value: 'romantic', label: 'Romântico' },
  { value: 'mysterious', label: 'Misterioso' },
  { value: 'suspense', label: 'Suspense' },
  { value: 'uplifting', label: 'Inspirador' },
  { value: 'melancholic', label: 'Melancólico' },
  { value: 'aggressive', label: 'Agressivo' },
  { value: 'peaceful', label: 'Pacífico' },
  { value: 'nostalgic', label: 'Nostálgico' },
];

const MUSIC_INSTRUMENTS = [
  { value: 'piano', label: '🎹 Piano' },
  { value: 'guitar', label: '🎸 Guitarra' },
  { value: 'acoustic-guitar', label: '🎸 Violão' },
  { value: 'drums', label: '🥁 Bateria' },
  { value: 'bass', label: '🎸 Baixo' },
  { value: 'strings', label: '🎻 Cordas (Orquestra)' },
  { value: 'synth', label: '🎹 Sintetizador' },
  { value: 'flute', label: '🎵 Flauta' },
  { value: 'saxophone', label: '🎷 Saxofone' },
  { value: 'trumpet', label: '🎺 Trompete' },
  { value: 'violin', label: '🎻 Violino' },
  { value: 'cello', label: '🎻 Violoncelo' },
  { value: 'harp', label: '🎵 Harpa' },
  { value: 'ukulele', label: '🎸 Ukulele' },
  { value: 'organ', label: '🎹 Órgão' },
];

const MUSIC_TEMPOS = [
  { value: 'very-slow', label: 'Muito Lento (< 60 BPM)' },
  { value: 'slow', label: 'Lento (60-80 BPM)' },
  { value: 'moderate', label: 'Moderado (80-110 BPM)' },
  { value: 'fast', label: 'Rápido (110-140 BPM)' },
  { value: 'very-fast', label: 'Muito Rápido (> 140 BPM)' },
];

const QualityStars = ({ level }: { level: number }) => (
  <span className="text-[10px] leading-none">
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < level ? 'text-amber-500' : 'text-muted-foreground/30'}>★</span>
    ))}
  </span>
);

const CostBadge = ({ cost }: { cost: string }) => {
  if (cost === 'GRÁTIS') return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-emerald-600 bg-emerald-500/15 ring-1 ring-emerald-500/20">✅ GRÁTIS</span>;
  const color = cost.length <= 1 ? 'text-emerald-600 bg-emerald-500/10 ring-emerald-500/20' : cost.length === 2 ? 'text-blue-600 bg-blue-500/10 ring-blue-500/20' : cost.length === 3 ? 'text-orange-600 bg-orange-500/10 ring-orange-500/20' : 'text-red-600 bg-red-500/10 ring-red-500/20';
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${color}`}>{cost}</span>;
};

const ModelSelectItem = ({ model, disabled }: { model: ModelInfo; disabled?: boolean }) => (
  <SelectItem key={model.value} value={model.value} className={`py-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`} disabled={disabled}>
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="truncate text-sm">{model.label}</span>
      <CostBadge cost={model.cost} />
      {disabled && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-muted-foreground bg-muted ring-1 ring-border/40 whitespace-nowrap">🔒 Configurar API</span>}
    </div>
  </SelectItem>
);

const SectionTitle = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-2 mt-5 mb-2 px-0.5">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
    <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold whitespace-nowrap">
      {icon}
      {children}
    </span>
    <div className="h-px flex-1 bg-gradient-to-r from-border/40 via-transparent to-transparent" />
  </div>
);

const ConfigField = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="rounded-xl bg-background/60 border border-border/30 p-3 space-y-1.5 hover:border-border/50 transition-all duration-200 hover:shadow-[0_1px_6px_-2px_hsl(var(--foreground)/0.06)]">
    <Label className="text-[11px] font-medium text-foreground/70 tracking-wide">{label}</Label>
    {hint && <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{hint}</p>}
    {children}
  </div>
);

const ToggleField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between rounded-xl bg-background/60 border border-border/30 px-3 py-2.5 hover:border-border/50 transition-all duration-200 hover:shadow-[0_1px_6px_-2px_hsl(var(--foreground)/0.06)]">
    <Label className="text-[11px] font-medium text-foreground/70 tracking-wide">{label}</Label>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

// Providers always available via Lovable AI gateway (no external key needed)
const LOVABLE_GATEWAY_PREFIXES = ['google/', 'openai/', 'free/'];

const isLovableGatewayModel = (modelValue: string) =>
  LOVABLE_GATEWAY_PREFIXES.some((p) => modelValue.startsWith(p));

// Video models that need external API keys (not available via Lovable AI gateway)
const VIDEO_MODELS_NEEDING_KEY: Record<string, string> = {
  'google/veo-3.1': 'google',
  'google/veo-3.1-fast': 'google',
  'google/veo-3': 'google',
  'google/veo-2': 'google',
  'openai/sora-3': 'openai',
  'openai/sora-2': 'openai',
  'runway/gen4': 'runway',
  'runway/gen3-alpha-turbo': 'runway',
  'kling/v2.1': 'kling',
  'kling/v1.6': 'kling',
  'pika/v2.2': 'pika',
  'minimax/video-01': 'minimax',
  'luma/dream-machine-1.5': 'luma',
  'stability/stable-video': 'stability',
  'bytedance/seedvideo': 'bytedance',
  'replicate/ltx-video': 'replicate',
};

// Unified provider prefixes for model configuration check
const UNIFIED_PREFIXES = ['apiframe/', 'aimlapi/', 'polloai/'];

const normalizeProvider = (provider: string): string => {
  const compact = provider.toLowerCase().trim().replace(/[\s._-]/g, '');
  if (compact === 'apiframe' || compact === 'apiframeai') return 'apiframe';
  if (compact === 'aimlapi' || compact === 'aiml') return 'aimlapi';
  if (compact === 'polloai' || compact === 'pollo') return 'polloai';
  return compact;
};

const isModelConfigured = (modelValue: string, configuredProviders: string[]): boolean => {
  if (modelValue === 'free/gif-animated') return true;

  const normalizedProviders = configuredProviders.map(normalizeProvider);
  const unifiedPrefix = UNIFIED_PREFIXES.find((p) => modelValue.startsWith(p));

  if (unifiedPrefix) {
    const providerName = normalizeProvider(unifiedPrefix.replace('/', ''));
    return normalizedProviders.includes(providerName);
  }

  const requiredProvider = VIDEO_MODELS_NEEDING_KEY[modelValue];
  if (!requiredProvider) return true;
  return normalizedProviders.includes(normalizeProvider(requiredProvider));
};

const filterModelsByProviders = (models: ModelInfo[], configuredProviders: string[]): ModelInfo[] => {
  const normalizedProviders = configuredProviders.map(normalizeProvider);

  return models.filter((m) => {
    if (isLovableGatewayModel(m.value)) return true;

    const unifiedPrefix = UNIFIED_PREFIXES.find((p) => m.value.startsWith(p));
    if (unifiedPrefix) {
      const providerName = normalizeProvider(unifiedPrefix.replace('/', ''));
      return normalizedProviders.includes(providerName);
    }

    const prefix = normalizeProvider(m.value.split('/')[0] ?? '');
    return normalizedProviders.includes(prefix);
  });
};

const getVideoModelsWithStatus = (models: ModelInfo[], configuredProviders: string[]): (ModelInfo & { disabled: boolean })[] => {
  return models
    .map((m) => ({
      ...m,
      disabled: !isModelConfigured(m.value, configuredProviders),
    }))
    .sort((a, b) => Number(a.disabled) - Number(b.disabled));
};

const StudioNodeConfigPanel: React.FC<Props> = ({ node, onUpdateConfig, onClose, onExecuteFromNode, allNodes, allEdges }) => {
  const meta = getNodeMeta(node.data.type);
  const config = node.data.config;
  const { result: storeResult } = useNodeResult(node.id);
  const activeResult = storeResult ?? node.data.result;

  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  useEffect(() => {
    let mounted = true;

    (async () => {
      let estabId = estabelecimentoId;

      if (!estabId) {
        const { data: rpcEstab } = await supabase.rpc('get_auth_user_estabelecimento_id');
        if (typeof rpcEstab === 'string') estabId = rpcEstab;
      }

      if (!estabId) {
        if (mounted) setConfiguredProviders([]);
        return;
      }

      const { data } = await supabase
        .from('ai_api_keys')
        .select('provider')
        .eq('estabelecimento_id', estabId)
        .eq('is_active', true);

      if (mounted && data) {
        setConfiguredProviders(data.map((d) => normalizeProvider(d.provider)));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [estabelecimentoId]);

  const filteredLLM = useMemo(() => filterModelsByProviders(LLM_MODELS, configuredProviders), [configuredProviders]);
  const filteredImageBase = useMemo(() => filterModelsByProviders(IMAGE_MODELS, configuredProviders), [configuredProviders]);
  const filteredVideo = useMemo(() => getVideoModelsWithStatus(VIDEO_MODELS, configuredProviders), [configuredProviders]);
  const filteredAudio = useMemo(() => filterModelsByProviders(AUDIO_MODELS, configuredProviders), [configuredProviders]);
  const filteredMusic = useMemo(() => filterModelsByProviders(MUSIC_MODELS, configuredProviders), [configuredProviders]);

  // Detect if this node has multiple distinct subject references connected (works for videoGen and imageGen)
  const hasMultipleSubjectRefs = useMemo(() => {
    if (node.data.type !== 'videoGen' && node.data.type !== 'imageGen' && node.data.type !== 'productComposite') {
      if (!allNodes || !allEdges) return false;
      return false;
    }
    if (!allNodes || !allEdges) return false;
    const incomingNodeIds = allEdges.filter(e => e.target === node.id).map(e => e.source);
    const incomingNodes = allNodes.filter(n => incomingNodeIds.includes(n.id));
    const subjectTypes = new Set<string>();
    incomingNodes.forEach(n => {
      const t = (n.data as any)?.type as StudioNodeType;
      if (t === 'productImageSelect' || t === 'multiProductSelect') subjectTypes.add('produto');
      if (t === 'galleryInfluencer') subjectTypes.add('influencer');
    });
    return subjectTypes.size >= 2;
  }, [node.id, node.data.type, allNodes, allEdges]);

  // When multiple subject refs are connected, filter to only multi-ref capable models
  const filteredImage = useMemo(() => {
    if (hasMultipleSubjectRefs) {
      return filteredImageBase.filter(m => m.supportsMultiRef);
    }
    return filteredImageBase;
  }, [filteredImageBase, hasMultipleSubjectRefs]);

  // Video models handle multi-subject composition via enriched text prompts, so no filtering needed
  const filteredVideoFinal = filteredVideo;

  const currentVideoModel = config.videoModel || 'free/gif-animated';
  const currentImageModel = config.model || 'google/gemini-2.5-flash-image';
  const isCurrentModelMultiRefCapable = node.data.type === 'videoGen'
    ? isMultiRefModel(currentVideoModel)
    : isMultiRefModel(currentImageModel);

  const update = (key: string, value: any) => {
    onUpdateConfig(node.id, { [key]: value });
  };

  const isElevenLabs = (config.audioModel || '').startsWith('elevenlabs');
  const isOpenAITTS = (config.audioModel || '').startsWith('openai/tts');
  const isGoogleTTS = (config.audioModel || '').startsWith('google/');

  const renderConfig = () => {
    switch (node.data.type) {
      case 'textInput':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Texto / Prompt">
              <Textarea
                value={config.text || ''}
                onChange={(e) => update('text', e.target.value)}
                placeholder="Escreva seu prompt aqui..."
                rows={6}
                className="mt-1 text-sm"
              />
            </ConfigField>
            {config.presetLayerSelections && (
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('studio-reload-preset', {
                      detail: { selections: config.presetLayerSelections, presetName: config.presetName, nodeId: node.id }
                    }));
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Recarregar Configuração do Preset
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Abre o gerador com as mesmas seleções usadas para criar este prompt
                </p>
              </div>
            )}
          </div>
        );

      case 'imageInput':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Imagens de Referência" hint="Cole URLs de imagens ou imagens base64. Cada linha é uma imagem.">
              <Textarea
                value={(config.images || []).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter((l: string) => l.trim());
                  update('images', lines);
                }}
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;data:image/png;base64,..."
                rows={4}
                className="mt-1 font-mono text-[10px]"
              />
            </ConfigField>
            <ConfigField label="Ou carregue um arquivo">
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-1 text-xs w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer file:transition-colors"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      update('images', [...(config.images || []), base64]);
                    };
                    reader.readAsDataURL(file);
                  });
                }}
              />
            </ConfigField>
            {(config.images || []).length > 0 && (
              <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
                <Label className="text-[11px] font-semibold text-foreground/80">{config.images.length} imagem(ns) carregada(s)</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {config.images.map((img: string, idx: number) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border/50 aspect-square shadow-sm hover:shadow-md transition-shadow">
                      <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => update('images', config.images.filter((_: any, i: number) => i !== idx))}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'productImageSelect':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Produto Selecionado" hint="Selecione um produto diretamente no bloco do canvas. A imagem será usada como referência para outros blocos.">
              {config.selectedImageUrl ? (
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <img src={config.selectedImageUrl} alt={config.productName || 'Produto'} className="w-full h-40 object-contain bg-muted/30" />
                  </div>
                  <p className="text-xs font-medium">📦 {config.productName}</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { update('selectedImageUrl', ''); update('productId', ''); update('productName', ''); }}>
                    Trocar produto
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Nenhum produto selecionado. Use o bloco no canvas para selecionar.</p>
              )}
            </ConfigField>
          </div>
        );

      case 'systemPrompt':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Instruções do Sistema">
              <Textarea
                value={config.systemPrompt || ''}
                onChange={(e) => update('systemPrompt', e.target.value)}
                placeholder="Defina como o modelo deve se comportar..."
                rows={6}
                className="mt-1 text-sm"
              />
            </ConfigField>
          </div>
        );

      case 'llmProcess':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Modelo">
              <Select value={config.model || 'google/gemini-2.5-flash'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredLLM.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label={`Temperatura (${config.temperature ?? 0.7})`}>
              <Slider
                value={[config.temperature ?? 0.7]}
                onValueChange={([v]) => update('temperature', v)}
                min={0} max={2} step={0.1}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label={`Max Tokens (${config.maxTokens ?? 2048})`}>
              <Slider
                value={[config.maxTokens ?? 2048]}
                onValueChange={([v]) => update('maxTokens', v)}
                min={256} max={16384} step={256}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label={`Top P (${config.topP ?? 1})`}>
              <Slider
                value={[config.topP ?? 1]}
                onValueChange={([v]) => update('topP', v)}
                min={0} max={1} step={0.05}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label={`Frequência Penalty (${config.frequencyPenalty ?? 0})`}>
              <Slider
                value={[config.frequencyPenalty ?? 0]}
                onValueChange={([v]) => update('frequencyPenalty', v)}
                min={-2} max={2} step={0.1}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label={`Presença Penalty (${config.presencePenalty ?? 0})`}>
              <Slider
                value={[config.presencePenalty ?? 0]}
                onValueChange={([v]) => update('presencePenalty', v)}
                min={-2} max={2} step={0.1}
                className="mt-1"
              />
            </ConfigField>
            <SectionTitle>Formato de Resposta</SectionTitle>
            <ConfigField label="Formato">
              <Select value={config.responseFormat || 'text'} onValueChange={(v) => update('responseFormat', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto Livre</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            <ToggleField label="Streaming" checked={config.streaming ?? false} onChange={(v) => update('streaming', v)} />
          </div>
        );

      case 'imageGen':
      case 'imageEdit':
      case 'productComposite':
        return (
          <div className="space-y-2.5">
            {hasMultipleSubjectRefs && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">Múltiplas referências detectadas</strong>
                  Produto + Influencer conectados. Apenas modelos compatíveis com múltiplas referências visuais estão sendo exibidos.
                </div>
              </div>
            )}
            <ConfigField label="Modelo de Imagem">
              <Select value={config.model || 'google/gemini-2.5-flash-image'} onValueChange={(v) => {
                update('model', v);
                // Auto-fill optimal params per image model
                if (v.startsWith('google/')) {
                  // Gemini image models
                  update('imageSize', '1024x1024');
                  update('quality', 'standard');
                  update('guidanceScale', 7.5);
                  update('steps', 30);
                } else if (v.startsWith('openai/')) {
                  // DALL-E models
                  update('imageSize', '1024x1024');
                  update('quality', 'standard');
                  update('guidanceScale', 7);
                  update('steps', 50);
                } else if (v.startsWith('stability/')) {
                  // Stable Diffusion
                  update('imageSize', '1024x1024');
                  update('quality', 'standard');
                  update('guidanceScale', 7);
                  update('steps', 30);
                } else if (v.startsWith('flux/') || v.startsWith('black-forest-labs/')) {
                  // Flux models
                  update('imageSize', '1024x1024');
                  update('quality', 'hd');
                  update('guidanceScale', 3.5);
                  update('steps', 28);
                } else if (v.startsWith('ideogram/')) {
                  update('imageSize', '1024x1024');
                  update('quality', 'standard');
                  update('guidanceScale', 7);
                  update('steps', 30);
                } else {
                  // Default
                  update('imageSize', '1024x1024');
                  update('quality', 'standard');
                  update('guidanceScale', 7.5);
                  update('steps', 30);
                }
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredImage.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            {node.data.type === 'imageEdit' && (
              <ConfigField label="Instrução de Edição">
                <Textarea
                  value={config.editPrompt || ''}
                  onChange={(e) => update('editPrompt', e.target.value)}
                  placeholder="Ex: Torne a cena mais dramática..."
                  rows={3}
                  className="mt-1"
                />
              </ConfigField>
            )}
            <SectionTitle>Estilo & Tamanho</SectionTitle>
            <ConfigField label="Estilo Visual">
              <Select value={config.imageStyle || 'natural'} onValueChange={(v) => update('imageStyle', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Tamanho">
              <Select value={config.imageSize || '1024x1024'} onValueChange={(v) => update('imageSize', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Qualidade">
              <Select value={config.quality || 'standard'} onValueChange={(v) => update('quality', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Rascunho (Rápido)</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="hd">HD (Alta Qualidade)</SelectItem>
                  <SelectItem value="ultra">Ultra HD</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            <SectionTitle>Ajustes Avançados</SectionTitle>
            <ConfigField label={`Número de Variações (${config.numImages ?? 1})`}>
              <Slider
                value={[config.numImages ?? 1]}
                onValueChange={([v]) => update('numImages', v)}
                min={1} max={4} step={1}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label={`Guidance Scale (${config.guidanceScale ?? 7.5})`}>
              <Slider
                value={[config.guidanceScale ?? 7.5]}
                onValueChange={([v]) => update('guidanceScale', v)}
                min={1} max={20} step={0.5}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label={`Steps (${config.steps ?? 30})`}>
              <Slider
                value={[config.steps ?? 30]}
                onValueChange={([v]) => update('steps', v)}
                min={10} max={150} step={5}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label="Seed (Semente)">
              <Input
                type="number"
                value={config.seed || ''}
                onChange={(e) => update('seed', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Aleatório"
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label="Prompt Negativo">
              <Textarea
                value={config.negativePrompt || ''}
                onChange={(e) => update('negativePrompt', e.target.value)}
                placeholder="O que NÃO incluir na imagem..."
                rows={2}
                className="mt-1"
              />
            </ConfigField>
            {node.data.type === 'imageEdit' && (
              <>
                <SectionTitle>Opções de Edição</SectionTitle>
                <ConfigField label={`Força da Edição (${config.editStrength ?? 0.75})`}>
                  <Slider
                    value={[config.editStrength ?? 0.75]}
                    onValueChange={([v]) => update('editStrength', v)}
                    min={0.1} max={1} step={0.05}
                    className="mt-1"
                  />
                </ConfigField>
                <ConfigField label="Tipo de Edição">
                  <Select value={config.editType || 'general'} onValueChange={(v) => update('editType', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="inpaint">Inpainting (Preencher área)</SelectItem>
                      <SelectItem value="outpaint">Outpainting (Expandir)</SelectItem>
                      <SelectItem value="upscale">Upscale (Aumentar resolução)</SelectItem>
                      <SelectItem value="remove-bg">Remover Fundo</SelectItem>
                      <SelectItem value="colorize">Colorizar</SelectItem>
                      <SelectItem value="style-transfer">Transferir Estilo</SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigField>
              </>
            )}
          </div>
        );

      case 'videoGen':
        const isGifModel = (config.videoModel || 'free/gif-animated') === 'free/gif-animated';
        return (
          <div className="space-y-2.5">
            {hasMultipleSubjectRefs && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">Múltiplas referências detectadas</strong>
                  Produto + Influencer conectados. Apenas modelos compatíveis com múltiplas referências visuais estão sendo exibidos.
                </div>
              </div>
            )}
            <ConfigField label="Modelo de Vídeo">
              <Select value={config.videoModel || 'free/gif-animated'} onValueChange={(v) => {
                update('videoModel', v);
                // Auto-fill minimum required params per model
                if (v === 'free/gif-animated') {
                  update('frameCount', 4);
                  update('fps', 3);
                  update('resolution', '480p');
                  update('duration', 4);
                } else if (v.startsWith('google/')) {
                  // Google Veo: duration 4-8s
                  update('duration', 4);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 7);
                } else if (v.startsWith('openai/')) {
                  // Sora: duration 4, 8, 12
                  update('duration', 4);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 7);
                } else if (v.startsWith('runway/')) {
                  // Runway: duration 5 or 10
                  update('duration', 5);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 7);
                } else if (v.startsWith('kling/')) {
                  // Kling: duration 5 or 10
                  update('duration', 5);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 7);
                } else if (v.startsWith('luma/')) {
                  // Luma: automatic duration ~4s
                  update('duration', 4);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 7);
                } else if (v.startsWith('stability/')) {
                  // Stability: fixed ~4s
                  update('duration', 4);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 2.5);
                } else {
                  // Default
                  update('duration', 5);
                  update('resolution', '1080p');
                  update('aspectRatio', '16:9');
                  update('fps', '24');
                  update('cfgScale', 7);
                }
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredVideoFinal.map((m) => (
                    <ModelSelectItem key={m.value} model={m} disabled={m.disabled} />
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Estilo de Vídeo">
              <Select value={config.videoStyle || 'realistic'} onValueChange={(v) => update('videoStyle', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIDEO_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            {isGifModel && (
              <>
                <SectionTitle>Configuração do GIF</SectionTitle>
                <ConfigField label={`Quantidade de Frames: ${config.frameCount || 4}`}>
                  <Slider
                    className="mt-1"
                    min={2}
                    max={20}
                    step={1}
                    value={[config.frameCount || 4]}
                    onValueChange={([v]) => update('frameCount', v)}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>2</span>
                    <span>20</span>
                  </div>
                </ConfigField>
                <ConfigField label="Velocidade (FPS)">
                  <Select value={String(config.fps || 3)} onValueChange={(v) => update('fps', Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5 fps (Muito lento — 2s/frame)</SelectItem>
                      <SelectItem value="1">1 fps (Lento — 1s/frame)</SelectItem>
                      <SelectItem value="2">2 fps (Normal — 0.5s/frame)</SelectItem>
                      <SelectItem value="3">3 fps (Rápido)</SelectItem>
                      <SelectItem value="4">4 fps (Muito rápido)</SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigField>
                <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
                  <Label className="text-[11px] font-semibold text-foreground/80">Duração total estimada</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{((config.frameCount || 4) / (config.fps || 2)).toFixed(1)}s ({config.frameCount || 4} frames × {(1 / (config.fps || 2)).toFixed(1)}s)
                  </p>
                </div>
              </>
            )}
            <ConfigField label="Resolução">
              <Select value={config.resolution || '1080p'} onValueChange={(v) => update('resolution', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (Rápido)</SelectItem>
                  <SelectItem value="720p">720p (Balanceado)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="2k">2K (QHD)</SelectItem>
                  <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Aspecto">
              <Select value={config.aspectRatio || '16:9'} onValueChange={(v) => update('aspectRatio', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Paisagem)</SelectItem>
                  <SelectItem value="9:16">9:16 (Retrato/Reels)</SelectItem>
                  <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                  <SelectItem value="4:3">4:3 (Clássico)</SelectItem>
                  <SelectItem value="3:4">3:4 (Retrato Clássico)</SelectItem>
                  <SelectItem value="21:9">21:9 (Cinemascope)</SelectItem>
                  <SelectItem value="2.35:1">2.35:1 (Anamórfico)</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            {!isGifModel && (
              <>
                <SectionTitle>Duração</SectionTitle>
                {(() => {
                  const vm = config.videoModel || '';
                  const isSora = vm.startsWith('openai/');
                  const isRunway = vm.startsWith('runway/');
                  const isKling = vm.startsWith('kling/');
                  const isGoogle = vm.startsWith('google/');
                  const isLuma = vm.startsWith('luma/');
                  const isStability = vm.startsWith('stability/');
                  
                  // Duration limits per provider
                  let minDur = 1, maxDur = 20, stepDur = 1, defaultDur = 5;
                  let durationNote = '';
                  if (isSora) { minDur = 4; maxDur = 12; stepDur = 4; defaultDur = 4; durationNote = 'Sora: 4s, 8s ou 12s'; }
                  else if (isRunway) { minDur = 5; maxDur = 10; stepDur = 5; defaultDur = 10; durationNote = 'Runway: 5s ou 10s'; }
                  else if (isKling) { minDur = 5; maxDur = 10; stepDur = 5; defaultDur = 5; durationNote = 'Kling: 5s ou 10s'; }
                  else if (isGoogle) { minDur = 4; maxDur = 8; stepDur = 1; defaultDur = 4; durationNote = 'Veo: 4-8 segundos'; }
                  else if (isLuma) { durationNote = 'Luma: duração automática (~4s)'; }
                  else if (isStability) { durationNote = 'Stability: duração fixa (~4s)'; }
                  else { maxDur = 30; defaultDur = 5; }

                  if (isLuma || isStability) {
                    return (
                      <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
                        <p className="text-xs text-muted-foreground">{durationNote}</p>
                      </div>
                    );
                  }

                  // Providers with fixed duration options use Select, others use Slider
                  const fixedOptions: { value: number; label: string }[] | null =
                    isSora ? [{ value: 4, label: '4 segundos' }, { value: 8, label: '8 segundos' }, { value: 12, label: '12 segundos' }] :
                    isRunway ? [{ value: 5, label: '5 segundos' }, { value: 10, label: '10 segundos' }] :
                    isKling ? [{ value: 5, label: '5 segundos' }, { value: 10, label: '10 segundos' }] :
                    null;

                  if (fixedOptions) {
                    return (
                      <>
                        <ConfigField label="Duração do Vídeo">
                          <Select value={String(config.duration || defaultDur)} onValueChange={(v) => update('duration', Number(v))}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {fixedOptions.map((opt) => (
                                <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </ConfigField>
                        {durationNote && (
                          <p className="text-[10px] text-muted-foreground -mt-1">{durationNote}</p>
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      <ConfigField label={`Duração (${config.duration || defaultDur}s)`}>
                        <Slider
                          value={[config.duration || defaultDur]}
                          onValueChange={([v]) => update('duration', v)}
                          min={minDur} max={maxDur} step={stepDur}
                          className="mt-1"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{minDur}s</span>
                          <span>{maxDur}s</span>
                        </div>
                      </ConfigField>
                      {durationNote && (
                        <p className="text-[10px] text-muted-foreground -mt-1">{durationNote}</p>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            <SectionTitle>Câmera</SectionTitle>
            <ConfigField label="Movimento de Câmera">
              <Select value={config.cameraMovement || 'none'} onValueChange={(v) => update('cameraMovement', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMERA_MOVEMENTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label={`Velocidade da Câmera (${config.cameraSpeed ?? 1}x)`}>
              <Slider
                value={[config.cameraSpeed ?? 1]}
                onValueChange={([v]) => update('cameraSpeed', v)}
                min={0.25} max={4} step={0.25}
                className="mt-1"
              />
            </ConfigField>
            <SectionTitle>Qualidade & FPS</SectionTitle>
            <ConfigField label="Frames por Segundo">
              <Select value={config.fps || '24'} onValueChange={(v) => update('fps', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIDEO_FPS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label={`CFG Scale (${config.cfgScale ?? 7})`}>
              <Slider
                value={[config.cfgScale ?? 7]}
                onValueChange={([v]) => update('cfgScale', v)}
                min={1} max={20} step={0.5}
                className="mt-1"
              />
            </ConfigField>
            <ConfigField label="Seed (Semente)">
              <Input
                type="number"
                value={config.videoSeed || ''}
                onChange={(e) => update('videoSeed', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Aleatório"
                className="mt-1"
              />
            </ConfigField>
            <SectionTitle>Opções</SectionTitle>
            <ToggleField label="Loop Infinito" checked={config.loop ?? false} onChange={(v) => update('loop', v)} />
            <ToggleField label="Gerar com Áudio" checked={config.withAudio ?? true} onChange={(v) => update('withAudio', v)} />
            <ToggleField label="Gerar com Música" checked={config.withMusic ?? true} onChange={(v) => update('withMusic', v)} />
            <ConfigField label="Prompt Negativo">
              <Textarea
                value={config.videoNegativePrompt || ''}
                onChange={(e) => update('videoNegativePrompt', e.target.value)}
                placeholder="O que evitar no vídeo..."
                rows={2}
                className="mt-1"
              />
            </ConfigField>
          </div>
        );

      case 'audioGen':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Modelo de Áudio">
              <Select value={config.audioModel || 'elevenlabs/v3'} onValueChange={(v) => update('audioModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredAudio.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Tipo">
              <Select value={config.type || 'sfx'} onValueChange={(v) => update('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfx">Efeito Sonoro (SFX)</SelectItem>
                  <SelectItem value="narration">Narração</SelectItem>
                  <SelectItem value="ambient">Som Ambiente</SelectItem>
                  <SelectItem value="voiceover">Voice Over</SelectItem>
                  <SelectItem value="dialogue">Diálogo</SelectItem>
                  <SelectItem value="foley">Foley (Ruído de Cena)</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>

            <SectionTitle>Locutor / Voz</SectionTitle>
            <ConfigField label="Idioma">
              <Select value={config.language || 'pt-BR'} onValueChange={(v) => update('language', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>

            {isElevenLabs && (
              <ConfigField label="Voz (ElevenLabs)">
                <Select value={config.voiceId || ELEVENLABS_VOICES[0].value} onValueChange={(v) => update('voiceId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ELEVENLABS_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            )}

            {isOpenAITTS && (
              <ConfigField label="Voz (OpenAI)">
                <Select value={config.voiceId || 'alloy'} onValueChange={(v) => update('voiceId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPENAI_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            )}

            {isGoogleTTS && (
              <ConfigField label="Voz (Google pt-BR)">
                <Select value={config.voiceId || GOOGLE_VOICES_PT[0].value} onValueChange={(v) => update('voiceId', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOOGLE_VOICES_PT.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            )}

            <SectionTitle>Configurações de Voz</SectionTitle>
            <ConfigField label={`Estabilidade (${config.stability ?? 0.5})`}>
              <Slider value={[config.stability ?? 0.5]} onValueChange={([v]) => update('stability', v)} min={0} max={1} step={0.05} className="mt-1" />
            </ConfigField>
            <ConfigField label={`Similaridade (${config.similarityBoost ?? 0.75})`}>
              <Slider value={[config.similarityBoost ?? 0.75]} onValueChange={([v]) => update('similarityBoost', v)} min={0} max={1} step={0.05} className="mt-1" />
            </ConfigField>
            <ConfigField label={`Estilo (${config.style ?? 0.5})`}>
              <Slider value={[config.style ?? 0.5]} onValueChange={([v]) => update('style', v)} min={0} max={1} step={0.05} className="mt-1" />
            </ConfigField>
            <ConfigField label={`Velocidade (${config.speed ?? 1}x)`}>
              <Slider value={[config.speed ?? 1]} onValueChange={([v]) => update('speed', v)} min={0.5} max={2} step={0.1} className="mt-1" />
            </ConfigField>
            <ToggleField label="Speaker Boost" checked={config.speakerBoost ?? true} onChange={(v) => update('speakerBoost', v)} />

            <SectionTitle>Duração & Formato</SectionTitle>
            <ConfigField label={`Duração (${config.duration || 5}s)`}>
              <Slider value={[config.duration || 5]} onValueChange={([v]) => update('duration', v)} min={1} max={300} step={1} className="mt-1" />
            </ConfigField>
            <ConfigField label="Formato de Saída">
              <Select value={config.audioFormat || 'mp3'} onValueChange={(v) => update('audioFormat', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Sample Rate">
              <Select value={config.sampleRate || '44100'} onValueChange={(v) => update('sampleRate', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_SAMPLE_RATES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label={`Prompt Influence (${config.promptInfluence ?? 0.3})`}>
              <Slider value={[config.promptInfluence ?? 0.3]} onValueChange={([v]) => update('promptInfluence', v)} min={0} max={1} step={0.05} className="mt-1" />
            </ConfigField>
          </div>
        );

      case 'musicGen':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Modelo de Música">
              <Select value={config.musicModel || 'suno/v4'} onValueChange={(v) => update('musicModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredMusic.map((m) => <ModelSelectItem key={m.value} model={m} />)}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Gênero">
              <Select value={config.genre || 'ambient'} onValueChange={(v) => update('genre', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambient">Ambient</SelectItem>
                  <SelectItem value="cinematic">Cinematográfico</SelectItem>
                  <SelectItem value="electronic">Eletrônico</SelectItem>
                  <SelectItem value="edm">EDM</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="techno">Techno</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="blues">Blues</SelectItem>
                  <SelectItem value="lofi">Lo-Fi</SelectItem>
                  <SelectItem value="hiphop">Hip-Hop</SelectItem>
                  <SelectItem value="trap">Trap</SelectItem>
                  <SelectItem value="classical">Clássico</SelectItem>
                  <SelectItem value="rnb">R&B</SelectItem>
                  <SelectItem value="soul">Soul</SelectItem>
                  <SelectItem value="funk">Funk</SelectItem>
                  <SelectItem value="sertanejo">Sertanejo</SelectItem>
                  <SelectItem value="bossa-nova">Bossa Nova</SelectItem>
                  <SelectItem value="samba">Samba</SelectItem>
                  <SelectItem value="mpb">MPB</SelectItem>
                  <SelectItem value="forro">Forró</SelectItem>
                  <SelectItem value="reggae">Reggae</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="folk">Folk</SelectItem>
                  <SelectItem value="gospel">Gospel</SelectItem>
                  <SelectItem value="indie">Indie</SelectItem>
                  <SelectItem value="kpop">K-Pop</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            <SectionTitle>Humor & Tom</SectionTitle>
            <ConfigField label="Humor">
              <Select value={config.mood || 'calm'} onValueChange={(v) => update('mood', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_MOODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Tempo">
              <Select value={config.tempo || 'moderate'} onValueChange={(v) => update('tempo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_TEMPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label={`BPM Específico (${config.bpm || 'Auto'})`}>
              <Slider value={[config.bpm ?? 120]} onValueChange={([v]) => update('bpm', v)} min={40} max={200} step={5} className="mt-1" />
            </ConfigField>
            <SectionTitle>Instrumentos</SectionTitle>
            <ConfigField label="Instrumento Principal">
              <Select value={config.mainInstrument || 'piano'} onValueChange={(v) => update('mainInstrument', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_INSTRUMENTS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Instrumento Secundário">
              <Select value={config.secondaryInstrument || ''} onValueChange={(v) => update('secondaryInstrument', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {MUSIC_INSTRUMENTS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </ConfigField>
            <SectionTitle>Duração & Tom</SectionTitle>
            <ConfigField label={`Duração (${config.duration || 30}s)`}>
              <Slider value={[config.duration || 30]} onValueChange={([v]) => update('duration', v)} min={5} max={300} step={5} className="mt-1" />
            </ConfigField>
            <ConfigField label="Tonalidade">
              <Select value={config.key || 'auto'} onValueChange={(v) => update('key', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automática</SelectItem>
                  <SelectItem value="C">Dó Maior (C)</SelectItem>
                  <SelectItem value="Cm">Dó Menor (Cm)</SelectItem>
                  <SelectItem value="D">Ré Maior (D)</SelectItem>
                  <SelectItem value="Dm">Ré Menor (Dm)</SelectItem>
                  <SelectItem value="E">Mi Maior (E)</SelectItem>
                  <SelectItem value="Em">Mi Menor (Em)</SelectItem>
                  <SelectItem value="F">Fá Maior (F)</SelectItem>
                  <SelectItem value="G">Sol Maior (G)</SelectItem>
                  <SelectItem value="Gm">Sol Menor (Gm)</SelectItem>
                  <SelectItem value="A">Lá Maior (A)</SelectItem>
                  <SelectItem value="Am">Lá Menor (Am)</SelectItem>
                  <SelectItem value="Bb">Si♭ Maior (Bb)</SelectItem>
                  <SelectItem value="B">Si Maior (B)</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            <SectionTitle>Opções</SectionTitle>
            <ToggleField label="Incluir Vocal" checked={config.withVocals ?? false} onChange={(v) => update('withVocals', v)} />
            <ToggleField label="Loop (Repetível)" checked={config.loopable ?? false} onChange={(v) => update('loopable', v)} />
            <ToggleField label="Fade In/Out" checked={config.fadeInOut ?? true} onChange={(v) => update('fadeInOut', v)} />
            <ConfigField label="Formato de Saída">
              <Select value={config.musicFormat || 'mp3'} onValueChange={(v) => update('musicFormat', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </ConfigField>
          </div>
        );

      case 'videoMerge':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Transição</Label>
              <Select value={config.transition || 'fade'} onValueChange={(v) => update('transition', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="crossfade">Crossfade</SelectItem>
                  <SelectItem value="cut">Corte Seco</SelectItem>
                  <SelectItem value="slide-left">Slide Esquerda</SelectItem>
                  <SelectItem value="slide-right">Slide Direita</SelectItem>
                  <SelectItem value="slide-up">Slide Cima</SelectItem>
                  <SelectItem value="slide-down">Slide Baixo</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="dissolve">Dissolve</SelectItem>
                  <SelectItem value="wipe">Wipe</SelectItem>
                  <SelectItem value="spin">Spin</SelectItem>
                  <SelectItem value="blur">Blur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Duração da transição ({config.transitionDuration || 1}s)</Label>
              <Slider
                value={[config.transitionDuration || 1]}
                onValueChange={([v]) => update('transitionDuration', v)}
                min={0.1} max={5} step={0.1}
                className="mt-2"
              />
            </div>
            <SectionTitle>Saída</SectionTitle>
            <div>
              <Label className="text-xs">Resolução Final</Label>
              <Select value={config.mergeResolution || 'source'} onValueChange={(v) => update('mergeResolution', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Manter Original</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="4k">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">FPS Final</Label>
              <Select value={config.mergeFps || 'source'} onValueChange={(v) => update('mergeFps', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Manter Original</SelectItem>
                  {VIDEO_FPS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Manter Áudio Original</Label>
              <Switch checked={config.keepAudio ?? true} onCheckedChange={(v) => update('keepAudio', v)} />
            </div>
          </div>
        );

      case 'lipSync':
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Conecte um nó de áudio e um nó de vídeo/imagem como entrada para sincronizar os lábios automaticamente.
            </p>
            <SectionTitle>Configurações</SectionTitle>
            <div>
              <Label className="text-xs">Modelo de Lip Sync</Label>
              <Select value={config.lipSyncModel || 'wav2lip'} onValueChange={(v) => update('lipSyncModel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wav2lip">Wav2Lip (Rápido)</SelectItem>
                  <SelectItem value="wav2lip-hq">Wav2Lip HQ</SelectItem>
                  <SelectItem value="sadtalker">SadTalker (Expressivo)</SelectItem>
                  <SelectItem value="videoretalking">VideoReTalking (Realista)</SelectItem>
                  <SelectItem value="museTalk">MuseTalk (Alta Qualidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Qualidade</Label>
              <Select value={config.lipSyncQuality || 'standard'} onValueChange={(v) => update('lipSyncQuality', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Rápido (Prévia)</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="high">Alta Qualidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Intensidade ({config.lipSyncIntensity ?? 1})</Label>
              <Slider
                value={[config.lipSyncIntensity ?? 1]}
                onValueChange={([v]) => update('lipSyncIntensity', v)}
                min={0.5} max={1.5} step={0.1}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Manter Expressão Original</Label>
              <Switch checked={config.keepExpression ?? true} onCheckedChange={(v) => update('keepExpression', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Smooth (Suavizar)</Label>
              <Switch checked={config.smoothLipSync ?? true} onCheckedChange={(v) => update('smoothLipSync', v)} />
            </div>
          </div>
        );

      case 'imageAnalyze':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={config.model || 'google/gemini-2.5-flash'} onValueChange={(v) => update('model', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {filteredLLM.map((m) => (
                    <ModelSelectItem key={m.value} model={m} />
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prompt de Análise</Label>
              <Textarea
                value={config.prompt || ''}
                onChange={(e) => update('prompt', e.target.value)}
                placeholder="Descreva o que quer analisar..."
                rows={3}
                className="mt-1"
              />
            </div>
            <SectionTitle>Tipo de Análise</SectionTitle>
            <div>
              <Label className="text-xs">Modo de Análise</Label>
              <Select value={config.analysisMode || 'describe'} onValueChange={(v) => update('analysisMode', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="describe">Descrever em Detalhes</SelectItem>
                  <SelectItem value="caption">Gerar Legenda</SelectItem>
                  <SelectItem value="ocr">Extrair Texto (OCR)</SelectItem>
                  <SelectItem value="objects">Detectar Objetos</SelectItem>
                  <SelectItem value="faces">Detectar Rostos</SelectItem>
                  <SelectItem value="colors">Extrair Paleta de Cores</SelectItem>
                  <SelectItem value="sentiment">Sentimento/Emoção</SelectItem>
                  <SelectItem value="nsfw">Classificar Conteúdo</SelectItem>
                  <SelectItem value="similar">Buscar Semelhantes</SelectItem>
                  <SelectItem value="alt-text">Gerar Alt Text (Acessibilidade)</SelectItem>
                  <SelectItem value="tags">Gerar Tags/Keywords</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Idioma da Resposta</Label>
              <Select value={config.analysisLanguage || 'pt-BR'} onValueChange={(v) => update('analysisLanguage', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.slice(0, 6).map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nível de Detalhe</Label>
              <Select value={config.detailLevel || 'standard'} onValueChange={(v) => update('detailLevel', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Breve (1-2 frases)</SelectItem>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="detailed">Detalhado</SelectItem>
                  <SelectItem value="exhaustive">Exaustivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'output':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Formato de Saída</Label>
              <Select value={config.format || 'auto'} onValueChange={(v) => update('format', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionTitle>Exportação</SectionTitle>
            <div>
              <Label className="text-xs">Nome do Arquivo</Label>
              <Input
                value={config.fileName || ''}
                onChange={(e) => update('fileName', e.target.value)}
                placeholder="resultado-final"
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Auto-download</Label>
              <Switch checked={config.autoDownload ?? false} onCheckedChange={(v) => update('autoDownload', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Salvar no Storage</Label>
              <Switch checked={config.saveToStorage ?? false} onCheckedChange={(v) => update('saveToStorage', v)} />
            </div>
          </div>
        );

      case 'textContent': {
        const TEXT_STYLE_TEMPLATES = [
          { id: 'heading-bold', name: 'Título Grande', titleFont: 'Montserrat', titleSize: 72, titleWeight: 'bold', titleColor: '#000000', subtitleFont: 'Montserrat', subtitleSize: 42, subtitleWeight: '600', subtitleColor: '#4A4A4A', bodyFont: 'Inter', bodySize: 24, bodyWeight: 'normal', bodyColor: '#666666', textAlign: 'center' },
          { id: 'heading-elegant', name: 'Elegante', titleFont: 'Playfair Display', titleSize: 64, titleWeight: 'bold', titleColor: '#2C2C2C', subtitleFont: 'Raleway', subtitleSize: 36, subtitleWeight: '300', subtitleColor: '#555555', bodyFont: 'Georgia', bodySize: 20, bodyWeight: 'normal', bodyColor: '#666666', textAlign: 'center' },
          { id: 'modern-minimal', name: 'Moderno Minimal', titleFont: 'Poppins', titleSize: 56, titleWeight: '600', titleColor: '#1A1A1A', subtitleFont: 'Poppins', subtitleSize: 32, subtitleWeight: 'normal', subtitleColor: '#666666', bodyFont: 'Inter', bodySize: 18, bodyWeight: 'normal', bodyColor: '#888888', textAlign: 'left' },
          { id: 'retro-bold', name: 'Retro Negrito', titleFont: 'Bebas Neue', titleSize: 80, titleWeight: 'normal', titleColor: '#FF6B6B', subtitleFont: 'Oswald', subtitleSize: 40, subtitleWeight: 'bold', subtitleColor: '#4ECDC4', bodyFont: 'Arial', bodySize: 22, bodyWeight: 'normal', bodyColor: '#333333', textAlign: 'center' },
          { id: 'corporate-clean', name: 'Corporativo', titleFont: 'Roboto', titleSize: 60, titleWeight: 'bold', titleColor: '#2D3748', subtitleFont: 'Roboto', subtitleSize: 34, subtitleWeight: '400', subtitleColor: '#4A5568', bodyFont: 'Open Sans', bodySize: 20, bodyWeight: 'normal', bodyColor: '#718096', textAlign: 'left' },
          { id: 'creative-fun', name: 'Criativo', titleFont: 'Pacifico', titleSize: 68, titleWeight: 'normal', titleColor: '#9B59B6', subtitleFont: 'Dancing Script', subtitleSize: 44, subtitleWeight: 'normal', subtitleColor: '#E74C3C', bodyFont: 'Comic Sans MS', bodySize: 24, bodyWeight: 'normal', bodyColor: '#3498DB', textAlign: 'center' },
          { id: 'luxury-gold', name: 'Luxo Dourado', titleFont: 'Cinzel', titleSize: 58, titleWeight: 'bold', titleColor: '#D4AF37', subtitleFont: 'Cormorant Garamond', subtitleSize: 38, subtitleWeight: '600', subtitleColor: '#8B7355', bodyFont: 'Crimson Text', bodySize: 22, bodyWeight: 'normal', bodyColor: '#5A5A5A', textAlign: 'center' },
          { id: 'tech-future', name: 'Tech Futurista', titleFont: 'Orbitron', titleSize: 64, titleWeight: 'bold', titleColor: '#00FF88', subtitleFont: 'Rajdhani', subtitleSize: 36, subtitleWeight: '600', subtitleColor: '#00CCFF', bodyFont: 'Share Tech', bodySize: 20, bodyWeight: 'normal', bodyColor: '#AAAAAA', textAlign: 'left' },
          { id: 'neon-vibrant', name: 'Neon Vibrante', titleFont: 'Righteous', titleSize: 70, titleWeight: 'normal', titleColor: '#FF00FF', subtitleFont: 'Audiowide', subtitleSize: 40, subtitleWeight: 'normal', subtitleColor: '#00FFFF', bodyFont: 'Electrolize', bodySize: 22, bodyWeight: 'normal', bodyColor: '#FFFF00', textAlign: 'center' },
          { id: 'editorial-magazine', name: 'Editorial Revista', titleFont: 'DM Serif Display', titleSize: 62, titleWeight: 'normal', titleColor: '#2F4F4F', subtitleFont: 'Source Serif Pro', subtitleSize: 36, subtitleWeight: '600', subtitleColor: '#696969', bodyFont: 'IBM Plex Serif', bodySize: 20, bodyWeight: 'normal', bodyColor: '#808080', textAlign: 'left' },
          { id: 'sports-dynamic', name: 'Esportivo', titleFont: 'Alfa Slab One', titleSize: 72, titleWeight: 'normal', titleColor: '#FF4500', subtitleFont: 'Teko', subtitleSize: 42, subtitleWeight: 'bold', subtitleColor: '#FF6347', bodyFont: 'Saira Condensed', bodySize: 24, bodyWeight: 'normal', bodyColor: '#FF7F50', textAlign: 'center' },
          { id: 'fashion-chic', name: 'Fashion Chic', titleFont: 'Oswald', titleSize: 60, titleWeight: '600', titleColor: '#000000', subtitleFont: 'Montserrat', subtitleSize: 36, subtitleWeight: '300', subtitleColor: '#333333', bodyFont: 'Raleway', bodySize: 20, bodyWeight: 'normal', bodyColor: '#666666', textAlign: 'left' },
          { id: 'food-gourmet', name: 'Food Gourmet', titleFont: 'Lobster Two', titleSize: 62, titleWeight: 'bold', titleColor: '#8B0000', subtitleFont: 'Marck Script', subtitleSize: 40, subtitleWeight: 'normal', subtitleColor: '#A52A2A', bodyFont: 'Caudex', bodySize: 22, bodyWeight: 'normal', bodyColor: '#CD5C5C', textAlign: 'center' },
          { id: 'zen-minimal', name: 'Zen Minimalista', titleFont: 'Zen Antique', titleSize: 58, titleWeight: 'normal', titleColor: '#8FBC8F', subtitleFont: 'Zen Kaku Gothic New', subtitleSize: 34, subtitleWeight: '300', subtitleColor: '#9ACD32', bodyFont: 'Noto Serif JP', bodySize: 20, bodyWeight: 'normal', bodyColor: '#6B8E23', textAlign: 'center' },
        ];

        const applyTemplate = (tpl: typeof TEXT_STYLE_TEMPLATES[0]) => {
          Object.entries(tpl).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'name') {
              update(key, value);
            }
          });
          update('templateId', tpl.id);
        };

        return (
          <div className="space-y-2.5">
            <SectionTitle icon={<Sparkles className="h-3 w-3" />}>Modelo de Estilo</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              {TEXT_STYLE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className={`p-2.5 rounded-lg border text-left transition-all hover:shadow-sm ${
                    config.templateId === tpl.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border/40 bg-muted/20 hover:border-border/70'
                  }`}
                >
                  <p style={{ fontFamily: tpl.titleFont, fontWeight: tpl.titleWeight as any, color: tpl.titleColor, fontSize: 13 }} className="truncate leading-tight">{tpl.name}</p>
                  <p style={{ fontFamily: tpl.subtitleFont, color: tpl.subtitleColor, fontSize: 9 }} className="truncate leading-tight mt-0.5">Subtítulo</p>
                </button>
              ))}
            </div>

            <SectionTitle>Conteúdo</SectionTitle>
            <ConfigField label="Título">
              <Input value={config.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Título principal" className="mt-1" />
            </ConfigField>
            <ConfigField label="Subtítulo">
              <Input value={config.subtitle || ''} onChange={(e) => update('subtitle', e.target.value)} placeholder="Subtítulo" className="mt-1" />
            </ConfigField>
            <ConfigField label="Corpo">
              <Textarea value={config.body || ''} onChange={(e) => update('body', e.target.value)} placeholder="Texto do corpo..." rows={3} className="mt-1" />
            </ConfigField>

            <SectionTitle>Tipografia Avançada</SectionTitle>
            <ConfigField label="Fonte do Título">
              <div className="flex gap-1.5 mt-1">
                <Input value={config.titleFont || 'Montserrat'} onChange={(e) => update('titleFont', e.target.value)} placeholder="Font family" className="flex-1" />
                <input type="color" value={config.titleColor || '#000000'} onChange={(e) => update('titleColor', e.target.value)} className="h-10 w-10 rounded-lg border border-border/50 cursor-pointer" />
              </div>
            </ConfigField>
            <ConfigField label="Fonte do Subtítulo">
              <div className="flex gap-1.5 mt-1">
                <Input value={config.subtitleFont || 'Montserrat'} onChange={(e) => update('subtitleFont', e.target.value)} placeholder="Font family" className="flex-1" />
                <input type="color" value={config.subtitleColor || '#4A4A4A'} onChange={(e) => update('subtitleColor', e.target.value)} className="h-10 w-10 rounded-lg border border-border/50 cursor-pointer" />
              </div>
            </ConfigField>
            <ConfigField label="Fonte do Corpo">
              <div className="flex gap-1.5 mt-1">
                <Input value={config.bodyFont || 'Inter'} onChange={(e) => update('bodyFont', e.target.value)} placeholder="Font family" className="flex-1" />
                <input type="color" value={config.bodyColor || '#666666'} onChange={(e) => update('bodyColor', e.target.value)} className="h-10 w-10 rounded-lg border border-border/50 cursor-pointer" />
              </div>
            </ConfigField>
            <ConfigField label="Alinhamento">
              <Select value={config.textAlign || 'center'} onValueChange={(v) => update('textAlign', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
          </div>
        );
      }

      case 'multiProductSelect':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Produtos Selecionados" hint="Selecione múltiplos produtos diretamente no bloco do canvas. Cada produto será processado individualmente pelo bloco de Saída em Lote.">
              {(config.products || []).length > 0 ? (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(config.products || []).map((p: any, idx: number) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-border/50 relative group">
                        <img src={p.foto_url} alt={p.nome} className="w-full h-20 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <p className="text-[8px] text-white truncate">{p.nome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{config.products.length} produto(s)</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Nenhum produto selecionado. Use o bloco no canvas para adicionar.</p>
              )}
            </ConfigField>
          </div>
        );

      case 'platformFormat': {
        const PLATFORM_PRESETS = [
          { platform: 'instagram', type: 'post', width: 1080, height: 1080, label: 'Post Quadrado' },
          { platform: 'instagram', type: 'story', width: 1080, height: 1920, label: 'Stories' },
          { platform: 'instagram', type: 'reel', width: 1080, height: 1920, label: 'Reels' },
          { platform: 'instagram', type: 'landscape', width: 1080, height: 566, label: 'Post Paisagem' },
          { platform: 'instagram', type: 'portrait', width: 1080, height: 1350, label: 'Post Retrato' },
          { platform: 'whatsapp', type: 'status', width: 1080, height: 1920, label: 'Status' },
          { platform: 'whatsapp', type: 'profile', width: 640, height: 640, label: 'Foto de Perfil' },
          { platform: 'whatsapp', type: 'group', width: 640, height: 640, label: 'Foto de Grupo' },
          { platform: 'facebook', type: 'post', width: 1200, height: 630, label: 'Post' },
          { platform: 'facebook', type: 'story', width: 1080, height: 1920, label: 'Stories' },
          { platform: 'facebook', type: 'cover', width: 820, height: 312, label: 'Capa' },
          { platform: 'facebook', type: 'profile', width: 180, height: 180, label: 'Foto de Perfil' },
          { platform: 'telegram', type: 'post', width: 1280, height: 720, label: 'Post' },
          { platform: 'telegram', type: 'story', width: 1080, height: 1920, label: 'Stories' },
          { platform: 'telegram', type: 'profile', width: 640, height: 640, label: 'Foto de Perfil' },
        ];
        const currentPlatform = config.platform || 'instagram';
        const types = PLATFORM_PRESETS.filter(p => p.platform === currentPlatform);
        return (
          <div className="space-y-2.5">
            <ConfigField label="Plataforma" hint="Selecione a plataforma de destino para definir o tamanho ideal da imagem.">
              <Select value={currentPlatform} onValueChange={(v) => {
                update('platform', v);
                const first = PLATFORM_PRESETS.find(p => p.platform === v);
                if (first) {
                  update('contentType', first.type);
                  update('width', first.width);
                  update('height', first.height);
                }
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">📸 Instagram</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="facebook">👤 Facebook</SelectItem>
                  <SelectItem value="telegram">✈️ Telegram</SelectItem>
                  <SelectItem value="custom">📐 Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            {currentPlatform !== 'custom' && (
              <ConfigField label="Tipo de Conteúdo" hint="Formato específico para a plataforma selecionada.">
                <Select value={config.contentType || types[0]?.type || 'post'} onValueChange={(v) => {
                  update('contentType', v);
                  const preset = PLATFORM_PRESETS.find(p => p.platform === currentPlatform && p.type === v);
                  if (preset) { update('width', preset.width); update('height', preset.height); }
                }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => (
                      <SelectItem key={t.type} value={t.type}>{t.label} ({t.width}×{t.height})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            )}
            {currentPlatform === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <ConfigField label="Largura (px)">
                  <Input type="number" min={100} max={4096} value={config.width || 1080} onChange={(e) => update('width', parseInt(e.target.value) || 1080)} className="mt-1" />
                </ConfigField>
                <ConfigField label="Altura (px)">
                  <Input type="number" min={100} max={4096} value={config.height || 1080} onChange={(e) => update('height', parseInt(e.target.value) || 1080)} className="mt-1" />
                </ConfigField>
              </div>
            )}
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold">{config.width || 1080} × {config.height || 1080}px</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Conecte à saída de um bloco de geração de imagem</p>
            </div>
          </div>
        );
      }

      case 'loopOutput':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Revisão de Resultados" hint="Ao finalizar o lote, uma tela de revisão será exibida para você selecionar quais imagens salvar na galeria.">
              <p className="text-xs text-muted-foreground mt-1">
                As imagens geradas serão exibidas em uma tela de revisão ao final do processamento. Você poderá selecionar quais salvar na galeria ou descartar.
              </p>
            </ConfigField>
          </div>
        );

      case 'randomPick':
        return (
          <div className="space-y-2.5">
            <ConfigField label="Categoria da Galeria" hint="De qual categoria da galeria de referências as imagens serão sorteadas aleatoriamente a cada iteração.">
              <Select value={config.galleryCategory || 'salvas'} onValueChange={(v) => update('galleryCategory', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salvas">📁 Imagens Salvas</SelectItem>
                  <SelectItem value="influencer">👤 Influencers</SelectItem>
                  <SelectItem value="ambiente">🏔️ Ambientes</SelectItem>
                  <SelectItem value="estilo">🎨 Estilos</SelectItem>
                  <SelectItem value="paleta">🎨 Paletas</SelectItem>
                  <SelectItem value="textura">🧱 Texturas</SelectItem>
                  <SelectItem value="logo">⭐ Logos</SelectItem>
                  <SelectItem value="pose">🤸 Poses</SelectItem>
                  <SelectItem value="roupa">👗 Roupas</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
          </div>
        );

      case 'mediaCorrection':
        return (
          <div className="space-y-4">
            <ConfigField label="Tipo de Mídia">
              <Select value={config.mediaType || 'image'} onValueChange={v => update('mediaType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">🖼️ Imagem</SelectItem>
                  <SelectItem value="video">🎬 Vídeo</SelectItem>
                  <SelectItem value="auto">🔄 Auto-detectar</SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>
            <ConfigField label="Instrução de Correção / Refinamento">
              <Textarea
                value={config.correctionPrompt || ''}
                onChange={e => update('correctionPrompt', e.target.value)}
                placeholder="Descreva o que deve ser corrigido ou refinado na mídia gerada. Ex: 'Mude a cor do fundo para azul', 'Remova o texto sobreposto', 'Aumente o brilho da cena'..."
                rows={5}
                className="nodrag nowheel text-sm"
                onClick={e => e.stopPropagation()}
              />
            </ConfigField>
            <ConfigField label="Manter Estilo Original">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.keepOriginalStyle !== false}
                  onCheckedChange={v => update('keepOriginalStyle', v)}
                />
                <span className="text-xs text-muted-foreground">
                  {config.keepOriginalStyle !== false ? 'Sim, manter base original' : 'Não, pode alterar livremente'}
                </span>
              </div>
            </ConfigField>
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>💡 Como usar:</strong> Conecte a saída de um bloco de Gerar Imagem/Vídeo a este bloco, escreva a correção desejada, e conecte a saída deste bloco a um novo bloco de geração.
              </p>
            </div>
          </div>
        );

      default:
        return <p className="text-xs text-muted-foreground">Sem configurações adicionais</p>;
    }
  };

  // Get accent color for this node type
  const nodeAccentMap: Record<string, string> = {
    textInput: '#6366f1', systemPrompt: '#a855f7', imageInput: '#f97316',
    multiProductSelect: '#059669',
    llmProcess: '#0ea5e9', imageGen: '#f43f5e', imageEdit: '#ec4899',
    productComposite: '#8b5cf6', videoGen: '#f59e0b', audioGen: '#22c55e',
    musicGen: '#14b8a6', lipSync: '#06b6d4', videoMerge: '#eab308',
    imageAnalyze: '#14b8a6', loopOutput: '#7c3aed', randomPick: '#e11d48',
    mediaCorrection: '#f97316',
    output: '#64748b', textContent: '#7c3aed',
  };
  const accent = nodeAccentMap[node.data.type] || '#64748b';

   return (
    <div className="w-[85vw] sm:w-[340px] max-w-[340px] h-full border-l border-border/30 bg-gradient-to-b from-card via-card/98 to-card/95 flex flex-col shrink-0 shadow-[-2px_0_16px_-6px_hsl(var(--foreground)/0.04)]">
      {/* Refined header with subtle accent */}
      <div
        className="px-4 py-3.5 border-b border-border/20 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent}08, transparent 60%)` }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}18, transparent)` }} />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${accent}12`, border: `1px solid ${accent}18` }}
            >
              <span className="text-sm">{meta?.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-[12px] text-foreground/90 leading-tight tracking-tight">{node.data.label}</h3>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5 tracking-wide">{meta?.description || 'Configurações'}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-6 w-6 rounded-lg hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground/70">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {onExecuteFromNode && (
        <div className="px-4 py-2.5 border-b border-border/20">
          <Button
            size="sm"
            onClick={() => onExecuteFromNode(node.id)}
            className="w-full gap-2 bg-primary/90 hover:bg-primary text-primary-foreground border-0 rounded-xl text-[11px] h-8 font-medium shadow-sm hover:shadow transition-all"
          >
            <SkipForward className="h-3 w-3" />
            Executar deste ponto
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-3.5 space-y-2">
          {renderConfig()}
        </div>

        {activeResult && (
          <div className="mx-3.5 mb-4 mt-2 pt-3 border-t border-border/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3 text-primary/60" />
              <Label className="text-[10px] font-medium text-primary/70 tracking-wide">Resultado</Label>
            </div>
            <div className="rounded-xl border border-border/25 bg-gradient-to-br from-muted/20 to-muted/10 p-3 shadow-sm">
              {typeof activeResult === 'string' && (
                <p className="text-[11px] whitespace-pre-wrap text-foreground/60 leading-relaxed">{activeResult}</p>
              )}
              {activeResult?.imageUrl && (
                <img src={activeResult.imageUrl} alt="Result" className="w-full rounded-lg shadow-sm" />
              )}
              {activeResult?.text && (
                <p className="text-[11px] whitespace-pre-wrap mt-2 text-foreground/60 leading-relaxed">{activeResult.text}</p>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default StudioNodeConfigPanel;
