import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, RotateCcw, Video, Image, Check, Wand2, Film, LayoutList, Copy, Shuffle, Library, FileText, Clapperboard, Layers, RefreshCw, BookOpen, Pencil, Save, Trash2, Play, ImageIcon, Bot, Palette, Smartphone, Puzzle, Target, Tag, Camera, Sun, Zap, RectangleHorizontal, Crosshair, Megaphone, Anchor, Tv, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PromptPresets, { type PromptPreset } from './PromptPresets';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getStudioDefaults } from './AISettingsPanel';

// ─── LAYER DEFINITIONS ───────────────────────────────────────────────

interface LayerOption {
  id: string;
  label: string;
  emoji?: string;
}

interface Layer {
  id: string;
  title: string;
  emoji: string;
  icon: LucideIcon;
  iconColor: string; // tailwind gradient classes
  description: string;
  options: LayerOption[];
  multiple?: boolean;
  required?: boolean;
  visibleWhen?: (selections: Record<string, string[]>) => boolean;
  filterOptions?: (options: LayerOption[], selections: Record<string, string[]>) => LayerOption[];
}

// Map platform IDs to their compatible orientation IDs
const PLATFORM_ORIENTATION_MAP: Record<string, string[]> = {
  'tiktok': ['vertical', 'tiktok'],
  'instagram': ['square', 'ig-feed', 'ig-carousel', 'horizontal'],
  'instagram-reels': ['vertical', 'ig-reels'],
  'youtube': ['horizontal', 'youtube-thumb'],
  'youtube-shorts': ['vertical', 'youtube-shorts'],
  'facebook-ads': ['facebook-feed', 'square', 'vertical', 'horizontal'],
  'landing-page': ['horizontal', 'square'],
  'hero-section': ['horizontal', 'banner-web'],
};

