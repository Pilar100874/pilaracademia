import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Play, Check, Package, Users, Search, Video, Image, Plus, Loader2, Sparkles, X, Save, Trash2, CopyPlus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ─── Video Images ────────────────────────────────────────────────────
import imgCinematicStudio from '@/assets/presets/preset-product-cinematic-studio.jpg';
import imgLuxuryReveal from '@/assets/presets/preset-product-luxury-reveal.jpg';
import imgInfluencerVlog from '@/assets/presets/preset-product-influencer-vlog.jpg';
import imgScifi from '@/assets/presets/preset-product-scifi.jpg';
import imgAthletic from '@/assets/presets/preset-product-athletic.jpg';
import imgMinimalist from '@/assets/presets/preset-product-minimalist.jpg';
import imgFashion from '@/assets/presets/preset-product-fashion.jpg';
import imgHero from '@/assets/presets/preset-product-hero.jpg';
import imgStorytelling from '@/assets/presets/preset-product-storytelling.jpg';
import imgInfluencerReview from '@/assets/presets/preset-influencer-review.jpg';
import imgInfluencerVertical from '@/assets/presets/preset-influencer-vertical.jpg';
import imgInfluencerLuxury from '@/assets/presets/preset-influencer-luxury.jpg';
import imgInfluencerFitness from '@/assets/presets/preset-influencer-fitness.jpg';
import imgInfluencerUnboxing from '@/assets/presets/preset-influencer-unboxing.jpg';
import imgInfluencerFashion from '@/assets/presets/preset-influencer-fashion.jpg';
import imgInfluencerCafe from '@/assets/presets/preset-influencer-cafe.jpg';
import imgInfluencerStorytelling from '@/assets/presets/preset-influencer-storytelling.jpg';

// ─── Image Images ────────────────────────────────────────────────────
import imgProdWhite from '@/assets/presets/preset-img-product-white.jpg';
import imgProdFlatlay from '@/assets/presets/preset-img-product-flatlay.jpg';
import imgProdDark from '@/assets/presets/preset-img-product-dark.jpg';
import imgProdSplash from '@/assets/presets/preset-img-product-splash.jpg';
import imgProdMacro from '@/assets/presets/preset-img-product-macro.jpg';
import imgProdOutdoor from '@/assets/presets/preset-img-product-outdoor.jpg';
import imgProdLuxury from '@/assets/presets/preset-img-product-luxury.jpg';
import imgProdNeon from '@/assets/presets/preset-img-product-neon.jpg';
import imgInfPortrait from '@/assets/presets/preset-img-inf-portrait.jpg';
import imgInfLifestyle from '@/assets/presets/preset-img-inf-lifestyle.jpg';
import imgInfEditorial from '@/assets/presets/preset-img-inf-editorial.jpg';
import imgInfBeauty from '@/assets/presets/preset-img-inf-beauty.jpg';
import imgInfFitness from '@/assets/presets/preset-img-inf-fitness.jpg';
import imgInfStreet from '@/assets/presets/preset-img-inf-street.jpg';
import imgInfStudio from '@/assets/presets/preset-img-inf-studio.jpg';
import imgInfCozy from '@/assets/presets/preset-img-inf-cozy.jpg';

// ─── Reference Block Definitions ─────────────────────────────────────

const ALL_REF_BLOCKS = [
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
];

// ─── Preset types ────────────────────────────────────────────────────

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  image: string;
  mediaType: 'video' | 'image';
  category: 'produto' | 'influencer';
  tags: string[];
  referenceBlocks: string[];
  isCustom?: boolean;
}

const NEGATIVE_BLOCK = `\nDo not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`;

