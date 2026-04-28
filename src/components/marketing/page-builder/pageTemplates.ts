// Page template themes for auto-generation — Advanced Collection

export interface PageTemplateTheme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  preview_gradient: string;
  tags: string[];
  config: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontDisplay?: string;
    fontBody?: string;
    secondaryColor?: string;
    heroStyle?: string; // 'gradient' | 'image-overlay' | 'split' | 'minimal' | 'video-bg'
    borderRadius?: string; // '0px' | '8px' | '16px' | '24px'
    cardStyle?: string; // 'bordered' | 'shadow' | 'glass' | 'flat' | 'gradient'
  };
}

export interface PageTemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  themes: PageTemplateTheme[];
}

export const TEMPLATE_CATEGORIES: PageTemplateCategory[] = [
  {
    id: 'startup',
    name: 'Startup & SaaS',
    icon: '🚀',
    description: 'Páginas modernas para empresas de tecnologia',
    themes: [
      {
        id: 'startup-neon', name: 'Neon Pulse', description: 'Vibrante com gradientes neon e fundo escuro',
        thumbnail: '⚡', preview_gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        tags: ['dark', 'neon', 'tech'],
        config: { primaryColor: '#8b5cf6', accentColor: '#06d6a0', backgroundColor: '#0f0c29', textColor: '#e2e8f0', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '16px' },
      },
      {
        id: 'startup-clean', name: 'Clean Pro', description: 'Minimalista e profissional com azul corporativo',
        thumbnail: '💎', preview_gradient: 'linear-gradient(135deg, #ffffff, #f0f9ff, #dbeafe)',
        tags: ['light', 'minimal', 'corporate'],
        config: { primaryColor: '#2563eb', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '12px' },
      },
      {
        id: 'startup-aurora', name: 'Aurora', description: 'Gradientes pastel futuristas e impactantes',
        thumbnail: '🌈', preview_gradient: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
        tags: ['gradient', 'modern', 'creative'],
        config: { primaryColor: '#7c3aed', accentColor: '#ec4899', backgroundColor: '#faf5ff', textColor: '#1e1b4b', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'startup-midnight', name: 'Midnight', description: 'Azul profundo com detalhes dourados',
        thumbnail: '🌙', preview_gradient: 'linear-gradient(135deg, #0c1445, #1a237e, #283593)',
        tags: ['dark', 'elegant', 'premium'],
        config: { primaryColor: '#fbbf24', accentColor: '#f59e0b', backgroundColor: '#0c1445', textColor: '#e8eaf6', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'startup-emerald', name: 'Emerald Tech', description: 'Verde tecnológico futurista',
        thumbnail: '💚', preview_gradient: 'linear-gradient(135deg, #064e3b, #065f46, #047857)',
        tags: ['dark', 'green', 'tech'],
        config: { primaryColor: '#10b981', accentColor: '#34d399', backgroundColor: '#022c22', textColor: '#d1fae5', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '16px' },
      },
      {
        id: 'startup-cyber', name: 'Cyber Grid', description: 'Estética cyberpunk com cyan e magenta',
        thumbnail: '🤖', preview_gradient: 'linear-gradient(135deg, #0a0a0a, #1a0a2e, #0a1628)',
        tags: ['dark', 'cyber', 'futuristic'],
        config: { primaryColor: '#06b6d4', accentColor: '#d946ef', backgroundColor: '#0a0a0a', textColor: '#e0f2fe', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '8px' },
      },
      {
        id: 'startup-frost', name: 'Frost Glass', description: 'Visual glassmorphism com transparências',
        thumbnail: '❄️', preview_gradient: 'linear-gradient(135deg, #e0e7ff, #c7d2fe, #a5b4fc)',
        tags: ['light', 'glass', 'modern'],
        config: { primaryColor: '#4f46e5', accentColor: '#6366f1', backgroundColor: '#eef2ff', textColor: '#312e81', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '20px' },
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce & Produto',
    icon: '🛍️',
    description: 'Páginas de vendas e lançamento de produtos',
    themes: [
      {
        id: 'ecom-luxury', name: 'Luxe Black', description: 'Sofisticado com preto e dourado premium',
        thumbnail: '👑', preview_gradient: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        tags: ['dark', 'luxury', 'premium'],
        config: { primaryColor: '#d4af37', accentColor: '#f1c40f', backgroundColor: '#1a1a2e', textColor: '#f5f5f5', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '8px' },
      },
      {
        id: 'ecom-vibrant', name: 'Pop Vibrant', description: 'Cores vivas para produtos jovens',
        thumbnail: '🎉', preview_gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb)',
        tags: ['colorful', 'young', 'bold'],
        config: { primaryColor: '#ff6b6b', accentColor: '#feca57', backgroundColor: '#ffffff', textColor: '#2d3436', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'ecom-minimal', name: 'Mono Store', description: 'Minimalista em preto e branco',
        thumbnail: '🖤', preview_gradient: 'linear-gradient(135deg, #2c3e50, #3d566e, #5d7b9a)',
        tags: ['minimal', 'mono', 'elegant'],
        config: { primaryColor: '#1a1a1a', accentColor: '#e74c3c', backgroundColor: '#fafafa', textColor: '#1a1a1a', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '0px' },
      },
      {
        id: 'ecom-nature', name: 'Eco Natural', description: 'Orgânico para produtos sustentáveis',
        thumbnail: '🌿', preview_gradient: 'linear-gradient(135deg, #d4edda, #c3e6cb, #a3d9a5)',
        tags: ['green', 'natural', 'organic'],
        config: { primaryColor: '#2d6a4f', accentColor: '#52b788', backgroundColor: '#f0fdf4', textColor: '#1b4332', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'image-overlay', cardStyle: 'bordered', borderRadius: '16px' },
      },
      {
        id: 'ecom-fire', name: 'Fire Sale', description: 'Vermelho urgente para promoções',
        thumbnail: '🔥', preview_gradient: 'linear-gradient(135deg, #b91c1c, #dc2626, #ef4444)',
        tags: ['red', 'urgent', 'sale'],
        config: { primaryColor: '#dc2626', accentColor: '#f59e0b', backgroundColor: '#fef2f2', textColor: '#7f1d1d', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '12px' },
      },
      {
        id: 'ecom-fashion', name: 'Fashion Week', description: 'Elegante editorial de moda',
        thumbnail: '👗', preview_gradient: 'linear-gradient(135deg, #f5f0e8, #e8d5b5, #c9a96e)',
        tags: ['fashion', 'editorial', 'elegant'],
        config: { primaryColor: '#1a1a1a', accentColor: '#c9a96e', backgroundColor: '#f5f0e8', textColor: '#1a1a1a', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'flat', borderRadius: '0px' },
      },
      {
        id: 'ecom-tech-product', name: 'Tech Product', description: 'Para gadgets e produtos tech',
        thumbnail: '📱', preview_gradient: 'linear-gradient(135deg, #111827, #1f2937, #374151)',
        tags: ['dark', 'tech', 'product'],
        config: { primaryColor: '#3b82f6', accentColor: '#60a5fa', backgroundColor: '#111827', textColor: '#f9fafb', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '16px' },
      },
      {
        id: 'ecom-cosmetics', name: 'Beauty Glow', description: 'Rosa suave para cosméticos e beleza',
        thumbnail: '💄', preview_gradient: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #fbcfe8)',
        tags: ['pink', 'beauty', 'soft'],
        config: { primaryColor: '#be185d', accentColor: '#ec4899', backgroundColor: '#fdf2f8', textColor: '#831843', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '24px' },
      },
    ],
  },
  {
    id: 'services',
    name: 'Serviços & Consultoria',
    icon: '💼',
    description: 'Para profissionais, agências e consultores',
    themes: [
      {
        id: 'serv-corporate', name: 'Corporate Blue', description: 'Profissional e confiável',
        thumbnail: '🏢', preview_gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb, #3b82f6)',
        tags: ['blue', 'corporate', 'trust'],
        config: { primaryColor: '#1e40af', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'bordered', borderRadius: '12px' },
      },
      {
        id: 'serv-warm', name: 'Warm Consulting', description: 'Tons quentes e acolhedores',
        thumbnail: '🤝', preview_gradient: 'linear-gradient(135deg, #fef3c7, #fde68a, #fbbf24)',
        tags: ['warm', 'friendly', 'human'],
        config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'serv-agency', name: 'Agency Pro', description: 'Visual de agência digital ousada',
        thumbnail: '🎯', preview_gradient: 'linear-gradient(135deg, #18181b, #27272a, #3f3f46)',
        tags: ['dark', 'agency', 'bold'],
        config: { primaryColor: '#f97316', accentColor: '#fb923c', backgroundColor: '#18181b', textColor: '#fafafa', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'serv-health', name: 'Health & Wellness', description: 'Calmo para saúde e bem-estar',
        thumbnail: '🧘', preview_gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)',
        tags: ['calm', 'health', 'green'],
        config: { primaryColor: '#059669', accentColor: '#34d399', backgroundColor: '#f0fdf4', textColor: '#064e3b', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'image-overlay', cardStyle: 'bordered', borderRadius: '20px' },
      },
      {
        id: 'serv-legal', name: 'Legal & Finance', description: 'Sóbrio para escritórios e finanças',
        thumbnail: '⚖️', preview_gradient: 'linear-gradient(135deg, #1e293b, #334155, #475569)',
        tags: ['dark', 'serious', 'trust'],
        config: { primaryColor: '#1e293b', accentColor: '#64748b', backgroundColor: '#f8fafc', textColor: '#0f172a', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '8px' },
      },
      {
        id: 'serv-architecture', name: 'Architecture', description: 'Linhas retas para arquitetura e engenharia',
        thumbnail: '🏛️', preview_gradient: 'linear-gradient(135deg, #f5f5f4, #d6d3d1, #a8a29e)',
        tags: ['minimal', 'architecture', 'clean'],
        config: { primaryColor: '#292524', accentColor: '#78716c', backgroundColor: '#fafaf9', textColor: '#1c1917', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'flat', borderRadius: '0px' },
      },
      {
        id: 'serv-dental', name: 'Medical Clean', description: 'Limpo e confiável para clínicas',
        thumbnail: '🏥', preview_gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe, #bfdbfe)',
        tags: ['light', 'medical', 'clean'],
        config: { primaryColor: '#0284c7', accentColor: '#38bdf8', backgroundColor: '#f0f9ff', textColor: '#0c4a6e', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
      },
    ],
  },
  {
    id: 'creative',
    name: 'Criativo & Portfólio',
    icon: '🎨',
    description: 'Para artistas, designers e criativos',
    themes: [
      {
        id: 'creative-dark', name: 'Dark Canvas', description: 'Fundo escuro com acentos roxo neon',
        thumbnail: '🎭', preview_gradient: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
        tags: ['dark', 'creative', 'purple'],
        config: { primaryColor: '#8b5cf6', accentColor: '#a78bfa', backgroundColor: '#0f172a', textColor: '#e2e8f0', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '16px' },
      },
      {
        id: 'creative-pastel', name: 'Pastel Dream', description: 'Cores pastel suaves e delicadas',
        thumbnail: '🦋', preview_gradient: 'linear-gradient(135deg, #fce7f3, #ddd6fe, #cffafe)',
        tags: ['pastel', 'soft', 'feminine'],
        config: { primaryColor: '#db2777', accentColor: '#8b5cf6', backgroundColor: '#fdf2f8', textColor: '#831843', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'shadow', borderRadius: '24px' },
      },
      {
        id: 'creative-brutalist', name: 'Brutalist', description: 'Alto contraste e tipografia forte',
        thumbnail: '🏗️', preview_gradient: 'linear-gradient(135deg, #fafafa, #e5e5e5, #d4d4d4)',
        tags: ['brutalist', 'bold', 'contrast'],
        config: { primaryColor: '#000000', accentColor: '#ef4444', backgroundColor: '#fafafa', textColor: '#000000', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '0px' },
      },
      {
        id: 'creative-retro', name: 'Retro Wave', description: 'Estética retro-futurista synthwave',
        thumbnail: '🌆', preview_gradient: 'linear-gradient(135deg, #1a0533, #3d0f72, #ff0080)',
        tags: ['retro', 'synthwave', 'neon'],
        config: { primaryColor: '#ff0080', accentColor: '#00e5ff', backgroundColor: '#1a0533', textColor: '#f0e6ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'creative-earth', name: 'Earth Tones', description: 'Tons terrosos e artesanais',
        thumbnail: '🏺', preview_gradient: 'linear-gradient(135deg, #fef7ed, #fed7aa, #fdba74)',
        tags: ['warm', 'artisan', 'organic'],
        config: { primaryColor: '#9a3412', accentColor: '#c2410c', backgroundColor: '#fffbf1', textColor: '#431407', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'image-overlay', cardStyle: 'bordered', borderRadius: '16px' },
      },
      {
        id: 'creative-neon-pop', name: 'Neon Pop Art', description: 'Pop art com cores elétricas',
        thumbnail: '🎪', preview_gradient: 'linear-gradient(135deg, #fde047, #a3e635, #22d3ee)',
        tags: ['pop', 'colorful', 'bold'],
        config: { primaryColor: '#0ea5e9', accentColor: '#eab308', backgroundColor: '#ffffff', textColor: '#0c4a6e', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '20px' },
      },
      {
        id: 'creative-gallery', name: 'Art Gallery', description: 'Visual de galeria de arte contemporânea',
        thumbnail: '🖼️', preview_gradient: 'linear-gradient(135deg, #ffffff, #f5f5f5, #e5e5e5)',
        tags: ['gallery', 'minimal', 'art'],
        config: { primaryColor: '#171717', accentColor: '#a3a3a3', backgroundColor: '#ffffff', textColor: '#171717', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'flat', borderRadius: '0px' },
      },
    ],
  },
  {
    id: 'food',
    name: 'Gastronomia & Food',
    icon: '🍽️',
    description: 'Restaurantes, delivery e gastronomia',
    themes: [
      {
        id: 'food-elegant', name: 'Fine Dining', description: 'Sofisticado para restaurantes premium',
        thumbnail: '🥂', preview_gradient: 'linear-gradient(135deg, #1c1917, #292524, #44403c)',
        tags: ['dark', 'elegant', 'premium'],
        config: { primaryColor: '#d4af37', accentColor: '#b8860b', backgroundColor: '#1c1917', textColor: '#f5f5f4', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '8px' },
      },
      {
        id: 'food-fresh', name: 'Fresh & Healthy', description: 'Fresco para comida saudável',
        thumbnail: '🥗', preview_gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7, #bbf7d0)',
        tags: ['green', 'fresh', 'healthy'],
        config: { primaryColor: '#16a34a', accentColor: '#22c55e', backgroundColor: '#f0fdf4', textColor: '#14532d', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'bordered', borderRadius: '16px' },
      },
      {
        id: 'food-rustic', name: 'Cantina Rústica', description: 'Aconchegante para comida caseira',
        thumbnail: '🍲', preview_gradient: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fde68a)',
        tags: ['warm', 'rustic', 'cozy'],
        config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'image-overlay', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'food-urban', name: 'Urban Kitchen', description: 'Moderno para hamburguerias e street food',
        thumbnail: '🍔', preview_gradient: 'linear-gradient(135deg, #1f2937, #374151, #4b5563)',
        tags: ['dark', 'urban', 'modern'],
        config: { primaryColor: '#ef4444', accentColor: '#f97316', backgroundColor: '#111827', textColor: '#f9fafb', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'food-zen', name: 'Zen Oriental', description: 'Minimalista para culinária oriental',
        thumbnail: '🍣', preview_gradient: 'linear-gradient(135deg, #fefce8, #fef9c3, #fde68a)',
        tags: ['minimal', 'oriental', 'zen'],
        config: { primaryColor: '#7c2d12', accentColor: '#dc2626', backgroundColor: '#fefce8', textColor: '#1c1917', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '8px' },
      },
      {
        id: 'food-bakery', name: 'Sweet Bakery', description: 'Delicado para padarias e confeitarias',
        thumbnail: '🧁', preview_gradient: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #f9a8d4)',
        tags: ['pink', 'sweet', 'bakery'],
        config: { primaryColor: '#be185d', accentColor: '#f472b6', backgroundColor: '#fdf2f8', textColor: '#831843', fontDisplay: 'Georgia', fontBody: 'Georgia', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '24px' },
      },
    ],
  },
  {
    id: 'education',
    name: 'Educação & Cursos',
    icon: '📚',
    description: 'Cursos online, infoprodutos e educação',
    themes: [
      {
        id: 'edu-modern', name: 'Learn Pro', description: 'Profissional para plataformas de ensino',
        thumbnail: '🎓', preview_gradient: 'linear-gradient(135deg, #1e3a5f, #3b82f6, #60a5fa)',
        tags: ['blue', 'professional', 'education'],
        config: { primaryColor: '#1d4ed8', accentColor: '#3b82f6', backgroundColor: '#eff6ff', textColor: '#1e3a8a', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'edu-playful', name: 'Creative Learn', description: 'Colorido para cursos criativos',
        thumbnail: '🎯', preview_gradient: 'linear-gradient(135deg, #fef3c7, #fde68a, #a3e635)',
        tags: ['colorful', 'fun', 'creative'],
        config: { primaryColor: '#7c3aed', accentColor: '#f59e0b', backgroundColor: '#fefce8', textColor: '#1c1917', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'edu-expert', name: 'Expert Authority', description: 'Escuro para mentores e especialistas',
        thumbnail: '🧠', preview_gradient: 'linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)',
        tags: ['dark', 'authority', 'expert'],
        config: { primaryColor: '#6366f1', accentColor: '#818cf8', backgroundColor: '#0f0a2e', textColor: '#e0e7ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'edu-coach', name: 'Coach Warmth', description: 'Acolhedor para coaching e mentoria',
        thumbnail: '💡', preview_gradient: 'linear-gradient(135deg, #fff7ed, #fed7aa, #fb923c)',
        tags: ['warm', 'coaching', 'inspiring'],
        config: { primaryColor: '#ea580c', accentColor: '#f97316', backgroundColor: '#fff7ed', textColor: '#7c2d12', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'bordered', borderRadius: '16px' },
      },
      {
        id: 'edu-book', name: 'Book Launch', description: 'Elegante para lançamentos de livros e ebooks',
        thumbnail: '📖', preview_gradient: 'linear-gradient(135deg, #451a03, #78350f, #92400e)',
        tags: ['dark', 'book', 'launch'],
        config: { primaryColor: '#fbbf24', accentColor: '#f59e0b', backgroundColor: '#451a03', textColor: '#fef3c7', fontDisplay: 'Playfair Display', fontBody: 'Georgia', heroStyle: 'split', cardStyle: 'glass', borderRadius: '8px' },
      },
      {
        id: 'edu-webinar', name: 'Webinar Live', description: 'Dinâmico para webinars e lives',
        thumbnail: '🎥', preview_gradient: 'linear-gradient(135deg, #0f766e, #14b8a6, #2dd4bf)',
        tags: ['teal', 'webinar', 'live'],
        config: { primaryColor: '#0f766e', accentColor: '#14b8a6', backgroundColor: '#f0fdfa', textColor: '#134e4a', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'video-bg', cardStyle: 'shadow', borderRadius: '16px' },
      },
    ],
  },
  {
    id: 'events',
    name: 'Eventos & Lançamentos',
    icon: '🎪',
    description: 'Eventos, webinars e lançamentos especiais',
    themes: [
      {
        id: 'event-gala', name: 'Gala Night', description: 'Sofisticado para eventos exclusivos',
        thumbnail: '✨', preview_gradient: 'linear-gradient(135deg, #0a0a0a, #1a1a2e, #2d1b69)',
        tags: ['dark', 'luxury', 'gala'],
        config: { primaryColor: '#fbbf24', accentColor: '#f59e0b', backgroundColor: '#0a0a0a', textColor: '#fefce8', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'event-festival', name: 'Festival', description: 'Vibrante para shows e festivais',
        thumbnail: '🎵', preview_gradient: 'linear-gradient(135deg, #7c3aed, #ec4899, #f97316)',
        tags: ['colorful', 'vibrant', 'festival'],
        config: { primaryColor: '#ec4899', accentColor: '#f97316', backgroundColor: '#faf5ff', textColor: '#1e1b4b', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '20px' },
      },
      {
        id: 'event-conference', name: 'Conference', description: 'Profissional para conferências',
        thumbnail: '🎤', preview_gradient: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
        tags: ['dark', 'professional', 'conference'],
        config: { primaryColor: '#06b6d4', accentColor: '#22d3ee', backgroundColor: '#0f172a', textColor: '#f0f9ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '12px' },
      },
      {
        id: 'event-launch', name: 'Mega Launch', description: 'Impactante para lançamentos',
        thumbnail: '🚀', preview_gradient: 'linear-gradient(135deg, #dc2626, #b91c1c, #991b1b)',
        tags: ['red', 'impact', 'launch'],
        config: { primaryColor: '#dc2626', accentColor: '#fbbf24', backgroundColor: '#fef2f2', textColor: '#7f1d1d', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'shadow', borderRadius: '12px' },
      },
      {
        id: 'event-countdown', name: 'Countdown', description: 'Timer urgente com visual de escassez',
        thumbnail: '⏰', preview_gradient: 'linear-gradient(135deg, #1e1b4b, #7c3aed, #a855f7)',
        tags: ['urgency', 'countdown', 'launch'],
        config: { primaryColor: '#7c3aed', accentColor: '#fbbf24', backgroundColor: '#1e1b4b', textColor: '#ede9fe', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '16px' },
      },
    ],
  },
  {
    id: 'real_estate',
    name: 'Imobiliário & Auto',
    icon: '🏠',
    description: 'Imóveis, automóveis e veículos',
    themes: [
      {
        id: 'real-premium', name: 'Premium Estate', description: 'Luxuoso para imóveis de alto padrão',
        thumbnail: '🏡', preview_gradient: 'linear-gradient(135deg, #1c1917, #292524, #78716c)',
        tags: ['dark', 'luxury', 'real-estate'],
        config: { primaryColor: '#d4af37', accentColor: '#a8860b', backgroundColor: '#1c1917', textColor: '#fafaf9', fontDisplay: 'Playfair Display', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '8px' },
      },
      {
        id: 'real-modern', name: 'Modern Living', description: 'Clean moderno para construtoras',
        thumbnail: '🏙️', preview_gradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
        tags: ['light', 'modern', 'clean'],
        config: { primaryColor: '#0f172a', accentColor: '#3b82f6', backgroundColor: '#f8fafc', textColor: '#0f172a', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '16px' },
      },
      {
        id: 'real-auto', name: 'Auto Sport', description: 'Dinâmico para veículos e concessionárias',
        thumbnail: '🏎️', preview_gradient: 'linear-gradient(135deg, #0a0a0a, #1a1a1a, #dc2626)',
        tags: ['dark', 'auto', 'sport'],
        config: { primaryColor: '#dc2626', accentColor: '#f97316', backgroundColor: '#0a0a0a', textColor: '#fafafa', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'image-overlay', cardStyle: 'glass', borderRadius: '12px' },
      },
    ],
  },
];

// Flatten all themes for easy lookup
export const ALL_THEMES: PageTemplateTheme[] = TEMPLATE_CATEGORIES.flatMap(c => c.themes);

export function getThemeById(id: string): PageTemplateTheme | undefined {
  return ALL_THEMES.find(t => t.id === id);
}