const LAYERS: Layer[] = [
  {
    id: 'contentType',
    title: 'Tipo de Conteúdo',
    emoji: '🎬',
    icon: Play,
    iconColor: 'from-violet-500 to-purple-600',
    description: 'Escolha entre vídeo ou imagem',
    required: true,
    options: [
      { id: 'video', label: 'Geração de Vídeo', emoji: '🎥' },
      { id: 'image', label: 'Geração de Imagem', emoji: '🖼️' },
    ],
  },
  {
    id: 'videoModel',
    title: 'Modelo de IA',
    emoji: '🤖',
    icon: Bot,
    iconColor: 'from-blue-500 to-cyan-500',
    description: 'Selecione o modelo de vídeo',
    required: true,
    visibleWhen: (s) => s.contentType?.includes('video'),
    options: [
      { id: 'veo3', label: 'Veo 3', emoji: '🔵' },
      { id: 'sora', label: 'Sora', emoji: '🟢' },
      { id: 'kling', label: 'Kling', emoji: '🟣' },
      { id: 'gen4', label: 'Gen-4', emoji: '🔴' },
      { id: 'hailuo', label: 'Hailuo', emoji: '🟡' },
      { id: 'pika', label: 'Pika', emoji: '🟠' },
      { id: 'dream-machine', label: 'Dream Machine', emoji: '💭' },
      { id: 'seed-video', label: 'Seed Video', emoji: '🌱' },
      { id: 'svd', label: 'Stable Video Diffusion', emoji: '⚡' },
      { id: 'ltx-video', label: 'LTX-Video 2', emoji: '🔮' },
    ],
  },
  {
    id: 'imageModel',
    title: 'Modelo de IA',
    emoji: '🤖',
    icon: Bot,
    iconColor: 'from-blue-500 to-cyan-500',
    description: 'Selecione o modelo de imagem',
    required: true,
    visibleWhen: (s) => s.contentType?.includes('image'),
    options: [
      { id: 'midjourney', label: 'Midjourney', emoji: '🎨' },
      { id: 'stable-diffusion', label: 'Stable Diffusion', emoji: '⚡' },
      { id: 'flux', label: 'Flux', emoji: '🌊' },
      { id: 'dall-e', label: 'DALL-E', emoji: '🟢' },
      { id: 'leonardo', label: 'Leonardo AI', emoji: '🦁' },
    ],
  },
  {
    id: 'visualStyle',
    title: 'Estilo Visual',
    emoji: '🎨',
    icon: Palette,
    iconColor: 'from-pink-500 to-rose-500',
    description: 'Defina a estética do conteúdo',
    options: [
      { id: 'cinematic', label: 'Cinematográfico', emoji: '🎬' },
      { id: 'realistic', label: 'Realista', emoji: '📸' },
      { id: 'ugc', label: 'UGC', emoji: '📱' },
      { id: 'luxury', label: 'Luxo', emoji: '💎' },
      { id: 'minimalist', label: 'Minimalista', emoji: '◻️' },
      { id: 'futuristic', label: 'Futurista', emoji: '🚀' },
      { id: 'commercial', label: 'Publicidade Comercial', emoji: '📺' },
      { id: 'viral', label: 'Viral Redes Sociais', emoji: '🔥' },
      { id: 'documentary', label: 'Estilo Documentário', emoji: '🎥' },
      { id: 'high-fashion', label: 'Alta Moda', emoji: '👗' },
      { id: 'studio-photo', label: 'Fotografia de Estúdio', emoji: '📷' },
      { id: 'lifestyle', label: 'Estilo de Vida', emoji: '🌿' },
    ],
  },
  {
    id: 'platform',
    title: 'Plataforma de Publicação',
    emoji: '📲',
    icon: Smartphone,
    iconColor: 'from-green-500 to-emerald-500',
    description: 'Onde o conteúdo será publicado',
    options: [
      { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
      { id: 'instagram', label: 'Instagram', emoji: '📸' },
      { id: 'instagram-reels', label: 'Instagram Reels', emoji: '🎞️' },
      { id: 'youtube', label: 'YouTube', emoji: '▶️' },
      { id: 'youtube-shorts', label: 'YouTube Shorts', emoji: '⚡' },
      { id: 'facebook-ads', label: 'Facebook Ads', emoji: '📘' },
      { id: 'landing-page', label: 'Vídeo para Landing Page', emoji: '🌐' },
      { id: 'hero-section', label: 'Seção Hero do Site', emoji: '🖥️' },
    ],
  },
  {
    id: 'orientation',
    title: 'Orientação do Conteúdo',
    emoji: '📐',
    icon: RectangleHorizontal,
    iconColor: 'from-sky-500 to-blue-500',
    filterOptions: (options, selections) => {
      const platform = selections.platform?.[0];
      if (!platform || !PLATFORM_ORIENTATION_MAP[platform]) return options;
      const allowed = PLATFORM_ORIENTATION_MAP[platform];
      return options.filter(o => allowed.includes(o.id));
    },
    description: 'Proporção e formato (filtrado pela plataforma selecionada)',
    options: [
      { id: 'vertical', label: 'Vertical (9:16)', emoji: '📱' },
      { id: 'horizontal', label: 'Horizontal (16:9)', emoji: '🖥️' },
      { id: 'square', label: 'Quadrado (1:1)', emoji: '⬜' },
      { id: 'ig-feed', label: 'Instagram Feed (4:5)', emoji: '📸' },
      { id: 'ig-reels', label: 'Instagram Reels (9:16)', emoji: '🎞️' },
      { id: 'ig-stories', label: 'Instagram Stories (9:16)', emoji: '📖' },
      { id: 'ig-carousel', label: 'Instagram Carrossel (1:1)', emoji: '🔄' },
      { id: 'whatsapp-status', label: 'WhatsApp Status (9:16)', emoji: '💬' },
      { id: 'whatsapp-catalog', label: 'WhatsApp Catálogo (1:1)', emoji: '🛍️' },
      { id: 'tiktok', label: 'TikTok (9:16)', emoji: '🎵' },
      { id: 'facebook-feed', label: 'Facebook Feed (1.91:1)', emoji: '📘' },
      { id: 'facebook-stories', label: 'Facebook Stories (9:16)', emoji: '📗' },
      { id: 'facebook-cover', label: 'Facebook Capa (820x312)', emoji: '🖼️' },
      { id: 'youtube-thumb', label: 'YouTube Thumbnail (16:9)', emoji: '▶️' },
      { id: 'youtube-shorts', label: 'YouTube Shorts (9:16)', emoji: '⚡' },
      { id: 'linkedin-feed', label: 'LinkedIn Feed (1.91:1)', emoji: '💼' },
      { id: 'linkedin-stories', label: 'LinkedIn Stories (9:16)', emoji: '📊' },
      { id: 'pinterest', label: 'Pinterest (2:3)', emoji: '📌' },
      { id: 'twitter-post', label: 'X / Twitter Post (16:9)', emoji: '🐦' },
      { id: 'banner-web', label: 'Banner Web (728x90)', emoji: '🌐' },
    ],
  },
  {
    id: 'referenceBlocks',
    title: 'Blocos de Referência',
    emoji: '🧩',
    icon: Puzzle,
    iconColor: 'from-amber-500 to-orange-500',
    description: 'Selecione os blocos que deseja inserir no workflow (múltipla seleção)',
    multiple: true,
    options: [
      { id: 'productImageSelect', label: 'Produto', emoji: '📦' },
      { id: 'galleryInfluencer', label: 'Influencer', emoji: '👤' },
      { id: 'galleryLogo', label: 'Logo / Marca', emoji: '🏷️' },
      { id: 'galleryRoupa', label: 'Roupa / Vestuário', emoji: '👗' },
      { id: 'galleryPose', label: 'Ref. Pose', emoji: '🤸' },
      { id: 'galleryAmbiente', label: 'Ref. Ambiente', emoji: '🏔️' },
      { id: 'galleryEstilo', label: 'Ref. Estilo', emoji: '🎨' },
      { id: 'galleryTextura', label: 'Textura / Material', emoji: '🧱' },
      { id: 'galleryPaleta', label: 'Paleta de Cores', emoji: '🎨' },
      { id: 'imageInput', label: 'Imagem de Referência', emoji: '🖼️' },
    ],
  },
  {
    id: 'campaignType',
    title: 'Tipo de Campanha',
    emoji: '🎯',
    icon: Target,
    iconColor: 'from-red-500 to-rose-500',
    description: 'Formato da narrativa publicitária',
    options: [
      { id: 'showcase', label: 'Vitrine de Produto', emoji: '✨' },
      { id: 'demonstration', label: 'Demonstração de Produto', emoji: '🔍' },
      { id: 'problem-solution', label: 'Problema → Solução', emoji: '💡' },
      { id: 'before-after', label: 'Antes e Depois', emoji: '🔄' },
      { id: 'storytelling', label: 'Narrativa', emoji: '📖' },
      { id: 'influencer-review', label: 'Avaliação de Influencer', emoji: '⭐' },
      { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
      { id: 'lifestyle-usage', label: 'Uso no Dia a Dia', emoji: '🌿' },
      { id: 'testimonial', label: 'Depoimento', emoji: '💬' },
      { id: 'comparison', label: 'Comparação', emoji: '⚖️' },
    ],
  },
  {
    id: 'productCategory',
    title: 'Categoria de Produto',
    emoji: '🏷️',
    icon: Tag,
    iconColor: 'from-teal-500 to-cyan-500',
    description: 'Tipo de produto em destaque',
    options: [
      { id: 'bobinas-papel', label: 'Bobinas de Papel', emoji: '🧻' },
      { id: 'papeis-graficos', label: 'Papéis Gráficos', emoji: '📄' },
      { id: 'descartaveis', label: 'Produtos Descartáveis', emoji: '🥡' },
      { id: 'technology', label: 'Tecnologia', emoji: '💻' },
      { id: 'smartphones', label: 'Smartphones', emoji: '📱' },
      { id: 'gadgets', label: 'Gadgets', emoji: '🔌' },
      { id: 'beauty', label: 'Beleza', emoji: '💄' },
      { id: 'skincare', label: 'Skincare', emoji: '🧴' },
      { id: 'cosmetics', label: 'Cosméticos', emoji: '💅' },
      { id: 'perfumes', label: 'Perfumes', emoji: '🌸' },
      { id: 'fitness', label: 'Fitness', emoji: '💪' },
      { id: 'supplements', label: 'Suplementos', emoji: '💊' },
      { id: 'sportswear', label: 'Roupas Esportivas', emoji: '👟' },
      { id: 'fashion', label: 'Moda', emoji: '👔' },
      { id: 'accessories', label: 'Acessórios', emoji: '⌚' },
      { id: 'food', label: 'Alimentos', emoji: '🍔' },
      { id: 'beverages', label: 'Bebidas', emoji: '🥤' },
      { id: 'automotive', label: 'Automotivo', emoji: '🚗' },
      { id: 'home-gadgets', label: 'Casa Inteligente', emoji: '🏠' },
      { id: 'pets', label: 'Pets', emoji: '🐾' },
      { id: 'jewelry', label: 'Joias', emoji: '💍' },
      { id: 'furniture', label: 'Móveis', emoji: '🛋️' },
      { id: 'cleaning', label: 'Limpeza', emoji: '🧹' },
      { id: 'health', label: 'Saúde', emoji: '🏥' },
      { id: 'baby', label: 'Bebê / Infantil', emoji: '👶' },
      { id: 'education', label: 'Educação / Cursos', emoji: '📚' },
      { id: 'software', label: 'Software / SaaS', emoji: '🖥️' },
      { id: 'real-estate', label: 'Imóveis', emoji: '🏡' },
      { id: 'travel', label: 'Viagens / Turismo', emoji: '✈️' },
    ],
  },
  {
    id: 'cameraStyle',
    title: 'Estilo de Câmera',
    emoji: '📹',
    icon: Camera,
    iconColor: 'from-indigo-500 to-violet-500',
    description: 'Movimento e enquadramento',
    visibleWhen: (s) => s.contentType?.includes('video'),
    options: [
      { id: 'handheld', label: 'Câmera na Mão', emoji: '🤳' },
      { id: 'cinematic-camera', label: 'Câmera Cinematográfica', emoji: '🎬' },
      { id: 'drone', label: 'Tomada de Drone', emoji: '🚁' },
      { id: 'macro', label: 'Tomada Macro', emoji: '🔬' },
      { id: 'slowmo', label: 'Câmera Lenta', emoji: '🐌' },
      { id: 'tracking', label: 'Câmera de Acompanhamento', emoji: '🏃' },
      { id: 'pov', label: 'Câmera POV', emoji: '👁️' },
      { id: 'rotation', label: 'Rotação de Produto', emoji: '🔄' },
    ],
  },
  {
    id: 'lighting',
    title: 'Estilo de Iluminação',
    emoji: '💡',
    icon: Sun,
    iconColor: 'from-yellow-500 to-amber-500',
    description: 'Tom e atmosfera da luz',
    options: [
      { id: 'natural', label: 'Luz Natural', emoji: '☀️' },
      { id: 'studio', label: 'Iluminação de Estúdio', emoji: '💡' },
      { id: 'dramatic', label: 'Iluminação Dramática', emoji: '🌑' },
      { id: 'neon', label: 'Iluminação Neon', emoji: '🟣' },
      { id: 'soft-luxury', label: 'Iluminação Suave de Luxo', emoji: '✨' },
      { id: 'high-contrast', label: 'Alto Contraste', emoji: '⬛' },
      { id: 'golden-hour', label: 'Hora Dourada', emoji: '🌅' },
    ],
  },
  {
    id: 'energy',
    title: 'Energia do Conteúdo',
    emoji: '⚡',
    icon: Zap,
    iconColor: 'from-orange-500 to-red-500',
    description: 'Ritmo e sensação geral',
    options: [
      { id: 'high-energy', label: 'Alta Energia', emoji: '🔥' },
      { id: 'calm', label: 'Calmo / Estético', emoji: '🌿' },
      { id: 'luxury-mood', label: 'Atmosfera de Luxo', emoji: '💎' },
      { id: 'dramatic-mood', label: 'Dramático', emoji: '🎭' },
      { id: 'emotional', label: 'Emocional', emoji: '💖' },
      { id: 'inspirational', label: 'Inspiracional', emoji: '🌟' },
    ],
  },
  {
    id: 'marketingGoal',
    title: 'Objetivo de Marketing',
    emoji: '🎯',
    icon: Crosshair,
    iconColor: 'from-fuchsia-500 to-pink-500',
    description: 'Defina o objetivo do anúncio',
    options: [
      { id: 'product-awareness', label: 'Conhecimento do Produto', emoji: '👁️' },
      { id: 'direct-sales', label: 'Vendas Diretas', emoji: '💰' },
      { id: 'lead-generation', label: 'Geração de Leads', emoji: '📋' },
      { id: 'brand-awareness', label: 'Conhecimento de Marca', emoji: '🏢' },
      { id: 'app-install', label: 'Instalação de App', emoji: '📲' },
      { id: 'product-launch', label: 'Lançamento de Produto', emoji: '🚀' },
      { id: 'retargeting', label: 'Retargeting', emoji: '🔁' },
      { id: 'social-proof', label: 'Prova Social', emoji: '⭐' },
      { id: 'educational', label: 'Conteúdo Educativo', emoji: '📚' },
      { id: 'viral-engagement', label: 'Engajamento Viral', emoji: '🔥' },
    ],
  },
  {
    id: 'hookStyle',
    title: 'Estilo de Gancho',
    emoji: '🪝',
    icon: Anchor,
    iconColor: 'from-lime-500 to-green-500',
    description: 'Tipo de abertura para capturar atenção',
    options: [
      { id: 'pattern-interrupt', label: 'Quebra de Padrão', emoji: '⚡' },
      { id: 'question', label: 'Gancho de Pergunta', emoji: '❓' },
      { id: 'problem', label: 'Gancho de Problema', emoji: '😰' },
      { id: 'shock', label: 'Choque / Surpresa', emoji: '😱' },
      { id: 'visual-hook', label: 'Gancho Visual', emoji: '👀' },
      { id: 'fast-demo', label: 'Demo Rápida', emoji: '⏩' },
      { id: 'bold-statement', label: 'Declaração Impactante', emoji: '💪' },
      { id: 'curiosity', label: 'Gancho de Curiosidade', emoji: '🤔' },
    ],
  },
  {
    id: 'creativeFormat',
    title: 'Formato Criativo',
    emoji: '🎞️',
    icon: Tv,
    iconColor: 'from-muted-foreground to-zinc-600',
    description: 'Estrutura criativa do conteúdo',
    options: [
      { id: 'ugc-ad', label: 'Anúncio UGC', emoji: '📱' },
      { id: 'product-hero', label: 'Destaque do Produto', emoji: '✨' },
      { id: 'influencer-review', label: 'Avaliação de Influencer', emoji: '⭐' },
      { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
      { id: 'before-after', label: 'Antes e Depois', emoji: '🔄' },
      { id: 'lifestyle-ad', label: 'Anúncio Estilo de Vida', emoji: '🌿' },
      { id: 'cinematic-brand', label: 'Filme de Marca Cinematográfico', emoji: '🎬' },
      { id: 'viral-clip', label: 'Clipe Viral para Redes', emoji: '🔥' },
      { id: 'testimonial', label: 'Depoimento', emoji: '💬' },
      { id: 'product-comparison', label: 'Comparação de Produtos', emoji: '⚖️' },
    ],
  },
];

// ─── VIRAL HOOK LIBRARY ──────────────────────────────────────────────

interface ViralHook {
  category: string;
  emoji: string;
  hooks: string[];
}

// Map hookStyle option IDs to their VIRAL_HOOKS category
const HOOK_STYLE_CATEGORY_MAP: Record<string, string> = {
  'pattern-interrupt': 'Quebra de Padrão',
  'question': 'Gancho de Pergunta',
  'problem': 'Gancho de Problema',
  'shock': 'Gancho de Choque',
  'curiosity': 'Gancho de Curiosidade',
  'bold-statement': 'Declaração Impactante',
  'visual-hook': 'Gancho Visual',
  'fast-demo': 'Demo Rápida',
};

const DEFAULT_VIRAL_HOOKS: ViralHook[] = [
  {
    category: 'Quebra de Padrão',
    emoji: '⚡',
    hooks: [
      'Espera... ninguém te conta isso sobre esse produto.',
      'Pare tudo o que você está fazendo e veja isso.',
      'Isso não deveria funcionar assim... mas funciona.',
      'Eu apostei que não ia funcionar. Estava errado.',
      'Isso muda tudo que você sabe sobre esse assunto.',
    ],
  },
  {
    category: 'Gancho de Pergunta',
    emoji: '❓',
    hooks: [
      'Você sabia que está usando isso do jeito errado?',
      'Por que ninguém fala sobre isso?',
      'Qual desses dois produtos é realmente melhor?',
      'Você pagaria R$10 por isso? E se eu te disser o preço real...',
      'O que acontece quando você combina esses dois produtos?',
    ],
  },
  {
    category: 'Gancho de Problema',
    emoji: '😰',
    hooks: [
      'Cansado de desperdiçar dinheiro com produtos que não funcionam?',
      'Se você tem esse problema, precisa ver isso.',
      'O maior erro que as pessoas cometem com isso.',
      'Eu sofri com isso por anos até descobrir a solução.',
      'Isso pode estar custando muito mais do que você imagina.',
    ],
  },
  {
    category: 'Gancho de Choque',
    emoji: '😱',
    hooks: [
      'Eu não acreditei quando vi o resultado.',
      'Isso vai te chocar — mas é 100% real.',
      'Veja o que aconteceu quando testei isso.',
      'O resultado superou todas as expectativas.',
      'Você nunca mais vai olhar para isso da mesma forma.',
    ],
  },
  {
    category: 'Gancho de Curiosidade',
    emoji: '🤔',
    hooks: [
      'Assista até o final para ver o resultado.',
      'O segredo que as grandes marcas não querem que você saiba.',
      'Tem uma coisa sobre esse produto que muda tudo...',
      'Vou te mostrar algo que pouca gente conhece.',
      'Existe um truque simples que ninguém usa — até agora.',
    ],
  },
  {
    category: 'Declaração Impactante',
    emoji: '💪',
    hooks: [
      'Esse é o melhor produto que eu já testei. Ponto final.',
      'Isso mudou minha rotina completamente.',
      'Se você não está usando isso, está perdendo tempo.',
      'Sem dúvida, a melhor compra que fiz esse ano.',
      'Depois de testar 50 marcas, essa é a vencedora.',
    ],
  },
  {
    category: 'Gancho Visual',
    emoji: '👀',
    hooks: [
      'Olha essa textura... incrível.',
      'Assista de perto — cada detalhe importa.',
      'Zoom no detalhe que faz toda a diferença.',
      'Presta atenção nessa transformação.',
      'Visual satisfatório que você vai querer assistir de novo.',
    ],
  },
  {
    category: 'Demo Rápida',
    emoji: '⏩',
    hooks: [
      'Em 10 segundos você vai entender porque isso é tão bom.',
      'Demonstração rápida — resultado impressionante.',
      'Veja como funciona em tempo real.',
      'Teste prático: antes e depois em segundos.',
      'Rápido, simples e eficiente. Veja como.',
    ],
  },
];

// ─── MAPS ────────────────────────────────────────────────────────────

const creativeFormatMap: Record<string, string> = {
  'ugc-ad': 'A raw, authentic UGC-style ad filmed with a smartphone feel. The creator speaks directly to camera, showing the product naturally as if sharing with friends.',
  'product-hero': 'A stunning product hero shot with the product as the absolute centerpiece, elevated on a pedestal or floating, with dramatic lighting emphasizing every detail and texture.',
  'influencer-review': 'An influencer review where a charismatic creator naturally demonstrates and reviews the product, sharing genuine reactions and highlighting key features.',
  'unboxing': 'An exciting unboxing experience capturing the anticipation and reveal of the product, showing premium packaging details and the first-touch reaction.',
  'before-after': 'A dramatic before and after transformation showing the clear difference and impact of using the product, with split-screen or transition reveal.',
  'lifestyle-ad': 'A lifestyle advertisement showing the product seamlessly integrated into an aspirational daily routine, emphasizing how it enhances everyday life.',
  'cinematic-brand': 'A premium cinematic brand film with sweeping visuals, emotional narrative arc, and high-production value that elevates the brand identity.',
  'viral-clip': 'A highly shareable viral social media clip designed for maximum engagement, with unexpected elements, quick transitions, and thumb-stopping moments.',
  'testimonial': 'An authentic testimonial featuring a real customer sharing their genuine experience, with natural settings and honest emotional reactions.',
  'product-comparison': 'A side-by-side product comparison clearly demonstrating the advantages over competitors, with data-driven visuals and clear differentiators.',
};

const campaignMap: Record<string, string> = {
  'showcase': 'The scene showcases the product with elegant, premium presentation.',
  'demonstration': 'The scene demonstrates the product features and real-world functionality step by step.',
  'problem-solution': 'The narrative follows a problem-solution structure: first showing the frustration, then the product as the solution.',
  'before-after': 'The visual narrative reveals a dramatic before-and-after transformation.',
  'storytelling': 'The content tells a compelling emotional story connected to the brand.',
  'influencer-review': 'An influencer reviews and recommends the product with genuine enthusiasm.',
  'unboxing': 'The scene captures a premium unboxing experience with tactile details.',
  'lifestyle-usage': 'The product is shown being used naturally in an aspirational everyday lifestyle setting.',
  'testimonial': 'Authentic customer testimonial with genuine emotional connection.',
  'comparison': 'Direct comparison highlighting the product advantages over alternatives.',
};

const productMap: Record<string, string> = {
  'bobinas-papel': 'The product is a premium industrial paper roll (bobina de papel), designed for high-volume commercial and industrial printing applications, showcasing superior paper quality, consistent texture, and reliable material strength.',
  'papeis-graficos': 'The product is a professional-grade graphic paper engineered for precision printing, featuring an ultra-smooth finish optimized for vivid color reproduction and sharp detail in professional publishing and design work.',
  'descartaveis': 'The product is a single-use disposable item designed for convenience, hygiene, and practical everyday use, emphasizing its clean packaging, functional design, and effortless disposal after use.',
  'technology': 'The product is a cutting-edge technology device with sleek industrial design, premium build materials, and innovative features that represent the latest in consumer electronics.',
  'smartphones': 'The product is a premium smartphone featuring a stunning edge-to-edge display, precision-machined aluminum or glass body, and advanced camera system with professional-grade capabilities.',
  'gadgets': 'The product is an innovative consumer tech gadget engineered to solve everyday problems through smart technology, compact design, and intuitive user interaction.',
  'beauty': 'The product is a premium beauty item with luxurious textures, rich color formulations, and sophisticated packaging that communicates elegance and self-care.',
  'skincare': 'The product is a professional skincare solution formulated with clinically proven ingredients, designed to deliver visible results such as hydration, radiance, and skin renewal.',
  'cosmetics': 'The product is a high-performance cosmetic with rich pigment payoff, elegant finishes, and professional-grade quality suitable for both everyday and editorial use.',
  'perfumes': 'The product is a luxury fragrance housed in an artistically designed bottle, evoking sensory sophistication through its visual presentation and aromatic character.',
  'fitness': 'The product is professional-grade fitness equipment engineered for peak athletic performance, durability, and ergonomic comfort during intense training sessions.',
  'supplements': 'The product is a health and wellness supplement with scientifically backed formulation, clean ingredient sourcing, and transparent labeling for informed consumers.',
  'sportswear': 'The product is high-performance athletic sportswear combining moisture-wicking technology, ergonomic fit, and contemporary style for active lifestyles.',
  'fashion': 'The product is a fashion garment or ensemble with designer-level tailoring, premium fabrics, and trend-forward aesthetics that define contemporary style.',
  'accessories': 'The product is a premium fashion accessory crafted with fine materials and refined details, designed to elevate any outfit with sophistication.',
  'food': 'The product is a gourmet food item with appetizing visual presentation, vibrant natural colors, and premium culinary quality that invites tasting.',
  'beverages': 'The product is a premium beverage with refreshing visual appeal, realistic condensation on the container, and enticing liquid motion that communicates freshness.',
  'automotive': 'The product is an automotive item or vehicle featuring precision engineering, aerodynamic design lines, and a powerful visual presence that conveys performance.',
  'home-gadgets': 'The product is a smart home device designed for modern connected living, showcasing seamless integration, intuitive controls, and minimalist aesthetic.',
  'pets': 'The product is designed specifically for pet care and comfort, shown with authentic animal interaction that highlights pet-friendly materials and thoughtful design.',
  'jewelry': 'The product is a fine jewelry piece featuring sparkling gemstones, lustrous metallic surfaces, and intricate craftsmanship visible in every detail.',
  'furniture': 'The product is a designer furniture piece showcasing master craftsmanship, premium materials, and harmonious integration within contemporary interior spaces.',
  'cleaning': 'The product is a cleaning solution or tool engineered for maximum effectiveness, designed to deliver visible cleanliness with ease and efficiency.',
  'health': 'The product is a health and medical-grade item focused on wellness, safety compliance, and clinical-quality standards for consumer confidence.',
  'baby': 'The product is a baby or children\'s item designed with the highest safety standards, soft materials, and gentle aesthetics that communicate care and protection.',
  'education': 'The product is an educational program, course, or learning material that showcases knowledge transformation, personal growth, and measurable skill development.',
  'software': 'The product is a software or SaaS platform presented through polished UI mockups, demonstrating intuitive workflows, productivity gains, and modern digital design.',
  'real-estate': 'The product is a real estate property showcasing architectural excellence, premium interior finishes, and an aspirational lifestyle setting.',
  'travel': 'The product is a travel or tourism experience highlighting breathtaking destinations, immersive adventure, and unforgettable cultural moments.',
};

const refBlockPromptMap: Record<string, string> = {
  'productImageSelect': 'The product reference image is provided as visual input for accurate representation.',
  'galleryInfluencer': 'A charismatic influencer presents the product with natural confidence. Reference photo provided.',
  'galleryLogo': 'The brand logo is included for visual identity integration.',
  'galleryRoupa': 'Clothing/outfit reference is provided for accurate wardrobe representation.',
  'galleryPose': 'A pose reference is provided for body positioning and composition.',
  'galleryAmbiente': 'An environment reference is provided for scene setting and ambiance.',
  'galleryEstilo': 'A style reference is provided for visual aesthetic direction.',
  'galleryTextura': 'A texture/material reference is provided for surface detail accuracy.',
  'galleryPaleta': 'A color palette reference is provided for cohesive color direction.',
  'imageInput': 'A custom reference image is provided as visual guidance.',
};

const goalMap: Record<string, string> = {
  'product-awareness': 'The tone focuses on introducing and building awareness for the product, making it memorable and recognizable.',
  'direct-sales': 'The tone is conversion-driven, emphasizing clear product benefits, urgency, and a strong call-to-action.',
  'lead-generation': 'The content is designed to spark curiosity and drive the viewer to learn more or sign up.',
  'brand-awareness': 'The focus is on emotional brand storytelling, building identity and long-term recognition.',
  'app-install': 'The content showcases the app interface and key features, driving installs with a clear CTA.',
  'product-launch': 'The tone builds excitement and anticipation for a brand-new product reveal.',
  'retargeting': 'The content reinforces the product value proposition for viewers who have already shown interest.',
  'social-proof': 'The content emphasizes social proof through reviews, ratings, user counts, or testimonials.',
  'educational': 'The content educates the viewer about the product with informative, value-driven messaging.',
  'viral-engagement': 'The content is engineered for maximum shares and engagement with trending, shareable elements.',
};

const hookMap: Record<string, string> = {
  'pattern-interrupt': 'Strong pattern interrupt in the first 3 seconds — an unexpected visual or action that immediately breaks the viewer\'s scroll and demands attention.',
  'question': 'Open with a provocative question displayed on screen or spoken directly to camera that makes the viewer pause and think.',
  'problem': 'Start by dramatizing a relatable problem or pain point that the viewer immediately identifies with, creating urgency.',
  'shock': 'Begin with a shocking or surprising visual reveal that creates an immediate emotional reaction and curiosity.',
  'visual-hook': 'Open with a stunning, visually arresting shot — dramatic close-up, unexpected angle, or mesmerizing motion that captivates instantly.',
  'fast-demo': 'Jump straight into a rapid product demonstration in the first 2 seconds, showing the product in action before the viewer can scroll.',
  'bold-statement': 'Open with a bold, controversial, or provocative text statement on screen that challenges the viewer\'s assumptions.',
  'curiosity': 'Create a curiosity gap in the opening — show a teaser of the result or an intriguing setup that makes the viewer need to keep watching.',
};

const cameraMap: Record<string, string> = {
  'handheld': 'Handheld camera with natural organic movement, slight shake for authentic feel. Close to mid-range framing.',
  'cinematic-camera': 'Smooth cinematic camera on gimbal or dolly. Precise, controlled movements with professional film-grade framing and depth of field.',
  'drone': 'Aerial drone shot with sweeping, elevated perspective revealing the full scene and environment.',
  'macro': 'Extreme macro close-up shot revealing fine textures, materials, and microscopic product details.',
  'slowmo': 'Dramatic slow motion capture at 120-240fps, emphasizing every detail of movement and texture.',
  'tracking': 'Dynamic tracking shot following the subject with smooth lateral or forward movement, keeping the subject perfectly framed.',
  'pov': 'Immersive first-person POV perspective, placing the viewer directly in the scene as if experiencing it themselves.',
  'rotation': '360-degree product rotation on turntable, revealing every angle with consistent, smooth motion.',
};

const lightMap: Record<string, string> = {
  'natural': 'Natural daylight illumination with soft window light or outdoor sunlight, creating authentic warmth and gentle shadows.',
  'studio': 'Professional multi-point studio lighting setup with key light, fill light, and rim light for polished, controlled illumination.',
  'dramatic': 'Dramatic chiaroscuro lighting with deep shadows and strong directional light creating bold contrast and mood.',
  'neon': 'Vibrant neon lighting with colorful reflections, glows, and RGB accents creating a modern, edgy atmosphere.',
  'soft-luxury': 'Soft, diffused luxury lighting with warm tones, delicate highlights, and gentle gradients for an elegant premium feel.',
  'high-contrast': 'High contrast lighting with bold shadows and bright highlights, creating strong graphic visual impact.',
  'golden-hour': 'Warm golden hour sunlight with long shadows, amber tones, and a magical, dreamy atmospheric quality.',
};

const energyMap: Record<string, string> = {
  'high-energy': 'Fast-paced dynamic action with quick cuts, rapid movements, and intense rhythm.',
  'calm': 'Slow, contemplative, and aesthetic rhythm. Gentle movements, long takes, and a serene atmosphere.',
  'luxury-mood': 'Sophisticated, slow, and premium-paced. Every movement is deliberate and elegant.',
  'dramatic-mood': 'Building dramatic tension with suspenseful pacing and a powerful climactic reveal.',
  'emotional': 'Emotionally charged pacing that connects deeply with the viewer.',
  'inspirational': 'Uplifting and motivational rhythm building from calm to powerful and empowering.',
};

const styleMap: Record<string, string> = {
  'cinematic': 'Cinematic film aesthetic with wide dynamic range, subtle film grain, anamorphic lens characteristics, and professional color grading with teal-orange tones.',
  'realistic': 'Hyper-realistic photographic quality with natural skin tones, authentic textures, and true-to-life color accuracy. Shot on a professional DSLR or mirrorless camera.',
  'ugc': 'Authentic user-generated content aesthetic filmed on a smartphone. Raw, unpolished, natural feel as if a real person created this content spontaneously. No professional production value — the authenticity IS the appeal.',
  'luxury': 'Ultra-premium luxury visual language with rich metallic textures, deep blacks, golds, and refined composition that communicates exclusivity.',
  'minimalist': 'Clean minimalist design with abundant white space, simple geometric composition, and restrained color palette.',
  'futuristic': 'Futuristic sci-fi aesthetic with holographic elements, sleek reflective surfaces, and cool cyber-blue tones.',
  'commercial': 'Broadcast-quality commercial advertising with perfect color balance, crisp resolution, and polished production value.',
  'viral': 'Bold, attention-grabbing viral social media style with oversaturated colors, fast energy, and thumb-stopping visual impact. Smartphone-shot feel.',
  'documentary': 'Documentary style with authentic, journalistic visual approach. Natural framing, observational camera work, and truthful representation.',
  'high-fashion': 'High fashion editorial aesthetic with bold artistic styling, dramatic poses, avant-garde composition, and magazine-quality finish.',
  'studio-photo': 'Professional studio photography with controlled multi-point lighting, seamless backgrounds, and precise focus for maximum product clarity.',
  'lifestyle': 'Warm lifestyle aesthetic with natural golden tones, aspirational everyday settings, and an inviting, relatable atmosphere.',
};

const platformMap: Record<string, string> = {
  'tiktok': 'Optimized for TikTok: vertical 9:16, fast-paced editing, first 1-2 seconds must hook.',
  'instagram': 'Optimized for Instagram Feed: visually striking composition, cohesive color palette.',
  'instagram-reels': 'Optimized for Instagram Reels: vertical 9:16, dynamic transitions, engaging within first 3 seconds.',
  'youtube': 'Optimized for YouTube: widescreen 16:9, cinematic quality, structured narrative.',
  'youtube-shorts': 'Optimized for YouTube Shorts: vertical 9:16, quick-hit content under 60 seconds.',
  'facebook-ads': 'Optimized for Facebook Ads: conversion-focused, clear product benefits, strong CTA.',
  'landing-page': 'Optimized for landing page hero: premium, persuasive, looping capability.',
  'hero-section': 'Optimized for website hero section: seamless looping ambient visual, subtle motion.',
};

const orientMap: Record<string, string> = {
  'vertical': 'Vertical format 9:16 aspect ratio (1080x1920).',
  'horizontal': 'Horizontal format 16:9 aspect ratio (1920x1080).',
  'square': 'Square format 1:1 aspect ratio (1080x1080).',
  'ig-feed': 'Instagram Feed format 4:5 aspect ratio (1080x1350). Optimized for maximum feed visibility.',
  'ig-reels': 'Instagram Reels format 9:16 vertical (1080x1920). Full-screen immersive vertical video.',
  'ig-stories': 'Instagram Stories format 9:16 vertical (1080x1920). Ephemeral full-screen content.',
  'ig-carousel': 'Instagram Carousel format 1:1 square (1080x1080). Multi-slide swipeable content.',
  'whatsapp-status': 'WhatsApp Status format 9:16 vertical (1080x1920). Full-screen status update.',
  'whatsapp-catalog': 'WhatsApp Catalog format 1:1 square (1080x1080). Product catalog thumbnail.',
  'tiktok': 'TikTok format 9:16 vertical (1080x1920). Fast-paced, attention-grabbing vertical content.',
  'facebook-feed': 'Facebook Feed format 1.91:1 landscape (1200x628). Optimized for news feed engagement.',
  'facebook-stories': 'Facebook Stories format 9:16 vertical (1080x1920). Full-screen story content.',
  'facebook-cover': 'Facebook Cover Photo format (820x312). Banner-style header image.',
  'youtube-thumb': 'YouTube Thumbnail format 16:9 (1280x720). High-impact clickable thumbnail.',
  'youtube-shorts': 'YouTube Shorts format 9:16 vertical (1080x1920). Short-form vertical video.',
  'linkedin-feed': 'LinkedIn Feed format 1.91:1 landscape (1200x628). Professional content optimized for engagement.',
  'linkedin-stories': 'LinkedIn Stories format 9:16 vertical (1080x1920). Professional story content.',
  'pinterest': 'Pinterest Pin format 2:3 vertical (1000x1500). Tall format optimized for Pinterest feed.',
  'twitter-post': 'X/Twitter Post format 16:9 (1200x675). Optimized for timeline visibility.',
  'banner-web': 'Web Banner format (728x90). Standard leaderboard display ad.',
};

// ─── STYLE-ADAPTIVE OVERRIDES ────────────────────────────────────────

interface StyleOverrides {
  camera: string;
  lighting: string;
  styleTone: string;
}

function getStyleOverrides(visualStyle: string | undefined, userCamera: string | undefined, userLighting: string | undefined): StyleOverrides {
  // UGC style overrides — camera and lighting must match the authentic feel
  if (visualStyle === 'ugc' || visualStyle === 'viral') {
    return {
      camera: 'Handheld smartphone camera with natural handheld motion and slightly imperfect framing typical of real user-generated content. No gimbal, no dolly, no cinematic movements.',
      lighting: 'Natural ambient lighting similar to indoor daylight or casual everyday environments. No studio setups, no dramatic shadows.',
      styleTone: 'Authentic, casual, relatable, unpolished smartphone aesthetic. The content should feel like a real person filmed it spontaneously.',
    };
  }

  // Documentary style — authentic but more intentional than UGC
  if (visualStyle === 'documentary') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Steady handheld camera with intentional, observational framing. Natural movements that follow the subject without drawing attention to the camera work.',
      lighting: userLighting ? lightMap[userLighting] : 'Available natural light with minimal intervention. Authentic environmental lighting that preserves the reality of the scene.',
      styleTone: 'Journalistic, authentic, observational. The content should feel truthful and unscripted.',
    };
  }

  // Lifestyle — warm and natural but polished
  if (visualStyle === 'lifestyle') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Smooth handheld or light gimbal camera with gentle, organic movement. Intimate mid-range framing that feels natural and inviting.',
      lighting: userLighting ? lightMap[userLighting] : 'Warm natural light with soft golden tones. Window light or outdoor golden hour feel that creates an aspirational, cozy atmosphere.',
      styleTone: 'Warm, aspirational, natural. The content should feel like a beautiful moment from everyday life.',
    };
  }

  // Cinematic / Luxury / High-Fashion — full production value
  if (visualStyle === 'cinematic' || visualStyle === 'luxury' || visualStyle === 'high-fashion') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Professional cinema camera on gimbal or dolly with smooth, precise cinematic movements. Professional composition with shallow depth of field and carefully planned framing.',
      lighting: userLighting ? lightMap[userLighting] : 'Dramatic cinematic lighting with controlled studio setup. Multi-point lighting with intentional shadows, rim lights, and atmospheric depth.',
      styleTone: visualStyle === 'luxury'
        ? 'Ultra-premium, sophisticated, aspirational. Every frame should communicate exclusivity and refined taste.'
        : visualStyle === 'high-fashion'
          ? 'Editorial high-fashion aesthetic with bold artistic choices, dramatic poses, and magazine-quality visual impact.'
          : 'Premium film-like advertising aesthetic with wide dynamic range, professional color grading, and cinematic depth.',
    };
  }

  // Commercial — broadcast quality
  if (visualStyle === 'commercial') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Professional camera with smooth controlled movements. Broadcast-quality framing with precise focus pulls and clean composition.',
      lighting: userLighting ? lightMap[userLighting] : 'Professional studio lighting with balanced exposure, clean whites, and perfectly controlled shadows for broadcast-ready content.',
      styleTone: 'Polished, professional, broadcast-ready commercial quality with perfect color balance and crisp resolution.',
    };
  }

  // Studio Photography — controlled environment
  if (visualStyle === 'studio-photo') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Fixed or controlled camera on tripod with precise framing. Sharp focus with controlled depth of field on seamless studio background.',
      lighting: userLighting ? lightMap[userLighting] : 'Professional multi-point studio lighting with key light, fill light, and rim light for polished, controlled illumination.',
      styleTone: 'Clean, controlled, professional studio environment with seamless backgrounds and perfect product isolation.',
    };
  }

  // Default: use user selections or sensible defaults
  return {
    camera: userCamera ? cameraMap[userCamera] : 'Professional camera with smooth, controlled movement and intentional framing.',
    lighting: userLighting ? lightMap[userLighting] : 'Professional lighting setup optimized for the scene and subject.',
    styleTone: '',
  };
}