const DEFAULT_PRESETS: PromptPreset[] = [
  // ═══ VIDEO — PRODUTOS ═══
  {
    id: 'vp-cinematic-studio', name: 'Cinematic Studio', mediaType: 'video', category: 'produto',
    tags: ['studio', 'tech', 'luxury'], image: imgCinematicStudio,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Ultra cinematic commercial of a modern tech product on a minimalist black studio background. Slow rotating product on glossy reflective surface. Macro shots showing premium materials and textures. Soft volumetric lighting, rim light highlighting the edges. Camera: ARRI Alexa 35, 85mm lens, shallow depth of field. Ultra realistic reflections, luxury advertising aesthetic, smooth motion. Background fades into elegant gradient lighting. Final scene: product centered with subtle glow and dramatic lighting, text space for branding.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-luxury-reveal', name: 'Luxury Reveal', mediaType: 'video', category: 'produto',
    tags: ['luxury', 'dramatic', 'particles'], image: imgLuxuryReveal,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Luxury product reveal commercial. A dark cinematic environment with particles floating in the air. The product slowly emerges from shadows with dramatic lighting. High-speed slow motion, 120fps look. Camera pushes in slowly with macro lens. Hyper realistic textures, cinematic color grading, premium advertising style similar to high-end perfume ads. Moody atmosphere with soft fog and light rays.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-influencer-vlog', name: 'Influencer Vlog Style', mediaType: 'video', category: 'produto',
    tags: ['ugc', 'vlog', 'lifestyle'], image: imgInfluencerVlog,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Realistic influencer-style commercial video. A charismatic young influencer speaking to the camera while demonstrating a product. Modern aesthetic apartment with natural lighting from large windows. Camera handheld vlog style but cinematic stabilization. Authentic social media advertising tone. Camera: Sony FX6, 35mm lens. Warm natural light, realistic skin tones, lifestyle advertising.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-scifi', name: 'Sci-Fi Lab', mediaType: 'video', category: 'produto',
    tags: ['futuristic', 'neon', 'tech'], image: imgScifi,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Futuristic product commercial in a sci-fi environment. The product floating in a high-tech laboratory with holographic interface elements around it. Neon blue and purple lighting. Camera slowly orbiting around the product. Hyper realistic reflections, ultra detailed materials. Cinematic sci-fi atmosphere similar to Blade Runner advertising style.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-athletic', name: 'Athletic Energy', mediaType: 'video', category: 'produto',
    tags: ['sports', 'energy', 'dynamic'], image: imgAthletic,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `High-energy cinematic commercial. Athletic influencer using the product in motion. Dynamic tracking shots and slow motion action. Urban environment with dramatic sunset lighting. Sweat particles and dust visible in backlight. Camera: RED Komodo, 50mm lens. Epic advertising vibe similar to Nike commercials.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-minimalist', name: 'Minimalist Luxury', mediaType: 'video', category: 'produto',
    tags: ['minimal', 'clean', 'fashion'], image: imgMinimalist,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Minimalist luxury product commercial. Clean white studio background with soft gradient lighting. The product placed on a marble surface. Slow camera dolly movement and macro shots revealing texture. Soft shadows, premium fashion brand aesthetic. Ultra realistic studio lighting and reflections.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-fashion', name: 'High Fashion', mediaType: 'video', category: 'produto',
    tags: ['fashion', 'luxury', 'cinematic'], image: imgFashion,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer', 'galleryRoupa'], isCustom: true,
    prompt: `High fashion cinematic commercial. Elegant influencer walking through a luxurious environment (marble floors, dramatic lighting). Close-ups of the product in slow motion. Soft smoke and light rays in the background. Camera slow motion, 60fps cinematic look. Fashion magazine advertising style.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-hero', name: 'Epic Hero Shot', mediaType: 'video', category: 'produto',
    tags: ['hero', 'dramatic', 'premium'], image: imgHero,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Epic hero shot product commercial. The product placed on a reflective black surface with dramatic lighting from behind. Particles floating in the air. Camera slowly pushing in. Ultra high contrast cinematic lighting. Premium brand reveal aesthetic.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-storytelling', name: 'Cinematic Storytelling', mediaType: 'video', category: 'produto',
    tags: ['story', 'emotional', 'lifestyle'], image: imgStorytelling,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Cinematic storytelling commercial. A person using the product in an emotional everyday moment. Warm lighting inside a home during sunset. Close-up shots of hands interacting with the product. Natural acting, authentic lifestyle tone. Camera: ARRI Alexa Mini LF. Beautiful cinematic color grading and soft film grain.${NEGATIVE_BLOCK}`,
  },

  // ═══ VIDEO — INFLUENCER ═══
  {
    id: 'vi-review', name: 'Tech Review', mediaType: 'video', category: 'influencer',
    tags: ['review', 'youtube', 'tech'], image: imgInfluencerReview,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Ultra realistic influencer review video. A confident tech influencer holding the product and explaining its benefits directly to camera. Studio setup with soft LED lighting and blurred background. Camera: Sony A7S III, 35mm lens. Authentic YouTube review style but cinematic quality.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-vertical', name: 'Vertical Viral', mediaType: 'video', category: 'influencer',
    tags: ['vertical', 'tiktok', 'viral'], image: imgInfluencerVertical,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Vertical video influencer style commercial. Energetic influencer demonstrating the product quickly. Fast jump cuts, dynamic camera movements. Bright modern room, vibrant lighting. Social media viral advertising vibe.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-luxury', name: 'Luxury Penthouse', mediaType: 'video', category: 'influencer',
    tags: ['luxury', 'night', 'fashion'], image: imgInfluencerLuxury,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer', 'galleryRoupa'], isCustom: true,
    prompt: `Luxury influencer showcasing the product in an elegant penthouse. Night city lights visible through large windows. Soft cinematic lighting and elegant movements. Fashion commercial atmosphere.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-fitness', name: 'Fitness Workout', mediaType: 'video', category: 'influencer',
    tags: ['fitness', 'gym', 'energy'], image: imgInfluencerFitness,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Fitness influencer using the product during workout. Gym environment with dramatic lighting and slow motion. Sweat and motion emphasized with backlight. High energy commercial vibe.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-unboxing', name: 'Unboxing Experience', mediaType: 'video', category: 'influencer',
    tags: ['unboxing', 'reveal', 'youtube'], image: imgInfluencerUnboxing,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Ultra realistic unboxing video. Influencer opening the product packaging slowly. Close-up shots of textures and details. Warm lighting and excitement reaction. YouTube style product reveal.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-fashion', name: 'Street Fashion', mediaType: 'video', category: 'influencer',
    tags: ['fashion', 'urban', 'editorial'], image: imgInfluencerFashion,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer', 'galleryRoupa'], isCustom: true,
    prompt: `Fashion influencer showcasing the product as part of their outfit. Stylish urban environment. Smooth camera tracking shots. High fashion editorial style.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-cafe', name: 'Café Lifestyle', mediaType: 'video', category: 'influencer',
    tags: ['cafe', 'cozy', 'lifestyle'], image: imgInfluencerCafe,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Influencer sitting in a cozy café using the product naturally. Soft window light, cinematic depth of field. Relaxed lifestyle commercial tone.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-storytelling', name: 'Personal Story', mediaType: 'video', category: 'influencer',
    tags: ['story', 'emotional', 'authentic'], image: imgInfluencerStorytelling,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Influencer telling a personal story about how the product improved their life. Natural emotional acting. Warm cinematic lighting. Authentic lifestyle advertising narrative.${NEGATIVE_BLOCK}`,
  },

  // ═══ IMAGE — PRODUTOS ═══
  {
    id: 'ip-white-studio', name: 'White Studio Clean', mediaType: 'image', category: 'produto',
    tags: ['e-commerce', 'clean', 'minimal'], image: imgProdWhite,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Professional product photography on a clean white seamless background. The product is centered with perfect symmetry. Soft diffused studio lighting from multiple angles eliminating harsh shadows. High-key photography style optimized for e-commerce and catalog use. Sharp focus across the entire product. Ultra high resolution, 4K detail, photorealistic rendering. Camera: Phase One IQ4, 120mm macro lens.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-flatlay', name: 'Flat Lay Lifestyle', mediaType: 'image', category: 'produto',
    tags: ['flatlay', 'instagram', 'lifestyle'], image: imgProdFlatlay,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Aesthetic flat lay product photography shot from directly above. The product arranged with complementary lifestyle accessories on a clean surface. Warm natural lighting from a window. Carefully curated composition with balanced negative space. Instagram-optimized aesthetic with cohesive color palette. Camera: Canon R5, 35mm lens, top-down angle.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-dark-moody', name: 'Dark Moody', mediaType: 'image', category: 'produto',
    tags: ['dark', 'dramatic', 'premium'], image: imgProdDark,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Dark moody product photography on a matte black surface. Dramatic rim lighting from behind creates a subtle glow outline around the product. Soft smoke wisps in the background. High contrast chiaroscuro lighting with deep shadows. Premium luxury advertising aesthetic. Ultra detailed textures visible. Camera: Sony A1, 90mm macro lens, f/2.8.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-splash', name: 'Dynamic Splash', mediaType: 'image', category: 'produto',
    tags: ['splash', 'dynamic', 'energy'], image: imgProdSplash,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `High-speed product photography with dynamic liquid splash effects. The product appears to float with water, paint, or liquid droplets frozen in mid-air around it. Clean gradient background. Dramatic strobe lighting capturing every droplet in sharp detail. Commercial advertising style with vibrant energy. Camera: Nikon Z9, 1/8000s shutter speed, 85mm lens.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-macro', name: 'Macro Texture', mediaType: 'image', category: 'produto',
    tags: ['macro', 'detail', 'texture'], image: imgProdMacro,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Extreme macro product photography revealing fine textures, materials, and craftsmanship details. Ultra close-up showing surface quality, stitching, grain, or material composition. Very shallow depth of field with creamy bokeh. Professional studio lighting highlighting micro-details. Camera: Canon MP-E 65mm macro lens, 5:1 magnification, focus stacked for maximum sharpness.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-outdoor', name: 'Outdoor Natural', mediaType: 'image', category: 'produto',
    tags: ['outdoor', 'natural', 'golden-hour'], image: imgProdOutdoor,
    referenceBlocks: ['productImageSelect', 'galleryAmbiente'], isCustom: true,
    prompt: `Product photography in a beautiful natural outdoor setting during golden hour. The product placed on a natural surface (wood, stone, or earth) surrounded by botanical elements. Warm golden sunlight creating long soft shadows and a magical atmospheric quality. Organic lifestyle aesthetic with earthy tones. Camera: Sony A7R V, 50mm lens, f/1.8 for beautiful bokeh.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-luxury-still', name: 'Luxury Still Life', mediaType: 'image', category: 'produto',
    tags: ['luxury', 'marble', 'elegant'], image: imgProdLuxury,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Luxury still life product photography on a polished marble surface. Elegant composition with fresh flowers, gold accents, and premium decorative elements. Soft diffused lighting creating delicate shadows and subtle reflections on the marble. Premium fashion brand aesthetic with refined color palette. Camera: Hasselblad X2D, 80mm lens, medium format quality.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-neon-glow', name: 'Neon Glow', mediaType: 'image', category: 'produto',
    tags: ['neon', 'futuristic', 'tech'], image: imgProdNeon,
    referenceBlocks: ['productImageSelect'], isCustom: true,
    prompt: `Futuristic product photography with vibrant neon RGB lighting. The product on a glossy reflective surface with colorful neon reflections. Purple, blue, and pink neon accents creating a cyberpunk aesthetic. High-tech environment feel with glowing light strips in the background. Ultra detailed reflections and materials. Camera: Sony A7S III, 85mm lens, wide open aperture.${NEGATIVE_BLOCK}`,
  },

  // ═══ IMAGE — INFLUENCER ═══
  {
    id: 'ii-portrait', name: 'Studio Portrait', mediaType: 'image', category: 'influencer',
    tags: ['portrait', 'studio', 'professional'], image: imgInfPortrait,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Professional influencer portrait photography holding the product. Soft LED studio lighting with beautiful catchlights in the eyes. Slightly blurred background with subtle bokeh. Confident and natural pose. The product held at chest level for clear visibility. Warm skin tones, professional retouching aesthetic. Camera: Canon R5, 85mm f/1.4 lens.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-lifestyle', name: 'Lifestyle Candid', mediaType: 'image', category: 'influencer',
    tags: ['candid', 'natural', 'home'], image: imgInfLifestyle,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Candid lifestyle photography of an influencer naturally using the product at home. Warm natural window light illuminating the scene. Cozy interior setting with tasteful decor. Authentic, unposed moment captured in a relaxed environment. Soft warm color palette with gentle shadows. Camera: Sony A7 IV, 35mm lens, f/2.0 for environmental context with subject isolation.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-editorial', name: 'Fashion Editorial', mediaType: 'image', category: 'influencer',
    tags: ['editorial', 'fashion', 'dramatic'], image: imgInfEditorial,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer', 'galleryRoupa'], isCustom: true,
    prompt: `High fashion editorial photography featuring an influencer with the product. Dramatic directional lighting creating bold shadows and highlights. Avant-garde composition with strong visual impact. Magazine-quality finish with rich color grading. The product integrated naturally into the styling. Camera: Hasselblad X2D, 100mm lens, controlled studio environment with colored gels.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-beauty', name: 'Beauty Close-Up', mediaType: 'image', category: 'influencer',
    tags: ['beauty', 'skincare', 'close-up'], image: imgInfBeauty,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Professional beauty photography. Close-up of hands elegantly holding a skincare or beauty product. Soft beauty lighting with diffused fill creating flawless illumination. Clean minimal background. Focus on product details and natural skin texture. Cosmetics advertising aesthetic with premium feel. Camera: Canon R5, 100mm macro lens, f/4.0.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-fitness', name: 'Fitness Action', mediaType: 'image', category: 'influencer',
    tags: ['fitness', 'gym', 'action'], image: imgInfFitness,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Dynamic fitness photography of an athletic person with the product in a gym environment. Dramatic backlight creating rim light effect on the body. Action pose frozen in mid-movement. Visible energy and determination. High contrast lighting emphasizing muscle definition and product visibility. Camera: Nikon Z9, 70-200mm f/2.8, 1/2000s shutter speed.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-street', name: 'Street Style', mediaType: 'image', category: 'influencer',
    tags: ['street', 'urban', 'fashion'], image: imgInfStreet,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer', 'galleryRoupa'], isCustom: true,
    prompt: `Street style photography of a fashionable influencer with the product in an urban setting. Modern architecture and city environment as backdrop. Candid walking shot with natural movement. The product integrated seamlessly into the outfit or held naturally. Editorial fashion photography style with cinematic color grading. Camera: Sony A7R V, 50mm f/1.4, natural light.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-studio-brand', name: 'Brand Ambassador', mediaType: 'image', category: 'influencer',
    tags: ['studio', 'brand', 'commercial'], image: imgInfStudio,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer', 'galleryLogo'], isCustom: true,
    prompt: `Professional studio portrait of a brand ambassador with the product. Clean seamless backdrop with multi-point lighting setup. Confident expression and natural smile. The product prominently displayed. Commercial advertising quality with perfect color balance. Professional retouching with natural skin tones preserved. Camera: Phase One IQ4, 120mm lens, controlled lighting.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-cozy', name: 'Cozy Indoor', mediaType: 'image', category: 'influencer',
    tags: ['cozy', 'warm', 'indoor'], image: imgInfCozy,
    referenceBlocks: ['productImageSelect', 'galleryInfluencer'], isCustom: true,
    prompt: `Cozy indoor photography of a person naturally using the product in a warm living room. Soft ambient lighting from candles and warm light sources. Comfortable setting with blankets, cushions, and warm decor. Hygge aesthetic with golden warm tones. Authentic relaxed moment. Camera: Sony A7 IV, 35mm f/1.8, low-light optimized with warm white balance.${NEGATIVE_BLOCK}`,
  },
];

// ─── Local storage for custom presets ────────────────────────────────
const CUSTOM_PRESETS_KEY = 'ai-studio-custom-prompt-presets';
const SEEDED_VERSION_KEY = 'ai-studio-presets-seeded-v';
const CURRENT_SEED_VERSION = '2';

function loadAllPresets(): PromptPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const saved: PromptPreset[] = raw ? JSON.parse(raw) : [];
    const seededVersion = localStorage.getItem(SEEDED_VERSION_KEY);

    if (seededVersion === CURRENT_SEED_VERSION && saved.length > 0) {
      // Merge: ensure any NEW defaults not yet in saved are added
      const savedIds = new Set(saved.map(p => p.id));
      const missing = DEFAULT_PRESETS.filter(p => !savedIds.has(p.id));
      if (missing.length > 0) {
        const merged = [...saved, ...missing];
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(merged));
        return merged;
      }
      return saved;
    }

    // First load or version upgrade: seed defaults, preserve user-created (custom-*) presets
    const userCreated = saved.filter(p => p.id.startsWith('custom-'));
    const seeded = [...DEFAULT_PRESETS, ...userCreated];
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(seeded));
    localStorage.setItem(SEEDED_VERSION_KEY, CURRENT_SEED_VERSION);
    return seeded;
  } catch { return [...DEFAULT_PRESETS]; }
}

function saveCustomPresets(presets: PromptPreset[]) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

// ─── COMPONENT ───────────────────────────────────────────────────────

interface PromptPresetsProps {
  onSelect: (preset: PromptPreset) => void;
  estabelecimentoId?: string;
}

const PromptPresets: React.FC<PromptPresetsProps> = ({ onSelect, estabelecimentoId }) => {
  const [activeMediaType, setActiveMediaType] = useState<'video' | 'image'>('video');
  const [activeCategory, setActiveCategory] = useState<'produto' | 'influencer'>('produto');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allPresets, setAllPresets] = useState<PromptPreset[]>(loadAllPresets);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null);
  const [presetsInUse, setPresetsInUse] = useState<Set<string>>(new Set());
  const [detailPreset, setDetailPreset] = useState<PromptPreset | null>(null);
  const { toast } = useToast();

  // Load which presets are in use by saved workflows
  React.useEffect(() => {
    const fetchPresetsInUse = async () => {
      if (!estabelecimentoId) return;
      const { data } = await supabase
        .from('ai_studio_workflows')
        .select('nodes_data')
        .eq('estabelecimento_id', estabelecimentoId);
      if (!data) return;
      const usedNames = new Set<string>();
      data.forEach((w: any) => {
        const nodes = Array.isArray(w.nodes_data) ? w.nodes_data : [];
        nodes.forEach((n: any) => {
          const name = n?.data?.config?.presetName;
          if (name) usedNames.add(name);
        });
      });
      // Map names back to preset IDs
      const usedIds = new Set<string>();
      allPresets.forEach(p => {
        if (usedNames.has(p.name)) usedIds.add(p.id);
      });
      setPresetsInUse(usedIds);
    };
    fetchPresetsInUse();
  }, [estabelecimentoId, allPresets]);

  const filtered = useMemo(() => {
    return allPresets.filter(p => {
      if (p.mediaType !== activeMediaType) return false;
      if (p.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
      }
      return true;
    });
  }, [allPresets, activeMediaType, activeCategory, search]);

  const selectedPreset = selectedId ? allPresets.find(p => p.id === selectedId) : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Prompt copiado para a área de transferência.' });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteCustom = (id: string) => {
    if (presetsInUse.has(id)) {
      toast({ title: 'Não é possível excluir', description: 'Este prompt está em uso em um workflow salvo.', variant: 'destructive' });
      setDeleteConfirmId(null);
      return;
    }
    const updated = allPresets.filter(p => p.id !== id);
    setAllPresets(updated);
    saveCustomPresets(updated);
    setSelectedId(null);
    setDeleteConfirmId(null);
    toast({ title: 'Removido', description: 'Prompt removido.' });
  };

  const handleDuplicatePreset = (preset: PromptPreset) => {
    const copy: PromptPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      name: `${preset.name} (cópia)`,
      isCustom: true,
    };
    const updated = [...allPresets, copy];
    setAllPresets(updated);
    saveCustomPresets(updated);
    setSelectedId(copy.id);
    toast({ title: 'Duplicado!', description: `Prompt "${copy.name}" criado.` });
  };

  const handleSaveCustom = (preset: PromptPreset) => {
    const existingIndex = allPresets.findIndex(p => p.id === preset.id);
    let updated: PromptPreset[];
    if (existingIndex >= 0) {
      updated = [...allPresets];
      updated[existingIndex] = preset;
    } else {
      updated = [...allPresets, preset];
    }
    setAllPresets(updated);
    saveCustomPresets(updated);
    setShowCreateDialog(false);
    setEditingPreset(null);
    setSelectedId(preset.id);
    toast({ title: 'Salvo!', description: `Prompt "${preset.name}" salvo com sucesso.` });
  };

  const handleEditPreset = (preset: PromptPreset) => {
    setEditingPreset(preset);
    setShowCreateDialog(true);
  };

  const countByMediaAndCat = (media: 'video' | 'image', cat: 'produto' | 'influencer') =>
    allPresets.filter(p => p.mediaType === media && p.category === cat).length;

  return (
    <div className="flex flex-col h-full">
      {/* Media Type Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Button
          variant={activeMediaType === 'video' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveMediaType('video'); setSelectedId(null); }}
        >
          <Video className="h-3.5 w-3.5" /> Vídeo
        </Button>
        <Button
          variant={activeMediaType === 'image' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveMediaType('image'); setSelectedId(null); }}
        >
          <Image className="h-3.5 w-3.5" /> Imagem
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setEditingPreset(null); setShowCreateDialog(true); }}>
          <Plus className="h-3.5 w-3.5" /> Criar Prompt
        </Button>
      </div>

      {/* Category + Search */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Button
          variant={activeCategory === 'produto' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveCategory('produto'); setSelectedId(null); }}
        >
          <Package className="h-3.5 w-3.5" /> Produto ({countByMediaAndCat(activeMediaType, 'produto')})
        </Button>
        <Button
          variant={activeCategory === 'influencer' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveCategory('influencer'); setSelectedId(null); }}
        >
          <Users className="h-3.5 w-3.5" /> Influencer ({countByMediaAndCat(activeMediaType, 'influencer')})
        </Button>
        <div className="flex-1" />
        <div className="relative w-40">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 p-2.5 sm:p-4">
            {filtered.map((preset, i) => (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                  selectedId === preset.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border/50 hover:border-primary/30'
                }`}
              >
                <button
                  onClick={() => { setSelectedId(preset.id); setDetailPreset(preset); }}
                  className="w-full text-left"
                >
                  <div className="aspect-square relative overflow-hidden">
                    {preset.image ? (
                      <img src={preset.image} alt={preset.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-black/50 text-white border-0">
                        {preset.mediaType === 'video' ? '🎥' : '📷'}
                      </Badge>
                      {preset.isCustom && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-primary/80 text-white border-0">
                          Custom
                        </Badge>
                      )}
                    </div>
                    {selectedId === preset.id && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-xs font-semibold text-white truncate">{preset.name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {preset.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </button>
                {/* Overlay buttons on hover */}
                <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex-wrap px-1">
                  <Button
                    size="sm"
                    className="gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] pointer-events-auto shadow-lg h-6 sm:h-7 px-1.5 sm:px-2"
                    onClick={(e) => { e.stopPropagation(); onSelect(preset); }}
                  >
                    <Play className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> Usar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] pointer-events-auto shadow-lg bg-background/90 h-6 sm:h-7 px-1.5 sm:px-2"
                    onClick={(e) => { e.stopPropagation(); handleEditPreset(preset); }}
                  >
                    <Sparkles className="h-2.5 sm:h-3 w-2.5 sm:w-3" /> <span className="hidden sm:inline">Editar</span><span className="sm:hidden">✏</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-0.5 text-[9px] sm:text-[10px] pointer-events-auto shadow-lg bg-background/90 h-6 sm:h-7 px-1.5 sm:px-2"
                    onClick={(e) => { e.stopPropagation(); handleDuplicatePreset(preset); }}
                  >
                    <CopyPlus className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-0.5 text-[9px] sm:text-[10px] pointer-events-auto shadow-lg h-6 sm:h-7 px-1.5 sm:px-2"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(preset.id); }}
                  >
                    <Trash2 className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

      </div>

      {/* Create/Edit Dialog */}
      <CreatePromptDialog
        key={editingPreset?.id || 'new'}
        open={showCreateDialog}
        onClose={() => { setShowCreateDialog(false); setEditingPreset(null); }}
        onSave={handleSaveCustom}
        defaultMediaType={activeMediaType}
        defaultCategory={activeCategory}
        editingPreset={editingPreset}
      />

      {/* Prompt Detail Popup */}
      <Dialog open={!!detailPreset} onOpenChange={(v) => { if (!v) setDetailPreset(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {detailPreset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4 text-primary" />
                  {detailPreset.name}
                </DialogTitle>
                <DialogDescription className="flex gap-1.5 flex-wrap mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {detailPreset.mediaType === 'video' ? '🎥 Vídeo' : '📷 Imagem'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {detailPreset.category === 'produto' ? '📦 Produto' : '👤 Influencer'}
                  </Badge>
                  {detailPreset.isCustom && (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">Custom</Badge>
                  )}
                  {detailPreset.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </DialogDescription>
              </DialogHeader>

              {/* Image */}
              {detailPreset.image && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={detailPreset.image} alt={detailPreset.name} className="w-full aspect-video object-cover" />
                </div>
              )}

              {/* Reference Blocks */}
              {detailPreset.referenceBlocks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">🧩 Blocos de Referência</p>
                  <div className="flex flex-wrap gap-1">
                    {detailPreset.referenceBlocks.map(blockId => {
                      const block = ALL_REF_BLOCKS.find(b => b.id === blockId);
                      return block ? (
                        <Badge key={blockId} variant="secondary" className="text-[10px] gap-1">
                          {block.emoji} {block.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Prompt */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">📝 Prompt</p>
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-foreground/80">
                    {detailPreset.prompt}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { navigator.clipboard.writeText(detailPreset.prompt); toast({ title: 'Copiado!' }); }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setDetailPreset(null); handleEditPreset(detailPreset); }}>
                  <Sparkles className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => { setDetailPreset(null); onSelect(detailPreset); }}>
                  <Play className="h-3.5 w-3.5" /> Aplicar no Canvas
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este prompt? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDeleteCustom(deleteConfirmId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── CREATE PROMPT DIALOG ────────────────────────────────────────────

interface CreatePromptDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (preset: PromptPreset) => void;
  defaultMediaType: 'video' | 'image';
  defaultCategory: 'produto' | 'influencer';
  editingPreset?: PromptPreset | null;
}

const CreatePromptDialog: React.FC<CreatePromptDialogProps> = ({ open, onClose, onSave, defaultMediaType, defaultCategory, editingPreset }) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>(defaultMediaType);
  const [category, setCategory] = useState<'produto' | 'influencer'>(defaultCategory);
  const [tags, setTags] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(['productImageSelect']);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Reset/populate when opening
  React.useEffect(() => {
    if (open) {
      if (editingPreset) {
        setName(editingPreset.name);
        setPrompt(editingPreset.prompt);
        setMediaType(editingPreset.mediaType);
        setCategory(editingPreset.category);
        setTags(editingPreset.tags.join(', '));
        setSelectedBlocks(editingPreset.referenceBlocks || ['productImageSelect']);
        setGeneratedImage(editingPreset.image || '');
      } else {
        setName('');
        setPrompt('');
        setMediaType(defaultMediaType);
        setCategory(defaultCategory);
        setTags('');
        setSelectedBlocks(['productImageSelect']);
        setGeneratedImage('');
      }
    }
  }, [open, defaultMediaType, defaultCategory, editingPreset]);

  const toggleBlock = (blockId: string) => {
    setSelectedBlocks(prev =>
      prev.includes(blockId) ? prev.filter(b => b !== blockId) : [...prev, blockId]
    );
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Prompt vazio', description: 'Escreva o prompt antes de gerar a imagem de referência.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ad-image', {
        body: {
          prompt: `Create a cinematic reference thumbnail image that visually represents the following advertising concept. Do NOT include any text, logos, or watermarks. Pure visual representation:\n\n${prompt.slice(0, 500)}`,
          style: 'cinematic, professional, advertising reference',
        },
      });
      if (error) throw error;
      const imageUrl = data?.image || data?.imageUrl || '';
      if (imageUrl) {
        // Upload base64 to storage to avoid localStorage quota issues
        try {
          const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
          if (base64Match) {
            const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1];
            const base64Data = base64Match[2];
            const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `preset-ref-${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from('catalog-ai-images')
              .upload(fileName, byteArray, { contentType: `image/${base64Match[1]}`, upsert: true });
            if (!uploadError) {
              const { data: publicData } = supabase.storage
                .from('catalog-ai-images')
                .getPublicUrl(fileName);
              if (publicData?.publicUrl) {
                setGeneratedImage(publicData.publicUrl);
                toast({ title: 'Imagem gerada!', description: 'Imagem de referência atualizada.' });
                return;
              }
            }
            console.warn('Upload failed, using base64 fallback:', uploadError);
          }
        } catch (uploadErr) {
          console.warn('Upload to storage failed, using base64 fallback:', uploadErr);
        }
        // Fallback to base64
        setGeneratedImage(imageUrl);
        toast({ title: 'Imagem gerada!', description: 'Imagem de referência atualizada.' });
      } else {
        console.warn('No image in response:', JSON.stringify(data).slice(0, 300));
        toast({ title: 'Imagem não retornada', description: data?.error || 'O modelo não gerou uma imagem. Tente reformular o prompt.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Failed to generate reference image:', err);
      const msg = err?.message || 'Tente novamente.';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('Rate limit')) {
        toast({ title: 'Limite de requisições', description: 'Aguarde alguns segundos e tente novamente.', variant: 'destructive' });
      } else if (msg.includes('402') || msg.includes('billing') || msg.includes('insufficient') || msg.includes('Credits') || msg.includes('exclusively available')) {
        toast({ title: 'Créditos insuficientes', description: 'Adicione saldo na sua conta do provedor de IA.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao gerar imagem', description: msg.substring(0, 150), variant: 'destructive' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !prompt.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o nome e o prompt.', variant: 'destructive' });
      return;
    }
    const preset: PromptPreset = {
      id: editingPreset ? editingPreset.id : `custom-${Date.now()}`,
      name: name.trim(),
      prompt: prompt.trim(),
      image: generatedImage,
      mediaType,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      referenceBlocks: selectedBlocks,
      isCustom: true,
    };
    onSave(preset);
  };

  const isEditing = !!editingPreset;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isGenerating) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => { if (isGenerating) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (isGenerating) e.preventDefault(); }}
          className="fixed left-[50%] top-[50%] z-[10000] w-full max-w-2xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] rounded-2xl border-2 border-border bg-background p-8 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> {isEditing ? 'Editar Prompt' : 'Criar Prompt Personalizado'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <Label className="text-xs">Nome do Prompt</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Product on Beach" className="mt-1" />
          </div>

          {/* Type & Category */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs">Tipo de Mídia</Label>
              <Select value={mediaType} onValueChange={(v: 'video' | 'image') => setMediaType(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">🎥 Vídeo</SelectItem>
                  <SelectItem value="image">📷 Imagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={(v: 'produto' | 'influencer') => setCategory(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="produto">📦 Produto</SelectItem>
                  <SelectItem value="influencer">👤 Influencer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs">Tags (separadas por vírgula)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="Ex: luxury, beach, outdoor" className="mt-1" />
          </div>

          {/* Prompt */}
          <div>
            <Label className="text-xs">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Descreva o estilo visual do comercial..."
              className="mt-1 min-h-[120px] text-xs font-mono"
            />
          </div>

          {/* Reference Blocks */}
          <div>
            <Label className="text-xs mb-2 block">🧩 Blocos de Referência (serão inseridos no canvas)</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_REF_BLOCKS.map(block => (
                <label
                  key={block.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                    selectedBlocks.includes(block.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <Checkbox
                    checked={selectedBlocks.includes(block.id)}
                    onCheckedChange={() => toggleBlock(block.id)}
                  />
                  <span>{block.emoji} {block.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reference Image */}
          <div>
            <Label className="text-xs mb-2 block">🖼️ Imagem de Referência</Label>
            <div className="flex gap-3 items-start">
              <div className="w-32 h-32 rounded-lg border overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                {generatedImage ? (
                  <img src={generatedImage} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handleGenerateImage}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isGenerating ? 'Gerando...' : 'Gerar Imagem Automática'}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  A imagem será gerada pela IA com base no prompt como referência visual do estilo.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 gap-1.5" onClick={handleSave} disabled={!name.trim() || !prompt.trim()}>
              <Save className="h-4 w-4" /> {isEditing ? 'Salvar Alterações' : 'Salvar Prompt'}
            </Button>
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
};

export default PromptPresets;
export { DEFAULT_PRESETS as PROMPT_PRESETS };