// ─── PROMPT GENERATOR ────────────────────────────────────────────────

function generatePrompt(selections: Record<string, string[]>, negativePrompt: string): string {
  const isVideo = selections.contentType?.includes('video');
  const visualStyle = selections.visualStyle?.[0];
  const userCamera = selections.cameraStyle?.[0];
  const userLighting = selections.lighting?.[0];
  const overrides = getStyleOverrides(visualStyle, userCamera, userLighting);

  const blocks: { label: string; text: string }[] = [];

  // 1. HOOK (first block — attention in first seconds)
  if (selections.hookStyle?.length) {
    blocks.push({ label: '🪝 HOOK', text: hookMap[selections.hookStyle[0]] || 'Strong attention-grabbing moment in the first seconds of the video.' });
  } else if (isVideo) {
    // Auto-inject a default hook for video content
    blocks.push({ label: '🪝 HOOK', text: 'Strong attention-grabbing moment in the first seconds of the video that immediately captures the viewer\'s interest and stops scrolling.' });
  }

  // 2. SCENE DESCRIPTION
  const sceneParts: string[] = [];
  const contentWord = isVideo ? 'video' : 'image';
  if (selections.creativeFormat?.length) {
    sceneParts.push(creativeFormatMap[selections.creativeFormat[0]] || `Create a professional ${contentWord}`);
  } else {
    sceneParts.push(`Create a professional marketing ${contentWord}`);
  }
  if (selections.campaignType?.length) sceneParts.push(campaignMap[selections.campaignType[0]] || '');
  if (selections.productCategory?.length) sceneParts.push(productMap[selections.productCategory[0]] || '');
  if (selections.referenceBlocks?.length) {
    selections.referenceBlocks.forEach(blockId => {
      if (refBlockPromptMap[blockId]) sceneParts.push(refBlockPromptMap[blockId]);
    });
  }
  if (selections.marketingGoal?.length) sceneParts.push(goalMap[selections.marketingGoal[0]] || '');
  blocks.push({ label: '🎬 SCENE DESCRIPTION', text: sceneParts.filter(Boolean).join(' ') });

  // 3. CAMERA (adaptive based on visual style)
  if (isVideo) {
    blocks.push({ label: '📹 CAMERA', text: overrides.camera });
  }

  // 4. LIGHTING (adaptive based on visual style)
  blocks.push({ label: '💡 LIGHTING', text: overrides.lighting });

  // 5. ACTION
  if (selections.energy?.length) {
    blocks.push({ label: '🎬 ACTION', text: energyMap[selections.energy[0]] || '' });
  }

  // 6. VISUAL STYLE (with adaptive tone)
  if (visualStyle) {
    const baseStyle = styleMap[visualStyle] || '';
    const tone = overrides.styleTone;
    const combined = tone ? `${baseStyle} ${tone}` : baseStyle;
    blocks.push({ label: '🎨 VISUAL STYLE', text: combined });
  }

  // 7. ORIENTATION
  if (selections.orientation?.length) {
    blocks.push({ label: '📐 ORIENTATION', text: orientMap[selections.orientation[0]] || '' });
  }

  // 8. MODEL OPTIMIZATION
  const modelKey = isVideo ? 'videoModel' : 'imageModel';
  if (selections[modelKey]?.length) {
    const modelLabel = LAYERS.find(l => l.id === modelKey)?.options.find(o => o.id === selections[modelKey][0])?.label;
    if (modelLabel) {
      blocks.push({ label: '🤖 MODEL OPTIMIZATION', text: `Optimized for ${modelLabel}. Professional quality, 4K resolution, highly detailed, photorealistic rendering.` });
    }
  }

  // 9. PLATFORM OPTIMIZATION
  if (selections.platform?.length) {
    blocks.push({ label: '📲 PLATFORM OPTIMIZATION', text: platformMap[selections.platform[0]] || '' });
  }

  // 10. NEGATIVE PROMPT (from settings + mandatory rules)
  const mandatoryNegative = [
    'Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks.',
    'Use only the elements provided through the system input blocks.',
    'Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided.',
    'If something is not provided through the system blocks, it must not appear in the generated content.',
    'The generated content must not contain erotic, sexual, explicit or suggestive content.',
  ].join('\n');

  const finalNegative = negativePrompt
    ? `${negativePrompt}\n\n${mandatoryNegative}`
    : mandatoryNegative;
  blocks.push({ label: '🚫 NEGATIVE PROMPT', text: finalNegative });

  return blocks.map(b => `[${b.label}]\n${b.text}`).join('\n\n');
}

// ─── SCRIPT GENERATOR ────────────────────────────────────────────────

function generateScript(selections: Record<string, string[]>, selectedHookText?: string, variationSeed?: number): string {
  const product = selections.productCategory?.[0];
  const productLabel = LAYERS.find(l => l.id === 'productCategory')?.options.find(o => o.id === product)?.label || 'o produto';
  const goal = selections.marketingGoal?.[0] || '';
  const platform = selections.platform?.[0] || '';

  const isShort = ['tiktok', 'instagram-reels', 'youtube-shorts'].includes(platform);

  const hookVariations = [
    'Espera... você precisa ver isso antes de tomar qualquer decisão.',
    'Você não vai acreditar no que eu descobri...',
    'Para tudo! Isso muda completamente o jogo.',
    'Se você ainda não conhece isso, está perdendo tempo.',
    'Eu testei e o resultado foi SURREAL.',
    'Atenção: isso pode mudar sua rotina para sempre.',
    'Todo mundo está falando sobre isso — e com razão.',
    'Você estava fazendo errado esse tempo todo. Descubra o porquê.',
  ];

  const problemVariations = [
    `Muitas pessoas enfrentam dificuldades e não encontram a solução certa para ${productLabel}. Gastam dinheiro, tempo e energia sem resultado.`,
    `Cansou de tentar alternativas que não funcionam? O problema com ${productLabel} é que ninguém te conta a verdade.`,
    `Você já passou horas pesquisando sobre ${productLabel} e sempre acabou frustrado? Isso é mais comum do que imagina.`,
    `O maior erro que as pessoas cometem com ${productLabel} é não saber por onde começar. E isso custa caro.`,
  ];

  const introVariations = [
    `Apresentamos ${productLabel} — a solução que resolve isso de forma simples e eficiente.`,
    `Conheça ${productLabel}: desenvolvido para quem quer resultado de verdade, sem complicação.`,
    `${productLabel} chegou para transformar a sua experiência. Simples, direto e eficaz.`,
    `Depois de meses de desenvolvimento, ${productLabel} está pronto para mudar o jogo.`,
  ];

  const demoVariations = [
    `Mostrar ${productLabel} sendo utilizado em um cenário real. Destacar a facilidade de uso, a qualidade do material e os resultados visíveis.`,
    `Demonstração prática de ${productLabel}: veja como funciona na vida real, passo a passo, sem edição.`,
    `Acompanhe o uso de ${productLabel} do início ao fim. Cada detalhe faz diferença no resultado.`,
    `Teste ao vivo com ${productLabel}: sem roteiro, sem filtro — apenas o produto funcionando.`,
  ];

  const benefitVariations = [
    `Destaque os principais benefícios: qualidade superior, praticidade, custo-benefício e resultados comprovados.`,
    `Por que escolher ${productLabel}? Economia de tempo, qualidade garantida e satisfação imediata.`,
    `Os resultados falam por si: mais eficiência, menos desperdício e uma experiência incomparável.`,
    `Clientes reais já comprovaram: ${productLabel} entrega tudo o que promete — e mais.`,
  ];

  const ctaMap: Record<string, string[]> = {
    'direct-sales': ['Compre agora e aproveite a oferta por tempo limitado. Link na bio.', 'Garanta o seu antes que acabe! Clique no link agora.', 'Oferta exclusiva — só hoje. Não perca, link na descrição.'],
    'lead-generation': ['Clique no link e descubra mais. Cadastre-se gratuitamente.', 'Quer saber mais? Deixe seu contato e receba tudo em primeira mão.', 'Cadastro grátis por tempo limitado. Acesse o link agora.'],
    'product-awareness': ['Conheça mais sobre nosso produto. Link na descrição.', 'Descubra tudo sobre ${productLabel}. Acesse o link.', 'Saiba por que ${productLabel} está conquistando milhares de pessoas.'],
    'brand-awareness': ['Siga-nos para mais conteúdo exclusivo.', 'Acompanhe nossas novidades — siga agora!', 'Fique por dentro de tudo. Siga e ative as notificações.'],
    'app-install': ['Baixe o app agora — link na bio.', 'App disponível para download. Comece agora mesmo!', 'Instale gratuitamente e transforme sua rotina.'],
    'product-launch': ['Lançamento oficial! Garanta o seu agora.', 'Acabou de sair! Seja um dos primeiros a experimentar.', 'Novo lançamento disponível — não fique de fora!'],
    'retargeting': ['Ainda pensando? Aproveite antes que acabe.', 'Última chance de garantir o seu. Não deixe escapar!', 'Você viu, gostou — agora é hora de agir.'],
    'social-proof': ['Milhares de clientes já aprovaram. Veja os depoimentos.', 'Junte-se a quem já transformou sua experiência.', '+10.000 clientes satisfeitos. Faça parte desse grupo.'],
    'educational': ['Quer aprender mais? Siga para mais dicas.', 'Conteúdo novo toda semana. Siga e aprenda!', 'Gostou? Salve esse vídeo e compartilhe com quem precisa.'],
    'viral-engagement': ['Marque alguém que precisa ver isso! Compartilhe.', 'Desafio: compartilhe com 3 amigos e veja a reação deles!', 'Se isso te surpreendeu, imagina quem ainda não viu?'],
  };

  const pick = (arr: string[], seed?: number) => {
    const idx = seed !== undefined ? Math.abs(seed) % arr.length : 0;
    return arr[idx];
  };

  const hookText = selectedHookText || pick(hookVariations, variationSeed);
  const ctaOptions = ctaMap[goal] || ['Saiba mais — link na descrição.'];

  const sections = [
    { label: '🪝 GANCHO (Primeiros 3 segundos)', text: `"${hookText}"` },
    { label: '😰 PROBLEMA', text: `"${pick(problemVariations, variationSeed !== undefined ? variationSeed + 1 : undefined)}"` },
    { label: '📦 INTRODUÇÃO DO PRODUTO', text: `"${pick(introVariations, variationSeed !== undefined ? variationSeed + 2 : undefined)}"` },
    { label: '🔍 DEMONSTRAÇÃO', text: `"${pick(demoVariations, variationSeed !== undefined ? variationSeed + 3 : undefined)}"` },
    { label: '✨ BENEFÍCIOS', text: `"${pick(benefitVariations, variationSeed !== undefined ? variationSeed + 4 : undefined)}"` },
    { label: '📣 CHAMADA PARA AÇÃO', text: `"${pick(ctaOptions, variationSeed !== undefined ? variationSeed + 5 : undefined)}"` },
  ];

  if (isShort) {
    return sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n') +
      '\n\n⏱️ Formato: Roteiro curto (15-60 segundos) — ritmo rápido e direto.';
  }

  return sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n') +
    '\n\n⏱️ Formato: Roteiro completo — com narrativa estruturada.';
}

// ─── SCENE GENERATOR ─────────────────────────────────────────────────

interface Scene {
  title: string;
  description: string;
  camera: string;
  lighting: string;
  action: string;
}

function generateScenes(selections: Record<string, string[]>, variationSeed?: number): Scene[] {
  const product = LAYERS.find(l => l.id === 'productCategory')?.options.find(o => o.id === selections.productCategory?.[0])?.label || 'o produto';
  const visualStyle = selections.visualStyle?.[0];
  const userCamera = selections.cameraStyle?.[0];
  const userLighting = selections.lighting?.[0];
  const overrides = getStyleOverrides(visualStyle, userCamera, userLighting);

  const isUgc = visualStyle === 'ugc' || visualStyle === 'viral';
  const seed = variationSeed || 0;

  const hookDescriptions = [
    isUgc
      ? `Abertura casual e autêntica que captura a atenção. Uma pessoa real olha para a câmera do smartphone e começa a falar sobre ${product} como se estivesse compartilhando com um amigo.`
      : `Abertura impactante que captura a atenção do espectador nos primeiros 3 segundos. Um visual inesperado ou ação disruptiva relacionada a ${product}.`,
    isUgc
      ? `Alguém segura ${product} e faz uma expressão de surpresa genuína, como se acabasse de descobrir algo incrível.`
      : `Cena de mistério: ${product} é mostrado parcialmente, criando curiosidade. O espectador quer saber mais.`,
    isUgc
      ? `A pessoa está em um ambiente do dia a dia e começa: "Gente, eu preciso contar uma coisa sobre ${product}..."`
      : `Transição rápida e criativa revela ${product} de forma inesperada — um corte seco que prende o olhar.`,
  ];

  const problemDescriptions = [
    `Mostrar a frustração ou dificuldade do dia a dia sem ${product}. O espectador se identifica com a situação.`,
    `Cenário antes vs depois: a realidade sem ${product} é frustrante. Pequenos erros se acumulam e geram insatisfação.`,
    `Pessoa tenta resolver o problema da forma tradicional e falha. A frustração é visível e identificável.`,
  ];

  const introDescriptions = [
    isUgc ? `A pessoa mostra ${product} casualmente, tirando da bolsa, mesa ou prateleira. Apresentação natural e não ensaiada.` : `Reveal dramático de ${product}. O produto entra em cena como a solução definitiva.`,
    isUgc ? `Com entusiasmo natural, a pessoa tira ${product} de uma caixa: "Olha o que chegou!"` : `Transição cinematográfica revela ${product} em câmera lenta com iluminação dramática.`,
    isUgc ? `A pessoa segura ${product} e diz: "Isso aqui mudou tudo pra mim. Deixa eu te mostrar."` : `${product} emerge de um fundo escuro com iluminação gradual, criando tensão e expectativa.`,
  ];

  const demoDescriptions = [
    `${product} sendo utilizado em um cenário real, mostrando funcionalidades e facilidade de uso.`,
    `Demonstração detalhada de ${product}: cada funcionalidade é mostrada com foco nos detalhes que impressionam.`,
    `Teste prático ao vivo: ${product} é colocado à prova em condições reais, sem edição ou filtros.`,
  ];

  const resultDescriptions = [
    `O resultado final após o uso de ${product}. A transformação é visível e impactante.`,
    `Comparação lado a lado: antes e depois com ${product}. A diferença é impressionante.`,
    `Reação genuína de satisfação ao ver os resultados de ${product}. O impacto é imediato.`,
  ];

  const ctaDescriptions = [
    isUgc ? `Pessoa olha para a câmera e faz a recomendação final de ${product}, incentivando o espectador a experimentar.` : `Encerramento com chamada para ação. Packshot do produto ou composição final com identidade de marca.`,
    isUgc ? `"Se você quer experimentar, o link tá na bio. Confia em mim, vale muito a pena!"` : `Logo da marca aparece com slogan. QR code ou link destacado em tela.`,
    isUgc ? `Pessoa sorri e diz: "Depois não diga que eu não avisei! Link na bio, corre lá."` : `Montagem final com os melhores momentos + CTA animado e profissional.`,
  ];

  const pick = (arr: string[], offset: number) => arr[Math.abs(seed + offset) % arr.length];

  const hookActions = [
    isUgc ? 'Pessoa olha para a câmera com expressão de surpresa ou entusiasmo, começa a falar naturalmente.' : 'Movimento rápido de abertura, zoom dramático ou revelação visual que prende a atenção imediatamente.',
    isUgc ? 'Pessoa gesticula enquanto fala, mostrando energia e autenticidade.' : 'Corte rápido entre 3 ângulos diferentes do produto em menos de 2 segundos.',
    isUgc ? 'Pessoa para o que está fazendo, olha para a câmera e começa a falar com empolgação.' : 'Câmera inicia em macro no produto e faz zoom out revelando o cenário completo.',
  ];

  return [
    {
      title: 'Cena 1 — Gancho Inicial',
      description: pick(hookDescriptions, 0),
      camera: isUgc ? 'Câmera frontal de smartphone, enquadramento selfie ligeiramente imperfeito.' : overrides.camera,
      lighting: overrides.lighting,
      action: pick(hookActions, 0),
    },
    {
      title: 'Cena 2 — Apresentação do Problema',
      description: pick(problemDescriptions, 1),
      camera: isUgc ? 'Câmera de smartphone mostrando a situação de perto, com movimentos naturais de mão.' : 'Close-up nos detalhes da frustração, expressões faciais ou produto problemático.',
      lighting: isUgc ? 'Iluminação ambiente natural do local onde está.' : 'Iluminação levemente sombria para transmitir desconforto.',
      action: 'Pessoa tentando realizar a tarefa sem sucesso, expressando frustração visível.',
    },
    {
      title: 'Cena 3 — Introdução do Produto',
      description: pick(introDescriptions, 2),
      camera: isUgc ? 'Câmera de smartphone mostrando o produto na mão, enquadramento casual.' : 'Câmera em slow motion focando no produto, com profundidade de campo rasa.',
      lighting: isUgc ? overrides.lighting : 'Iluminação premium com destaque suave no produto.',
      action: isUgc ? 'Pessoa segura o produto e mostra para a câmera, explicando o que é.' : 'Produto sendo revelado com impacto visual — pode ser unboxing, colocação na mesa ou transição criativa.',
    },
    {
      title: 'Cena 4 — Demonstração do Produto',
      description: pick(demoDescriptions, 3),
      camera: isUgc ? 'Câmera alternando entre selfie e câmera traseira do smartphone para mostrar detalhes.' : 'Ângulos múltiplos: close-up nos detalhes, plano médio mostrando uso, plano geral do contexto.',
      lighting: overrides.lighting,
      action: 'Demonstração passo a passo do uso do produto, destacando texturas, qualidade e resultados.',
    },
    {
      title: 'Cena 5 — Resultado / Benefícios',
      description: pick(resultDescriptions, 4),
      camera: isUgc ? 'Câmera de smartphone mostrando o resultado final, reação genuína.' : 'Plano aberto mostrando o resultado, seguido de close-up nos detalhes.',
      lighting: isUgc ? overrides.lighting : 'Iluminação brilhante e otimista, transmitindo satisfação.',
      action: 'Reação positiva do usuário, expressão de satisfação, resultado visual claro.',
    },
    {
      title: 'Cena 6 — Fechamento com CTA',
      description: pick(ctaDescriptions, 5),
      camera: isUgc ? 'Câmera frontal de smartphone, enquadramento selfie natural.' : 'Câmera estável em plano fixo, enquadramento central do produto ou logo.',
      lighting: isUgc ? overrides.lighting : 'Iluminação limpa e profissional, fundo neutro ou com identidade visual.',
      action: isUgc ? 'Pessoa fala diretamente para a câmera com entusiasmo genuíno, faz CTA natural.' : 'Produto centralizado, texto de CTA aparece, logo da marca em destaque.',
    },
  ];
}

// ─── VARIATION GENERATOR ─────────────────────────────────────────────

function generateVariations(selections: Record<string, string[]>, negativePrompt: string): string[] {
  const base = generatePrompt(selections, negativePrompt);
  const variationModifiers = [
    { scene: 'ambiente urbano moderno com arquitetura contemporânea', camera: 'câmera com leve movimento de tracking lateral suave', mood: 'atmosfera clean e profissional' },
    { scene: 'cenário natural ao ar livre com vegetação exuberante', camera: 'câmera handheld orgânica com movimentos naturais', mood: 'atmosfera acolhedora e autêntica' },
    { scene: 'estúdio minimalista com fundo infinito branco', camera: 'câmera fixa com zoom lento e cinematográfico', mood: 'atmosfera premium e sofisticada' },
    { scene: 'ambiente industrial com texturas metálicas e concreto', camera: 'drone shot revelando o cenário de cima', mood: 'atmosfera ousada e impactante' },
    { scene: 'espaço criativo colorido com elementos visuais dinâmicos', camera: 'câmera POV imersiva seguindo a ação', mood: 'atmosfera energética e viral' },
  ];

  return variationModifiers.map((mod, i) => {
    return `═══════════════════════════════════════\n🎬 VARIAÇÃO ${i + 1}\n═══════════════════════════════════════\n\n` +
      base +
      `\n\n[🔀 MODIFICADORES DA VARIAÇÃO ${i + 1}]\nCenário: ${mod.scene}\nCâmera: ${mod.camera}\nAtmosfera: ${mod.mood}`;
  });
}

// ─── COMPONENT ───────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  image: string;
  category: string;
  toolType?: string;
  isVideo?: boolean;
  videoModel?: string;
  imageModel?: string;
  duration?: number;
  videoSubcategory?: string;
  referenceBlocks?: string[];
  layerSelections?: Record<string, string[]>;
  variationPrompts?: string[];
}

interface PresetsGalleryProps {
  onSelectPreset: (preset: Preset) => void;
  onClose: () => void;
  estabelecimentoId?: string;
  initialSelections?: Record<string, string[]>;
}

const PresetsGallery: React.FC<PresetsGalleryProps> = ({ onSelectPreset, onClose, estabelecimentoId = '', initialSelections }) => {
  const [mode, setMode] = useState<'choose' | 'wizard' | 'prompts'>(initialSelections ? 'wizard' : 'choose');
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections || {});
  const [expandedLayer, setExpandedLayer] = useState<string>('contentType');
  const [activeTab, setActiveTab] = useState<string>('prompt');
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [selectedHookText, setSelectedHookText] = useState<string>('');
  const [variations, setVariations] = useState<string[]>([]);
  const [viralHooks, setViralHooks] = useState<ViralHook[]>(DEFAULT_VIRAL_HOOKS);
  const [editingHook, setEditingHook] = useState<{ catIdx: number; hookIdx: number } | null>(null);
  const [editingHookText, setEditingHookText] = useState('');
  const [selectedVariations, setSelectedVariations] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  

  // If hookStyle is deselected while on hooks tab, redirect
  const hasHookStyleSelected = (selections.hookStyle || []).length > 0;
  useEffect(() => {
    if (activeTab === 'hooks' && !hasHookStyleSelected) {
      setActiveTab('prompt');
    }
  }, [hasHookStyleSelected, activeTab]);

  // Filter hooks based on selected hookStyle
  const filteredHooks = useMemo(() => {
    const selectedStyles = selections.hookStyle || [];
    if (selectedStyles.length === 0) return [];
    const allowedCategories = selectedStyles.map(s => HOOK_STYLE_CATEGORY_MAP[s]).filter(Boolean);
    return viralHooks.filter(h => allowedCategories.includes(h.category));
  }, [selections.hookStyle, viralHooks]);

  const visibleLayers = useMemo(() => {
    return LAYERS.filter(layer => {
      if (!layer.visibleWhen) return true;
      return layer.visibleWhen(selections);
    });
  }, [selections]);

  const toggleOption = (layerId: string, optionId: string) => {
    setSelections(prev => {
      const current = prev[layerId] || [];
      const layer = LAYERS.find(l => l.id === layerId);
      if (layerId === 'contentType') {
        const next: Record<string, string[]> = { ...prev, [layerId]: [optionId] };
        delete next.videoModel;
        delete next.imageModel;
        if (optionId !== 'video' && (activeTab === 'script' || activeTab === 'scenes')) {
          setActiveTab('prompt');
        }
        return next;
      }
      // When platform changes, clear orientation if it's no longer valid
      if (layerId === 'platform') {
        const newPlatform = current.includes(optionId) ? undefined : optionId;
        const allowed = newPlatform ? PLATFORM_ORIENTATION_MAP[newPlatform] : null;
        const currentOrientation = prev.orientation?.[0];
        const next: Record<string, string[]> = { ...prev, [layerId]: current.includes(optionId) ? [] : [optionId] };
        if (allowed && currentOrientation && !allowed.includes(currentOrientation)) {
          next['orientation'] = [];
        }
        return next;
      }
      if (layer?.multiple) {
        if (current.includes(optionId)) return { ...prev, [layerId]: current.filter(id => id !== optionId) };
        return { ...prev, [layerId]: [...current, optionId] };
      }
      if (current.includes(optionId)) return { ...prev, [layerId]: [] };
      return { ...prev, [layerId]: [optionId] };
    });
  };

  const selectionCount = Object.values(selections).filter(v => v.length > 0).length;

  const savedDefaults = useMemo(() => getStudioDefaults(estabelecimentoId), [estabelecimentoId]);
  const negativePromptText = useMemo(() => {
    const isVideo = selections.contentType?.includes('video');
    return isVideo ? savedDefaults.videoNegativePrompt : savedDefaults.imageNegativePrompt;
  }, [selections.contentType, savedDefaults]);

  // Auto-update variations when selections change and variations tab is active
  useEffect(() => {
    if (activeTab === 'variations' && variations.length > 0 && selectionCount >= 2) {
      const v = generateVariations(selections, negativePromptText);
      setVariations(v);
      setSelectedVariations(new Set(v.map((_, i) => i)));
    }
  }, [selections, negativePromptText]);

  const generatedPrompt = useMemo(() => {
    if (selectionCount < 2) return '';
    return generatePrompt(selections, negativePromptText);
  }, [selections, selectionCount, negativePromptText]);

  const generatedScriptBase = useMemo(() => {
    if (selectionCount < 2) return '';
    return generateScript(selections, selectedHookText || undefined);
  }, [selections, selectionCount, selectedHookText]);

  const [editedScript, setEditedScript] = useState('');
  const [scriptVersion, setScriptVersion] = useState(0);
  const [isEditingScript, setIsEditingScript] = useState(false);

  // Sync editedScript when base changes (new selections)
  useEffect(() => {
    if (!isEditingScript) {
      setEditedScript(generatedScriptBase);
    }
  }, [generatedScriptBase, isEditingScript]);

  const generatedScript = editedScript || generatedScriptBase;

  const handleSuggestNewScript = useCallback(() => {
    const seed = Math.floor(Math.random() * 100) + 1;
    const newScript = generateScript(selections, undefined, seed);
    setEditedScript(newScript);
    setScriptVersion(v => v + 1);
    setIsEditingScript(false);
    toast({ title: 'Novo roteiro sugerido!' });
  }, [selections, toast]);

  const generatedScenesBase = useMemo(() => {
    if (selectionCount < 2) return [];
    return generateScenes(selections);
  }, [selections, selectionCount]);

  const [editedScenes, setEditedScenes] = useState<Scene[] | null>(null);
  const [scenesVersion, setScenesVersion] = useState(0);

  // Sync scenes when base changes
  useEffect(() => {
    setEditedScenes(null);
  }, [generatedScenesBase]);

  const currentScenes = editedScenes || generatedScenesBase;

  const handleUpdateScene = useCallback((index: number, field: keyof Scene, value: string) => {
    setEditedScenes(prev => {
      const scenes = prev ? [...prev] : [...generatedScenesBase];
      scenes[index] = { ...scenes[index], [field]: value };
      return scenes;
    });
  }, [generatedScenesBase]);

  const handleSuggestNewScenes = useCallback(() => {
    const seed = Math.floor(Math.random() * 100) + 1;
    const newScenes = generateScenes(selections, seed);
    setEditedScenes(newScenes);
    setScenesVersion(v => v + 1);
    toast({ title: 'Nova sequência de cenas gerada!' });
  }, [selections, toast]);

  const handleResetScenes = useCallback(() => {
    setEditedScenes(null);
  }, []);

  const handleAddScene = useCallback(() => {
    setEditedScenes(prev => {
      const scenes = prev ? [...prev] : [...generatedScenesBase];
      const num = scenes.length + 1;
      scenes.push({
        title: `Cena ${num} — Nova Cena`,
        description: 'Descreva o que acontece visualmente nesta cena...',
        camera: 'Defina o enquadramento e movimento de câmera...',
        lighting: 'Defina a iluminação da cena...',
        action: 'Descreva a ação principal...',
      });
      return scenes;
    });
    toast({ title: 'Cena adicionada!' });
  }, [generatedScenesBase, toast]);

  const handleRemoveScene = useCallback((index: number) => {
    setEditedScenes(prev => {
      const scenes = prev ? [...prev] : [...generatedScenesBase];
      if (scenes.length <= 1) return scenes;
      const updated = scenes.filter((_, i) => i !== index);
      // Renumber titles
      return updated.map((s, i) => ({
        ...s,
        title: s.title.replace(/^Cena \d+/, `Cena ${i + 1}`),
      }));
    });
    toast({ title: 'Cena removida!' });
  }, [generatedScenesBase, toast]);

  const handleGenerate = () => {
    const isVideo = selections.contentType?.includes('video');
    const modelKey = isVideo ? 'videoModel' : 'imageModel';
    const modelId = selections[modelKey]?.[0];

    const videoModelMap: Record<string, string> = {
      'veo3': 'google/veo-3.1', 'sora': 'openai/sora-2', 'kling': 'kling/v2.1',
      'gen4': 'runway/gen4', 'hailuo': 'hailuo/minimax-video-01', 'pika': 'pika/v2',
      'dream-machine': 'luma/dream-machine', 'seed-video': 'seed/video-01', 'svd': 'stability/svd',
      'ltx-video': 'replicate/ltx-video',
    };

    const imageModelMap: Record<string, string> = {
      'midjourney': 'midjourney/v6', 'stable-diffusion': 'stability/sdxl', 'flux': 'flux/1.1-pro',
      'dall-e': 'openai/dall-e-3', 'leonardo': 'leonardo/phoenix',
    };

    const style = selections.visualStyle?.[0] || '';
    const campaign = selections.campaignType?.[0] || '';
    const platform = selections.platform?.[0] || '';
    const nameParts = [
      style && LAYERS.find(l => l.id === 'visualStyle')?.options.find(o => o.id === style)?.label,
      campaign && LAYERS.find(l => l.id === 'campaignType')?.options.find(o => o.id === campaign)?.label,
      platform && LAYERS.find(l => l.id === 'platform')?.options.find(o => o.id === platform)?.label,
    ].filter(Boolean);

    // If on variations tab and we have variations, include them
    const isVariationsTab = activeTab === 'variations' && variations.length > 0;

    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: nameParts.length ? nameParts.join(' • ') : (isVideo ? 'Vídeo Personalizado' : 'Imagem Personalizada'),
      description: 'Prompt gerado pelo AI Creative Prompt Engine.',
      prompt: generatedPrompt,
      image: '',
      category: isVideo ? 'video' : 'image',
      toolType: isVideo ? 'videoGen' : 'imageGen',
      isVideo,
      videoModel: isVideo && modelId ? videoModelMap[modelId] : undefined,
      imageModel: !isVideo && modelId ? imageModelMap[modelId] : undefined,
      duration: isVideo ? 6 : undefined,
      referenceBlocks: selections.referenceBlocks || [],
      layerSelections: { ...selections },
      variationPrompts: isVariationsTab ? variations.filter((_, i) => selectedVariations.has(i)) : undefined,
    };

    // Apply directly to canvas (no review step)
    onSelectPreset(preset);
  };

  const handlePromptPresetSelect = useCallback((promptPreset: PromptPreset) => {
    const isVideo = promptPreset.mediaType === 'video';
    const referenceBlocks = promptPreset.referenceBlocks || (
      promptPreset.category === 'influencer'
        ? ['productImageSelect', 'galleryInfluencer']
        : ['productImageSelect']
    );

    const preset: Preset = {
      id: `prompt-${promptPreset.id}-${Date.now()}`,
      name: promptPreset.name,
      description: `Prompt pronto: ${promptPreset.name}`,
      prompt: promptPreset.prompt,
      image: promptPreset.image,
      category: isVideo ? 'video' : 'image',
      toolType: isVideo ? 'videoGen' : 'imageGen',
      isVideo,
      referenceBlocks,
      layerSelections: {},
    };
    onSelectPreset(preset);
  }, [onSelectPreset]);

  const handleReset = () => {
    setSelections({});
    setExpandedLayer('contentType');
    setSelectedHookText('');
    setVariations([]);
    setWizardStep(1);
  };

  const handleGenerateVariations = useCallback(() => {
    if (selectionCount < 2) return;
    const v = generateVariations(selections, negativePromptText);
    setVariations(v);
    setSelectedVariations(new Set(v.map((_, i) => i)));
    toast({ title: 'Variações Geradas', description: `${v.length} variações de prompt criadas com sucesso.` });
  }, [selections, selectionCount, toast]);

  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
  }, [toast]);

  const handleSelectRandomHook = useCallback(() => {
    const all = filteredHooks.flatMap(h => h.hooks);
    if (all.length === 0) return;
    const random = all[Math.floor(Math.random() * all.length)];
    setSelectedHookText(random);
    toast({ title: 'Gancho Selecionado', description: random });
  }, [filteredHooks, toast]);

  // ─── RENDER ──────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
        <div className="relative flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-border/50 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Wand2 className="h-3.5 sm:h-4.5 w-3.5 sm:w-4.5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">AI Creative Studio</h2>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Motor avançado de criação de criativos</p>
              </div>
            </div>
            {/* Mode Toggle — only when not on choose screen */}
            {mode !== 'choose' && (
              <div className="flex items-center bg-muted/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-0.5 border border-border/40">
                <button
                  onClick={() => setMode('wizard')}
                  className={`px-2 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-[10px] transition-all flex items-center gap-1 sm:gap-1.5 ${
                    mode === 'wizard' ? 'bg-background shadow-md text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Wand2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> <span className="hidden xs:inline">Assistente</span><span className="xs:hidden">Assist.</span>
                </button>
                <button
                  onClick={() => setMode('prompts')}
                  className={`px-2 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-[10px] transition-all flex items-center gap-1 sm:gap-1.5 ${
                    mode === 'prompts' ? 'bg-background shadow-md text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> Prompts
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {mode === 'wizard' && selectionCount > 0 && (
              <Badge className="text-[9px] sm:text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold hidden sm:inline-flex">
                {selectionCount} camadas
              </Badge>
            )}
            {mode === 'wizard' && selectionCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-lg border-border/50">
                <RotateCcw className="h-3 w-3" /> <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg sm:rounded-xl hover:bg-destructive/10 hover:text-destructive h-7 w-7 sm:h-9 sm:w-9">
              <X className="h-4 sm:h-5 w-4 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Choose Mode Screen */}
      {mode === 'choose' ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-xl w-full space-y-5 sm:space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="text-center space-y-3"
            >
              <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto border border-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Como deseja criar?</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Escolha entre montar seu criativo passo a passo ou usar um prompt pronto da biblioteca</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 25 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('wizard')}
                className="group relative overflow-hidden rounded-2xl border-2 border-border/30 bg-background p-6 text-left transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground mb-1">Assistente</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Monte seu criativo passo a passo escolhendo tipo, estilo, plataforma e mais opções</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    Começar <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('prompts')}
                className="group relative overflow-hidden rounded-2xl border-2 border-border/30 bg-background p-6 text-left transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground mb-1">Prompts Prontos</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Use prompts profissionais prontos da biblioteca para aplicar diretamente no canvas</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    Explorar <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </motion.button>
            </div>
          </div>
        </div>
      ) : mode === 'prompts' ? (
        <PromptPresets onSelect={handlePromptPresetSelect} estabelecimentoId={estabelecimentoId} />
      ) : (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Step 1 — Layers Panel */}
        <AnimatePresence mode="wait">
        {wizardStep === 1 ? (
        <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/10">
           {/* Friendly header with progress */}
           <div className="px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Monte seu criativo</p>
                  <p className="text-[11px] text-muted-foreground">Escolha as opções abaixo para montar o prompt perfeito</p>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="relative">
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((selectionCount / Math.max(visibleLayers.length, 1)) * 100, 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {selectionCount === 0 ? '👋 Comece selecionando abaixo' : `${selectionCount} de ${visibleLayers.length} configurado${selectionCount !== 1 ? 's' : ''}`}
                </span>
                {selectionCount >= 2 && (
                  <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Pronto para gerar!
                  </span>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2.5 sm:px-4 pb-5 space-y-2">
              {visibleLayers.map((layer, idx) => {
                const isExpanded = expandedLayer === layer.id;
                const selected = selections[layer.id] || [];
                const hasSelection = selected.length > 0;
                const stepNumber = idx + 1;
                const IconComp = layer.icon;

                return (
                  <motion.div
                    key={layer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <div
                      className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                        isExpanded
                          ? 'border-primary/30 bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.02] shadow-xl shadow-primary/[0.06]'
                          : hasSelection
                            ? 'border-primary/15 bg-gradient-to-r from-primary/[0.03] to-transparent hover:border-primary/25 hover:shadow-md'
                            : 'border-border/20 bg-background/80 hover:border-border/40 hover:shadow-md hover:bg-background'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedLayer(isExpanded ? '' : layer.id)}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left group"
                      >
                        {/* Step number + icon */}
                        <div className="relative flex-shrink-0">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            hasSelection
                              ? `bg-gradient-to-br ${layer.iconColor} shadow-lg`
                              : isExpanded
                                ? `bg-gradient-to-br ${layer.iconColor} shadow-md opacity-90`
                                : 'bg-muted/40 group-hover:bg-muted/70'
                          }`}>
                            <IconComp className={`h-5 w-5 transition-colors ${
                              hasSelection || isExpanded ? 'text-white' : 'text-muted-foreground/70'
                            }`} />
                          </div>
                          {hasSelection && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30"
                            >
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </motion.div>
                          )}
                          {!hasSelection && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-[8px] font-bold text-muted-foreground">{stepNumber}</span>
                            </div>
                          )}
                        </div>

                        {/* Title + description / selection pills */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{layer.title}</span>
                            {layer.required && !hasSelection && (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold uppercase tracking-wider border border-destructive/15">
                                Obrigatório
                              </span>
                            )}
                            {layer.multiple && (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
                                Múltiplo
                              </span>
                            )}
                          </div>
                          {!isExpanded && hasSelection && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {selected.slice(0, 3).map(s => {
                                const opt = layer.options.find(o => o.id === s);
                                return (
                                  <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/10">
                                    {opt?.emoji} {opt?.label}
                                  </span>
                                );
                              })}
                              {selected.length > 3 && (
                                <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                                  +{selected.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {!isExpanded && !hasSelection && (
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{layer.description}</p>
                          )}
                        </div>

                        <ChevronRight className={`h-4 w-4 text-muted-foreground/30 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90 text-primary' : 'group-hover:translate-x-0.5'}`} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-2.5 sm:px-4 pb-3 sm:pb-4 pt-0">
                              <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent mb-2 sm:mb-3" />
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-2 sm:mb-3 pl-1">{layer.description}</p>
                              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {(layer.filterOptions ? layer.filterOptions(layer.options, selections) : layer.options).map((option) => {
                                  const isSelected = selected.includes(option.id);
                                  return (
                                    <motion.button
                                      key={option.id}
                                      whileHover={{ scale: 1.03, y: -1 }}
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => toggleOption(layer.id, option.id)}
                                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-200 border-2 ${
                                        isSelected
                                          ? `bg-gradient-to-br ${layer.iconColor} text-white border-transparent shadow-lg shadow-primary/15`
                                          : 'bg-background text-foreground border-border/20 hover:border-primary/20 hover:bg-primary/[0.03] hover:shadow-sm'
                                      }`}
                                    >
                                      <span className="text-base">{option.emoji}</span>
                                      <span>{option.label}</span>
                                      {isSelected && <Check className="h-3.5 w-3.5 ml-0.5 opacity-90" />}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
          {/* Step 1 Footer — Avançar button */}
          <div className="p-3 sm:p-4 border-t border-border/20 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm">
            <Button
              className="w-full gap-2.5 h-12 rounded-xl font-bold text-sm shadow-xl shadow-primary/25 bg-gradient-to-r from-primary via-primary/95 to-primary/85 hover:from-primary/90 hover:via-primary/85 hover:to-primary/75 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
              size="lg"
              disabled={selectionCount < 2 || !selections.contentType?.length}
              onClick={() => setWizardStep(2)}
            >
              <Sparkles className="h-4.5 w-4.5" />
              Ver Prompt Gerado
              <ChevronRight className="h-4 w-4 ml-1 opacity-60" />
            </Button>
            {selectionCount < 2 && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">Selecione pelo menos 2 camadas para avançar</p>
            )}
          </div>
        </motion.div>
        ) : (
        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-muted/5 via-background to-muted/15">
          <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val);
              if (val === 'variations' && variations.length === 0 && selectionCount >= 2) {
                const v = generateVariations(selections, negativePromptText);
                setVariations(v);
                setSelectedVariations(new Set(v.map((_, i) => i)));
                toast({ title: 'Variações Geradas', description: `${v.length} variações de prompt criadas com sucesso.` });
              }
            }} className="flex flex-col flex-1 overflow-hidden">
             <div className="border-b border-border/30 px-2 sm:px-4 pt-2 sm:pt-3 pb-1">
               <TabsList className={`h-8 sm:h-10 w-full grid bg-muted/30 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-border/20 ${
                (() => {
                  const isVideo = selections.contentType?.includes('video');
                  const hasHook = hasHookStyleSelected;
                  if (isVideo && hasHook) return 'grid-cols-5';
                  if (isVideo || hasHook) return 'grid-cols-4';
                  return 'grid-cols-2';
                })()
              }`}>
                 <TabsTrigger value="prompt" className="text-[9px] sm:text-[10px] gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-bold data-[state=active]:bg-gradient-to-b data-[state=active]:from-background data-[state=active]:to-background/90 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/40">
                   <Sparkles className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> Prompt
                 </TabsTrigger>
                 {hasHookStyleSelected && (
                   <TabsTrigger value="hooks" className="text-[9px] sm:text-[10px] gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-bold data-[state=active]:bg-gradient-to-b data-[state=active]:from-background data-[state=active]:to-background/90 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/40">
                     <Library className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> <span className="hidden sm:inline">Ganchos</span><span className="sm:hidden">Hook</span>
                   </TabsTrigger>
                 )}
                 {selections.contentType?.includes('video') && (
                   <TabsTrigger value="script" className="text-[9px] sm:text-[10px] gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-bold data-[state=active]:bg-gradient-to-b data-[state=active]:from-background data-[state=active]:to-background/90 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/40">
                     <FileText className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> <span className="hidden sm:inline">Roteiro</span><span className="sm:hidden">Script</span>
                   </TabsTrigger>
                 )}
                 {selections.contentType?.includes('video') && (
                   <TabsTrigger value="scenes" className="text-[9px] sm:text-[10px] gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-bold data-[state=active]:bg-gradient-to-b data-[state=active]:from-background data-[state=active]:to-background/90 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/40">
                     <Clapperboard className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> Cenas
                   </TabsTrigger>
                 )}
                 <TabsTrigger value="variations" className="text-[9px] sm:text-[10px] gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-bold data-[state=active]:bg-gradient-to-b data-[state=active]:from-background data-[state=active]:to-background/90 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/40">
                   <Layers className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> <span className="hidden sm:inline">Variações</span><span className="sm:hidden">Vars</span>
                 </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Prompt */}
            <TabsContent value="prompt" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-4">
                  {selectionCount > 0 && (
                    <div className="rounded-xl border border-border/30 bg-gradient-to-br from-muted/20 to-muted/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Layers className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Configurações Ativas</span>
                      </div>
                      <div className="space-y-2.5">
                        {visibleLayers.filter(l => (selections[l.id] || []).length > 0).map(layer => (
                          <div key={layer.id} className="flex items-start gap-2.5">
                            <span className="text-sm mt-0.5">{layer.emoji}</span>
                            <div className="flex-1">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold">{layer.title}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(selections[layer.id] || []).map(s => {
                                  const opt = layer.options.find(o => o.id === s);
                                  return (
                                    <span key={s} className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/90 font-medium border border-primary/10">
                                      {opt?.emoji} {opt?.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {generatedPrompt && (
                    <div className="rounded-xl border border-border/30 bg-background shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20 bg-gradient-to-r from-primary/[0.06] to-transparent">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <p className="text-xs font-bold text-foreground">Prompt Estruturado</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5 rounded-lg hover:bg-primary/10" onClick={() => handleCopyText(generatedPrompt)}>
                          <Copy className="h-3 w-3" /> Copiar
                        </Button>
                      </div>
                      <div className="p-4">
                        <pre className="text-[11px] text-foreground/90 leading-[1.7] font-mono whitespace-pre-wrap">{generatedPrompt}</pre>
                      </div>
                    </div>
                  )}

                  {selectionCount < 2 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5 border border-primary/10"
                      >
                        <Wand2 className="h-8 w-8 text-primary/40" />
                      </motion.div>
                      <p className="text-base font-semibold text-foreground/80">Quase lá! ✨</p>
                      <p className="text-[12px] text-muted-foreground/60 mt-1.5 max-w-[240px] mx-auto">
                        Selecione pelo menos 2 camadas no painel ao lado para gerar seu prompt
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Viral Hooks */}
            <TabsContent value="hooks" className="flex-1 flex flex-col overflow-hidden mt-0">
              <div className="p-3 border-b flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleSelectRandomHook}>
                  <Shuffle className="h-3 w-3" /> Gancho Aleatório
                </Button>
                {selectedHookText && (
                  <Badge className="text-[9px] px-2 bg-primary/15 text-primary border-primary/20 max-w-[300px] truncate">
                    ✅ {selectedHookText}
                  </Badge>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {filteredHooks.map((category) => {
                    const catIdx = viralHooks.findIndex(h => h.category === category.category);
                    return (
                      <div key={category.category}>
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                          <span>{category.emoji}</span> {category.category}
                        </h4>
                        <div className="space-y-1">
                          {category.hooks.map((hook, i) => {
                            const isEditing = editingHook?.catIdx === catIdx && editingHook?.hookIdx === i;
                            return (
                              <div key={i} className="flex items-center gap-1">
                                {isEditing ? (
                                  <div className="flex-1 flex items-center gap-1">
                                    <input
                                      className="flex-1 px-3 py-2 rounded-md text-xs border border-primary bg-background focus:outline-none"
                                      value={editingHookText}
                                      onChange={(e) => setEditingHookText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          setViralHooks(prev => {
                                            const updated = [...prev];
                                            updated[catIdx] = { ...updated[catIdx], hooks: [...updated[catIdx].hooks] };
                                            updated[catIdx].hooks[i] = editingHookText;
                                            return updated;
                                          });
                                          setEditingHook(null);
                                          toast({ title: 'Gancho atualizado!' });
                                        }
                                        if (e.key === 'Escape') setEditingHook(null);
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setViralHooks(prev => {
                                          const updated = [...prev];
                                          updated[catIdx] = { ...updated[catIdx], hooks: [...updated[catIdx].hooks] };
                                          updated[catIdx].hooks[i] = editingHookText;
                                          return updated;
                                        });
                                        setEditingHook(null);
                                        toast({ title: 'Gancho atualizado!' });
                                      }}
                                    >
                                      <Save className="h-3 w-3 text-primary" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setSelectedHookText(hook)}
                                      className={`flex-1 text-left px-3 py-2 rounded-md text-xs border transition-all ${
                                        selectedHookText === hook
                                          ? 'border-primary bg-primary/10 text-primary font-medium'
                                          : 'border-border/40 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground'
                                      }`}
                                    >
                                      "{hook}"
                                    </button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 opacity-40 hover:opacity-100"
                                      onClick={() => {
                                        setEditingHook({ catIdx, hookIdx: i });
                                        setEditingHookText(hook);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 opacity-40 hover:opacity-100 text-destructive"
                                      onClick={() => {
                                        if (selectedHookText === hook) setSelectedHookText('');
                                        setViralHooks(prev => {
                                          const updated = [...prev];
                                          updated[catIdx] = { ...updated[catIdx], hooks: updated[catIdx].hooks.filter((_, idx) => idx !== i) };
                                          return updated;
                                        });
                                        toast({ title: 'Gancho removido!' });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {/* Add new hook button */}
                          <button
                            onClick={() => {
                              setViralHooks(prev => {
                                const updated = [...prev];
                                updated[catIdx] = { ...updated[catIdx], hooks: [...updated[catIdx].hooks, ''] };
                                return updated;
                              });
                              const newIdx = category.hooks.length;
                              setEditingHook({ catIdx, hookIdx: newIdx });
                              setEditingHookText('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-md text-xs border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground transition-all flex items-center gap-1.5"
                          >
                            <span className="text-sm">＋</span> Adicionar nova frase de gancho
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredHooks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Library className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione um Estilo de Gancho para ver as frases</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Script */}
            <TabsContent value="script" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {selectionCount >= 2 ? (
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Roteiro Gerado
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleCopyText(generatedScript)}>
                            <Copy className="h-3 w-3" /> Copiar
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={generatedScript}
                        onChange={(e) => { setEditedScript(e.target.value); setIsEditingScript(true); }}
                        className="text-[11px] text-foreground leading-relaxed font-mono whitespace-pre-wrap bg-muted/30 border-border/50 min-h-[300px] resize-y"
                        placeholder="O roteiro aparecerá aqui..."
                      />
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] gap-1.5 h-7"
                          onClick={handleSuggestNewScript}
                        >
                          <Sparkles className="h-3 w-3" /> Sugerir outro roteiro
                        </Button>
                        {isEditingScript && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] gap-1 h-7 text-muted-foreground"
                            onClick={() => { setEditedScript(generatedScriptBase); setIsEditingScript(false); }}
                          >
                            Restaurar original
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione pelo menos 2 camadas para gerar o roteiro</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Scenes / Storyboard */}
            <TabsContent value="scenes" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {selectionCount >= 2 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <Clapperboard className="h-3.5 w-3.5 text-primary" /> Storyboard — {currentScenes.length} Cenas
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => {
                          const text = currentScenes.map(s => `${s.title}\nDescrição: ${s.description}\nCâmera: ${s.camera}\nIluminação: ${s.lighting}\nAção: ${s.action}`).join('\n\n---\n\n');
                          handleCopyText(text);
                        }}>
                          <Copy className="h-3 w-3" /> Copiar Tudo
                        </Button>
                      </div>
                      {currentScenes.map((scene, i) => (
                        <motion.div
                          key={`${scenesVersion}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-background rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {i + 1}
                            </div>
                            <input
                              className="text-xs font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 py-0.5 transition-colors"
                              value={scene.title}
                              onChange={(e) => handleUpdateScene(i, 'title', e.target.value)}
                            />
                            {currentScenes.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive/50 hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => handleRemoveScene(i)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Textarea
                            value={scene.description}
                            onChange={(e) => handleUpdateScene(i, 'description', e.target.value)}
                            rows={2}
                            className="text-[11px] text-muted-foreground bg-muted/30 border-border/50 min-h-[50px] resize-y"
                          />
                          <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground font-medium min-w-[70px] shrink-0 pt-0.5">📹 Câmera:</span>
                              <input
                                className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-[10px] py-0 transition-colors"
                                value={scene.camera}
                                onChange={(e) => handleUpdateScene(i, 'camera', e.target.value)}
                              />
                            </div>
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground font-medium min-w-[70px] shrink-0 pt-0.5">💡 Iluminação:</span>
                              <input
                                className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-[10px] py-0 transition-colors"
                                value={scene.lighting}
                                onChange={(e) => handleUpdateScene(i, 'lighting', e.target.value)}
                              />
                            </div>
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground font-medium min-w-[70px] shrink-0 pt-0.5">🎬 Ação:</span>
                              <input
                                className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-[10px] py-0 transition-colors"
                                value={scene.action}
                                onChange={(e) => handleUpdateScene(i, 'action', e.target.value)}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] gap-1.5 h-7"
                          onClick={handleAddScene}
                        >
                          <Plus className="h-3 w-3" /> Adicionar Cena
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] gap-1.5 h-7"
                          onClick={handleSuggestNewScenes}
                        >
                          <Sparkles className="h-3 w-3" /> Gerar nova sequência
                        </Button>
                        {editedScenes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] gap-1 h-7 text-muted-foreground"
                            onClick={handleResetScenes}
                          >
                            Restaurar original
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione pelo menos 2 camadas para gerar o storyboard</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Variations */}
            <TabsContent value="variations" className="flex-1 flex flex-col overflow-hidden mt-0">
              <div className="p-3 border-b flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleGenerateVariations}
                  disabled={selectionCount < 2}
                >
                  <RefreshCw className="h-3 w-3" /> Gerar 5 Variações
                </Button>
                {variations.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedVariations(new Set(variations.map((_, i) => i)))}
                    >
                      Selecionar Todas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedVariations(new Set())}
                    >
                      Limpar
                    </Button>
                    <Badge variant="secondary" className="text-[9px]">
                      {selectedVariations.size}/{variations.length} selecionadas
                    </Badge>
                  </>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {variations.length > 0 ? (
                    variations.map((v, i) => {
                      const isSelected = selectedVariations.has(i);
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => {
                            setSelectedVariations(prev => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            });
                          }}
                          className={`bg-background rounded-lg border p-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border/40 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <Badge variant="outline" className="text-[9px]">Variação {i + 1}</Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1" onClick={(e) => { e.stopPropagation(); handleCopyText(v); }}>
                              <Copy className="h-2.5 w-2.5" /> Copiar
                            </Button>
                          </div>
                          <pre className="text-[10px] text-foreground leading-relaxed font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">{v}</pre>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Clique em "Gerar 5 Variações" para criar prompts alternativos</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="p-4 border-t border-border/20 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm space-y-2.5">
            {hasHookStyleSelected && !selectedHookText && (
              <div className="flex items-center justify-center gap-2 text-[10px] text-destructive font-semibold bg-destructive/5 rounded-xl px-3 py-2 border border-destructive/15">
                <span className="text-sm">⚠️</span> Selecione uma frase de gancho na aba "Ganchos" antes de aplicar.
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 h-12 rounded-xl font-bold text-sm"
                size="lg"
                onClick={() => setWizardStep(1)}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Voltar
              </Button>
              <Button
                className="flex-[2] gap-2.5 h-12 rounded-xl font-bold text-sm shadow-xl shadow-primary/25 bg-gradient-to-r from-primary via-primary/95 to-primary/85 hover:from-primary/90 hover:via-primary/85 hover:to-primary/75 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
                size="lg"
                disabled={selectionCount < 2 || !selections.contentType?.length || (hasHookStyleSelected && !selectedHookText) || (activeTab === 'variations' && selectedVariations.size === 0)}
                onClick={handleGenerate}
              >
                {selections.contentType?.includes('video') ? <Video className="h-4.5 w-4.5" /> : <Image className="h-4.5 w-4.5" />}
                {activeTab === 'variations' && variations.length > 0 ? `Aplicar ${selectedVariations.size} Variação${selectedVariations.size !== 1 ? 'ões' : ''} no Canvas` : 'Aplicar no Canvas'}
                <ChevronRight className="h-4 w-4 ml-1 opacity-60" />
              </Button>
            </div>
          </div>
        </motion.div>
        )}
        </AnimatePresence>
      </div>
      )}

    </motion.div>
  );
};

export default PresetsGallery;
export type { Preset };
