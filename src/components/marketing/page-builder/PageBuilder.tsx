import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, GripVertical, Plus, Trash2, Eye, Code, Image, Video, Type, Play,
  ChevronDown, ChevronUp, Settings, Palette, Layout, Bot, ArrowDown,
  Sparkles, FileText, Monitor, Smartphone, Tablet, Copy, Save, Loader2,
  Columns, Square, AlignLeft, Link, ExternalLink, Upload, FolderOpen,
  Wand2, LayoutTemplate, ImagePlus, Package, GalleryHorizontalEnd,
  MoreVertical, Pencil, FolderInput, Zap, CheckCircle2, AlertTriangle, Maximize, Minimize, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TEMPLATE_CATEGORIES, ALL_THEMES, getThemeById } from './pageTemplates';
import { FULL_TEMPLATE_CATEGORIES, ALL_FULL_TEMPLATES, FullTemplate } from './fullTemplates';
import { TemplateMiniPreview } from './TemplateMiniPreview';
import { AgentTextBank } from './AgentTextBank';
import {
  DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay,
  useSensor, useSensors, PointerSensor, useDroppable, useDraggable
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PageSection {
  id: string;
  type: 'hero' | 'text' | 'image' | 'video' | 'gallery' | 'cta' | 'features' | 'testimonials' | 'faq' | 'footer' | 'custom_html' | 'spacer' | 'social_proof' | 'guarantee' | 'objections' | 'pricing' | 'process_steps';
  title: string;
  content: Record<string, any>;
  visible: boolean;
  styles: Record<string, string>;
}

interface PageConfig {
  title: string; description: string; favicon: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  backgroundColor: string; textColor: string;
  fontDisplay: string; fontBody: string; maxWidth: string;
  whatsappGlobal?: string; siteGlobal?: string;
  empresaNome?: string; empresaEndereco?: string; empresaTelefone?: string;
}

interface SavedPage {
  id: string; nome: string; slug: string; sections: any; config: any;
  publicado: boolean; created_at: string; updated_at: string;
}

interface MediaAsset {
  id: string; nome: string; tipo: string; public_url: string; thumbnail_url?: string;
}

// ── Section Templates ──────────────────────────────────────────────────────────
const SECTION_TEMPLATES: { type: PageSection['type']; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'hero', label: 'Hero', icon: <Layout className="h-4 w-4" />, description: 'Título, subtítulo e CTA' },
  { type: 'text', label: 'Texto', icon: <Type className="h-4 w-4" />, description: 'Bloco de texto' },
  { type: 'image', label: 'Imagem', icon: <Image className="h-4 w-4" />, description: 'Imagem com legenda' },
  { type: 'video', label: 'Vídeo', icon: <Video className="h-4 w-4" />, description: 'Player de vídeo' },
  { type: 'features', label: 'Recursos', icon: <Columns className="h-4 w-4" />, description: 'Grade de recursos' },
  { type: 'testimonials', label: 'Depoimentos', icon: <FileText className="h-4 w-4" />, description: 'Depoimentos de clientes' },
  { type: 'social_proof', label: 'Prova Social', icon: <FileText className="h-4 w-4" />, description: 'Números e métricas' },
  { type: 'guarantee', label: 'Garantia', icon: <Square className="h-4 w-4" />, description: 'Seção de garantia' },
  { type: 'objections', label: 'Objeções', icon: <AlignLeft className="h-4 w-4" />, description: 'Quebra de objeções' },
  { type: 'pricing', label: 'Preços', icon: <FileText className="h-4 w-4" />, description: 'Tabela de preços' },
  { type: 'process_steps', label: 'Processo', icon: <Columns className="h-4 w-4" />, description: 'Etapas do processo' },
  { type: 'cta', label: 'CTA', icon: <Square className="h-4 w-4" />, description: 'Call-to-action' },
  { type: 'faq', label: 'FAQ', icon: <AlignLeft className="h-4 w-4" />, description: 'Perguntas frequentes' },
  { type: 'gallery', label: 'Galeria', icon: <Image className="h-4 w-4" />, description: 'Grid de imagens' },
  { type: 'footer', label: 'Rodapé', icon: <Layout className="h-4 w-4" />, description: 'Rodapé do site' },
  { type: 'spacer', label: 'Espaçador', icon: <ArrowDown className="h-4 w-4" />, description: 'Espaço vertical' },
  { type: 'custom_html', label: 'HTML', icon: <Code className="h-4 w-4" />, description: 'Código personalizado' },
];

const defaultContent: Record<PageSection['type'], Record<string, any>> = {
  hero: { headline: 'Título Principal', subheadline: 'Subtítulo descritivo do seu negócio', cta_text: 'Começar Agora', cta_url: '#', cta_type: 'url', whatsapp_number: '', background_image: '' },
  text: { body: 'Seu texto aqui...', alignment: 'left' },
  image: { url: '', alt: '', caption: '', fit: 'cover' },
  video: { url: '', poster: '', autoplay: false },
  features: { items: [{ icon: '🚀', title: 'Recurso 1', description: 'Descrição' }, { icon: '⚡', title: 'Recurso 2', description: 'Descrição' }, { icon: '🎯', title: 'Recurso 3', description: 'Descrição' }] },
  testimonials: { items: [{ name: 'Cliente', role: 'Cargo', text: 'Depoimento...', avatar: '' }] },
  social_proof: { items: [{ number: '1000+', label: 'Clientes Atendidos' }, { number: '98%', label: 'Satisfação' }, { number: '5+', label: 'Anos no Mercado' }] },
  guarantee: { title: 'Garantia Total', description: 'Oferecemos garantia incondicional de 30 dias. Se não ficar satisfeito, devolvemos seu dinheiro.', icon: '🛡️', duration: '30 dias' },
  objections: { title: 'Tire Suas Dúvidas', items: [{ objection: 'É caro demais', response: 'Nosso produto se paga em menos de 30 dias.' }, { objection: 'Não sei se funciona', response: 'Temos centenas de cases de sucesso comprovados.' }] },
  pricing: { title: 'Planos e Preços', items: [{ name: 'Básico', price: 'R$ 97/mês', features: ['Recurso 1', 'Recurso 2'], highlighted: false }, { name: 'Profissional', price: 'R$ 197/mês', features: ['Tudo do Básico', 'Recurso 3', 'Recurso 4'], highlighted: true }] },
  process_steps: { title: 'Como Funciona', items: [{ step: '1', title: 'Cadastre-se', description: 'Crie sua conta em segundos' }, { step: '2', title: 'Configure', description: 'Personalize conforme suas necessidades' }, { step: '3', title: 'Resultados', description: 'Comece a ver resultados imediatos' }] },
  cta: { headline: 'Pronto para começar?', description: 'Não perca essa oportunidade', button_text: 'Fale Conosco', button_url: '#', button_type: 'url', whatsapp_number: '', style: 'primary' },
  faq: { items: [{ question: 'Pergunta?', answer: 'Resposta.' }] },
  gallery: { images: [] },
  footer: { company: '', links: [{ label: 'Contato', url: '#' }], copyright: `© ${new Date().getFullYear()}` },
  spacer: { height: '60' },
  custom_html: { code: '<div>Seu HTML aqui</div>' },
};

// ── PAGE TEMPLATES ─────────────────────────────────────────────────────────────
interface PageTemplate {
  id: string; name: string; description: string; icon: React.ReactNode;
  thumbnail: string; sections: PageSection[]; config: Partial<PageConfig>;
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'landing-startup', name: 'Landing Startup', description: 'Hero + Features + Depoimentos + FAQ + CTA',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🚀',
    config: { primaryColor: '#4f46e5', accentColor: '#06b6d4', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Transforme sua ideia em realidade', subheadline: 'Plataforma completa para escalar seu negócio digital com inteligência e velocidade.', cta_text: 'Teste Grátis', cta_url: '#', background_image: '' } },
      { id: 't-feat', type: 'features', title: 'Recursos', visible: true, styles: {}, content: { items: [{ icon: '⚡', title: 'Ultra Rápido', description: 'Performance otimizada para carregar em menos de 1 segundo.' }, { icon: '🔒', title: 'Seguro', description: 'Dados protegidos com criptografia de ponta.' }, { icon: '📊', title: 'Analytics', description: 'Dashboards em tempo real.' }, { icon: '🤖', title: 'IA Integrada', description: 'Automações inteligentes.' }, { icon: '🌐', title: 'Global', description: 'Infra em 50+ países.' }, { icon: '💬', title: 'Suporte 24/7', description: 'Especialistas a qualquer momento.' }] } },
      { id: 't-test', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'Maria Silva', role: 'CEO, TechCorp', text: 'Aumentamos vendas em 300% nos primeiros 3 meses.' }, { name: 'João Santos', role: 'Fundador, StartupX', text: 'A melhor decisão para nosso negócio.' }] } },
      { id: 't-faq', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Como funciona o período de teste?', answer: '14 dias grátis sem cartão de crédito.' }, { question: 'Posso cancelar a qualquer momento?', answer: 'Sim, sem taxa de cancelamento.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Comece agora mesmo', description: 'Junte-se a mais de 10.000 empresas.', button_text: 'Criar Conta Grátis', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'product-launch', name: 'Lançamento de Produto', description: 'Hero + Imagem + Features + Vídeo + CTA',
    icon: <Package className="h-5 w-5" />, thumbnail: '🎯',
    config: { primaryColor: '#dc2626', accentColor: '#f59e0b', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero Produto', visible: true, styles: {}, content: { headline: 'Apresentamos o Produto Revolucionário', subheadline: 'A solução que você estava esperando finalmente chegou.', cta_text: 'Comprar Agora', cta_url: '#', background_image: '' } },
      { id: 't-img', type: 'image', title: 'Foto do Produto', visible: true, styles: {}, content: { url: '', alt: 'Imagem do Produto', caption: 'Design premiado e tecnologia de ponta', fit: 'contain' } },
      { id: 't-feat', type: 'features', title: 'Diferenciais', visible: true, styles: {}, content: { items: [{ icon: '✨', title: 'Design Premium', description: 'Acabamento sofisticado.' }, { icon: '🔋', title: 'Bateria Durável', description: 'Até 48h de uso contínuo.' }, { icon: '🎨', title: '5 Cores', description: 'Combine com seu estilo.' }] } },
      { id: 't-vid', type: 'video', title: 'Vídeo Demonstração', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
      { id: 't-test', type: 'testimonials', title: 'Avaliações', visible: true, styles: {}, content: { items: [{ name: 'Ana Costa', role: 'Influenciadora', text: 'Superou todas as minhas expectativas.' }, { name: 'Pedro Lima', role: 'Tech Reviewer', text: 'Melhor custo-benefício do mercado!' }] } },
      { id: 't-cta', type: 'cta', title: 'Compre Agora', visible: true, styles: {}, content: { headline: 'Oferta de Lançamento', description: '30% de desconto exclusivo!', button_text: 'Aproveitar Desconto', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'sales-page', name: 'Página de Vendas', description: 'Hero + Prova Social + Objeções + Garantia + Preço + CTA',
    icon: <Zap className="h-5 w-5" />, thumbnail: '💰',
    config: { primaryColor: '#059669', accentColor: '#f59e0b', fontDisplay: 'Inter', backgroundColor: '#f0fdf4', textColor: '#064e3b' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero de Vendas', visible: true, styles: {}, content: { headline: 'Descubra Como Triplicar Seus Resultados em 30 Dias', subheadline: 'O método comprovado por mais de 5.000 profissionais que transforma a forma como você trabalha.', cta_text: 'Quero Começar Agora', cta_url: '#', background_image: '' } },
      { id: 't-sp', type: 'social_proof', title: 'Prova Social', visible: true, styles: {}, content: { items: [{ number: '5.000+', label: 'Clientes Ativos' }, { number: '97%', label: 'Satisfação' }, { number: '3x', label: 'Mais Resultados' }, { number: '24h', label: 'Suporte' }] } },
      { id: 't-vid', type: 'video', title: 'Vídeo de Vendas', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
      { id: 't-feat', type: 'features', title: 'O Que Você Recebe', visible: true, styles: {}, content: { items: [{ icon: '📚', title: 'Módulo Completo', description: 'Acesso vitalício a todo conteúdo.' }, { icon: '🎯', title: 'Exercícios Práticos', description: 'Aplique imediatamente no seu negócio.' }, { icon: '👥', title: 'Comunidade VIP', description: 'Grupo exclusivo de alunos.' }] } },
      { id: 't-obj', type: 'objections', title: 'Objeções', visible: true, styles: {}, content: { title: 'Você Pode Estar Pensando...', items: [{ objection: 'É caro demais para mim', response: 'O investimento se paga em menos de 15 dias com os resultados que você vai alcançar.' }, { objection: 'Não tenho tempo', response: 'São apenas 15 minutos por dia. Menos que o tempo de um café.' }, { objection: 'Não sei se funciona pra mim', response: 'Temos alunos de todas as áreas com resultados comprovados.' }] } },
      { id: 't-test', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'Carlos M.', role: 'Empresário', text: 'Faturei R$ 50.000 a mais no primeiro mês aplicando o método.', metrics: '+R$ 50.000/mês' }, { name: 'Fernanda S.', role: 'Freelancer', text: 'Saí de 3 para 15 clientes em 60 dias.', metrics: '5x mais clientes' }] } },
      { id: 't-guar', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia Incondicional de 30 Dias', description: 'Se em 30 dias você não estiver 100% satisfeito, devolvemos cada centavo. Sem perguntas.', duration: '30 dias de garantia' } },
      { id: 't-price', type: 'pricing', title: 'Preços', visible: true, styles: {}, content: { title: 'Escolha Seu Plano', items: [{ name: 'Essencial', price: 'R$ 197', features: ['Acesso ao curso', 'Suporte por email', 'Certificado'], highlighted: false }, { name: 'Profissional', price: 'R$ 397', features: ['Tudo do Essencial', 'Mentoria em grupo', 'Comunidade VIP', 'Bônus exclusivos'], highlighted: true }, { name: 'Premium', price: 'R$ 997', features: ['Tudo do Profissional', 'Mentoria individual', 'Acesso vitalício', 'Consultoria 1:1'], highlighted: false }] } },
      { id: 't-cta', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Não Perca Essa Oportunidade', description: 'Vagas limitadas. Garanta a sua agora!', button_text: 'Quero Garantir Minha Vaga', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${new Date().getFullYear()} — Todos os direitos reservados` } },
    ]
  },
  {
    id: 'course-webinar', name: 'Curso / Webinar', description: 'Hero + Passos + Conteúdo + Preços + Garantia',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🎓',
    config: { primaryColor: '#7c3aed', accentColor: '#f59e0b', fontDisplay: 'Inter', backgroundColor: '#faf5ff', textColor: '#1e1b4b' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Domine [Habilidade] em 7 Dias', subheadline: 'Webinar gratuito onde você vai aprender o passo a passo completo.', cta_text: 'Inscrever-se Grátis', cta_url: '#', background_image: '' } },
      { id: 't-steps', type: 'process_steps', title: 'O Que Você Vai Aprender', visible: true, styles: {}, content: { title: 'Sua Jornada de Aprendizado', items: [{ step: '1', title: 'Fundamentos', description: 'Entenda os conceitos essenciais.' }, { step: '2', title: 'Prática Guiada', description: 'Exercícios passo a passo.' }, { step: '3', title: 'Projeto Real', description: 'Aplique em um caso real.' }, { step: '4', title: 'Certificação', description: 'Receba seu certificado.' }] } },
      { id: 't-text', type: 'text', title: 'Para Quem É', visible: true, styles: {}, content: { body: '✅ Iniciantes que querem aprender do zero\n✅ Profissionais que buscam atualização\n✅ Empreendedores que querem aplicar no negócio\n✅ Qualquer pessoa que deseja resultados reais', alignment: 'left' } },
      { id: 't-test', type: 'testimonials', title: 'Alunos', visible: true, styles: {}, content: { items: [{ name: 'Lucas R.', role: 'Aluno Turma 12', text: 'O melhor curso que já fiz. Conteúdo prático e direto ao ponto.', metrics: 'Nota 9.8/10' }, { name: 'Amanda T.', role: 'Aluna Turma 8', text: 'Consegui meu primeiro emprego na área 2 semanas após terminar.' }] } },
      { id: 't-price', type: 'pricing', title: 'Investimento', visible: true, styles: {}, content: { title: 'Escolha Seu Acesso', items: [{ name: 'Básico', price: 'R$ 147', features: ['Acesso ao curso', '6 meses de acesso', 'Certificado'], highlighted: false }, { name: 'Completo', price: 'R$ 297', features: ['Acesso vitalício', 'Comunidade', 'Mentorias semanais', 'Material extra'], highlighted: true }] } },
      { id: 't-guar', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia de 7 Dias', description: 'Teste sem risco. Se não gostar, devolvemos seu dinheiro.', duration: '7 dias' } },
      { id: 't-faq', type: 'faq', title: 'Dúvidas', visible: true, styles: {}, content: { items: [{ question: 'Preciso de conhecimento prévio?', answer: 'Não! O curso foi feito para iniciantes.' }, { question: 'Por quanto tempo tenho acesso?', answer: 'Depende do plano escolhido. O Completo é vitalício.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Comece Hoje Sua Transformação', description: 'Não adie mais seus sonhos.', button_text: 'Matricular-se Agora', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'portfolio', name: 'Portfólio Profissional', description: 'Hero + Sobre + Galeria + Serviços + Contato',
    icon: <GalleryHorizontalEnd className="h-5 w-5" />, thumbnail: '🎨',
    config: { primaryColor: '#1e293b', accentColor: '#8b5cf6', backgroundColor: '#0f172a', textColor: '#e2e8f0', fontDisplay: 'Playfair Display' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Apresentação', visible: true, styles: {}, content: { headline: 'Olá, eu sou [Seu Nome]', subheadline: 'Designer & Desenvolvedor criando experiências digitais memoráveis.', cta_text: 'Ver Projetos', cta_url: '#', background_image: '' } },
      { id: 't-text', type: 'text', title: 'Sobre Mim', visible: true, styles: {}, content: { body: 'Com mais de 10 anos de experiência, trabalho com marcas que buscam se destacar no mercado digital. Minha abordagem combina criatividade, estratégia e tecnologia.', alignment: 'center' } },
      { id: 't-gallery', type: 'gallery', title: 'Projetos', visible: true, styles: {}, content: { images: [] } },
      { id: 't-feat', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🎨', title: 'Design UI/UX', description: 'Interfaces intuitivas e bonitas' }, { icon: '💻', title: 'Desenvolvimento Web', description: 'Sites rápidos e responsivos' }, { icon: '📱', title: 'Apps Mobile', description: 'Aplicativos nativos e híbridos' }] } },
      { id: 't-cta', type: 'cta', title: 'Contato', visible: true, styles: {}, content: { headline: 'Vamos trabalhar juntos?', description: 'Estou disponível para novos projetos.', button_text: 'Enviar Mensagem', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'restaurant', name: 'Restaurante / Food', description: 'Hero + História + Galeria + Features + CTA',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🍽️',
    config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Georgia' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Sabor Autêntico', subheadline: 'Uma experiência gastronômica única com ingredientes frescos.', cta_text: 'Reservar Mesa', cta_url: '#', background_image: '' } },
      { id: 't-text', type: 'text', title: 'Nossa História', visible: true, styles: {}, content: { body: 'Fundado em 2010, nosso restaurante combina tradição e inovação para oferecer pratos que encantam todos os sentidos.', alignment: 'center' } },
      { id: 't-gallery', type: 'gallery', title: 'Nossos Pratos', visible: true, styles: {}, content: { images: [] } },
      { id: 't-feat', type: 'features', title: 'Por que nos escolher', visible: true, styles: {}, content: { items: [{ icon: '🌿', title: 'Ingredientes Frescos', description: 'Direto dos produtores locais' }, { icon: '👨‍🍳', title: 'Chef Premiado', description: 'Reconhecido internacionalmente' }, { icon: '🍷', title: 'Carta de Vinhos', description: 'Seleção exclusiva' }] } },
      { id: 't-test', type: 'testimonials', title: 'Avaliações', visible: true, styles: {}, content: { items: [{ name: 'Carla M.', role: 'Google Reviews ⭐⭐⭐⭐⭐', text: 'Melhor restaurante da cidade!' }] } },
      { id: 't-cta', type: 'cta', title: 'Reserva', visible: true, styles: {}, content: { headline: 'Faça sua Reserva', description: 'Garanta sua mesa.', button_text: 'Reservar Agora', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Restaurante Sabor', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'service-business', name: 'Prestação de Serviço', description: 'Hero + Serviços + Metodologia + Depoimentos + FAQ',
    icon: <FileText className="h-5 w-5" />, thumbnail: '💼',
    config: { primaryColor: '#0369a1', accentColor: '#0ea5e9', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Soluções que Geram Resultados', subheadline: 'Consultoria especializada para transformar desafios em oportunidades.', cta_text: 'Agendar Consultoria', cta_url: '#', background_image: '' } },
      { id: 't-feat', type: 'features', title: 'Nossos Serviços', visible: true, styles: {}, content: { items: [{ icon: '📈', title: 'Estratégia Digital', description: 'Campanhas de alto impacto.' }, { icon: '🎯', title: 'Performance', description: 'Otimização contínua de ROI.' }, { icon: '💡', title: 'Consultoria', description: 'Análise profunda com recomendações.' }, { icon: '🤝', title: 'Mentoria', description: 'Acompanhamento personalizado.' }] } },
      { id: 't-steps', type: 'process_steps', title: 'Como Trabalhamos', visible: true, styles: {}, content: { title: 'Nossa Metodologia', items: [{ step: '1', title: 'Diagnóstico', description: 'Analisamos seu cenário atual.' }, { step: '2', title: 'Estratégia', description: 'Plano de ação personalizado.' }, { step: '3', title: 'Execução', description: 'Implementação com agilidade.' }, { step: '4', title: 'Resultados', description: 'Mensuramos e otimizamos.' }] } },
      { id: 't-test', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Roberto F.', role: 'Diretor, Empresa XYZ', text: 'Triplicamos nosso faturamento em 6 meses.' }, { name: 'Lucia A.', role: 'Fundadora, Startup ABC', text: 'A consultoria foi transformadora.' }] } },
      { id: 't-faq', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Quanto tempo para resultados?', answer: 'Primeiros indicadores em 30-60 dias.' }, { question: 'Qual investimento mínimo?', answer: 'Entre em contato para orçamento personalizado.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Pronto para crescer?', description: 'Agende uma sessão de diagnóstico.', button_text: 'Falar com Especialista', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Consultoria', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'event-launch', name: 'Evento / Lançamento', description: 'Hero + Prova Social + Passos + Vídeo + FAQ + CTA',
    icon: <Zap className="h-5 w-5" />, thumbnail: '🎪',
    config: { primaryColor: '#fbbf24', accentColor: '#f97316', backgroundColor: '#0a0a0a', textColor: '#fefce8', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero Evento', visible: true, styles: {}, content: { headline: '[Nome do Evento] 2025', subheadline: 'O maior evento de [nicho] do Brasil. 3 dias de imersão total.', cta_text: 'Garantir Ingresso', cta_url: '#', background_image: '' } },
      { id: 't-sp', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '3.000+', label: 'Participantes' }, { number: '50+', label: 'Palestrantes' }, { number: '3 dias', label: 'Imersão' }, { number: '98%', label: 'Aprovação' }] } },
      { id: 't-vid', type: 'video', title: 'Aftermovie', visible: true, styles: {}, content: { url: '', poster: '', autoplay: false } },
      { id: 't-steps', type: 'process_steps', title: 'Programação', visible: true, styles: {}, content: { title: 'O Que Vai Acontecer', items: [{ step: 'Dia 1', title: 'Fundamentos', description: 'Palestras e workshops introdutórios.' }, { step: 'Dia 2', title: 'Aprofundamento', description: 'Painéis e masterclasses.' }, { step: 'Dia 3', title: 'Networking', description: 'Conexões e festa de encerramento.' }] } },
      { id: 't-feat', type: 'features', title: 'O Que Inclui', visible: true, styles: {}, content: { items: [{ icon: '🎤', title: 'Palestras', description: 'Conteúdo exclusivo.' }, { icon: '🍽️', title: 'Alimentação', description: 'Coffee break e almoço inclusos.' }, { icon: '📋', title: 'Material', description: 'Kit do participante.' }] } },
      { id: 't-price', type: 'pricing', title: 'Ingressos', visible: true, styles: {}, content: { title: 'Escolha Seu Ingresso', items: [{ name: 'Standard', price: 'R$ 497', features: ['Acesso geral', 'Coffee break', 'Certificado'], highlighted: false }, { name: 'VIP', price: 'R$ 997', features: ['Área VIP', 'Almoço incluso', 'Meet & Greet', 'Gravações'], highlighted: true }] } },
      { id: 't-faq', type: 'faq', title: 'Dúvidas', visible: true, styles: {}, content: { items: [{ question: 'Onde será o evento?', answer: 'Local será divulgado em breve.' }, { question: 'Tem estacionamento?', answer: 'Sim, estacionamento gratuito.' }] } },
      { id: 't-cta', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Vagas Limitadas!', description: 'Os ingressos estão se esgotando.', button_text: 'Comprar Ingresso', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '[Nome do Evento]', copyright: `© ${new Date().getFullYear()}` } },
    ]
  },
  {
    id: 'clinic-health', name: 'Clínica / Saúde', description: 'Hero + Serviços + Equipe + Depoimentos + Contato',
    icon: <Layout className="h-5 w-5" />, thumbnail: '🏥',
    config: { primaryColor: '#0284c7', accentColor: '#38bdf8', backgroundColor: '#f0f9ff', textColor: '#0c4a6e', fontDisplay: 'Inter' },
    sections: [
      { id: 't-hero', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Cuidando da Sua Saúde com Excelência', subheadline: 'Profissionais qualificados e tecnologia de ponta para o seu bem-estar.', cta_text: 'Agendar Consulta', cta_url: '#', background_image: '' } },
      { id: 't-feat', type: 'features', title: 'Especialidades', visible: true, styles: {}, content: { items: [{ icon: '🦷', title: 'Odontologia', description: 'Tratamentos completos.' }, { icon: '👁️', title: 'Oftalmologia', description: 'Exames e cirurgias.' }, { icon: '🩺', title: 'Clínica Geral', description: 'Check-up e prevenção.' }, { icon: '💪', title: 'Fisioterapia', description: 'Reabilitação e esportes.' }] } },
      { id: 't-text', type: 'text', title: 'Nossa Clínica', visible: true, styles: {}, content: { body: 'Com mais de 15 anos de atuação, nossa clínica reúne os melhores profissionais da região. Infraestrutura moderna, equipamentos de última geração e atendimento humanizado.', alignment: 'center' } },
      { id: 't-sp', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '15+', label: 'Anos de Experiência' }, { number: '50.000+', label: 'Pacientes Atendidos' }, { number: '20+', label: 'Especialistas' }, { number: '4.9⭐', label: 'Google Reviews' }] } },
      { id: 't-test', type: 'testimonials', title: 'Pacientes', visible: true, styles: {}, content: { items: [{ name: 'Marcos A.', role: 'Paciente', text: 'Atendimento excelente e profissionais muito competentes.' }, { name: 'Juliana F.', role: 'Paciente', text: 'Ambiente acolhedor. Me senti em boas mãos.' }] } },
      { id: 't-steps', type: 'process_steps', title: 'Como Agendar', visible: true, styles: {}, content: { title: 'Simples e Rápido', items: [{ step: '1', title: 'Escolha', description: 'Selecione a especialidade.' }, { step: '2', title: 'Agende', description: 'Escolha data e horário.' }, { step: '3', title: 'Consulte', description: 'Compareça à sua consulta.' }] } },
      { id: 't-cta', type: 'cta', title: 'Agendar', visible: true, styles: {}, content: { headline: 'Agende Sua Consulta Hoje', description: 'Atendimento rápido e sem fila.', button_text: 'Agendar pelo WhatsApp', button_url: '#' } },
      { id: 't-footer', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Clínica Saúde & Vida', copyright: `© ${new Date().getFullYear()} — CRM XXXXX` } },
    ]
  },
  {
    id: 'blank', name: 'Página em Branco', description: 'Comece do zero com total liberdade criativa',
    icon: <Plus className="h-5 w-5" />, thumbnail: '📄',
    config: {},
    sections: []
  },
];

// ── Draggable Asset Item ───────────────────────────────────────────────────────
const DraggableAsset: React.FC<{
  asset: MediaAsset;
  onDrop: (asset: MediaAsset) => void;
}> = ({ asset, onDrop }) => {
  const isVideo = asset.tipo === 'video';
  return (
    <button
      onClick={() => onDrop(asset)}
      className="relative aspect-video rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all group cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(asset));
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {isVideo ? (
        <div className="flex items-center justify-center h-full bg-muted">
          <Video className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : (
        <img src={asset.thumbnail_url || asset.public_url} alt={asset.nome} className="w-full h-full object-cover" />
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
        {asset.nome}
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="secondary" className="text-[9px] h-4">{isVideo ? 'Vídeo' : 'Imagem'}</Badge>
      </div>
    </button>
  );
};

// ── Assets Panel ───────────────────────────────────────────────────────────────
const AssetsPanel: React.FC<{ onDropAsset: (asset: MediaAsset) => void }> = ({ onDropAsset }) => {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }
      const { data } = await supabase
        .from('media_gallery')
        .select('id, nome, tipo, public_url, thumbnail_url')
        .eq('estabelecimento_id', estabId)
        .order('created_at', { ascending: false })
        .limit(80);
      setItems((data || []) as MediaAsset[]);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'video') return i.tipo === 'video';
    return ['imagem', 'image', 'gif'].includes(i.tipo);
  });

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(['all', 'image', 'video'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'secondary' : 'ghost'} size="sm" className="h-6 text-[10px] flex-1" onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todos' : f === 'image' ? '🖼️ Imagens' : '🎬 Vídeos'}
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground italic">Clique ou arraste para o preview para criar uma seção</p>
      <div className="grid grid-cols-2 gap-1.5 max-h-[calc(100%-80px)] overflow-y-auto">
        {filtered.map(asset => (
          <DraggableAsset key={asset.id} asset={asset} onDrop={onDropAsset} />
        ))}
      </div>
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhuma mídia encontrada</p>}
    </div>
  );
};

// ── Sortable Section Item ──────────────────────────────────────────────────────
const SortableSectionItem: React.FC<{
  section: PageSection; isSelected: boolean;
  onSelect: () => void; onDelete: () => void; onToggleVisible: () => void;
}> = ({ section, isSelected, onSelect, onDelete, onToggleVisible }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const tpl = SECTION_TEMPLATES.find(t => t.type === section.type);

  return (
    <div ref={setNodeRef} style={style}
      className={cn("flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors border",
        isSelected ? "bg-primary/10 border-primary" : "bg-card border-transparent hover:bg-muted/50"
      )} onClick={onSelect}>
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-4 w-4" /></div>
      <span className="text-sm">{tpl?.icon}</span>
      <span className={cn("flex-1 text-sm truncate min-w-0", !section.visible && "line-through text-muted-foreground")}>{section.title}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); onToggleVisible(); }} title={section.visible ? "Ocultar seção" : "Mostrar seção"}>
          {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Excluir seção">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// ── Media Picker Dialog ────────────────────────────────────────────────────────
const MediaPicker: React.FC<{ onSelect: (url: string) => void; type?: 'image' | 'video' }> = ({ onSelect, type = 'image' }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const tipoFilter = type === 'video' ? ['video'] : ['imagem', 'image', 'gif'];
      const { data } = await supabase
        .from('media_gallery')
        .select('id, nome, tipo, public_url, thumbnail_url, created_at')
        .eq('estabelecimento_id', estabId)
        .in('tipo', tipoFilter)
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data || []);
      setLoading(false);
    })();
  }, [type]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
      {items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item.public_url)}
          className="relative aspect-video rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all group">
          {type === 'video' ? (
            item.thumbnail_url ? (
              <div className="relative w-full h-full">
                <img src={item.thumbnail_url} alt={item.nome} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-4 w-4 text-foreground ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <video src={item.public_url} className="w-full h-full object-cover" muted preload="metadata"
                onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }} />
            )
          ) : (
            <img src={item.thumbnail_url || item.public_url} alt={item.nome} className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{item.nome}</div>
        </button>
      ))}
      {items.length === 0 && <p className="col-span-3 text-center text-sm text-muted-foreground py-4">Nenhuma mídia encontrada</p>}
    </div>
  );
};

// ── Strategy Text Picker ───────────────────────────────────────────────────────
const StrategyTextPicker: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [memory, setMemory] = useState<Record<string, any>>({});
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<string>('all');
  const [sourceTab, setSourceTab] = useState<'memory' | 'artifacts'>('memory');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) return;
      const { data: projs } = await supabase.from('strategy_projects').select('id, nome, strategic_memory').eq('estabelecimento_id', estabId).order('updated_at', { ascending: false }).limit(10);
      const projectList = projs || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        const projectIds = projectList.map((p: any) => p.id);
        const { data: arts } = await supabase.from('strategy_artifacts').select('id, tipo, conteudo, created_at, project_id').in('project_id', projectIds).order('created_at', { ascending: false }).limit(50);
        setArtifacts(arts || []);
      }
      if (projectList[0]) { setSelectedProject(projectList[0].id); setMemory((projectList[0].strategic_memory as Record<string, any>) || {}); }
      setLoading(false);
    })();
  }, []);

  const handleProjectChange = (id: string) => { setSelectedProject(id); const p = projects.find(p => p.id === id); setMemory((p?.strategic_memory as Record<string, any>) || {}); };

  const extractTexts = (obj: any, prefix = ''): { path: string; text: string }[] => {
    const results: { path: string; text: string }[] = [];
    if (!obj) return results;
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'string' && val.length > 10 && val.length < 2000) results.push({ path, text: val });
      else if (Array.isArray(val)) val.forEach((item, i) => {
        if (typeof item === 'string' && item.length > 5) results.push({ path: `${path}[${i}]`, text: item });
        else if (typeof item === 'object') results.push(...extractTexts(item, `${path}[${i}]`));
      });
      else if (typeof val === 'object' && val !== null) results.push(...extractTexts(val, path));
    }
    return results;
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const agentKeys = Object.keys(memory);
  const filteredKeys = activeAgent === 'all' ? agentKeys : agentKeys.filter(k => k === activeAgent);
  const projectArtifacts = artifacts.filter(a => a.project_id === selectedProject);

  return (
    <div className="space-y-3">
      {projects.length > 1 && (
        <Select value={selectedProject || ''} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Selecione projeto" /></SelectTrigger>
          <SelectContent className="bg-popover">{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="memory" className="flex-1 text-xs">Memória Estratégica</TabsTrigger>
          <TabsTrigger value="artifacts" className="flex-1 text-xs">Artefatos</TabsTrigger>
        </TabsList>
        <TabsContent value="memory" className="mt-2">
          {agentKeys.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={activeAgent === 'all' ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => setActiveAgent('all')}>Todos</Badge>
              {agentKeys.map(k => <Badge key={k} variant={activeAgent === k ? 'default' : 'outline'} className="cursor-pointer text-[10px]" onClick={() => setActiveAgent(k)}>{(AGENT_INFO_MAP as any)[k]?.icon || '🔹'} {(AGENT_INFO_MAP as any)[k]?.name || k}</Badge>)}
            </div>
          )}
          <ScrollArea className="h-[260px]">
            {filteredKeys.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado estratégico disponível.</p>}
            {filteredKeys.map(agentKey => {
              const texts = extractTexts(memory[agentKey]);
              if (texts.length === 0) return null;
              return (
                <div key={agentKey} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{(AGENT_INFO_MAP as any)[agentKey]?.icon || '🔹'} {(AGENT_INFO_MAP as any)[agentKey]?.name || agentKey}</p>
                  {texts.slice(0, 12).map((t, i) => (
                    <button key={i} onClick={() => onSelect(t.text)} className="block w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors border-b border-border/30">
                      <span className="text-muted-foreground">{t.path}: </span>
                      <span className="text-foreground">{t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="artifacts" className="mt-2">
          <ScrollArea className="h-[280px]">
            {projectArtifacts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum artefato encontrado.</p>}
            {projectArtifacts.map(art => {
              const texts = extractTexts(art.conteudo as any);
              if (texts.length === 0) return null;
              return (
                <div key={art.id} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{art.tipo}</p>
                  {texts.slice(0, 10).map((t, i) => (
                    <button key={i} onClick={() => onSelect(t.text)} className="block w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors border-b border-border/30">
                      <span className="text-muted-foreground">{t.path}: </span>
                      <span className="text-foreground">{t.text.slice(0, 120)}{t.text.length > 120 ? '...' : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Site Builder Agent Viewer ─────────────────────────────────────────────────
const SiteBuilderAgentViewer: React.FC<{ onImportSections?: (sections: PageSection[], config?: Partial<PageConfig>) => void }> = ({ onImportSections }) => {
  const [result, setResult] = useState<any>(null);
  const [htmlCompleto, setHtmlCompleto] = useState<string | null>(null);
  const [artifactHtmlList, setArtifactHtmlList] = useState<{ id: string; html: string; projectName: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [previewingHtml, setPreviewingHtml] = useState<string>('');

  useEffect(() => {
    (async () => {
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }

      // Fetch from strategic memory
      const { data } = await supabase.from('strategy_projects').select('id, nome, strategic_memory, updated_at').eq('estabelecimento_id', estabId).order('updated_at', { ascending: false }).limit(5);
      const projects = data || [];

      let memoryResult: any = null;
      let foundHtml: string | null = null;
      for (const p of projects) {
        const mem = (p.strategic_memory as Record<string, any>) || {};
        if (mem.site_builder) {
          memoryResult = mem.site_builder;
          if (typeof mem.site_builder.html_completo === 'string' && mem.site_builder.html_completo.length > 50) {
            foundHtml = mem.site_builder.html_completo;
          }
          break;
        }
      }
      setResult(memoryResult);
      setHtmlCompleto(foundHtml);

      // Fetch from artifacts (tipo = 'site_builder')
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: arts } = await supabase.from('strategy_artifacts').select('id, tipo, conteudo, created_at, project_id').in('project_id', projectIds).eq('tipo', 'site_builder').order('created_at', { ascending: false }).limit(10);
        const htmlItems: typeof artifactHtmlList = [];
        for (const art of (arts || [])) {
          const c = art.conteudo as any;
          if (!c) continue;
          let html = '';
          if (typeof c === 'string') html = c;
          else if (typeof c.html_completo === 'string') html = c.html_completo;
          else if (typeof c.html === 'string') html = c.html;
          if (html.length > 50) {
            const proj = projects.find(p => p.id === art.project_id);
            htmlItems.push({ id: art.id, html, projectName: proj?.nome || 'Projeto', date: art.created_at });
          }
        }
        setArtifactHtmlList(htmlItems);
      }

      setLoading(false);
    })();
  }, []);

  const handleImportHtml = (html: string) => {
    if (!onImportSections) return;
    setImporting(true);
    const section: PageSection = {
      id: `html-import-${Date.now()}`,
      type: 'custom_html',
      title: 'Site Builder (HTML Completo)',
      visible: true,
      styles: {},
      content: { code: html },
    };
    onImportSections([section]);
    toast.success('HTML completo importado como seção!');
    setImporting(false);
  };

  const handleImportSections = () => {
    if (!result || !onImportSections) return;
    setImporting(true);
    try {
      const imported: PageSection[] = [];
      const r = result;
      if (r.headline || r.titulo || r.hero_headline) imported.push({ id: `hero-imp-${Date.now()}`, type: 'hero', title: 'Hero (Importado)', visible: true, styles: {}, content: { headline: r.hero_headline || r.headline || r.titulo || '', subheadline: r.hero_subheadline || r.subheadline || r.subtitulo || r.descricao || '', cta_text: r.cta_text || r.hero_cta || 'Saiba Mais', cta_url: r.cta_url || '#', background_image: r.hero_image || '' } });
      if (r.features || r.recursos || r.beneficios) { const items = r.features || r.recursos || r.beneficios; if (Array.isArray(items) && items.length > 0) imported.push({ id: `feat-imp-${Date.now()}`, type: 'features', title: 'Recursos (Importado)', visible: true, styles: {}, content: { items: items.slice(0, 6).map((f: any) => ({ icon: f.icon || f.icone || '✨', title: f.title || f.titulo || f.name || f.nome || '', description: f.description || f.descricao || '' })) } }); }
      if (r.faq || r.perguntas_frequentes) { const items = r.faq || r.perguntas_frequentes; if (Array.isArray(items) && items.length > 0) imported.push({ id: `faq-imp-${Date.now()}`, type: 'faq', title: 'FAQ (Importado)', visible: true, styles: {}, content: { items: items.map((q: any) => ({ question: q.question || q.pergunta || '', answer: q.answer || q.resposta || '' })) } }); }
      const configHints: Partial<PageConfig> = {};
      if (r.title || r.titulo_pagina) configHints.title = r.title || r.titulo_pagina;
      if (imported.length > 0) { onImportSections(imported, configHints); toast.success(`${imported.length} seções importadas!`); }
      else toast.info('Output do Site Builder sem seções estruturadas reconhecíveis.');
    } catch { toast.error('Erro ao importar'); }
    setImporting(false);
  };

  const handlePreviewHtml = (html: string) => {
    setPreviewingHtml(html);
    setShowHtmlPreview(true);
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const hasAnyContent = result || artifactHtmlList.length > 0;
  if (!hasAnyContent) return <p className="text-sm text-muted-foreground text-center py-6">O agente Site Builder ainda não foi executado.</p>;

  return (
    <div className="space-y-3">
      {/* Import full HTML from memory */}
      {htmlCompleto && onImportSections && (
        <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold flex items-center gap-1.5"><Code className="h-3.5 w-3.5 text-primary" /> HTML Completo (Memória)</p>
          <p className="text-[10px] text-muted-foreground">HTML gerado pelo Site Builder disponível para importação direta.</p>
          <div className="flex gap-1.5">
            <Button variant="default" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => handleImportHtml(htmlCompleto)} disabled={importing}>
              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderInput className="h-3 w-3" />} Importar HTML
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handlePreviewHtml(htmlCompleto)}>
              <Eye className="h-3 w-3" /> Preview
            </Button>
          </div>
        </div>
      )}

      {/* Import from artifacts */}
      {artifactHtmlList.length > 0 && onImportSections && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">HTML dos Artefatos</p>
          {artifactHtmlList.map(item => (
            <div key={item.id} className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium truncate">{item.projectName}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{(item.html.length / 1024).toFixed(1)} KB de HTML</p>
              <div className="flex gap-1.5">
                <Button variant="default" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => handleImportHtml(item.html)} disabled={importing}>
                  {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderInput className="h-3 w-3" />} Importar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handlePreviewHtml(item.html)}>
                  <Eye className="h-3 w-3" /> Preview
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(item.html); toast.success('HTML copiado!'); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structured sections import */}
      {result && onImportSections && (
        <>
          <Separator />
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleImportSections} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Importar Seções Estruturadas
          </Button>
        </>
      )}

      {result && (
        <ScrollArea className="h-[200px]"><pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre></ScrollArea>
      )}

      {/* HTML Preview Dialog */}
      <Dialog open={showHtmlPreview} onOpenChange={setShowHtmlPreview}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview do HTML — Site Builder
              <Button variant="outline" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(previewingHtml); toast.success('HTML copiado!'); }}>
                <Copy className="h-3 w-3" /> Copiar HTML
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded border" style={{ height: 'calc(90vh - 80px)' }}>
            <iframe srcDoc={previewingHtml} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Section Editor ─────────────────────────────────────────────────────────────
// ── Alternatives Picker (for auto-generated content) ──────────────────────────
const AlternativesPicker: React.FC<{
  field: string;
  alternatives: { agent: string; icon: string; text: string }[];
  currentValue: string;
  onSelect: (text: string) => void;
}> = ({ field, alternatives, currentValue, onSelect }) => {
  const [open, setOpen] = useState(false);
  if (!alternatives || alternatives.length <= 1) return null;
  const currentIdx = alternatives.findIndex(a => a.text === currentValue);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
        onClick={() => setOpen(!open)}
      >
        <ArrowDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {alternatives.length} opções
      </Button>
      {open && (
        <div className="absolute z-50 right-0 top-7 w-72 bg-popover border rounded-lg shadow-lg p-1.5 space-y-1 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => { onSelect(alt.text); setOpen(false); }}
              className={cn(
                "w-full text-left p-2 rounded-md text-xs transition-colors",
                alt.text === currentValue
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{alt.icon}</span>
                <span className="font-semibold text-[10px] text-muted-foreground uppercase">{alt.agent}</span>
                {alt.text === currentValue && <Badge variant="secondary" className="text-[8px] h-3 ml-auto">Atual</Badge>}
              </div>
              <p className="text-foreground line-clamp-2">{alt.text}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Section Editor ─────────────────────────────────────────────────────────────
const SectionEditor: React.FC<{ section: PageSection; onChange: (u: PageSection) => void }> = ({ section, onChange }) => {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState('');
  const [strategyTarget, setStrategyTarget] = useState('');

  const updateContent = (key: string, value: any) => onChange({ ...section, content: { ...section.content, [key]: value } });
  const openMediaPicker = (t: string) => { setMediaPickerTarget(t); setShowMediaPicker(true); };
  const openStrategyPicker = (t: string) => { setStrategyTarget(t); setShowStrategyPicker(true); };

  const SB: React.FC<{ t: string }> = ({ t }) => {
    const alts = section.content[`_alt_${t}`];
    return (
      <div className="flex items-center gap-1">
        {alts && alts.length > 1 && (
          <AlternativesPicker
            field={t}
            alternatives={alts}
            currentValue={section.content[t] || ''}
            onSelect={(text) => updateContent(t, text)}
          />
        )}
        <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1" onClick={() => openStrategyPicker(t)}><Sparkles className="h-3 w-3" /> Estratégia</Button>
      </div>
    );
  };

  const renderFields = () => {
    switch (section.type) {
      case 'hero': return (
        <div className="space-y-3">
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título</Label><SB t="headline" /></div><Input value={section.content.headline} onChange={e => updateContent('headline', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Subtítulo</Label><SB t="subheadline" /></div><Textarea value={section.content.subheadline} onChange={e => updateContent('subheadline', e.target.value)} rows={2} /></div>
          <div><Label className="text-xs mb-1 block">Tipo do Botão</Label>
            <select value={section.content.cta_type || 'url'} onChange={e => updateContent('cta_type', e.target.value)} className="w-full h-8 rounded-md border bg-background px-2 text-xs">
              <option value="url">🔗 Link / URL</option>
              <option value="whatsapp">💬 WhatsApp</option>
            </select>
          </div>
          {(section.content.cta_type || 'url') === 'whatsapp' ? (
            <div><Label className="text-xs">Número WhatsApp</Label><Input value={section.content.whatsapp_number || ''} onChange={e => updateContent('whatsapp_number', e.target.value)} placeholder="5511999999999 (com DDI)" /><p className="text-[10px] text-muted-foreground mt-0.5">Formato: 55 + DDD + número (sem espaços)</p></div>
          ) : (
            <div><Label className="text-xs">URL do Botão</Label><Input value={section.content.cta_url} onChange={e => updateContent('cta_url', e.target.value)} placeholder="https://..." /></div>
          )}
          <div><Label className="text-xs">Texto do Botão</Label><Input value={section.content.cta_text} onChange={e => updateContent('cta_text', e.target.value)} /></div>
          <div><Label className="text-xs">Imagem de Fundo</Label><div className="flex gap-2 mt-1"><Input value={section.content.background_image} onChange={e => updateContent('background_image', e.target.value)} placeholder="URL" className="flex-1" /><Button variant="outline" size="sm" onClick={() => openMediaPicker('background_image')}><Image className="h-4 w-4" /></Button></div></div>
        </div>
      );
      case 'text': return (<div className="space-y-3"><div className="flex items-center justify-between mb-1"><Label className="text-xs">Conteúdo</Label><SB t="body" /></div><Textarea value={section.content.body} onChange={e => updateContent('body', e.target.value)} rows={5} /></div>);
      case 'image': return (
        <div className="space-y-3">
          <div><Label className="text-xs">URL da Imagem</Label><div className="flex gap-2 mt-1"><Input value={section.content.url} onChange={e => updateContent('url', e.target.value)} className="flex-1" /><Button variant="outline" size="sm" onClick={() => openMediaPicker('url')}><Image className="h-4 w-4" /></Button></div></div>
          {section.content.url && <img src={section.content.url} alt="" className="w-full max-h-40 object-contain rounded border" />}
          <Input value={section.content.alt} onChange={e => updateContent('alt', e.target.value)} placeholder="Texto alternativo" />
          <Input value={section.content.caption} onChange={e => updateContent('caption', e.target.value)} placeholder="Legenda" />
        </div>
      );
      case 'video': return (
        <div className="space-y-3">
          <div><Label className="text-xs">URL do Vídeo</Label><div className="flex gap-2 mt-1"><Input value={section.content.url} onChange={e => updateContent('url', e.target.value)} className="flex-1" placeholder="URL" /><Button variant="outline" size="sm" onClick={() => { setMediaPickerTarget('url'); setShowMediaPicker(true); }}><Video className="h-4 w-4" /></Button></div></div>
          {section.content.url && <video src={section.content.url} controls className="w-full max-h-40 rounded border" />}
        </div>
      );
      case 'cta': return (
        <div className="space-y-3">
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título</Label><SB t="headline" /></div><Input value={section.content.headline} onChange={e => updateContent('headline', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Descrição</Label><SB t="description" /></div><Textarea value={section.content.description} onChange={e => updateContent('description', e.target.value)} rows={2} /></div>
          <div><Label className="text-xs">Texto do Botão</Label><Input value={section.content.button_text} onChange={e => updateContent('button_text', e.target.value)} placeholder="Botão" /></div>
          <div><Label className="text-xs mb-1 block">Tipo do Botão</Label>
            <select value={section.content.button_type || 'url'} onChange={e => updateContent('button_type', e.target.value)} className="w-full h-8 rounded-md border bg-background px-2 text-xs">
              <option value="url">🔗 Link / URL</option>
              <option value="whatsapp">💬 WhatsApp</option>
            </select>
          </div>
          {(section.content.button_type || 'url') === 'whatsapp' ? (
            <div><Label className="text-xs">Número WhatsApp</Label><Input value={section.content.whatsapp_number || ''} onChange={e => updateContent('whatsapp_number', e.target.value)} placeholder="5511999999999 (com DDI)" /><p className="text-[10px] text-muted-foreground mt-0.5">Formato: 55 + DDD + número (sem espaços)</p></div>
          ) : (
            <div><Label className="text-xs">URL do Botão</Label><Input value={section.content.button_url} onChange={e => updateContent('button_url', e.target.value)} placeholder="https://..." /></div>
          )}
        </div>
      );
      case 'features': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2">
              <div className="grid grid-cols-[40px_1fr] gap-2">
                <Input value={item.icon} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, icon: e.target.value }; updateContent('items', items); }} className="text-center" />
                <Input value={item.title} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, title: e.target.value }; updateContent('items', items); }} placeholder="Título" />
              </div>
              <Textarea value={item.description} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, description: e.target.value }; updateContent('items', items); }} rows={1} className="mt-1" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { icon: '✨', title: 'Novo', description: 'Descrição' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'faq': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <Input value={item.question} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, question: e.target.value }; updateContent('items', items); }} placeholder="Pergunta" />
              <Textarea value={item.answer} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, answer: e.target.value }; updateContent('items', items); }} rows={2} placeholder="Resposta" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { question: 'Pergunta?', answer: 'Resposta.' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'gallery': return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(section.content.images || []).map((url: string, i: number) => (
              <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => updateContent('images', section.content.images.filter((_: any, idx: number) => idx !== i))} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => openMediaPicker('gallery_add')}><Image className="h-3 w-3 mr-1" /> Adicionar da Galeria</Button>
        </div>
      );
      case 'testimonials': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <Input value={item.name} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, name: e.target.value }; updateContent('items', items); }} placeholder="Nome" />
                <Input value={item.role} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, role: e.target.value }; updateContent('items', items); }} placeholder="Cargo" />
              </div>
              <Textarea value={item.text} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, text: e.target.value }; updateContent('items', items); }} rows={2} placeholder="Depoimento" />
              {item.metrics && <Input value={item.metrics} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, metrics: e.target.value }; updateContent('items', items); }} placeholder="Resultado/Métrica (ex: +300% vendas)" />}
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { name: 'Cliente', role: '', text: 'Depoimento...', metrics: '' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              const headline = section.content._parentHeadline || '';
              const FICTIONAL_TESTIMONIALS = [
                { name: 'Carlos Mendes', role: 'Empresário', text: 'Implementamos há 3 meses e os resultados superaram todas as expectativas. O ROI foi visível já na primeira semana.', metrics: '+250% ROI' },
                { name: 'Fernanda Oliveira', role: 'Gerente de Marketing', text: 'A facilidade de uso é impressionante. Minha equipe se adaptou em poucos dias e a produtividade disparou.', metrics: '+180% produtividade' },
                { name: 'Ricardo Santos', role: 'Diretor Comercial', text: 'Nunca vi uma solução tão completa. Reduziu nosso tempo de operação pela metade e aumentou as vendas significativamente.', metrics: '+340% vendas' },
                { name: 'Ana Beatriz Costa', role: 'CEO', text: 'O suporte é excepcional. Sempre que precisamos, a equipe estava pronta para nos ajudar. Melhor investimento do ano.', metrics: '5 estrelas' },
                { name: 'Paulo Henrique Silva', role: 'Coordenador de TI', text: 'A integração foi suave e sem dores de cabeça. Em uma semana já estávamos operando 100%. Recomendo fortemente.', metrics: 'Integração em 7 dias' },
                { name: 'Mariana Almeida', role: 'Empreendedora', text: 'Comecei sozinha e hoje tenho uma equipe. Essa ferramenta foi fundamental para escalar meu negócio de forma organizada.', metrics: 'De 1 para 12 funcionários' },
                { name: 'Thiago Barbosa', role: 'Consultor Financeiro', text: 'Reduzi custos operacionais em 40% no primeiro trimestre. O retorno veio muito mais rápido do que imaginava.', metrics: '-40% custos' },
                { name: 'Juliana Ferreira', role: 'Diretora de Operações', text: 'A automação dos processos nos liberou para focar no que realmente importa: nossos clientes. Transformador.', metrics: '+60% satisfação do cliente' },
              ];
              const existing = section.content.items || [];
              const availableTestimonials = FICTIONAL_TESTIMONIALS.filter(t => !existing.some((e: any) => e.name === t.name));
              const toAdd = availableTestimonials.slice(0, Math.max(4, 6 - existing.length));
              if (toAdd.length > 0) {
                updateContent('items', [...existing, ...toAdd]);
              }
            }}>
              <Wand2 className="h-3 w-3" /> Gerar Fictícios
            </Button>
          </div>
        </div>
      );
      case 'social_proof': return (
        <div className="space-y-3">
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Input value={item.number} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, number: e.target.value }; updateContent('items', items); }} placeholder="1000+" className="text-center font-bold" />
                <Input value={item.label} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, label: e.target.value }; updateContent('items', items); }} placeholder="Clientes" />
              </div>
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { number: '100+', label: 'Novo Indicador' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'guarantee': return (
        <div className="space-y-3">
          <div><Label className="text-xs">Ícone</Label><Input value={section.content.icon} onChange={e => updateContent('icon', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título</Label><SB t="title" /></div><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Descrição</Label><SB t="description" /></div><Textarea value={section.content.description} onChange={e => updateContent('description', e.target.value)} rows={3} /></div>
          <div><Label className="text-xs">Duração</Label><Input value={section.content.duration} onChange={e => updateContent('duration', e.target.value)} placeholder="30 dias" /></div>
        </div>
      );
      case 'objections': return (
        <div className="space-y-3">
          <div><div className="flex items-center justify-between mb-1"><Label className="text-xs">Título da Seção</Label><SB t="title" /></div><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <Input value={item.objection} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, objection: e.target.value }; updateContent('items', items); }} placeholder="Objeção (ex: É caro)" />
              <Textarea value={item.response} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, response: e.target.value }; updateContent('items', items); }} rows={2} placeholder="Resposta persuasiva" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { objection: 'Nova objeção', response: 'Resposta...' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      );
      case 'pricing': return (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2 space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <Input value={item.name} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, name: e.target.value }; updateContent('items', items); }} placeholder="Nome do plano" />
                <Input value={item.price} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, price: e.target.value }; updateContent('items', items); }} placeholder="R$ 97/mês" />
              </div>
              <Textarea value={(item.features || []).join('\n')} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, features: e.target.value.split('\n') }; updateContent('items', items); }} rows={3} placeholder="Um recurso por linha" />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.highlighted} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, highlighted: e.target.checked }; updateContent('items', items); }} /> Destacar</label>
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { name: 'Plano', price: 'R$ 0', features: ['Recurso'], highlighted: false }])}><Plus className="h-3 w-3 mr-1" /> Adicionar Plano</Button>
        </div>
      );
      case 'process_steps': return (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={section.content.title} onChange={e => updateContent('title', e.target.value)} /></div>
          {(section.content.items || []).map((item: any, i: number) => (
            <Card key={i} className="p-2">
              <div className="grid grid-cols-[40px_1fr] gap-2">
                <Input value={item.step} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, step: e.target.value }; updateContent('items', items); }} className="text-center font-bold" />
                <Input value={item.title} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, title: e.target.value }; updateContent('items', items); }} placeholder="Título da etapa" />
              </div>
              <Textarea value={item.description} onChange={e => { const items = [...section.content.items]; items[i] = { ...item, description: e.target.value }; updateContent('items', items); }} rows={1} className="mt-1" placeholder="Descrição" />
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs mt-1" onClick={() => updateContent('items', section.content.items.filter((_: any, idx: number) => idx !== i))}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateContent('items', [...(section.content.items || []), { step: `${(section.content.items || []).length + 1}`, title: 'Nova Etapa', description: '' }])}><Plus className="h-3 w-3 mr-1" /> Adicionar Etapa</Button>
        </div>
      );
      case 'spacer': return (<div><Label className="text-xs">Altura (px)</Label><Input type="number" value={section.content.height} onChange={e => updateContent('height', e.target.value)} /></div>);
      case 'custom_html': return (<div><Label className="text-xs">Código HTML</Label><Textarea value={section.content.code} onChange={e => updateContent('code', e.target.value)} rows={8} className="font-mono text-xs" /></div>);
      case 'footer': return (<div className="space-y-3"><Input value={section.content.company} onChange={e => updateContent('company', e.target.value)} placeholder="Empresa" /><Input value={section.content.copyright} onChange={e => updateContent('copyright', e.target.value)} placeholder="Copyright" /></div>);
      default: return <p className="text-xs text-muted-foreground">Editor não disponível.</p>;
    }
  };

  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Título da Seção</Label><Input value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} /></div>
      {section.content._media_suggestion && (
        <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p className="font-semibold flex items-center gap-1">💡 Sugestão de mídia (IA)</p>
          <p>{section.content._media_suggestion}</p>
        </div>
      )}
      <Separator />
      {renderFields()}
      <Dialog open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader><DialogTitle>Selecionar Mídia</DialogTitle></DialogHeader>
          <MediaPicker type={section.type === 'video' || mediaPickerTarget === 'video_url' ? 'video' : 'image'} onSelect={(url) => { if (mediaPickerTarget === 'gallery_add') updateContent('images', [...(section.content.images || []), url]); else updateContent(mediaPickerTarget, url); setShowMediaPicker(false); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={showStrategyPicker} onOpenChange={setShowStrategyPicker}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader><DialogTitle>Importar Texto Estratégico</DialogTitle></DialogHeader>
          <StrategyTextPicker onSelect={(text) => { updateContent(strategyTarget, text); setShowStrategyPicker(false); toast.success('Texto importado!'); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Contrast helpers ────────────────────────────────────────────────────────────
function hexToLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getContrastText(hex: string): string {
  return hexToLuminance(hex) > 0.55 ? '#1a1a1a' : '#ffffff';
}

function getContrastTextForAccent(hex: string): string {
  return hexToLuminance(hex) > 0.55 ? '#1a1a1a' : '#ffffff';
}

// Get a card background that contrasts with the page background
function getCardBg(pageBg: string): string {
  const lum = hexToLuminance(pageBg);
  return lum > 0.55 ? '#ffffff' : '#1e293b';
}

function getCardBorder(pageBg: string): string {
  const lum = hexToLuminance(pageBg);
  return lum > 0.55 ? '#e5e7eb' : '#334155';
}

function getSubtleText(pageBg: string): string {
  const lum = hexToLuminance(pageBg);
  return lum > 0.55 ? '#6b7280' : '#94a3b8';
}

function getSectionAltBg(pageBg: string): string {
  const lum = hexToLuminance(pageBg);
  return lum > 0.55 ? '#f9fafb' : '#0f172a';
}

// ── Pre-defined Color Palettes ─────────────────────────────────────────────────
const COLOR_PALETTES = [
  { name: 'Índigo Pro', primary: '#4f46e5', accent: '#06b6d4', bg: '#ffffff', text: '#1e293b', secondary: '#6366f1' },
  { name: 'Esmeralda', primary: '#059669', accent: '#fbbf24', bg: '#ffffff', text: '#064e3b', secondary: '#10b981' },
  { name: 'Sunset', primary: '#ea580c', accent: '#facc15', bg: '#fffbeb', text: '#431407', secondary: '#f97316' },
  { name: 'Dark Elegance', primary: '#6366f1', accent: '#f472b6', bg: '#0f172a', text: '#e2e8f0', secondary: '#818cf8' },
  { name: 'Midnight Blue', primary: '#1e40af', accent: '#38bdf8', bg: '#0a1628', text: '#e0f2fe', secondary: '#3b82f6' },
  { name: 'Ruby', primary: '#dc2626', accent: '#fbbf24', bg: '#ffffff', text: '#1c1917', secondary: '#ef4444' },
  { name: 'Royal Purple', primary: '#7c3aed', accent: '#f59e0b', bg: '#faf5ff', text: '#1e1b4b', secondary: '#8b5cf6' },
  { name: 'Forest', primary: '#166534', accent: '#a3e635', bg: '#f0fdf4', text: '#14532d', secondary: '#22c55e' },
  { name: 'Ocean Dark', primary: '#0ea5e9', accent: '#f97316', bg: '#0c1222', text: '#e0f2fe', secondary: '#38bdf8' },
  { name: 'Coral Clean', primary: '#f43f5e', accent: '#06b6d4', bg: '#fff1f2', text: '#1c1917', secondary: '#fb7185' },
  { name: 'Carbon', primary: '#18181b', accent: '#22d3ee', bg: '#09090b', text: '#fafafa', secondary: '#3f3f46' },
  { name: 'Warm Earth', primary: '#92400e', accent: '#d97706', bg: '#fffbeb', text: '#451a03', secondary: '#b45309' },
  { name: 'Teal Minimal', primary: '#0d9488', accent: '#f59e0b', bg: '#ffffff', text: '#134e4a', secondary: '#14b8a6' },
  { name: 'Neon Night', primary: '#8b5cf6', accent: '#22d3ee', bg: '#030712', text: '#f8fafc', secondary: '#a78bfa' },
  { name: 'Slate Pro', primary: '#334155', accent: '#3b82f6', bg: '#f8fafc', text: '#0f172a', secondary: '#475569' },
  { name: 'Rose Gold', primary: '#be185d', accent: '#fbbf24', bg: '#fff1f2', text: '#1c1917', secondary: '#ec4899' },
];

// ── URL resolver (WhatsApp or regular) ─────────────────────────────────────────
function resolveButtonUrl(type: string | undefined, url: string | undefined, whatsappNumber: string | undefined, buttonText?: string, globalConfig?: { whatsappGlobal?: string; siteGlobal?: string }): string {
  if (type === 'whatsapp') {
    const number = whatsappNumber || globalConfig?.whatsappGlobal || '';
    if (number) {
      const clean = number.replace(/\D/g, '');
      const msg = encodeURIComponent(buttonText || 'Olá!');
      return `https://wa.me/${clean}?text=${msg}`;
    }
  }
  const finalUrl = url && url !== '#' ? url : (globalConfig?.siteGlobal || url || '#');
  return finalUrl || '#';
}

// ── Preview Renderer ───────────────────────────────────────────────────────────
const SectionPreview: React.FC<{ section: PageSection; config: PageConfig }> = ({ section, config }) => {
  if (!section.visible) return null;
  const c = section.content;
  const layout = section.styles?.layout || '';
  switch (section.type) {
    case 'hero': {
      const primaryText = getContrastText(config.primaryColor);
      const accentText = getContrastTextForAccent(config.accentColor);
      if (layout === 'split-left' || layout === 'split-right') {
        const isRight = layout === 'split-right';
        return (
          <div className="relative py-12 px-6" style={{ backgroundColor: config.primaryColor, color: primaryText }}>
            <div className={`max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 ${isRight ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1 text-left">
                <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: config.fontDisplay }}>{c.headline}</h1>
                <p className="text-lg md:text-xl mb-8 opacity-90">{c.subheadline}</p>
                {c.cta_text && <a href={resolveButtonUrl(c.cta_type, c.cta_url, c.whatsapp_number, c.cta_text, config)} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 rounded-lg font-semibold text-lg" style={{ backgroundColor: config.accentColor, color: accentText }}>{c.cta_type === 'whatsapp' ? '💬 ' : ''}{c.cta_text}</a>}
              </div>
              <div className="flex-1 w-full">
                {c.background_image ? <img src={c.background_image} alt="" className="w-full rounded-xl shadow-2xl" /> : <div className="w-full aspect-[4/3] rounded-xl flex items-center justify-center text-sm" style={{ background: primaryText === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: primaryText === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }}>Imagem do Hero</div>}
              </div>
            </div>
          </div>
        );
      }
      return (<div className="relative py-20 px-6 text-center" style={{ backgroundImage: c.background_image ? `url(${c.background_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: c.background_image ? undefined : config.primaryColor, color: c.background_image ? '#fff' : primaryText }}>{c.background_image && <div className="absolute inset-0 bg-black/50" />}<div className="relative z-10 max-w-3xl mx-auto"><h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: config.fontDisplay }}>{c.headline}</h1><p className="text-lg md:text-xl mb-8 opacity-90">{c.subheadline}</p>{c.cta_text && <a href={resolveButtonUrl(c.cta_type, c.cta_url, c.whatsapp_number, c.cta_text, config)} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 rounded-lg font-semibold text-lg" style={{ backgroundColor: config.accentColor, color: accentText }}>{c.cta_type === 'whatsapp' ? '💬 ' : ''}{c.cta_text}</a>}</div></div>);
    }
    case 'text': return <div className="py-10 px-6 max-w-3xl mx-auto" style={{ textAlign: c.alignment as any }}><p className="text-base leading-relaxed whitespace-pre-wrap">{c.body}</p></div>;
    case 'image': return (<div className="py-8 px-6 max-w-4xl mx-auto text-center">{c.url ? <img src={c.url} alt={c.alt} className="w-full rounded-lg shadow-lg" style={{ objectFit: c.fit }} /> : <div className="h-48 bg-muted rounded-lg flex items-center justify-center"><Image className="h-10 w-10 text-muted-foreground" /></div>}{c.caption && <p className="text-sm text-muted-foreground mt-2">{c.caption}</p>}</div>);
    case 'video': return (<div className="py-8 px-6 max-w-4xl mx-auto" onClick={e => e.stopPropagation()}>{c.url ? <video src={c.url} controls poster={c.poster} className="w-full rounded-lg shadow-lg" onMouseDown={e => e.stopPropagation()} /> : c.poster ? <div className="relative w-full rounded-lg shadow-lg overflow-hidden"><img src={c.poster} alt="Video poster" className="w-full aspect-video object-cover" style={{ filter: 'brightness(0.7)' }} /><div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play className="h-7 w-7 text-white ml-1" /></div></div></div> : <div className="h-48 bg-muted rounded-lg flex items-center justify-center"><Video className="h-10 w-10 text-muted-foreground" /></div>}</div>);
    case 'features': {
      if (layout === 'zigzag') {
        return (<div className="py-12 px-6 max-w-5xl mx-auto space-y-8">{(c.items || []).map((item: any, i: number) => (<div key={i} className={`flex flex-col md:flex-row items-center gap-6 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}><div className="flex-1 text-center md:text-left"><span className="text-4xl block mb-3">{item.icon}</span><h3 className="font-semibold text-xl mb-2">{item.title}</h3><p className="text-muted-foreground">{item.description}</p></div><div className="flex-1 w-full"><div className="aspect-video rounded-xl bg-muted/30 border flex items-center justify-center text-muted-foreground text-sm">Imagem</div></div></div>))}</div>);
      }
      if (layout === 'icons-left') {
        return (<div className="py-12 px-6 max-w-4xl mx-auto space-y-4">{(c.items || []).map((item: any, i: number) => (<div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-card border"><span className="text-3xl shrink-0">{item.icon}</span><div><h3 className="font-semibold text-lg mb-1">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p></div></div>))}</div>);
      }
      return (<div className="py-12 px-6 max-w-5xl mx-auto"><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className="text-center p-6 rounded-xl bg-card border"><span className="text-3xl mb-3 block">{item.icon}</span><h3 className="font-semibold text-lg mb-2">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p></div>))}</div></div>);
    }
    case 'cta': { const ctaPrimaryText = getContrastText(config.primaryColor); const ctaAccentText = getContrastTextForAccent(config.accentColor); const ctaHref = resolveButtonUrl(c.button_type, c.button_url, c.whatsapp_number, c.button_text, config); return (<div className="py-16 px-6 text-center" style={{ backgroundColor: config.primaryColor, color: ctaPrimaryText }}><h2 className="text-2xl md:text-3xl font-bold mb-3">{c.headline}</h2><p className="text-lg mb-6 opacity-90">{c.description}</p><a href={ctaHref} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 rounded-lg font-semibold" style={{ backgroundColor: config.accentColor, color: ctaAccentText }}>{c.button_type === 'whatsapp' ? '💬 ' : ''}{c.button_text}</a></div>); }
    case 'testimonials': return (<div className="py-12 px-6 max-w-4xl mx-auto" style={{ backgroundColor: config.primaryColor, color: getContrastText(config.primaryColor) }}><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className="p-6 rounded-xl italic" style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}><p className="mb-3">"{item.text}"</p>{item.metrics && <p className="text-sm font-bold not-italic mb-2" style={{ color: config.accentColor }}>📈 {item.metrics}</p>}<p className="text-sm font-semibold not-italic">{item.name}{item.role ? ` — ${item.role}` : ''}</p></div>))}</div></div>);
    case 'social_proof': { const spText = getContrastText(config.primaryColor); return (<div className="py-12 px-6 text-center" style={{ backgroundColor: config.primaryColor, color: spText }}><div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">{(c.items || []).map((item: any, i: number) => (<div key={i} className="flex flex-col items-center justify-start"><p className="text-3xl md:text-4xl font-bold mb-1">{item.number}</p><p className="text-sm opacity-80">{item.label}</p></div>))}</div></div>); }
    case 'guarantee': return (<div className="py-12 px-6 max-w-3xl mx-auto text-center"><div className="p-8 rounded-2xl border-2 border-dashed" style={{ borderColor: config.accentColor }}><span className="text-5xl block mb-4">{c.icon || '🛡️'}</span><h3 className="text-2xl font-bold mb-3">{c.title}</h3><p className="text-base text-muted-foreground mb-2">{c.description}</p>{c.duration && <Badge variant="secondary" className="text-sm">{c.duration}</Badge>}</div></div>);
    case 'objections': return (<div className="py-12 px-6 max-w-3xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">{c.title || 'Tire Suas Dúvidas'}</h3><div className="space-y-4">{(c.items || []).map((item: any, i: number) => (<div key={i} className="p-5 rounded-xl border bg-card"><p className="font-semibold text-destructive mb-2">❌ "{item.objection}"</p><p className="text-sm text-foreground">✅ {item.response}</p></div>))}</div></div>);
    case 'pricing': return (<div className="py-12 px-6 max-w-4xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">{c.title || 'Planos'}</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className={cn("p-6 rounded-xl border-2 text-center", item.highlighted ? "border-primary shadow-lg scale-105" : "border-border")}><h4 className="font-bold text-lg mb-2">{item.name}</h4><p className="text-3xl font-bold mb-4" style={{ color: config.primaryColor }}>{item.price}</p><ul className="text-sm space-y-2 text-left">{(item.features || []).map((f: string, fi: number) => <li key={fi} className="flex items-center gap-2">✅ {f}</li>)}</ul></div>))}</div></div>);
    case 'process_steps': return (<div className="py-12 px-6 max-w-4xl mx-auto"><h3 className="text-2xl font-bold text-center mb-8">{c.title || 'Como Funciona'}</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{(c.items || []).map((item: any, i: number) => (<div key={i} className="text-center p-6"><div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3" style={{ backgroundColor: config.accentColor, color: '#fff' }}>{item.step}</div><h4 className="font-semibold text-lg mb-2">{item.title}</h4><p className="text-sm text-muted-foreground">{item.description}</p></div>))}</div></div>);
    case 'faq': return (<div className="py-12 px-6 max-w-3xl mx-auto space-y-4">{(c.items || []).map((item: any, i: number) => (<div key={i} className="border rounded-lg p-4"><h4 className="font-semibold mb-2">{item.question}</h4><p className="text-sm text-muted-foreground">{item.answer}</p></div>))}</div>);
    case 'gallery': return (<div className="py-8 px-6 max-w-5xl mx-auto"><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{(c.images || []).map((url: string, i: number) => <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />)}</div></div>);
    case 'footer': {
      const fNome = config.empresaNome;
      const fEnd = config.empresaEndereco;
      const fTel = config.empresaTelefone;
      const fWa = config.whatsappGlobal;
      const fSite = config.siteGlobal;
      return (<div className="py-8 px-6 text-center border-t bg-muted/30">
        <p className="font-semibold mb-1">{c.company || fNome || 'Empresa'}</p>
        {fEnd && <p className="text-xs text-muted-foreground mb-1">📍 {fEnd}</p>}
        <div className="flex items-center justify-center gap-3 flex-wrap text-xs text-muted-foreground mb-2">
          {fTel && <span>📞 {fTel}</span>}
          {fWa && <span>💬 {fWa}</span>}
          {fSite && <a href={fSite} target="_blank" rel="noopener noreferrer" className="underline">🌐 {fSite}</a>}
        </div>
        <p className="text-[10px] text-muted-foreground">{c.copyright}</p>
      </div>);
    }
    case 'spacer': return <div style={{ height: `${c.height || 60}px` }} />;
    case 'custom_html': return <div className="py-4 px-6 max-w-4xl mx-auto" dangerouslySetInnerHTML={{ __html: c.code || '' }} />;
    default: return null;
  }
};

function generateSlug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `page-${Date.now()}`;
}

// ── Shared HTML Generator ───────────────────────────────────────────────────────
function generateFullHTML(sections: PageSection[], config: PageConfig): string {
  const cfg: PageConfig = {
    title: '', description: '', favicon: '', primaryColor: '#1e40af', secondaryColor: '#3b82f6',
    accentColor: '#f59e0b', backgroundColor: '#ffffff', textColor: '#1f2937',
    fontDisplay: 'Inter', fontBody: 'Inter', maxWidth: '1200px', ...config,
  };
  const vs = sections.filter((s: PageSection) => s.visible);

  let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.title}</title><meta name="description" content="${cfg.description}">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(cfg.fontDisplay)}:wght@300;400;500;600;700;800;900&family=${encodeURIComponent(cfg.fontBody)}:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'${cfg.fontBody}',sans-serif;color:${cfg.textColor};background:${cfg.backgroundColor};-webkit-text-size-adjust:100%;overflow-x:hidden;line-height:1.6}
h1,h2,h3,h4,h5,h6{font-family:'${cfg.fontDisplay}',sans-serif;line-height:1.15}
p,span,li,a,td,th,label,input,textarea,select,button{font-family:'${cfg.fontBody}',sans-serif}
.container{max-width:${cfg.maxWidth};margin:0 auto;padding:0 clamp(16px,4vw,48px)}
img{max-width:100%;height:auto;display:block}video{max-width:100%;height:auto}
a{text-decoration:none;transition:all .3s ease}
section{overflow-x:hidden;position:relative}

/* ── Animations ─────────────────────────────────────── */
@keyframes fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-50px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(50px)}to{opacity:1;transform:translateX(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,.15)}50%{box-shadow:0 0 40px rgba(99,102,241,.35)}}
@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes counter{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

.reveal{opacity:0;transform:translateY(40px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-delay-1{transition-delay:.1s}
.reveal-delay-2{transition-delay:.2s}
.reveal-delay-3{transition-delay:.3s}
.reveal-delay-4{transition-delay:.4s}
.reveal-delay-5{transition-delay:.5s}

/* ── Buttons ────────────────────────────────────────── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:16px 40px;border-radius:100px;font-weight:600;font-size:1.05rem;cursor:pointer;transition:all .35s cubic-bezier(.16,1,.3,1);text-align:center;border:none;position:relative;overflow:hidden;letter-spacing:.02em}
.btn:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.2)}
.btn:active{transform:translateY(-1px)}
.btn::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.2),transparent);opacity:0;transition:opacity .3s}
.btn:hover::after{opacity:1}
.btn-outline{background:transparent;border:2px solid;backdrop-filter:blur(8px)}
.btn-outline:hover{transform:translateY(-3px)}

/* ── Cards ──────────────────────────────────────────── */
.card{border-radius:20px;transition:all .4s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}
.card:hover{transform:translateY(-6px)}
.card::before{content:'';position:absolute;inset:0;border-radius:inherit;opacity:0;transition:opacity .4s;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent);pointer-events:none}
.card:hover::before{opacity:1}
.card-glass{background:rgba(255,255,255,.06);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1)}
.card-glass:hover{border-color:rgba(255,255,255,.2);box-shadow:0 20px 60px rgba(0,0,0,.15)}

/* ── Layout ─────────────────────────────────────────── */
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(16px,3vw,32px)}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,3vw,32px)}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,3vw,28px)}
.text-center{text-align:center}

/* ── Decorative ─────────────────────────────────────── */
.gradient-text{background:linear-gradient(135deg,${cfg.accentColor},${cfg.primaryColor});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.glow-accent{box-shadow:0 0 60px -12px ${cfg.accentColor}40}
.divider{width:60px;height:4px;border-radius:4px;background:linear-gradient(90deg,${cfg.accentColor},${cfg.primaryColor});margin:0 auto 32px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:100px;font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.15;pointer-events:none;z-index:0}

/* ── Responsive ─────────────────────────────────────── */
@media(max-width:1024px){
  .grid-3{grid-template-columns:repeat(2,1fr)}
  .grid-4{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:768px){
  .grid-3,.grid-2{grid-template-columns:1fr}
  .grid-4{grid-template-columns:repeat(2,1fr)}
  .btn{padding:14px 28px;font-size:.95rem;width:100%;max-width:360px}
  .hero-split{flex-direction:column !important}
  .hero-split>div{min-width:100% !important;width:100% !important}
}
@media(max-width:480px){
  .grid-4{grid-template-columns:1fr}
  body{font-size:15px}
  .btn{max-width:100%}
}
</style></head><body>`;

  const primaryTextHTML = getContrastText(cfg.primaryColor);
  const accentTextHTML = getContrastTextForAccent(cfg.accentColor);
  const pageBgText = getContrastText(cfg.backgroundColor);
  const cardBg = getCardBg(cfg.backgroundColor);
  const cardBrd = getCardBorder(cfg.backgroundColor);
  const subtleText = getSubtleText(cfg.backgroundColor);
  const altBg = getSectionAltBg(cfg.backgroundColor);
  for (let si = 0; si < vs.length; si++) {
    const s = vs[si];
    const c = s.content;
    const isAlt = si % 2 === 1;
    switch (s.type) {
      case 'hero': {
        const heroLayout = s.styles?.layout || '';
        if (heroLayout === 'split-left' || heroLayout === 'split-right') {
          const isRight = heroLayout === 'split-right';
          html += `<section style="min-height:90vh;display:flex;align-items:center;padding:clamp(40px,8vw,100px) 24px;background:${cfg.primaryColor};color:${primaryTextHTML};position:relative;overflow:hidden">
            <div class="blob" style="width:500px;height:500px;background:${cfg.accentColor};top:-100px;right:-100px"></div>
            <div class="blob" style="width:400px;height:400px;background:${cfg.primaryColor};bottom:-100px;left:-100px"></div>
            <div class="container hero-split" style="display:flex;flex-wrap:wrap;align-items:center;gap:clamp(32px,5vw,80px);${isRight ? 'flex-direction:row-reverse' : ''};position:relative;z-index:1">
              <div style="flex:1;min-width:280px;text-align:left">
                <div class="badge" style="background:${cfg.accentColor}20;color:${cfg.accentColor};margin-bottom:20px;animation:fadeUp .6s ease both">🚀 Novo</div>
                <h1 style="font-size:clamp(2.2rem,5vw,4rem);font-weight:800;margin-bottom:20px;line-height:1.1;animation:fadeUp .6s ease .1s both">${c.headline||''}</h1>
                <p style="font-size:clamp(1rem,2vw,1.25rem);margin-bottom:36px;opacity:.8;max-width:540px;line-height:1.7;animation:fadeUp .6s ease .2s both">${c.subheadline||''}</p>
                ${c.cta_text ? `<div style="display:flex;flex-wrap:wrap;gap:12px;animation:fadeUp .6s ease .3s both"><a href="${resolveButtonUrl(c.cta_type, c.cta_url, c.whatsapp_number, c.cta_text, cfg)}" target="_blank" rel="noopener noreferrer" class="btn" style="background:${cfg.accentColor};color:${accentTextHTML}">${c.cta_type === 'whatsapp' ? '💬 ' : ''}${c.cta_text}</a></div>` : ''}
              </div>
              <div style="flex:1;min-width:280px;animation:scaleIn .8s ease .2s both">
                ${c.background_image ? `<img src="${c.background_image}" style="width:100%;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.35)">` : `<div style="width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,${cfg.accentColor}15,${cfg.accentColor}05);border:1px solid rgba(255,255,255,.08);border-radius:24px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(20px)"><span style="opacity:.25;font-size:3rem">📷</span></div>`}
              </div>
            </div>
          </section>\n`;
        } else {
          html += `<section style="min-height:90vh;display:flex;align-items:center;padding:clamp(60px,10vw,120px) 24px;text-align:center;${c.background_image ? `background:linear-gradient(165deg,rgba(0,0,0,.65),rgba(0,0,0,.4)),url(${c.background_image}) center/cover no-repeat` : `background:linear-gradient(165deg,${cfg.primaryColor},${cfg.primaryColor}ee)`};color:${c.background_image ? '#fff' : primaryTextHTML};position:relative;overflow:hidden">
            <div class="blob" style="width:600px;height:600px;background:${cfg.accentColor};top:-200px;right:-200px"></div>
            <div class="blob" style="width:500px;height:500px;background:${cfg.primaryColor};bottom:-200px;left:-100px"></div>
            <div class="container" style="position:relative;z-index:1">
              <div class="badge" style="background:rgba(255,255,255,.12);color:${c.background_image ? '#fff' : primaryTextHTML};margin-bottom:24px;animation:fadeUp .6s ease both;backdrop-filter:blur(8px)">✨ Bem-vindo</div>
              <h1 style="font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;margin-bottom:24px;line-height:1.08;max-width:900px;margin-left:auto;margin-right:auto;animation:fadeUp .6s ease .1s both;letter-spacing:-.02em">${c.headline||''}</h1>
              <p style="font-size:clamp(1.05rem,2vw,1.3rem);margin-bottom:40px;opacity:.85;max-width:680px;margin-left:auto;margin-right:auto;line-height:1.7;animation:fadeUp .6s ease .2s both">${c.subheadline||''}</p>
              ${c.cta_text ? `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;animation:fadeUp .6s ease .3s both"><a href="${resolveButtonUrl(c.cta_type, c.cta_url, c.whatsapp_number, c.cta_text, cfg)}" target="_blank" rel="noopener noreferrer" class="btn" style="background:${cfg.accentColor};color:${accentTextHTML};font-size:1.1rem;padding:18px 48px">${c.cta_type === 'whatsapp' ? '💬 ' : ''}${c.cta_text}</a></div>` : ''}
            </div>
          </section>\n`;
        }
        break;
      }
      case 'text':
        html += `<section style="padding:clamp(40px,6vw,80px) 24px"><div class="container reveal" style="max-width:768px;text-align:center"><p style="font-size:clamp(1rem,1.5vw,1.2rem);line-height:1.9;white-space:pre-wrap">${c.body||''}</p></div></section>\n`; break;
      case 'image':
        html += `<section style="padding:clamp(32px,5vw,64px) 24px"><div class="container text-center reveal">${c.url ? `<img src="${c.url}" alt="${c.alt||''}" style="border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.12);width:100%;object-fit:${c.fit||'cover'}">` : ''}${c.caption ? `<p style="margin-top:16px;color:${subtleText};font-size:.9rem">${c.caption}</p>` : ''}</div></section>\n`; break;
      case 'video': {
        const hasVideo = c.url && c.url.length > 5;
        const hasPoster = c.poster && c.poster.length > 5;
        const headlineOverlay = c._headline_overlay || '';
        const ctaOverlay = c._cta_overlay || '';
        if (hasVideo) {
          html += `<section style="padding:clamp(32px,5vw,64px) 24px"><div class="container reveal" style="max-width:960px"><video src="${c.url}" controls ${hasPoster ? `poster="${c.poster}"` : ''} style="width:100%;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.15)"></video></div></section>\n`;
        } else if (hasPoster) {
          html += `<section style="padding:clamp(32px,5vw,64px) 24px"><div class="container reveal" style="max-width:960px">
            <div style="position:relative;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.15)"><img src="${c.poster}" style="width:100%;aspect-ratio:16/9;object-fit:cover;filter:brightness(0.6)" />
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:24px">
            <div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.15);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;margin-bottom:16px;cursor:pointer;transition:transform .3s,background .3s;border:2px solid rgba(255,255,255,.2)" onmouseover="this.style.transform='scale(1.1)';this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.transform='scale(1)';this.style.background='rgba(255,255,255,.15)'"><svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
            ${headlineOverlay ? `<p style="font-size:1.4rem;font-weight:700;margin-bottom:8px;text-shadow:0 2px 12px rgba(0,0,0,.5)">${headlineOverlay}</p>` : ''}
            ${ctaOverlay ? `<p style="font-size:1rem;opacity:.9;text-shadow:0 2px 6px rgba(0,0,0,.5)">${ctaOverlay}</p>` : ''}
            </div></div></div></section>\n`;
        }
        break;
      }
      case 'features':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px;background:${isAlt ? altBg : 'transparent'}"><div class="container">
          <div class="grid-3">${(c.items||[]).map((f:any,i:number)=>`<div class="card reveal reveal-delay-${Math.min(i+1,5)}" style="text-align:center;padding:clamp(24px,3vw,40px) clamp(16px,2vw,28px);border-radius:20px;border:1px solid ${cardBrd};background:${cardBg};box-shadow:0 4px 20px rgba(0,0,0,.04)">
            <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,${cfg.accentColor}18,${cfg.accentColor}08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem">${f.icon||'✨'}</div>
            <h3 style="font-weight:700;font-size:clamp(1rem,1.5vw,1.2rem);margin-bottom:10px;color:${cfg.textColor}">${f.title||''}</h3>
            <p style="color:${subtleText};font-size:clamp(.85rem,1.2vw,.95rem);line-height:1.7">${f.description||''}</p>
          </div>`).join('')}</div></div></section>\n`; break;
      case 'cta':
        html += `<section style="padding:clamp(60px,10vw,120px) 24px;text-align:center;background:linear-gradient(165deg,${cfg.primaryColor},${cfg.primaryColor}dd);color:${primaryTextHTML};position:relative;overflow:hidden">
          <div class="blob" style="width:400px;height:400px;background:${cfg.accentColor};top:-100px;right:-100px"></div>
          <div class="container reveal" style="position:relative;z-index:1">
            <h2 style="font-size:clamp(1.8rem,4vw,3rem);font-weight:800;margin-bottom:16px;letter-spacing:-.01em">${c.headline||''}</h2>
            <p style="font-size:clamp(1rem,2vw,1.2rem);margin-bottom:36px;opacity:.85;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.7">${c.description||''}</p>
            ${c.button_text ? `<a href="${resolveButtonUrl(c.button_type, c.button_url, c.whatsapp_number, c.button_text, cfg)}" target="_blank" rel="noopener noreferrer" class="btn" style="background:${cfg.accentColor};color:${accentTextHTML};padding:18px 48px;font-size:1.1rem">${c.button_type === 'whatsapp' ? '💬 ' : ''}${c.button_text}</a>` : ''}
          </div></section>\n`; break;
      case 'testimonials':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px;background:linear-gradient(165deg,${cfg.primaryColor},${cfg.primaryColor}ee);color:${primaryTextHTML}"><div class="container">
          <div class="divider" style="background:linear-gradient(90deg,${cfg.accentColor},transparent)"></div>
          <div class="grid-2">${(c.items||[]).map((t:any,i:number)=>`<div class="card card-glass reveal reveal-delay-${Math.min(i+1,5)}" style="padding:clamp(24px,3vw,36px);text-align:center">
            <div style="font-size:2.5rem;margin-bottom:12px;opacity:.3">❝</div>
            <p style="margin-bottom:20px;font-size:clamp(.95rem,1.3vw,1.1rem);line-height:1.8;font-style:italic;opacity:.92">${t.text||''}</p>
            ${t.metrics?`<p style="font-size:.9rem;font-weight:700;font-style:normal;color:${cfg.accentColor};margin-bottom:12px;display:inline-flex;align-items:center;gap:6px;padding:4px 14px;background:${cfg.accentColor}15;border-radius:100px">📈 ${t.metrics}</p>`:''} 
            <div style="margin-top:8px"><p style="font-weight:700;font-style:normal;font-size:.95rem">${t.name||''}</p>${t.role ? `<p style="font-size:.85rem;opacity:.6;margin-top:2px">${t.role}</p>`:''}</div>
          </div>`).join('')}</div></div></section>\n`; break;
      case 'social_proof':
        html += `<section style="padding:clamp(40px,6vw,72px) 24px;text-align:center;background:${cfg.primaryColor};color:${primaryTextHTML};position:relative"><div class="container">
          <div class="grid-4" style="align-items:start;justify-items:center">${(c.items||[]).map((item:any,i:number)=>`<div class="reveal reveal-delay-${Math.min(i+1,5)}" style="display:flex;flex-direction:column;align-items:center;text-align:center;width:100%;max-width:220px;margin:0 auto">
            <p style="font-size:clamp(2.2rem,5vw,3.2rem);font-weight:800;margin-bottom:4px;background:linear-gradient(135deg,${primaryTextHTML},${cfg.accentColor});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${item.number||''}</p>
            <p style="font-size:.9rem;opacity:.65;letter-spacing:.03em;text-transform:uppercase">${item.label||''}</p>
          </div>`).join('')}</div></div></section>\n`; break;
      case 'guarantee':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px;text-align:center"><div class="container reveal" style="max-width:640px">
          <div class="card" style="padding:clamp(32px,5vw,56px);border:2px solid ${cfg.accentColor}30;background:linear-gradient(135deg,${cfg.accentColor}08,transparent);box-shadow:0 20px 60px ${cfg.accentColor}10">
            <span style="font-size:4rem;display:block;margin-bottom:20px;animation:float 3s ease-in-out infinite">${c.icon||'🛡️'}</span>
            <h3 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:800;margin-bottom:16px;color:${cfg.textColor}">${c.title||''}</h3>
            <p style="font-size:clamp(.95rem,1.3vw,1.1rem);color:${subtleText};margin-bottom:16px;line-height:1.8">${c.description||''}</p>
            ${c.duration?`<span class="badge" style="background:${cfg.accentColor}15;color:${cfg.accentColor};font-size:.85rem;padding:8px 20px">${c.duration}</span>`:''} 
          </div></div></section>\n`; break;
      case 'objections':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px"><div class="container" style="max-width:768px">
          <h3 class="reveal" style="font-size:clamp(1.4rem,3vw,2rem);font-weight:800;text-align:center;margin-bottom:48px;color:${cfg.textColor}">${c.title||''}</h3>
          ${(c.items||[]).map((item:any,i:number)=>`<div class="card reveal reveal-delay-${Math.min(i+1,5)}" style="padding:clamp(20px,3vw,28px);border:1px solid ${cardBrd};margin-bottom:16px;text-align:center;background:${cardBg}">
            <p style="font-weight:600;color:#ef4444;margin-bottom:12px;font-size:1.05rem">❌ "${item.objection||''}"</p>
            <p style="color:${cfg.textColor};line-height:1.7">✅ ${item.response||''}</p>
          </div>`).join('')}</div></section>\n`; break;
      case 'pricing':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px;background:${isAlt ? altBg : 'transparent'}"><div class="container">
          <h3 class="reveal" style="font-size:clamp(1.4rem,3vw,2rem);font-weight:800;text-align:center;margin-bottom:48px;color:${cfg.textColor}">${c.title||'Planos'}</h3>
          <div class="grid-3">${(c.items||[]).map((item:any,i:number)=>`<div class="card reveal reveal-delay-${Math.min(i+1,5)}" style="padding:clamp(28px,4vw,44px);border:${item.highlighted?`2px solid ${cfg.accentColor}`:`1px solid ${cardBrd}`};text-align:center;background:${cardBg};${item.highlighted?`box-shadow:0 20px 60px ${cfg.accentColor}20;transform:scale(1.03)`:''};position:relative;overflow:hidden">
            ${item.highlighted ? `<div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${cfg.accentColor},${cfg.primaryColor})"></div>` : ''}
            ${item.highlighted ? `<span class="badge" style="background:${cfg.accentColor};color:${accentTextHTML};margin-bottom:16px">⭐ Popular</span>` : ''}
            <h4 style="font-weight:700;font-size:clamp(1.1rem,1.5vw,1.4rem);margin-bottom:12px;color:${cfg.textColor}">${item.name||''}</h4>
            <p style="font-size:clamp(2rem,4vw,2.8rem);font-weight:800;background:linear-gradient(135deg,${cfg.primaryColor},${cfg.accentColor});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:24px">${item.price||''}</p>
            <ul style="list-style:none;text-align:left;font-size:.95rem;color:${cfg.textColor}">${(item.features||[]).map((f:string)=>`<li style="padding:10px 0;border-bottom:1px solid ${cardBrd};display:flex;align-items:center;gap:8px"><span style="color:${cfg.accentColor};font-size:1.1rem">✓</span> ${f}</li>`).join('')}</ul>
          </div>`).join('')}</div></div></section>\n`; break;
      case 'process_steps':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px;background:${isAlt ? altBg : 'transparent'}"><div class="container">
          <h3 class="reveal" style="font-size:clamp(1.4rem,3vw,2rem);font-weight:800;text-align:center;margin-bottom:48px;color:${cfg.textColor}">${c.title||'Como Funciona'}</h3>
          <div class="grid-3">${(c.items||[]).map((item:any,i:number)=>`<div class="reveal reveal-delay-${Math.min(i+1,5)}" style="text-align:center;padding:clamp(20px,3vw,32px);position:relative">
            <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,${cfg.accentColor},${cfg.primaryColor});color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;margin:0 auto 20px;box-shadow:0 8px 30px ${cfg.accentColor}30">${item.step||''}</div>
            <h4 style="font-weight:700;font-size:clamp(1rem,1.4vw,1.15rem);margin-bottom:10px;color:${cfg.textColor}">${item.title||''}</h4>
            <p style="color:${subtleText};line-height:1.7;font-size:clamp(.85rem,1.2vw,.95rem)">${item.description||''}</p>
          </div>`).join('')}</div></div></section>\n`; break;
      case 'faq':
        html += `<section style="padding:clamp(48px,8vw,100px) 24px"><div class="container" style="max-width:768px;text-align:center">
          <div class="divider"></div>
          ${(c.items||[]).map((q:any,i:number)=>`<div class="reveal reveal-delay-${Math.min(i+1,5)}" style="padding:clamp(16px,2vw,24px) 0;border-bottom:1px solid ${cardBrd}">
            <h4 style="font-weight:700;font-size:clamp(1rem,1.4vw,1.15rem);margin-bottom:10px;color:${cfg.textColor}">${q.question||''}</h4>
            <p style="color:${subtleText};line-height:1.7;font-size:clamp(.9rem,1.2vw,.95rem)">${q.answer||''}</p>
          </div>`).join('')}</div></section>\n`; break;
      case 'gallery':
        html += `<section style="padding:clamp(32px,5vw,64px) 24px"><div class="container"><div class="grid-3">${(c.images||[]).map((url:string,i:number)=>`<img class="reveal reveal-delay-${Math.min(i+1,5)}" src="${url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;transition:transform .4s ease" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">`).join('')}</div></div></section>\n`; break;
      case 'footer': {
        const fn = cfg.empresaNome || c.company || '';
        const fa = cfg.empresaEndereco || '';
        const ft = cfg.empresaTelefone || '';
        const fw = cfg.whatsappGlobal || '';
        const fs = cfg.siteGlobal || '';
        let footerInfo = '';
        if (fa) footerInfo += `<p style="color:${subtleText};font-size:.85rem;margin-bottom:8px">📍 ${fa}</p>`;
        let contactParts: string[] = [];
        if (ft) contactParts.push(`📞 ${ft}`);
        if (fw) contactParts.push(`💬 ${fw}`);
        if (fs) contactParts.push(`<a href="${fs}" target="_blank" rel="noopener noreferrer" style="color:${cfg.accentColor};transition:opacity .3s" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">🌐 ${fs}</a>`);
        if (contactParts.length) footerInfo += `<p style="color:${subtleText};font-size:.85rem;margin-bottom:10px">${contactParts.join(' &nbsp;·&nbsp; ')}</p>`;
        html += `<footer style="padding:clamp(32px,5vw,56px) 24px;text-align:center;border-top:1px solid ${cardBrd};background:${altBg}">
          <p style="font-weight:700;margin-bottom:8px;color:${cfg.textColor};font-size:1.05rem">${fn}</p>
          ${footerInfo}
          <p style="color:${subtleText};font-size:.8rem;opacity:.6">${c.copyright||''}</p>
        </footer>\n`; break;
      }
      case 'spacer':
        html += `<div style="height:${c.height||60}px"></div>\n`; break;
      case 'custom_html':
        html += c.code || ''; break;
    }
  }
  // Scroll-reveal IntersectionObserver
  html += `<script>
document.addEventListener('DOMContentLoaded',()=>{
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}})
  },{threshold:.08,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
});
</script>`;
  html += '</body></html>';
  return html;
}

// ── Preview Iframe (standalone) ─────────────────────────────────────────────────
const PREVIEW_DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: 'Monitor', width: '100%' },
  { key: 'tablet', label: 'Tablet', icon: 'Tablet', width: '768px' },
  { key: 'mobile', label: 'Celular', icon: 'Smartphone', width: '375px' },
] as const;

const PreviewIframe: React.FC<{ sections: PageSection[]; config: any }> = ({ sections, config }) => {
  const [device, setDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const current = PREVIEW_DEVICES.find(d => d.key === device)!;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-1 py-2 border-b bg-muted/30">
        {PREVIEW_DEVICES.map(d => (
          <Button
            key={d.key}
            variant={device === d.key ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setDevice(d.key)}
          >
            {d.key === 'desktop' && <Monitor className="h-3.5 w-3.5" />}
            {d.key === 'tablet' && <Tablet className="h-3.5 w-3.5" />}
            {d.key === 'mobile' && <Smartphone className="h-3.5 w-3.5" />}
            {d.label}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-auto flex justify-center bg-muted/20 p-2">
        <iframe
          srcDoc={generateFullHTML(sections, config as PageConfig)}
          className="border-0 bg-white shadow-lg transition-all duration-300"
          style={{
            width: current.width,
            maxWidth: '100%',
            height: '100%',
            borderRadius: device !== 'desktop' ? '16px' : '0',
          }}
        />
      </div>
    </div>
  );
};

// ── Auto Generate Page from Strategy (Multi-Step Wizard) ──────────────────────
const AutoGeneratePage: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (page: SavedPage) => void;
  globalConfig?: GlobalPageConfig;
}> = ({ open, onOpenChange, onGenerated, globalConfig: gCfg }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('ft-clean-light');
  const [selectedCategory, setSelectedCategory] = useState<string>('landing');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState<'select' | 'template' | 'product' | 'image_text' | 'video_script' | 'generating' | 'done'>('select');
  const [videoError, setVideoError] = useState<string>('');
  const [progress, setProgress] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savedPageRef, setSavedPageRef] = useState<SavedPage | null>(null);

  // Multi-step media states
  const [allAgentData, setAllAgentData] = useState<Record<string, any>>({});
  const [aiCopyData, setAiCopyData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Image step
  const [imageTexts, setImageTexts] = useState<{ agent: string; icon: string; text: string }[]>([]);
  const [selectedImageTextIdx, setSelectedImageTextIdx] = useState(0);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState('gemini-flash-image');

  // Video step
  const [videoScripts, setVideoScripts] = useState<{ agent: string; icon: string; label: string; storyboard: any[]; prompt: string }[]>([]);
  const [selectedVideoIdx, setSelectedVideoIdx] = useState(0);
  const [customVideoPrompt, setCustomVideoPrompt] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [selectedVideoModel, setSelectedVideoModel] = useState('auto');

  // Available models
  const [availableImageModels, setAvailableImageModels] = useState<{ id: string; label: string; paid: boolean }[]>([]);
  const [availableVideoModels, setAvailableVideoModels] = useState<{ id: string; label: string; paid: boolean }[]>([]);

  // Gallery selection
  const [galleryImages, setGalleryImages] = useState<{ url: string; titulo: string }[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<{ url: string; titulo: string }[]>([]);
  const [showGalleryPicker, setShowGalleryPicker] = useState<'image' | 'video' | null>(null);

  const MAX_VIDEO_DURATION = 8;

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const estabId = localStorage.getItem('estabelecimentoId');
      if (!estabId) { setLoading(false); return; }
      const { data } = await supabase
        .from('strategy_projects')
        .select('id, nome, descricao_negocio, strategic_memory, updated_at')
        .eq('estabelecimento_id', estabId)
        .order('updated_at', { ascending: false })
        .limit(20);
      const projs = data || [];
      setProjects(projs);
      if (projs.length > 0) setSelectedProject(projs[0].id);

      // Load available AI models based on configured API keys
      const imgModels: { id: string; label: string; paid: boolean }[] = [
        { id: 'gemini-flash-image', label: 'Nano Banana 2 (Rápido)', paid: false },
        { id: 'gemini-pro-image', label: 'Nano Banana Pro (Alta qualidade)', paid: false },
        { id: 'gemini-flash-image-old', label: 'Nano Banana (Econômico)', paid: false },
      ];
      const vidModels: { id: string; label: string; paid: boolean }[] = [];

      // Check ALL configured providers from Config APIs
      const { data: apiKeys } = await supabase
        .from('ai_api_keys')
        .select('provider, provider_display_name, is_active')
        .eq('estabelecimento_id', estabId);

      const allProviders = apiKeys || [];
      const activeProviders = allProviders.filter(k => k.is_active).map(k => k.provider);
      const inactiveProviders = allProviders.filter(k => !k.is_active).map(k => k.provider);

      // ApiFrame models
      if (activeProviders.includes('apiframe')) {
        imgModels.push(
          { id: 'apiframe/flux-imagine', label: 'Flux (ApiFrame)', paid: true },
          { id: 'apiframe/ideogram-imagine', label: 'Ideogram (ApiFrame)', paid: true },
          { id: 'apiframe/gpt-image', label: 'GPT Image (ApiFrame)', paid: true },
          { id: 'apiframe/midjourney-imagine', label: 'Midjourney (ApiFrame)', paid: true },
        );
        vidModels.push(
          { id: 'apiframe/kling-2.6', label: 'Kling 2.6 (ApiFrame)', paid: true },
          { id: 'apiframe/kling-2.5', label: 'Kling 2.5 Turbo (ApiFrame)', paid: true },
          { id: 'apiframe/runway', label: 'Runway Gen4 (ApiFrame)', paid: true },
          { id: 'apiframe/luma', label: 'Luma (ApiFrame)', paid: true },
        );
      }
      // Google Veo (video)
      if (activeProviders.includes('google') || activeProviders.includes('veo3')) {
        vidModels.push({ id: 'google-veo', label: 'Google Veo', paid: true });
      }
      // OpenAI (image - DALL-E via API)
      if (activeProviders.includes('openai')) {
        imgModels.push({ id: 'openai/dall-e', label: 'DALL-E (OpenAI)', paid: true });
      }
      // Stability AI (image)
      if (activeProviders.includes('stability')) {
        imgModels.push({ id: 'stability/sdxl', label: 'Stable Diffusion (Stability)', paid: true });
      }
      // Replicate (image/video)
      if (activeProviders.includes('replicate')) {
        imgModels.push({ id: 'replicate/flux', label: 'Flux (Replicate)', paid: true });
      }
      // Seedream / ByteDance (image)
      if (activeProviders.includes('seedream')) {
        imgModels.push({ id: 'seedream/generate', label: 'Seedream (ByteDance)', paid: true });
      }

      setAvailableImageModels(imgModels);
      setAvailableVideoModels(vidModels);
      if (vidModels.length > 0) setSelectedVideoModel(vidModels[0].id);

      // Load gallery images from multiple sources
      const allImages: { url: string; titulo: string }[] = [];
      const allVideos: { url: string; titulo: string }[] = [];

      // 1. contents table
      const { data: imgContents } = await supabase
        .from('contents')
        .select('titulo, url')
        .eq('estabelecimento_id', estabId)
        .in('tipo', ['imagem', 'image', 'gif'])
        .not('url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      (imgContents || []).filter(c => c.url).forEach(c => allImages.push({ url: c.url!, titulo: c.titulo }));

      const { data: vidContents } = await supabase
        .from('contents')
        .select('titulo, url')
        .eq('estabelecimento_id', estabId)
        .in('tipo', ['video'])
        .not('url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      (vidContents || []).filter(c => c.url).forEach(c => allVideos.push({ url: c.url!, titulo: c.titulo }));

      // 2. media_gallery table
      const { data: mediaGallery } = await supabase
        .from('media_gallery')
        .select('nome, public_url, tipo')
        .eq('estabelecimento_id', estabId)
        .not('public_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      (mediaGallery || []).forEach((m: any) => {
        if (m.tipo === 'image') allImages.push({ url: m.public_url, titulo: m.nome || 'Mídia' });
        if (m.tipo === 'video') allVideos.push({ url: m.public_url, titulo: m.nome || 'Vídeo' });
      });

      // 3. catalog_ai_images table
      const { data: aiImages } = await supabase
        .from('catalog_ai_images')
        .select('prompt, public_url')
        .eq('estabelecimento_id', estabId)
        .not('public_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      (aiImages || []).forEach((a: any) => allImages.push({ url: a.public_url, titulo: a.prompt || 'Imagem IA' }));

      // Deduplicate by URL
      const uniqueImages = allImages.filter((img, i, arr) => arr.findIndex(x => x.url === img.url) === i);
      const uniqueVideos = allVideos.filter((vid, i, arr) => arr.findIndex(x => x.url === vid.url) === i);

      setGalleryImages(uniqueImages);
      setGalleryVideos(uniqueVideos);

      setLoading(false);
      setStep('select');
      setProgress([]);
      setVideoError('');
      setGeneratedImageUrl('');
      setGeneratedVideoUrl('');
      setImageError('');
      setAiCopyData(null);
      setAllAgentData({});
    })();
  }, [open]);

  const extractText = (obj: any, key: string): string => {
    if (!obj) return '';
    if (typeof obj[key] === 'string') return obj[key];
    return '';
  };

  const extractArray = (obj: any, ...keys: string[]): any[] => {
    if (!obj) return [];
    for (const k of keys) {
      if (Array.isArray(obj[k])) return obj[k];
    }
    return [];
  };

  const parseDur = (d: string | number | undefined): number => {
    if (typeof d === 'number') return d;
    if (!d) return 2;
    const m = String(d).match(/(\d+)/);
    return m ? parseInt(m[1]) : 2;
  };

  // ── Prepare agent data + extract image texts + video scripts ──
  const prepareAgentData = async () => {
    setDataLoading(true);
    const project = projects.find(p => p.id === selectedProject);
    if (!project) { setDataLoading(false); return; }

    const mem: Record<string, any> = (project.strategic_memory as Record<string, any>) || {};
    const { data: artifacts } = await supabase
      .from('strategy_artifacts')
      .select('tipo, conteudo')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    const allData: Record<string, any> = { ...mem };
    for (const art of (artifacts || [])) {
      if (!allData[art.tipo]) allData[art.tipo] = art.conteudo;
    }
    setAllAgentData(allData);

    // Call AI for marketing copy
    let aiCopy: any = null;
    try {
      const summaryForAI = JSON.stringify({
        nome_negocio: project.nome,
        descricao: project.descricao_negocio,
        agentes_disponiveis: Object.keys(allData),
        dados: Object.fromEntries(
          Object.entries(allData).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v).slice(0, 1500) : String(v).slice(0, 500)])
        ),
      });
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('strategy-engine', {
        body: { action: 'generate_page_copy', projectId: project.id, contextSummary: summaryForAI }
      });
      if (!aiError && aiResult?.success && aiResult?.copy) aiCopy = aiResult.copy;
    } catch {}
    setAiCopyData(aiCopy);

    // Extract image-worthy texts from agents
    const texts: { agent: string; icon: string; text: string }[] = [];
    const addText = (agent: string, icon: string, data: any, keys: string[]) => {
      if (!data) return;
      for (const key of keys) {
        const val = data[key];
        if (typeof val === 'string' && val.length > 10 && !texts.find(t => t.text === val)) {
          texts.push({ agent, icon, text: val });
        }
      }
    };
    addText('IA Marketing', '🤖', aiCopy, ['hero_headline', 'hero_subheadline', 'image_suggestion']);
    addText('Posicionamento', '🎯', allData.positioning, ['proposta_unica', 'headline', 'descricao', 'conceito_visual', 'proposta_valor']);
    addText('Landing Page', '🏗️', allData.landing_page, ['headline', 'hero_headline', 'subheadline', 'conceito_visual']);
    addText('Criativos', '🎨', allData.creative, ['headline', 'conceito_visual', 'estilo_visual', 'direção_arte']);
    addText('Influencer', '🤳', allData.influencer_content, ['conceito', 'descricao_visual', 'headline']);
    addText('Site Builder', '🌐', allData.site_builder, ['hero_headline', 'hero_descricao', 'conceito']);
    addText('SEO', '🔎', allData.seo, ['titulo_pagina', 'meta_description']);
    addText('Social Media', '📲', allData.social_media, ['headline', 'conceito', 'descricao']);
    setImageTexts(texts);

    // Extract video scripts/storyboards
    const scripts: { agent: string; icon: string; label: string; storyboard: any[]; prompt: string }[] = [];
    const vp = allData.video_producer;
    if (vp?.storyboard && Array.isArray(vp.storyboard) && vp.storyboard.length > 0) {
      scripts.push({
        agent: 'Produtor de Vídeo', icon: '🎥',
        label: `Storyboard (${vp.storyboard.length} cenas)`,
        storyboard: vp.storyboard,
        prompt: vp.conceito_criativo?.tema_visual || '',
      });
    }
    const vslData = allData.vsl;
    if (vslData) {
      let vslScenes: any[] = [];
      if (vslData.storyboard && Array.isArray(vslData.storyboard)) {
        vslScenes = vslData.storyboard;
      } else {
        const sectionKeys = ['hook', 'problema', 'agitacao', 'descoberta', 'mecanismo', 'prova', 'oferta', 'cta'];
        vslScenes = sectionKeys
          .filter(k => vslData[k]?.texto)
          .map((k, i) => ({
            cena: `${k.charAt(0).toUpperCase() + k.slice(1)}`,
            duracao: vslData[k].duracao_estimada || '3s',
            naracao: (vslData[k].texto || '').slice(0, 200),
            descricao_visual: '',
          }));
      }
      if (vslScenes.length > 0) {
        scripts.push({
          agent: 'Roteirista de Vídeo', icon: '🎬',
          label: `VSL (${vslScenes.length} cenas)`,
          storyboard: vslScenes,
          prompt: vslData.hook?.texto?.slice(0, 100) || '',
        });
      }
    }
    const reelData = allData.reel;
    if (reelData) {
      let reelScenes: any[] = [];
      if (Array.isArray(reelData.storyboard)) reelScenes = reelData.storyboard;
      else if (Array.isArray(reelData.roteiro)) reelScenes = reelData.roteiro;
      else if (Array.isArray(reelData.cenas)) reelScenes = reelData.cenas;
      if (reelScenes.length > 0) {
        scripts.push({
          agent: 'Roteirista de Reels', icon: '📱',
          label: `Reels (${reelScenes.length} cenas)`,
          storyboard: reelScenes,
          prompt: reelData.conceito || reelData.tema || '',
        });
      }
    }
    setVideoScripts(scripts);
    setDataLoading(false);
  };

  // ── Generate Image (with auto-retry on 429) ──
  const handleGenerateImage = async () => {
    const selectedProd = selectedProduct ? products.find(p => p.id === selectedProduct) : null;
    if (!selectedProd) return;
    setImageLoading(true);
    setImageError('');

    const maxRetries = 3;
    const promptText = customImagePrompt || imageTexts[selectedImageTextIdx]?.text || selectedProd.nome;

    // Map model IDs to backend params
    const imageModelMap: Record<string, string> = {
      'gemini-flash-image': 'google/gemini-3.1-flash-image-preview',
      'gemini-pro-image': 'google/gemini-3-pro-image-preview',
      'gemini-flash-image-old': 'google/gemini-2.5-flash-image',
    };
    const isApiframeImage = selectedImageModel.startsWith('apiframe/');

    const estabId = localStorage.getItem('estabelecimentoId');
    const invokeBody: Record<string, any> = {
      action: 'generate_page_media',
      mediaType: 'image',
      productName: selectedProd.nome,
      productDescription: selectedProd.descricao || '',
      productImageUrl: selectedProd.foto_url || '',
      marketingContext: `${promptText}. ${projects.find(p => p.id === selectedProject)?.descricao_negocio || ''}`,
      imageModel: isApiframeImage ? selectedImageModel : (imageModelMap[selectedImageModel] || 'google/gemini-3.1-flash-image-preview'),
      useApiframe: isApiframeImage,
      estabelecimentoId: estabId,
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data: mediaResult, error: mediaError } = await supabase.functions.invoke('strategy-engine', { body: invokeBody });
        const errText = mediaError?.message || mediaResult?.error || '';
        const is429 = errText.includes('429') || errText.toLowerCase().includes('rate limit') || errText.toLowerCase().includes('resource exhausted');

        if (is429 && attempt < maxRetries) {
          const delay = attempt * 4000; // 4s, 8s
          setImageError(`Limite de requisições atingido. Tentando novamente em ${delay / 1000}s... (tentativa ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!mediaError && mediaResult?.success && mediaResult?.generatedImageUrl) {
          setGeneratedImageUrl(mediaResult.generatedImageUrl);
          setImageError('');
          break;
        } else {
          setImageError(errText || 'Não foi possível gerar a imagem. Tente novamente.');
          break;
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        const is429 = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');
        if (is429 && attempt < maxRetries) {
          const delay = attempt * 4000;
          setImageError(`Limite de requisições atingido. Tentando novamente em ${delay / 1000}s... (tentativa ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        setImageError(errMsg || 'Erro ao gerar imagem.');
        break;
      }
    }
    setImageLoading(false);
  };

  // ── Generate Video ──
  const handleGenerateVideo = async () => {
    const selectedProd = selectedProduct ? products.find(p => p.id === selectedProduct) : null;
    setVideoLoading(true);
    setVideoError('');
    try {
      const script = videoScripts[selectedVideoIdx];
      let videoGenPrompt = customVideoPrompt || '';
      if (!videoGenPrompt && script) {
        const sceneDescriptions = script.storyboard.map((s: any, i: number) => {
          const parts = [];
          if (s.descricao_visual) parts.push(s.descricao_visual);
          if (s.naracao) parts.push(`Narração: "${s.naracao}"`);
          if (s.movimento_camera) parts.push(`Câmera: ${s.movimento_camera}`);
          return `Cena ${i + 1} (${s.duracao || '2s'}): ${parts.join('. ')}`;
        }).join(' → ');
        videoGenPrompt = `Create a cinematic promotional video (max ${MAX_VIDEO_DURATION} seconds) for "${selectedProd?.nome || ''}". Storyboard: ${sceneDescriptions}. Style: professional, clean, modern advertising.`;
      } else if (!videoGenPrompt) {
        videoGenPrompt = `Create a short cinematic promotional video (max ${MAX_VIDEO_DURATION} seconds) for "${selectedProd?.nome || ''}". Style: professional advertising.`;
      }

      const estabId = localStorage.getItem('estabelecimentoId');
      
      // Step 1: Start the video generation (returns taskId for async providers)
      const startController = new AbortController();
      const startTimeout = setTimeout(() => startController.abort(), 55000); // 55s timeout
      let videoGenResponse: Response;
      try {
        videoGenResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
          method: 'POST',
          signal: startController.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: selectedVideoModel === 'google-veo' ? 'generate_video' : 'start_apiframe_video',
            params: {
              model: selectedVideoModel === 'google-veo' ? 'google-veo' : (selectedVideoModel === 'auto' ? 'auto' : selectedVideoModel),
              prompt: videoGenPrompt,
              estabelecimentoId: estabId,
              duration: MAX_VIDEO_DURATION,
              aspectRatio: '16:9',
              imageUrls: generatedImageUrl ? [generatedImageUrl] : [],
              withAudio: false,
              withMusic: false,
            },
          }),
        });
      } catch (fetchErr: any) {
        clearTimeout(startTimeout);
        const msg = fetchErr?.name === 'AbortError'
          ? 'Timeout ao conectar com o servidor de vídeo. Tente novamente.'
          : 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
        setVideoError(msg);
        setVideoLoading(false);
        return;
      }
      clearTimeout(startTimeout);

      if (!videoGenResponse.ok) {
        const errText = await videoGenResponse.text().catch(() => '');
        try {
          const errJson = JSON.parse(errText);
          const errMsg = errJson?.error || `Erro HTTP ${videoGenResponse.status}`;
          setVideoError(errMsg.includes('Nenhum provedor')
            ? 'Nenhum provedor de vídeo configurado. Configure uma API em Configurações → APIs Pagas.'
            : errMsg);
        } catch {
          setVideoError(`Erro HTTP ${videoGenResponse.status} na geração de vídeo.`);
        }
        setVideoLoading(false);
        return;
      }

      const startResult = await videoGenResponse.json();
      const result = startResult?.result;

      // If we got a direct videoUrl, we're done
      if (result?.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        setVideoLoading(false);
        return;
      }

      // If we got an error, show it
      if (result?.error) {
        setVideoError(result.error.substring(0, 300));
        setVideoLoading(false);
        return;
      }

      // If we got a taskId, poll for completion
      const taskId = result?.taskId;
      if (!taskId) {
        setVideoError('O provedor de vídeo não retornou resultado. Tente novamente.');
        setVideoLoading(false);
        return;
      }

      // Step 2: Poll for completion (client-side, avoids edge function timeout)
      const maxPolls = 60; // 60 * 5s = 5 minutes max
      for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const pollResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: 'fetch_apiframe_video',
              params: { estabelecimentoId: estabId, taskId },
            }),
          });
          if (!pollResp.ok) continue;
          const pollData = await pollResp.json();
          const pollResult = pollData?.result;
          if (pollResult?.error) {
            setVideoError(pollResult.error.substring(0, 300));
            setVideoLoading(false);
            return;
          }
          if (pollResult?.done && pollResult?.videoUrl) {
            setGeneratedVideoUrl(pollResult.videoUrl);
            setVideoLoading(false);
            return;
          }
          // Not done yet, continue polling
        } catch {
          // Network hiccup, retry
        }
      }
      setVideoError('Tempo limite excedido aguardando o vídeo. Tente novamente.');
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('fetch')) {
        setVideoError('Erro de conexão com o servidor de vídeo. Verifique sua internet e tente novamente.');
      } else {
        setVideoError(errMsg || 'Erro ao gerar vídeo.');
      }
    }
    setVideoLoading(false);
  };

  // ── Finalize: build page sections & save ──
  const finalizePage = async () => {
    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;
    setGenerating(true);
    setStep('generating');
    setProgress([]);
    setSavedPageRef(null);
    let generationError = '';
    const addProgress = (msg: string) => setProgress(prev => [...prev, msg]);
    const allData = allAgentData;
    const aiCopy = aiCopyData;
    const sections: PageSection[] = [];
    const selectedProd = selectedProduct ? products.find(p => p.id === selectedProduct) : null;

    const collectAlternatives = (sources: { agent: string; icon: string; data: any; keys: string[] }[]): { agent: string; icon: string; text: string }[] => {
      const alts: { agent: string; icon: string; text: string }[] = [];
      for (const src of sources) {
        if (!src.data) continue;
        for (const key of src.keys) {
          const val = src.data[key];
          if (typeof val === 'string' && val.length > 5) {
            if (!alts.find(a => a.text === val)) {
              alts.push({ agent: src.agent, icon: src.icon, text: val });
            }
            break;
          }
        }
      }
      return alts;
    };

    const getData = (key: string) => allData[key] || null;
    const pos = getData('positioning');
    const vox = getData('vox');
    const lp = getData('landing_page');
    const creative = getData('creative');
    const funnel = getData('funnel');
    const vsl = getData('vsl');
    const videoProd = getData('video_producer');
    const seoData = getData('seo');
    const emailData = getData('email');
    const socialData = getData('social_media');
    const cipherData = getData('cipher');
    const paidMedia = getData('paid_media');

    // 1. Hero
    addProgress('🎯 Construindo Hero...');
    const heroHeadline = aiCopy?.hero_headline || pos?.proposta_unica || pos?.headline || lp?.headline || lp?.hero_headline || creative?.headline || project.descricao_negocio || 'Transforme Seus Resultados Agora';
    const heroSub = aiCopy?.hero_subheadline || pos?.subheadline || pos?.descricao || lp?.subheadline || vox?.dor_principal || seoData?.meta_description || 'Descubra a solução que vai revolucionar seu negócio.';
    const heroCta = aiCopy?.hero_cta || lp?.cta_text || creative?.cta || 'Quero Começar Agora';

    const headlineAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['hero_headline'] },
      { agent: 'Posicionamento', icon: '🎯', data: pos, keys: ['proposta_unica', 'headline', 'titulo', 'proposta_valor'] },
      { agent: 'Landing Page', icon: '🏗️', data: lp, keys: ['headline', 'hero_headline', 'titulo'] },
      { agent: 'Criativos', icon: '🎨', data: creative, keys: ['headline', 'titulo_principal'] },
    ]);
    const subAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['hero_subheadline'] },
      { agent: 'Posicionamento', icon: '🎯', data: pos, keys: ['descricao', 'subheadline'] },
      { agent: 'Voz do Cliente', icon: '🎙️', data: vox, keys: ['dor_principal', 'resumo'] },
    ]);
    const ctaAlts = collectAlternatives([
      { agent: 'IA Marketing', icon: '🤖', data: aiCopy, keys: ['hero_cta'] },
      { agent: 'Landing Page', icon: '🏗️', data: lp, keys: ['cta_text', 'hero_cta'] },
      { agent: 'Criativos', icon: '🎨', data: creative, keys: ['cta', 'cta_text'] },
    ]);

    sections.push({
      id: `auto-hero-${Date.now()}`, type: 'hero', title: 'Hero Principal', visible: true, styles: {},
      content: {
        headline: heroHeadline, subheadline: heroSub, cta_text: heroCta,
        cta_type: gCfg?.whatsappGlobal ? 'whatsapp' : 'url',
        cta_url: gCfg?.siteGlobal || '#contato',
        whatsapp_number: gCfg?.whatsappGlobal || '',
        background_image: '',
        _alt_headline: headlineAlts, _alt_subheadline: subAlts, _alt_cta_text: ctaAlts,
      }
    });

    // 2. Social Proof
    addProgress('📊 Extraindo prova social...');
    const socialProofItems: any[] = [];
    if (aiCopy?.social_proof && Array.isArray(aiCopy.social_proof)) aiCopy.social_proof.forEach((sp: any) => socialProofItems.push(sp));
    if (socialProofItems.length === 0) {
      const numSources = [pos, lp, funnel, cipherData, socialData, emailData];
      const numKeys = ['clientes', 'usuarios', 'cases', 'metricas', 'numeros', 'social_proof'];
      for (const src of numSources) {
        if (!src) continue;
        for (const key of numKeys) {
          const val = src[key];
          if (Array.isArray(val)) val.slice(0, 4).forEach((item: any) => {
            if (typeof item === 'object' && item) socialProofItems.push({ number: item.numero || item.number || item.valor || '?', label: item.label || item.nome || '' });
          });
        }
      }
    }
    if (socialProofItems.length === 0) socialProofItems.push({ number: '[Preencher]', label: 'Clientes' }, { number: '[Preencher]', label: 'Satisfação' }, { number: '[Preencher]', label: 'Anos' });
    sections.push({ id: `auto-social-${Date.now()}`, type: 'social_proof', title: '📊 Prova Social', visible: true, styles: {}, content: { items: socialProofItems.slice(0, 4) } });

    // 3. Image (use pre-generated) — only add if there's an image
    const mainImageUrl = generatedImageUrl;
    if (mainImageUrl) {
      addProgress('📸 Inserindo imagem...');
      const mainImageAlt = selectedProd?.nome || 'Imagem do produto';
      sections.push({
        id: `auto-img-${Date.now()}`, type: 'image', title: '📸 Imagem Principal', visible: true, styles: {},
        content: { url: mainImageUrl, alt: mainImageAlt, caption: selectedProd?.nome || '', fit: 'cover' }
      });
    }

    // 4. Features
    addProgress('⚡ Montando diferenciais...');
    let featureItems: any[] = [];
    if (aiCopy?.features && Array.isArray(aiCopy.features)) featureItems = aiCopy.features.slice(0, 6);
    if (featureItems.length === 0) {
      const featureSources = [
        extractArray(pos, 'diferenciais', 'features', 'beneficios'),
        extractArray(lp, 'features', 'recursos', 'beneficios'),
        extractArray(funnel, 'etapas', 'features'),
        extractArray(creative, 'beneficios', 'features'),
        extractArray(cipherData, 'diferenciais', 'vantagens_competitivas'),
      ].filter(arr => arr.length > 0);
      const allFeats: any[] = [];
      for (const source of featureSources) {
        for (const f of source) {
          const title = typeof f === 'string' ? f.slice(0, 50) : (f.title || f.titulo || f.name || f.nome || '');
          const desc = typeof f === 'string' ? f : (f.description || f.descricao || f.texto || '');
          if (!title || title.trim().length < 3 || !desc || desc.trim().length < 3) continue;
          if (!allFeats.find(e => e.title === title)) {
            allFeats.push({ icon: f.icon || ['🚀', '⚡', '🎯', '💡', '🔒', '📊'][allFeats.length % 6], title, description: desc });
          }
        }
      }
      featureItems = allFeats.slice(0, 6);
    }
    if (featureItems.length === 0) featureItems = [{ icon: '🚀', title: 'Agilidade', description: 'Descreva' }, { icon: '🎯', title: 'Precisão', description: 'Descreva' }, { icon: '💡', title: 'Inovação', description: 'Descreva' }];
    sections.push({ id: `auto-feat-${Date.now()}`, type: 'features', title: aiCopy?.features_title || 'Por Que Nos Escolher', visible: true, styles: {}, content: { items: featureItems } });

    // 5. Process Steps
    addProgress('🔄 Montando etapas...');
    let processItems: any[] = [];
    if (aiCopy?.process_steps && Array.isArray(aiCopy.process_steps)) processItems = aiCopy.process_steps;
    if (processItems.length === 0) {
      const rawSteps = [...extractArray(funnel, 'etapas', 'stages', 'passos'), ...extractArray(lp, 'steps', 'como_funciona', 'etapas'), ...extractArray(pos, 'jornada_cliente', 'processo')];
      if (rawSteps.length > 0) processItems = rawSteps.slice(0, 5).map((s: any, i: number) => ({ step: `${i + 1}`, title: typeof s === 'string' ? s.slice(0, 40) : (s.title || s.titulo || `Etapa ${i + 1}`), description: typeof s === 'string' ? s : (s.description || s.descricao || '') }));
    }
    if (processItems.length >= 2) sections.push({ id: `auto-process-${Date.now()}`, type: 'process_steps', title: '🔄 Como Funciona', visible: true, styles: {}, content: { title: aiCopy?.process_title || 'Como Funciona', items: processItems } });

    // 6. About
    addProgress('📝 Seção sobre o negócio...');
    const aboutText = aiCopy?.about_text || pos?.historia || pos?.manifesto || vox?.resumo || project.descricao_negocio || 'Conte a história do seu negócio aqui.';
    sections.push({ id: `auto-about-${Date.now()}`, type: 'text', title: aiCopy?.about_title || 'Nossa História', visible: true, styles: {}, content: { body: aboutText, alignment: 'center' } });
    // 7. Video (use pre-generated) — only add if there's a video
    if (generatedVideoUrl) {
      addProgress('🎬 Inserindo vídeo...');
      sections.push({ id: `auto-video-${Date.now()}`, type: 'video', title: '🎬 Vídeo', visible: true, styles: {}, content: {
        url: generatedVideoUrl,
        poster: mainImageUrl || (selectedProd?.foto_url) || '',
        autoplay: true,
      }});
    }

    // 8. Testimonials
    addProgress('💬 Depoimentos...');
    let testimonialItems: any[] = [];
    if (aiCopy?.testimonials && Array.isArray(aiCopy.testimonials)) testimonialItems = aiCopy.testimonials;
    if (testimonialItems.length === 0) {
      const rawTest = [...extractArray(lp, 'testimonials', 'depoimentos'), ...extractArray(vox, 'depoimentos', 'testimonials'), ...extractArray(pos, 'depoimentos', 'cases')];
      if (rawTest.length > 0) testimonialItems = rawTest.slice(0, 6).map((t: any) => ({ name: t.name || t.nome || 'Cliente', role: t.role || t.cargo || '', text: t.text || t.texto || t.depoimento || '', metrics: t.metrics || '' }));
    }
    if (testimonialItems.length === 0) testimonialItems = [{ name: 'Cliente Satisfeito', role: 'Empresa', text: 'Insira um depoimento real aqui.' }, { name: 'Outro Cliente', role: 'Empresa', text: 'Mais um depoimento.' }];
    sections.push({ id: `auto-test-${Date.now()}`, type: 'testimonials', title: '💬 Depoimentos', visible: true, styles: {}, content: { items: testimonialItems } });

    // 9. Objections
    addProgress('🚫 Objeções...');
    let objectionItems: any[] = [];
    if (aiCopy?.objections && Array.isArray(aiCopy.objections)) objectionItems = aiCopy.objections;
    if (objectionItems.length === 0) {
      const rawObj = [...extractArray(vox, 'objecoes', 'objections', 'barreiras'), ...extractArray(pos, 'objecoes', 'barreiras'), ...extractArray(lp, 'objecoes', 'objections')];
      if (rawObj.length > 0) objectionItems = rawObj.slice(0, 5).map((o: any) => ({ objection: typeof o === 'string' ? o : (o.objecao || o.objection || ''), response: typeof o === 'string' ? 'Responda aqui.' : (o.resposta || o.response || '') }));
    }
    if (objectionItems.length > 0) sections.push({ id: `auto-obj-${Date.now()}`, type: 'objections', title: '🚫 Objeções', visible: true, styles: {}, content: { title: 'Ainda tem dúvidas?', items: objectionItems } });

    // 10. Guarantee
    addProgress('🛡️ Garantia...');
    let guaranteeData = { title: aiCopy?.guarantee_title || 'Garantia Total', description: aiCopy?.guarantee_description || '', icon: '🛡️', duration: aiCopy?.guarantee_duration || '' };
    if (!guaranteeData.description) {
      const rawG = pos?.garantia || lp?.garantia || funnel?.garantia;
      if (rawG && typeof rawG === 'object') { guaranteeData.title = rawG.titulo || guaranteeData.title; guaranteeData.description = rawG.descricao || rawG.description || ''; guaranteeData.duration = rawG.duracao || rawG.prazo || ''; }
      else if (typeof rawG === 'string') guaranteeData.description = rawG;
    }
    if (!guaranteeData.description) { guaranteeData.description = 'Se não ficar satisfeito, devolvemos seu dinheiro.'; guaranteeData.duration = '30 dias'; }
    sections.push({ id: `auto-guarantee-${Date.now()}`, type: 'guarantee', title: '🛡️ Garantia', visible: true, styles: {}, content: guaranteeData });

    // 11. Pricing
    addProgress('💰 Preços...');
    let pricingItems: any[] = [];
    if (aiCopy?.pricing && Array.isArray(aiCopy.pricing)) pricingItems = aiCopy.pricing;
    if (pricingItems.length === 0) {
      const rawP = [...extractArray(lp, 'planos', 'pricing', 'precos'), ...extractArray(funnel, 'planos', 'ofertas')];
      if (rawP.length > 0) pricingItems = rawP.slice(0, 3).map((p: any, i: number) => ({ name: p.name || p.nome || `Plano ${i + 1}`, price: p.price || p.preco || 'Consulte', features: Array.isArray(p.features || p.recursos) ? (p.features || p.recursos) : [], highlighted: i === 1 }));
    }
    if (pricingItems.length > 0) sections.push({ id: `auto-pricing-${Date.now()}`, type: 'pricing', title: '💰 Preços', visible: true, styles: {}, content: { title: 'Escolha seu Plano', items: pricingItems } });

    // 12. Gallery
    sections.push({ id: `auto-gallery-${Date.now()}`, type: 'gallery', title: '📸 Galeria', visible: true, styles: {}, content: { images: [], _media_suggestion: '🖼️ Adicione fotos profissionais.' } });

    // 13. FAQ
    addProgress('❓ FAQ...');
    let faqItems: any[] = [];
    if (aiCopy?.faq && Array.isArray(aiCopy.faq)) faqItems = aiCopy.faq;
    if (faqItems.length === 0) {
      const rawFaq = [...extractArray(lp, 'faq', 'perguntas_frequentes'), ...extractArray(seoData, 'faq', 'perguntas'), ...extractArray(vox, 'duvidas_frequentes', 'faq')];
      if (rawFaq.length > 0) faqItems = rawFaq.slice(0, 7).map((q: any) => ({ question: q.question || q.pergunta || '', answer: q.answer || q.resposta || '' }));
    }
    if (faqItems.length === 0) faqItems = [{ question: 'Como funciona?', answer: 'Descreva.' }, { question: 'Quais os diferenciais?', answer: 'Liste.' }];
    sections.push({ id: `auto-faq-${Date.now()}`, type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: faqItems } });

    // 14. CTA Final
    addProgress('🎯 CTA final...');
    const ctaFinalHeadline = aiCopy?.cta_final_headline || lp?.cta_headline || 'Pronto para Transformar Seus Resultados?';
    const ctaFinalDesc = aiCopy?.cta_final_description || pos?.urgencia || 'Não perca mais tempo.';
    sections.push({
      id: `auto-cta-${Date.now()}`, type: 'cta', title: 'CTA Final', visible: true, styles: {},
      content: { headline: ctaFinalHeadline, description: ctaFinalDesc, button_text: heroCta, button_type: gCfg?.whatsappGlobal ? 'whatsapp' : 'url', button_url: gCfg?.siteGlobal || '#contato', whatsapp_number: gCfg?.whatsappGlobal || '' }
    });

    // 15. Footer
    sections.push({ id: `auto-footer-${Date.now()}`, type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: gCfg?.empresaNome || '', copyright: `© ${new Date().getFullYear()} Todos os direitos reservados.` } });

    // Save
    addProgress('💾 Salvando página...');
    const fullTpl = ALL_FULL_TEMPLATES.find(t => t.id === selectedTemplate);
    const tplConfig: Record<string, string> = (fullTpl?.config || {}) as Record<string, string>;
    const pageName = aiCopy?.page_name || `${project.nome} — Página de Vendas`;
    const slug = generateSlug(`${pageName} ${Date.now().toString(36)}`);
    const estabId = localStorage.getItem('estabelecimentoId');

    const { data: saved, error } = await supabase.from('published_pages').insert({
      nome: pageName, slug,
      sections: sections as any,
      config: {
        title: aiCopy?.seo_title || seoData?.titulo_pagina || pageName,
        description: aiCopy?.seo_description || seoData?.meta_description || project.descricao_negocio || '',
        favicon: '', primaryColor: tplConfig.primaryColor || '#0f172a', secondaryColor: '#1e293b',
        accentColor: tplConfig.accentColor || '#3b82f6', backgroundColor: tplConfig.backgroundColor || '#ffffff',
        textColor: tplConfig.textColor || '#1f2937', fontDisplay: tplConfig.fontDisplay || 'Inter',
        fontBody: tplConfig.fontDisplay || 'Inter', maxWidth: tplConfig.maxWidth || '1200px',
        ...(gCfg ? { empresaNome: gCfg.empresaNome || '', empresaEndereco: gCfg.empresaEndereco || '', empresaTelefone: gCfg.empresaTelefone || '', whatsappGlobal: gCfg.whatsappGlobal || '', siteGlobal: gCfg.siteGlobal || '' } : {}),
        _autoGenerated: true,
      } as any,
      estabelecimento_id: estabId,
      publicado: false,
    }).select().single();

    if (error) {
      addProgress(`❌ Erro ao salvar: ${error.message}`);
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      const savedPage = saved as unknown as SavedPage;
      setSavedPageRef(savedPage);
      addProgress('✅ Página gerada com sucesso!');
      toast.success('Página de vendas completa gerada! 🎉');
      setTimeout(() => {
        onGenerated(savedPage);
        onOpenChange(false);
      }, 1500);
    }
    setStep('done');
    setGenerating(false);
  };

  const selectedProj = projects.find(p => p.id === selectedProject);
  const agentCount = selectedProj ? Object.keys((selectedProj.strategic_memory as Record<string, any>) || {}).length : 0;
  const selectedProd = selectedProduct ? products.find(p => p.id === selectedProduct) : null;

  const totalSteps = selectedProduct ? 5 : 3;
  const currentStepNum = step === 'select' ? 1 : step === 'template' ? 2 : step === 'product' ? 3 : step === 'image_text' ? 4 : step === 'video_script' ? 5 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !generating && !imageLoading && !videoLoading) onOpenChange(false); }}>
      <DialogContent className={cn("bg-background", (step === 'template' || step === 'image_text' || step === 'video_script') ? 'sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col' : 'sm:max-w-2xl')} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { if (generating || imageLoading || videoLoading) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Gerar Página Automática
          </DialogTitle>
        </DialogHeader>

        {/* ── Step indicator ── */}
        {currentStepNum > 0 && (
          <div className="flex items-center gap-1 px-1 pb-2">
            {Array.from({ length: totalSteps }, (_, i) => {
              const stepNum = i + 1;
              const stepLabels = ['Projeto', 'Template', 'Produto', 'Imagem', 'Vídeo'];
              const isActive = stepNum === currentStepNum;
              const isDone = stepNum < currentStepNum;
              return (
                <div key={stepNum} className="flex items-center gap-1 flex-1">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium w-full justify-center transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0", isActive ? "bg-primary-foreground text-primary" : isDone ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30 text-muted-foreground")}>
                      {isDone ? '✓' : stepNum}
                    </span>
                    <span className="truncate hidden sm:inline">{stepLabels[i]}</span>
                  </div>
                  {stepNum < totalSteps && <div className={cn("w-3 h-0.5 shrink-0", stepNum < currentStepNum ? "bg-primary" : "bg-border")} />}
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum projeto de estratégia encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">Crie um projeto no Motor de Estratégia primeiro.</p>
          </div>

        ) : step === 'select' ? (
          /* ── STEP 1: Select Project ── */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground"><strong>Passo 1:</strong> Selecione o projeto base.</p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.nome}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {Object.keys((p.strategic_memory as Record<string, any>) || {}).length} agentes
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProj && (
              <Card className="p-3 space-y-2 bg-muted/30">
                <p className="text-xs font-semibold">{selectedProj.nome}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{selectedProj.descricao_negocio}</p>
                {agentCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.keys((selectedProj.strategic_memory as Record<string, any>) || {}).map(key => {
                      const info = (AGENT_INFO_MAP as any)[key];
                      return <Badge key={key} variant="secondary" className="text-[10px] gap-0.5">{info?.icon || '🔹'} {info?.name || key}</Badge>;
                    })}
                  </div>
                )}
              </Card>
            )}
            <Button onClick={() => setStep('template')} disabled={!selectedProject} className="w-full gap-2">
              Próximo: Escolher Template <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </Button>
          </div>

        ) : step === 'template' ? (
          /* ── STEP 2: Select Template ── */
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground"><strong>Passo 2:</strong> Escolha o template.</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="text-xs gap-1">← Voltar</Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Categoria</Label>
              <Select value={selectedCategory} onValueChange={(val) => {
                setSelectedCategory(val);
                const cat = FULL_TEMPLATE_CATEGORIES.find(c => c.id === val);
                if (cat && cat.templates.length > 0 && !cat.templates.find(t => t.id === selectedTemplate)) setSelectedTemplate(cat.templates[0].id);
              }}>
                <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FULL_TEMPLATE_CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.icon} {cat.name} ({cat.templates.length})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(FULL_TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.templates || []).map(ft => (
                    <SelectItem key={ft.id} value={ft.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[ft.config.primaryColor, ft.config.accentColor].filter(Boolean).map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: c }} />)}
                        </div>
                        <span>{ft.name}</span>
                        <span className="text-muted-foreground">({ft.sections.length} seções)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const currentFt = ALL_FULL_TEMPLATES.find(t => t.id === selectedTemplate);
              if (!currentFt) return null;
              const previewHtml = generateFullHTML(currentFt.sections as PageSection[], { ...currentFt.config, title: currentFt.name, description: currentFt.description } as PageConfig);
              return (
                <div className="rounded-xl border overflow-hidden">
                  <div className="relative w-full overflow-hidden bg-muted/20" style={{ height: 280 }}>
                    <iframe srcDoc={previewHtml} className="border-0 pointer-events-none" style={{ width: 1200, height: 900, transform: 'scale(0.38)', transformOrigin: 'top left' }} title="Template Preview" sandbox="allow-same-origin" />
                  </div>
                  <div className="flex items-center gap-3 p-2.5" style={{ background: `linear-gradient(135deg, ${currentFt.config.primaryColor}, ${currentFt.config.backgroundColor})` }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white drop-shadow-sm">{currentFt.name}</p>
                      <p className="text-[10px] text-white/70">{currentFt.description}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <Button onClick={async () => {
              setLoadingProducts(true);
              const estabId = localStorage.getItem('estabelecimentoId');
              if (estabId) {
                const { data } = await supabase.from('produtos').select('id, nome, codigo, foto_url, descricao, preco_tabela, marca').eq('estabelecimento_id', estabId).eq('ativo', true).order('nome').limit(100);
                setProducts(data || []);
              }
              setLoadingProducts(false);
              setStep('product');
            }} className="w-full gap-2">
              <Package className="h-4 w-4" /> Próximo: Selecionar Produto
            </Button>
          </div>

        ) : step === 'product' ? (
          /* ── STEP 3: Select Product ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground"><strong>Passo 3:</strong> Selecione o produto (opcional).</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('template')} className="text-xs gap-1">← Voltar</Button>
            </div>
            <Input placeholder="🔍 Buscar produto..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="text-sm" />
            {loadingProducts ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="h-[300px] pr-2">
                <div className="space-y-2">
                  <button onClick={() => setSelectedProduct('')} className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left', !selectedProduct ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40')}>
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">🚫</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Sem produto específico</p>
                      <p className="text-[11px] text-muted-foreground">Gerar página apenas com dados da estratégia</p>
                    </div>
                    {!selectedProduct && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                  </button>
                  {products.filter(p => { if (!productSearch) return true; const s = productSearch.toLowerCase(); return (p.nome || '').toLowerCase().includes(s) || (p.codigo || '').toLowerCase().includes(s); }).map(product => {
                    const isSelected = selectedProduct === product.id;
                    return (
                      <button key={product.id} onClick={() => setSelectedProduct(product.id)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left', isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40')}>
                        {product.foto_url ? <img src={product.foto_url} alt={product.nome} className="w-12 h-12 rounded-lg object-cover border" /> : <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">📦</div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.nome}</p>
                          <div className="flex items-center gap-2">
                            {product.codigo && <span className="text-[10px] text-muted-foreground">#{product.codigo}</span>}
                            {product.marca && <Badge variant="outline" className="text-[9px] h-4">{product.marca}</Badge>}
                            {product.preco_tabela && <span className="text-[10px] font-semibold text-primary">R$ {Number(product.preco_tabela).toFixed(2)}</span>}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            <Button onClick={async () => {
              if (selectedProduct) {
                // Prepare agent data for image/video steps
                setDataLoading(true);
                await prepareAgentData();
                setStep('image_text');
              } else {
                // No product → prepare data & finalize directly
                await prepareAgentData();
                finalizePage();
              }
            }} disabled={dataLoading} className="w-full gap-2">
              {dataLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Carregando dados dos agentes...</> : selectedProduct ? <><ImagePlus className="h-4 w-4" /> Próximo: Criar Imagem</> : <><Zap className="h-4 w-4" /> Gerar Página (sem mídia)</>}
            </Button>
          </div>

        ) : step === 'image_text' ? (
          /* ── STEP 4: Choose Agent Text for Image ── */
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground"><strong>Passo 4:</strong> Escolha o texto base para gerar a imagem publicitária.</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('product')} className="text-xs gap-1">← Voltar</Button>
            </div>

            {selectedProd && (
              <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/30">
                {selectedProd.foto_url ? <img src={selectedProd.foto_url} alt={selectedProd.nome} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">📦</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{selectedProd.nome}</p>
                  <p className="text-[10px] text-muted-foreground">Produto selecionado</p>
                </div>
              </Card>
            )}

            {/* Model selector */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Modelo:</Label>
              <Select value={selectedImageModel} onValueChange={setSelectedImageModel}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableImageModels.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.paid ? '💲 ' : '✨ '}{m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {imageTexts.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 pr-2">
                <div className="space-y-2">
                  {imageTexts.map((item, idx) => (
                    <button key={idx} onClick={() => { setSelectedImageTextIdx(idx); setCustomImagePrompt(''); }} className={cn('w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left', selectedImageTextIdx === idx && !customImagePrompt ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                      <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">{item.agent}</p>
                        <p className="text-xs leading-relaxed">{item.text.slice(0, 200)}{item.text.length > 200 ? '...' : ''}</p>
                      </div>
                      {selectedImageTextIdx === idx && !customImagePrompt && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum texto de agente disponível. Use o campo abaixo.</p>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-muted-foreground">Ou escreva um prompt personalizado:</Label>
              <Textarea placeholder="Descreva a imagem que deseja gerar..." value={customImagePrompt} onChange={e => setCustomImagePrompt(e.target.value)} className="text-xs min-h-[60px]" />
            </div>

            {/* Image preview area */}
            {generatedImageUrl && (
              <div className="rounded-xl border overflow-hidden">
                <img src={generatedImageUrl} alt="Imagem gerada" className="w-full max-h-[200px] object-cover" />
                <div className="p-2 flex items-center justify-between bg-muted/30">
                  <p className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Imagem gerada</p>
                  <Button variant="ghost" size="sm" onClick={handleGenerateImage} disabled={imageLoading} className="text-[10px] h-6 gap-1">
                    {imageLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Regenerar
                  </Button>
                </div>
              </div>
            )}
            {imageError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-2">
                <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {imageError}</p>
              </div>
            )}

            {/* Gallery picker */}
            {showGalleryPicker === 'image' && (
              <div className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium">📁 Selecionar da Galeria</Label>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setShowGalleryPicker(null)}>Fechar</Button>
                </div>
                {galleryImages.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-auto">
                    {galleryImages.map((img, i) => (
                      <button key={i} onClick={() => { setGeneratedImageUrl(img.url); setShowGalleryPicker(null); }} className="rounded-lg border-2 border-transparent hover:border-primary overflow-hidden aspect-square">
                        <img src={img.url} alt={img.titulo} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma imagem na galeria ainda.</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleGenerateImage} disabled={imageLoading} variant={generatedImageUrl ? 'outline' : 'default'} className="flex-1 gap-2">
                {imageLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando imagem...</> : <><Wand2 className="h-4 w-4" /> {generatedImageUrl ? 'Regenerar Imagem' : 'Gerar Imagem'}</>}
              </Button>
              <Button variant="outline" onClick={() => setShowGalleryPicker(showGalleryPicker === 'image' ? null : 'image')} className="gap-1">
                <FolderOpen className="h-4 w-4" /> Galeria
              </Button>
              <Button onClick={() => setStep('video_script')} disabled={imageLoading} className="flex-1 gap-2">
                {generatedImageUrl ? 'Próximo: Vídeo →' : 'Pular → Vídeo'} 
              </Button>
            </div>
          </div>

        ) : step === 'video_script' ? (
          /* ── STEP 5: Choose Script for Video ── */
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground"><strong>Passo 5:</strong> Escolha o roteiro para gerar o vídeo.</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('image_text')} className="text-xs gap-1">← Voltar</Button>
            </div>

            {videoScripts.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0 pr-2">
                <div className="space-y-2">
                  {videoScripts.map((script, idx) => (
                    <button key={idx} onClick={() => { setSelectedVideoIdx(idx); setCustomVideoPrompt(''); }} className={cn('w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left', selectedVideoIdx === idx && !customVideoPrompt ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                      <span className="text-lg shrink-0 mt-0.5">{script.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{script.agent}</p>
                        <p className="text-[10px] text-muted-foreground">{script.label}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {script.storyboard.slice(0, 4).map((s: any, si: number) => (
                            <Badge key={si} variant="outline" className="text-[9px]">{s.cena || s.titulo || `Cena ${si + 1}`}</Badge>
                          ))}
                          {script.storyboard.length > 4 && <Badge variant="outline" className="text-[9px]">+{script.storyboard.length - 4}</Badge>}
                        </div>
                      </div>
                      {selectedVideoIdx === idx && !customVideoPrompt && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum roteiro de agente disponível. Use o campo abaixo ou pule.</p>
            )}

            {/* Model selector */}
            {availableVideoModels.length > 0 ? (
              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Modelo:</Label>
                <Select value={selectedVideoModel} onValueChange={setSelectedVideoModel}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVideoModels.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.paid ? '💲 ' : '✨ '}{m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-2">
                <p className="text-xs text-yellow-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Nenhum provedor de vídeo configurado. Configure uma API em Config APIs.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-muted-foreground">Ou escreva um prompt personalizado:</Label>
              <Textarea placeholder="Descreva o vídeo que deseja gerar..." value={customVideoPrompt} onChange={e => setCustomVideoPrompt(e.target.value)} className="text-xs min-h-[60px]" />
            </div>

            {/* Video preview area */}
            {generatedVideoUrl && (
              <div className="rounded-xl border overflow-hidden">
                <video src={generatedVideoUrl} controls className="w-full max-h-[200px]" />
                <div className="p-2 flex items-center justify-between bg-muted/30">
                  <p className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Vídeo gerado</p>
                  <Button variant="ghost" size="sm" onClick={handleGenerateVideo} disabled={videoLoading} className="text-[10px] h-6 gap-1">
                    {videoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Regenerar
                  </Button>
                </div>
              </div>
            )}
            {videoError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-2">
                <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {videoError}</p>
              </div>
            )}

            {/* Gallery picker for videos */}
            {showGalleryPicker === 'video' && (
              <div className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium">📁 Selecionar da Galeria</Label>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setShowGalleryPicker(null)}>Fechar</Button>
                </div>
                {galleryVideos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-auto">
                    {galleryVideos.map((vid, i) => (
                      <button key={i} onClick={() => { setGeneratedVideoUrl(vid.url); setShowGalleryPicker(null); }} className="rounded-lg border-2 border-transparent hover:border-primary overflow-hidden aspect-video bg-muted flex items-center justify-center">
                        <video src={vid.url} className="w-full h-full object-cover" muted preload="metadata" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum vídeo na galeria ainda.</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleGenerateVideo} disabled={videoLoading || availableVideoModels.length === 0} variant={generatedVideoUrl ? 'outline' : 'default'} className="flex-1 gap-2">
                {videoLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando vídeo...</> : <><Video className="h-4 w-4" /> {generatedVideoUrl ? 'Regenerar Vídeo' : 'Gerar Vídeo'}</>}
              </Button>
              <Button variant="outline" onClick={() => setShowGalleryPicker(showGalleryPicker === 'video' ? null : 'video')} className="gap-1">
                <FolderOpen className="h-4 w-4" /> Galeria
              </Button>
              <Button onClick={() => finalizePage()} disabled={videoLoading || generating} className="flex-1 gap-2">
                <Zap className="h-4 w-4" /> Finalizar Página
              </Button>
            </div>
          </div>

        ) : (
          /* ── GENERATING / DONE ── */
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              {progress.map((msg, i) => {
                const isError = msg.startsWith('❌');
                return (
                  <div key={i} className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 50}ms` }}>
                    {step === 'done' || i < progress.length - 1 ? (
                      isError ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    )}
                    <span className={cn(i === progress.length - 1 && step !== 'done' ? 'text-foreground font-medium' : 'text-muted-foreground', isError && 'text-destructive font-medium')}>{msg}</span>
                  </div>
                );
              })}
            </div>
            {step === 'done' && (
              <div className="text-center pt-4">
                <Badge variant="default" className="text-sm px-4 py-1.5 gap-1.5">
                  <Sparkles className="h-4 w-4" /> Página pronta para edição!
                </Badge>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
// AGENT_INFO reference for the auto-generator
const AGENT_INFO_MAP: Record<string, { name: string; icon: string }> = {
  vox: { name: 'Voz do Cliente', icon: '🎙️' },
  cipher: { name: 'Inteligência Competitiva', icon: '🔍' },
  positioning: { name: 'Posicionamento', icon: '🎯' },
  funnel: { name: 'Arquiteto de Funil', icon: '📊' },
  vsl: { name: 'Roteirista de Vídeo', icon: '🎬' },
  landing_page: { name: 'Landing Page', icon: '🏗️' },
  creative: { name: 'Criativos', icon: '🎨' },
  email: { name: 'Email Marketing', icon: '📧' },
  reel: { name: 'Roteirista de Reels', icon: '📱' },
  seo: { name: 'SEO & Conteúdo', icon: '🔎' },
  paid_media: { name: 'Mídia Paga', icon: '💰' },
  social_media: { name: 'Social Media', icon: '📲' },
  site_builder: { name: 'Site Builder', icon: '🌐' },
  video_producer: { name: 'Produtor de Vídeo', icon: '🎥' },
  influencer_content: { name: 'Influencer & Imagens', icon: '🤳' },
};

// ── Project Listing (Landing) ──────────────────────────────────────────────────
const GLOBAL_CONFIG_KEY = 'pagebuilder_global_config';

interface GlobalPageConfig {
  empresaNome: string;
  empresaEndereco: string;
  empresaTelefone: string;
  whatsappGlobal: string;
  siteGlobal: string;
}

const loadGlobalConfig = (): GlobalPageConfig => {
  try {
    const raw = localStorage.getItem(GLOBAL_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { empresaNome: '', empresaEndereco: '', empresaTelefone: '', whatsappGlobal: '', siteGlobal: '' };
};

const saveGlobalConfig = (cfg: GlobalPageConfig) => {
  localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify(cfg));
};

const PageBuilderLanding: React.FC<{
  onOpen: (page: SavedPage) => void;
  onCreateNew: () => void;
}> = ({ onOpen, onCreateNew }) => {
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAction, setDialogAction] = useState<{ type: 'rename' | 'duplicate' | 'delete' | 'publish' | 'unpublish'; page: SavedPage } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewPage, setPreviewPage] = useState<SavedPage | null>(null);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<GlobalPageConfig>(loadGlobalConfig);
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);

  const updateGlobalConfig = (updates: Partial<GlobalPageConfig>) => {
    setGlobalConfig(prev => {
      const next = { ...prev, ...updates };
      saveGlobalConfig(next);
      return next;
    });
  };

  const load = useCallback(async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { setLoading(false); return; }
    const { data } = await supabase.from('published_pages').select('*').eq('estabelecimento_id', estabId).order('updated_at', { ascending: false });
    setPages((data || []) as unknown as SavedPage[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDialog = (type: 'rename' | 'duplicate' | 'delete' | 'publish' | 'unpublish', page: SavedPage) => {
    setDialogAction({ type, page });
    if (type === 'rename') setRenameValue(page.nome);
  };

  const closeDialog = () => { setDialogAction(null); setProcessing(false); };

  const handleConfirm = async () => {
    if (!dialogAction) return;
    setProcessing(true);
    const { type, page } = dialogAction;

    try {
      switch (type) {
        case 'rename': {
          if (!renameValue.trim()) { setProcessing(false); return; }
          const slug = generateSlug(renameValue);
          const { error } = await supabase.from('published_pages').update({ nome: renameValue, slug }).eq('id', page.id);
          if (error) toast.error('Erro ao renomear');
          else toast.success('Página renomeada!');
          break;
        }
        case 'duplicate': {
          const estabId = localStorage.getItem('estabelecimentoId');
          if (!estabId) break;
          const newName = `${page.nome} (Cópia)`;
          const { error } = await supabase.from('published_pages').insert({
            nome: newName, slug: generateSlug(newName), sections: page.sections, config: page.config,
            estabelecimento_id: estabId, publicado: false,
          });
          if (error) toast.error('Erro ao duplicar');
          else toast.success('Página duplicada!');
          break;
        }
        case 'delete': {
          const { error } = await supabase.from('published_pages').delete().eq('id', page.id);
          if (error) toast.error('Erro ao excluir');
          else toast.success('Página excluída!');
          break;
        }
        case 'publish': {
          const { error } = await supabase.from('published_pages').update({ publicado: true }).eq('id', page.id);
          if (error) toast.error('Erro ao publicar');
          else toast.success('Página publicada! 🎉');
          break;
        }
        case 'unpublish': {
          const { error } = await supabase.from('published_pages').update({ publicado: false }).eq('id', page.id);
          if (error) toast.error('Erro ao despublicar');
          else toast.success('Página despublicada.');
          break;
        }
      }
    } catch { toast.error('Erro inesperado'); }

    closeDialog();
    load();
  };

  const getDialogContent = () => {
    if (!dialogAction) return { title: '', description: '', confirmLabel: '', variant: 'default' as const };
    const { type, page } = dialogAction;
    switch (type) {
      case 'rename': return { title: 'Renomear Página', description: `Altere o nome da página "${page.nome}".`, confirmLabel: 'Renomear', variant: 'default' as const };
      case 'duplicate': return { title: 'Duplicar Página', description: `Deseja criar uma cópia de "${page.nome}"? A cópia será salva como rascunho.`, confirmLabel: 'Duplicar', variant: 'default' as const };
      case 'delete': return { title: 'Excluir Página', description: `Tem certeza que deseja excluir "${page.nome}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', variant: 'destructive' as const };
      case 'publish': return { title: 'Publicar Página', description: `Deseja publicar "${page.nome}"? Ela ficará acessível publicamente em /p/${page.slug}.`, confirmLabel: 'Publicar', variant: 'default' as const };
      case 'unpublish': return { title: 'Despublicar Página', description: `Deseja despublicar "${page.nome}"? Ela deixará de estar acessível publicamente.`, confirmLabel: 'Despublicar', variant: 'destructive' as const };
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const dialogContent = getDialogContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Page Builder</h2>
          <p className="text-sm text-muted-foreground">Crie e gerencie suas páginas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutoGenerate(true)} className="gap-2">
            <Zap className="h-4 w-4" /> Gerar Automática
          </Button>
          <Button onClick={onCreateNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Página</Button>
        </div>
      </div>

      {/* Global Config */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowGlobalConfig(!showGlobalConfig)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Configurações Globais</span>
            <span className="text-[10px] text-muted-foreground">(Empresa, WhatsApp, Site — usados em todas as páginas)</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showGlobalConfig && "rotate-180")} />
        </button>
        {showGlobalConfig && (
          <div className="px-4 pb-4 pt-1 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">🏷️ Nome da Empresa</Label>
                <Input value={globalConfig.empresaNome} onChange={e => updateGlobalConfig({ empresaNome: e.target.value })} placeholder="Minha Empresa Ltda." className="text-xs h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">📍 Endereço</Label>
                <Input value={globalConfig.empresaEndereco} onChange={e => updateGlobalConfig({ empresaEndereco: e.target.value })} placeholder="Rua Exemplo, 123 - Cidade/UF" className="text-xs h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">📞 Telefone</Label>
                <Input value={globalConfig.empresaTelefone} onChange={e => updateGlobalConfig({ empresaTelefone: e.target.value })} placeholder="(11) 3000-0000" className="text-xs h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">💬 WhatsApp</Label>
                <Input value={globalConfig.whatsappGlobal} onChange={e => updateGlobalConfig({ whatsappGlobal: e.target.value })} placeholder="5511999999999" className="text-xs h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">🌐 Site / URL</Label>
                <Input value={globalConfig.siteGlobal} onChange={e => updateGlobalConfig({ siteGlobal: e.target.value })} placeholder="https://seusite.com.br" className="text-xs h-8 mt-0.5" />
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">Estes dados serão aplicados automaticamente no rodapé e nos botões/links ao gerar páginas automáticas.</p>
          </div>
        )}
      </Card>

      {pages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Nenhuma página criada</h3>
          <p className="text-sm text-muted-foreground mb-4">Comece criando sua primeira página</p>
          <Button onClick={onCreateNew} className="gap-2"><Plus className="h-4 w-4" /> Criar Página</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <button onClick={onCreateNew}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-all min-h-[200px]">
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Nova Página</span>
          </button>

          {pages.map(page => (
            <Card key={page.id} className="overflow-hidden group hover:shadow-md transition-shadow relative">
              {/* Context menu */}
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover w-48">
                    <DropdownMenuItem onClick={() => onOpen(page)} className="gap-2 cursor-pointer">
                      <FolderOpen className="h-4 w-4" /> Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDialog('rename', page)} className="gap-2 cursor-pointer">
                      <Pencil className="h-4 w-4" /> Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDialog('duplicate', page)} className="gap-2 cursor-pointer">
                      <Copy className="h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {page.publicado ? (
                      <DropdownMenuItem onClick={() => openDialog('unpublish', page)} className="gap-2 cursor-pointer">
                        <ExternalLink className="h-4 w-4" /> Despublicar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => openDialog('publish', page)} className="gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" /> Publicar
                      </DropdownMenuItem>
                    )}
                    {page.publicado && (
                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${page.slug}`); toast.success('URL copiada!'); }} className="gap-2 cursor-pointer">
                        <Link className="h-4 w-4" /> Copiar URL
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDialog('delete', page)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button onClick={() => onOpen(page)}
                className="w-full h-32 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Globe className="h-10 w-10 text-primary/30" />
              </button>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm truncate flex-1">{page.nome}</h4>
                  {page.publicado && <Badge variant="default" className="text-[9px] h-4 ml-1">Publicada</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">/p/{page.slug}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(page.updated_at).toLocaleString('pt-BR')}</p>
                <div className="flex gap-1 mt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onOpen(page)}>
                    Abrir Editor
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewPage(page)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={page.publicado ? 'secondary' : 'default'}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => openDialog(page.publicado ? 'unpublish' : 'publish', page)}
                  >
                    <Upload className="h-3 w-3" />
                    {page.publicado ? 'Despublicar' : 'Publicar'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Unified action confirmation dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => closeDialog()}>
        <DialogContent className="bg-background sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialogContent.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{dialogContent.description}</p>
          {dialogAction?.type === 'rename' && (
            <div className="space-y-2">
              <Label className="text-xs">Novo nome</Label>
              <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }} />
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={closeDialog} disabled={processing}>Cancelar</Button>
            <Button variant={dialogContent.variant} onClick={handleConfirm} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {dialogContent.confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview — {previewPage?.nome}
              {previewPage?.publicado && (
                <Button variant="outline" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => window.open(`${window.location.origin}/p/${previewPage.slug}`, '_blank')}>
                  <ExternalLink className="h-3 w-3" /> Abrir URL
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewPage && (
            <div className="flex-1 overflow-hidden rounded border" style={{ height: 'calc(90vh - 80px)' }}>
              <PreviewIframe sections={(previewPage.sections as any[]) || []} config={previewPage.config as any} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto Generate Dialog */}
      <AutoGeneratePage
        open={showAutoGenerate}
        onOpenChange={setShowAutoGenerate}
        globalConfig={globalConfig}
        onGenerated={(page) => {
          onOpen(page);
        }}
      />
    </div>
  );
};

// ── Editor Component ───────────────────────────────────────────────────────────
const PageBuilderEditor: React.FC<{
  initialPage?: SavedPage | null;
  onBack: () => void;
}> = ({ initialPage, onBack }) => {
  const [sections, setSections] = useState<PageSection[]>((initialPage?.sections as any[]) || []);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const savedGlobal = loadGlobalConfig();
  const [config, setConfig] = useState<PageConfig>(() => {
    const base: PageConfig = {
      title: 'Meu Site', description: '', favicon: '', primaryColor: '#1e40af', secondaryColor: '#3b82f6',
      accentColor: '#f59e0b', backgroundColor: '#ffffff', textColor: '#1f2937',
      fontDisplay: 'Inter', fontBody: 'Inter', maxWidth: '1200px',
      empresaNome: savedGlobal.empresaNome, empresaEndereco: savedGlobal.empresaEndereco,
      empresaTelefone: savedGlobal.empresaTelefone, whatsappGlobal: savedGlobal.whatsappGlobal,
      siteGlobal: savedGlobal.siteGlobal,
      ...(initialPage?.config as any || {}),
    };
    return base;
  });
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rightPanel, setRightPanel] = useState<'editor' | 'agent' | 'config'>('editor');
  const [leftTab, setLeftTab] = useState<'sections' | 'assets'>('sections');
  const [showAddSection, setShowAddSection] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(!initialPage && sections.length === 0);
  const isAutoGenerated = !!(initialPage?.config as any)?._autoGenerated;
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const [currentPageId, setCurrentPageId] = useState<string | null>(initialPage?.id || null);
  const [pageName, setPageName] = useState(initialPage?.nome || 'Meu Site');
  const [pageSlug, setPageSlug] = useState(initialPage?.slug || 'meu-site');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(initialPage?.publicado || false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [themeCategoryFilter, setThemeCategoryFilter] = useState(TEMPLATE_CATEGORIES[0]?.id || 'startup');
  const [fullTemplateCategoryFilter, setFullTemplateCategoryFilter] = useState(FULL_TEMPLATE_CATEGORIES[0]?.id || 'landing');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;

  // Track changes
  useEffect(() => { setHasChanges(true); }, [sections, config]);

  const handleBack = () => {
    if (hasChanges && sections.length > 0) {
      setShowUnsavedDialog(true);
      return;
    }
    onBack();
  };

  const handleSaveAndBack = async () => {
    await savePage();
    setShowUnsavedDialog(false);
    onBack();
  };

  const handleDiscardAndBack = () => {
    setShowUnsavedDialog(false);
    onBack();
  };

  const addSection = (type: PageSection['type'], content?: Record<string, any>) => {
    const id = `${type}-${Date.now()}`;
    const tpl = SECTION_TEMPLATES.find(t => t.type === type);
    setSections(prev => [...prev, { id, type, title: tpl?.label || type, visible: true, content: content || { ...defaultContent[type] }, styles: {} }]);
    setSelectedSectionId(id);
    setShowAddSection(false);
    setRightPanel('editor');
    toast.success(`Seção "${tpl?.label}" adicionada`);
  };

  const updateSection = (updated: PageSection) => setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const deleteSection = (id: string) => { setSectionToDelete(id); };
  const confirmDeleteSection = () => {
    if (!sectionToDelete) return;
    setSections(prev => prev.filter(s => s.id !== sectionToDelete));
    if (selectedSectionId === sectionToDelete) setSelectedSectionId(sections[0]?.id || null);
    setSectionToDelete(null);
    toast.success('Seção removida!');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections(prev => { const oi = prev.findIndex(s => s.id === active.id); const ni = prev.findIndex(s => s.id === over.id); return arrayMove(prev, oi, ni); });
    }
  };

  const handlePreviewDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const asset: MediaAsset = JSON.parse(data);
      const isVideo = asset.tipo === 'video';
      if (isVideo) addSection('video', { url: asset.public_url, poster: '', autoplay: false });
      else addSection('image', { url: asset.public_url, alt: asset.nome, caption: '', fit: 'cover' });
    } catch { /* ignore */ }
  }, []);

  const handleAssetClick = (asset: MediaAsset) => {
    const isVideo = asset.tipo === 'video';
    if (isVideo) addSection('video', { url: asset.public_url, poster: '', autoplay: false });
    else addSection('image', { url: asset.public_url, alt: asset.nome, caption: '', fit: 'cover' });
  };

  const applyTemplate = (template: PageTemplate) => {
    const timestamped = template.sections.map(s => ({ ...s, id: `${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }));
    setSections(timestamped);
    setConfig(c => ({ ...c, ...template.config }));
    if (!currentPageId) { setPageName(template.name); setPageSlug(generateSlug(template.name)); }
    setSelectedSectionId(timestamped[0]?.id || null);
    setRightPanel('editor');
    setShowTemplateDialog(false);
    setTimeout(() => previewRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const applyFullTemplate = (ft: FullTemplate) => {
    const timestamped = ft.sections.map(s => ({ ...s, id: `${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })) as PageSection[];
    setSections(timestamped);
    setConfig(c => ({ ...c, ...ft.config }));
    if (!currentPageId) { setPageName(ft.name); setPageSlug(generateSlug(ft.name)); }
    setSelectedSectionId(timestamped[0]?.id || null);
    setRightPanel('editor');
    setShowTemplateDialog(false);
    setTimeout(() => previewRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    toast.success(`Template "${ft.name}" aplicado com tema completo!`);
  };

  const savePage = async () => {
    const estabId = localStorage.getItem('estabelecimentoId');
    if (!estabId) { toast.error('Estabelecimento não encontrado'); return; }
    setSaving(true);
    const payload = { nome: pageName, slug: pageSlug, sections: sections as any, config: config as any, estabelecimento_id: estabId };
    let result;
    if (currentPageId) result = await supabase.from('published_pages').update(payload).eq('id', currentPageId).select().single();
    else result = await supabase.from('published_pages').insert(payload).select().single();
    if (result.error) { toast.error(result.error.message.includes('unique') ? 'Slug já em uso.' : 'Erro: ' + result.error.message); }
    else { setCurrentPageId(result.data.id); setIsPublished((result.data as any).publicado); setHasChanges(false); toast.success('Salvo!'); }
    setSaving(false); setShowSaveDialog(false);
  };

  const togglePublish = async () => {
    if (!currentPageId) { setShowSaveDialog(true); toast.info('Salve a página primeiro.'); return; }
    setPublishing(true);
    const ns = !isPublished;
    const { error } = await supabase.from('published_pages').update({ publicado: ns }).eq('id', currentPageId);
    if (error) toast.error('Erro: ' + error.message);
    else { setIsPublished(ns); toast.success(ns ? 'Publicada! 🎉' : 'Despublicada.'); }
    setPublishing(false);
  };

  const handleImportFromAgent = (imported: PageSection[], configHints?: Partial<PageConfig>) => {
    setSections(prev => [...prev, ...imported]);
    if (configHints) setConfig(c => ({ ...c, ...configHints }));
  };

  const generateHTML = useCallback(() => {
    return generateFullHTML(sections, config);
  }, [sections, config]);

  const previewWidth = viewMode === 'mobile' ? 375 : viewMode === 'tablet' ? 768 : '100%';
  const publicUrl = currentPageId && isPublished ? `${window.location.origin}/p/${pageSlug}` : null;

  return (
    <div className={`flex gap-0 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-200px)] -mx-3 sm:-mx-6 -mb-3 sm:-mb-6'}`}>
      {/* Left Panel */}
      <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-2 border-b">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-start mb-1" onClick={handleBack}>
            <ChevronUp className="h-3 w-3 rotate-[-90deg]" /> Voltar aos Projetos
          </Button>
          <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="sections" className="flex-1 text-xs h-7 gap-1"><Layout className="h-3 w-3" /> Seções</TabsTrigger>
              <TabsTrigger value="assets" className="flex-1 text-xs h-7 gap-1"><ImagePlus className="h-3 w-3" /> Mídias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {leftTab === 'sections' && (
          <>
            <div className="p-2 border-b space-y-1.5">
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => setShowAddSection(true)}><Plus className="h-3 w-3" /> Seção</Button>
                {!isAutoGenerated && (
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs gap-1" onClick={() => setShowTemplateDialog(true)}><LayoutTemplate className="h-3 w-3" /> Template</Button>
                )}
              </div>
              <Button variant="outline" size="sm" className="h-7 w-full text-xs gap-1" onClick={() => setShowSaveDialog(true)}><Save className="h-3 w-3" /> Salvar</Button>
            </div>
            <ScrollArea className="flex-1 p-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setDragActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map(s => (
                    <SortableSectionItem key={s.id} section={s} isSelected={s.id === selectedSectionId}
                      onSelect={() => { setSelectedSectionId(s.id); setRightPanel('editor'); }}
                      onDelete={() => deleteSection(s.id)}
                      onToggleVisible={() => updateSection({ ...s, visible: !s.visible })} />
                  ))}
                </SortableContext>
              </DndContext>
              {sections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Escolha um template ou adicione seções</p>
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {leftTab === 'assets' && (
          <ScrollArea className="flex-1 p-2">
            <AssetsPanel onDropAsset={handleAssetClick} />
          </ScrollArea>
        )}
      </div>

      {/* Center - Preview */}
      <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
        <div className="border-b px-4 py-2 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('desktop')}><Monitor className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('tablet')}><Tablet className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('mobile')}><Smartphone className="h-4 w-4" /></Button>
            {publicUrl && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                <Badge variant="secondary" className="text-[10px] gap-1"><Link className="h-3 w-3" /><span className="max-w-[200px] truncate">/p/{pageSlug}</span></Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('URL copiada!'); }}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowPreviewDialog(true)}><Eye className="h-3 w-3" /> Preview</Button>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => setShowCodeDialog(true)}><Code className="h-3 w-3" /> HTML</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Sair do Fullscreen' : 'Tela Cheia'}>{isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}</Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div ref={previewRef} className="flex justify-center py-4 px-4" style={{ minHeight: '100%' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={handlePreviewDrop}
          >
            <div className="bg-background border rounded-lg shadow-sm overflow-hidden transition-all" style={{ width: previewWidth, maxWidth: '100%' }}>
              {sections.filter(s => s.visible).length === 0 ? (
                <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg mx-4 my-4">
                  <ImagePlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">Arraste mídias aqui</p>
                  <p className="text-xs">ou escolha um template para começar</p>
                </div>
              ) : (
                sections.map(s => (
                  <div key={s.id} onClick={() => { setSelectedSectionId(s.id); setRightPanel('editor'); }}
                    className={cn("relative cursor-pointer transition-all", selectedSectionId === s.id && "ring-2 ring-primary ring-inset", !s.visible && "hidden")}>
                    <SectionPreview section={s} config={config} />
                    <div className={cn("absolute top-1 left-1 z-10", selectedSectionId === s.id ? "opacity-100" : "opacity-0 hover:opacity-100")}>
                      <Badge variant="secondary" className="text-[10px] shadow">{s.title}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l bg-card flex flex-col shrink-0">
        <div className="border-b p-2 flex items-center gap-1">
          <Button variant={rightPanel === 'editor' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('editor')}><Settings className="h-3 w-3 mr-1" /> Editor</Button>
          <Button variant={rightPanel === 'config' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('config')}><Palette className="h-3 w-3 mr-1" /> Estilo</Button>
          <Button variant={rightPanel === 'agent' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs flex-1" onClick={() => setRightPanel('agent')}><Bot className="h-3 w-3 mr-1" /> Agente</Button>
        </div>
        <ScrollArea className="flex-1 p-3">
          {rightPanel === 'editor' && (selectedSection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{selectedSection.title}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteSection(selectedSection.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <SectionEditor section={selectedSection} onChange={updateSection} />
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-6">Selecione uma seção para editar</p>)}
          {rightPanel === 'config' && (
            <div className="space-y-4">
              <div><Label className="text-xs">Título do Site</Label><Input value={config.title} onChange={e => setConfig(c => ({ ...c, title: e.target.value }))} /></div>
              <div><Label className="text-xs">Descrição (SEO)</Label><Textarea value={config.description} onChange={e => setConfig(c => ({ ...c, description: e.target.value }))} rows={2} /></div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">🎨 Paletas Prontas</p>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_PALETTES.map(pal => (
                  <button
                    key={pal.name}
                    title={pal.name}
                    onClick={() => setConfig(c => ({ ...c, primaryColor: pal.primary, secondaryColor: pal.secondary, accentColor: pal.accent, backgroundColor: pal.bg, textColor: pal.text }))}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-lg border hover:border-primary transition-all group"
                  >
                    <div className="flex gap-0.5">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: pal.primary }} />
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: pal.accent }} />
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: pal.bg }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground group-hover:text-foreground truncate w-full text-center">{pal.name}</span>
                  </button>
                ))}
              </div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">Cores Individuais</p>
              <div className="grid grid-cols-2 gap-2">
                {([['primaryColor', 'Primária'], ['secondaryColor', 'Secundária'], ['accentColor', 'Destaque'], ['backgroundColor', 'Fundo'], ['textColor', 'Texto']] as const).map(([key, label]) => (
                  <div key={key}><Label className="text-[10px]">{label}</Label><div className="flex gap-1"><input type="color" value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" /><Input value={(config as any)[key]} onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))} className="text-xs h-8" /></div></div>
                ))}
              </div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">Estilos de Tipografia</p>
              <p className="text-[10px] text-muted-foreground">Clique para aplicar um estilo pronto (mesmo do Editor de Design)</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                {([
                  { id: 'titulo-grande', name: 'Título Grande', display: 'Montserrat', body: 'Inter', preview: 'Aa', previewSub: 'Moderno e impactante' },
                  { id: 'elegante', name: 'Elegante', display: 'Playfair Display', body: 'Raleway', preview: 'Aa', previewSub: 'Sofisticado e refinado' },
                  { id: 'moderno-minimal', name: 'Minimalista', display: 'Poppins', body: 'Inter', preview: 'Aa', previewSub: 'Simples e direto' },
                  { id: 'corporativo', name: 'Corporativo', display: 'Roboto', body: 'Open Sans', preview: 'Aa', previewSub: 'Profissional e limpo' },
                  { id: 'luxo', name: 'Luxo Dourado', display: 'Cinzel', body: 'Cormorant Garamond', preview: 'Aa', previewSub: 'Premium e distinto' },
                  { id: 'tech', name: 'Tech Futurista', display: 'Orbitron', body: 'Rajdhani', preview: 'Aa', previewSub: 'Inovação digital' },
                  { id: 'retro', name: 'Retro Negrito', display: 'Bebas Neue', body: 'Oswald', preview: 'Aa', previewSub: 'Vibrante e ousado' },
                  { id: 'serifado', name: 'Serifado Clássico', display: 'Merriweather', body: 'Lora', preview: 'Aa', previewSub: 'Atemporal' },
                  { id: 'editorial', name: 'Editorial', display: 'DM Serif Display', body: 'IBM Plex Sans', preview: 'Aa', previewSub: 'Estilo jornalístico' },
                  { id: 'fashion', name: 'Fashion Chic', display: 'Oswald', body: 'Raleway', preview: 'Aa', previewSub: 'Alta costura' },
                  { id: 'esportivo', name: 'Esportivo', display: 'Alfa Slab One', body: 'Barlow', preview: 'Aa', previewSub: 'Energia e ação' },
                  { id: 'art-deco', name: 'Art Déco', display: 'Poiret One', body: 'Raleway', preview: 'Aa', previewSub: 'Glamour geométrico' },
                  { id: 'food', name: 'Food Gourmet', display: 'Lobster Two', body: 'Lato', preview: 'Aa', previewSub: 'Gastronômico' },
                  { id: 'natureza', name: 'Natural', display: 'Amatic SC', body: 'Nunito', preview: 'Aa', previewSub: 'Orgânico e suave' },
                  { id: 'geometrico', name: 'Geométrico', display: 'Exo 2', body: 'Barlow', preview: 'Aa', previewSub: 'Formas precisas' },
                  { id: 'negocios', name: 'Negócios', display: 'Roboto Slab', body: 'Source Sans Pro', preview: 'Aa', previewSub: 'Formal e confiável' },
                  { id: 'neon', name: 'Neon Vibrante', display: 'Righteous', body: 'Nunito', preview: 'Aa', previewSub: 'Energia pura' },
                  { id: 'vintage', name: 'Vintage', display: 'Abril Fatface', body: 'Libre Baskerville', preview: 'Aa', previewSub: 'Charme retrô' },
                  { id: 'zen', name: 'Zen Minimalista', display: 'Work Sans', body: 'Noto Sans', preview: 'Aa', previewSub: 'Paz e equilíbrio' },
                  { id: 'swiss', name: 'Suíço', display: 'Space Grotesk', body: 'DM Sans', preview: 'Aa', previewSub: 'Funcional e preciso' },
                ] as { id: string; name: string; display: string; body: string; preview: string; previewSub: string }[]).map(style => (
                  <button key={style.id} onClick={() => setConfig(c => ({ ...c, fontDisplay: style.display, fontBody: style.body }))}
                    className={cn("flex flex-col items-start p-2 rounded-lg border text-left transition-all hover:shadow-sm", config.fontDisplay === style.display && config.fontBody === style.body ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30")}>
                    <span className="text-lg font-bold leading-none" style={{ fontFamily: style.display }}>{style.preview}</span>
                    <span className="text-[10px] font-semibold mt-0.5 truncate w-full">{style.name}</span>
                    <span className="text-[8px] text-muted-foreground truncate w-full" style={{ fontFamily: style.body }}>{style.previewSub}</span>
                  </button>
                ))}
              </div>
              <Separator className="my-1" />
              <p className="text-[10px] font-medium text-muted-foreground">Ou escolha manualmente:</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Display (Títulos)</Label>
                  <select value={config.fontDisplay} onChange={e => setConfig(c => ({ ...c, fontDisplay: e.target.value }))} className="w-full h-8 rounded-md border bg-background px-2 text-xs" style={{ fontFamily: config.fontDisplay }}>
                    {['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Oswald', 'Playfair Display', 'Merriweather', 'Nunito', 'Rubik', 'Work Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Bricolage Grotesque', 'Plus Jakarta Sans', 'Georgia', 'Bebas Neue', 'Archivo', 'Barlow', 'Manrope', 'Lexend', 'Cinzel', 'Orbitron', 'Alfa Slab One', 'Poiret One', 'Lobster Two', 'Amatic SC', 'Exo 2', 'Roboto Slab', 'Righteous', 'Abril Fatface', 'DM Serif Display', 'Rajdhani', 'Cormorant Garamond'].map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                  </select>
                </div>
                <div><Label className="text-[10px]">Body (Textos)</Label>
                  <select value={config.fontBody} onChange={e => setConfig(c => ({ ...c, fontBody: e.target.value }))} className="w-full h-8 rounded-md border bg-background px-2 text-xs" style={{ fontFamily: config.fontBody }}>
                    {['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Nunito', 'Rubik', 'Work Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Plus Jakarta Sans', 'Georgia', 'Barlow', 'Manrope', 'Lexend', 'Merriweather', 'Source Sans Pro', 'Noto Sans', 'IBM Plex Sans', 'Figtree', 'Cormorant Garamond', 'Rajdhani', 'Oswald', 'Lora', 'Libre Baskerville'].map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-[10px]">Largura Máxima</Label><Input value={config.maxWidth} onChange={e => setConfig(c => ({ ...c, maxWidth: e.target.value }))} className="text-xs" /></div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">🏢 Dados da Empresa</p>
              <p className="text-[10px] text-muted-foreground">Exibidos automaticamente no rodapé de todas as páginas.</p>
              <div><Label className="text-[10px]">🏷️ Nome da Empresa</Label><Input value={config.empresaNome || ''} onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, empresaNome: v })); saveGlobalConfig({ ...loadGlobalConfig(), empresaNome: v }); }} placeholder="Minha Empresa Ltda." className="text-xs" /></div>
              <div><Label className="text-[10px]">📍 Endereço</Label><Input value={config.empresaEndereco || ''} onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, empresaEndereco: v })); saveGlobalConfig({ ...loadGlobalConfig(), empresaEndereco: v }); }} placeholder="Rua Exemplo, 123 - Cidade/UF" className="text-xs" /></div>
              <div><Label className="text-[10px]">📞 Telefone</Label><Input value={config.empresaTelefone || ''} onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, empresaTelefone: v })); saveGlobalConfig({ ...loadGlobalConfig(), empresaTelefone: v }); }} placeholder="(11) 3000-0000" className="text-xs" /></div>
              <Separator /><p className="text-xs font-semibold text-muted-foreground uppercase">📱 Links Globais</p>
              <p className="text-[10px] text-muted-foreground">Usados como padrão em todos os botões e links.</p>
              <div><Label className="text-[10px]">💬 WhatsApp Global</Label><Input value={config.whatsappGlobal || ''} onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, whatsappGlobal: v })); saveGlobalConfig({ ...loadGlobalConfig(), whatsappGlobal: v }); }} placeholder="5511999999999 (com DDI)" className="text-xs" /><p className="text-[9px] text-muted-foreground mt-0.5">Formato: 55 + DDD + número</p></div>
              <div><Label className="text-[10px]">🌐 Site / URL Padrão</Label><Input value={config.siteGlobal || ''} onChange={e => { const v = e.target.value; setConfig(c => ({ ...c, siteGlobal: v })); saveGlobalConfig({ ...loadGlobalConfig(), siteGlobal: v }); }} placeholder="https://seusite.com.br" className="text-xs" /></div>
            </div>
          )}
          {rightPanel === 'agent' && <AgentTextBank />}
        </ScrollArea>
      </div>

      {/* Template & Theme Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-background sm:max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5" /> Templates & Temas</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-0 mt-3 gap-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
                {FULL_TEMPLATE_CATEGORIES.map(cat => (
                  <button key={cat.id}
                    onClick={() => setFullTemplateCategoryFilter(cat.id)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                      fullTemplateCategoryFilter === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:bg-muted"
                    )}>
                    <span>{cat.icon}</span> {cat.name}
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{cat.templates.length}</Badge>
                  </button>
                ))}
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-2 pb-2">
                  {(FULL_TEMPLATE_CATEGORIES.find(c => c.id === fullTemplateCategoryFilter)?.templates || ALL_FULL_TEMPLATES.slice(0, 9)).map(ft => (
                    <button key={ft.id}
                      onClick={() => applyFullTemplate(ft)}
                      onMouseEnter={() => setHoveredTemplate(ft.id)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                      className="flex flex-col gap-1.5 rounded-xl border-2 border-transparent hover:border-primary transition-all text-left group overflow-hidden">
                      <div className="w-full aspect-[3/4] overflow-hidden rounded-t-lg relative">
                        <TemplateMiniPreview
                          config={ft.config}
                          sectionTypes={ft.sections.map(s => s.type)}
                          className="w-full h-full"
                        />
                        {hoveredTemplate === ft.id && (
                          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-semibold shadow-lg">
                              Aplicar Template
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-2 pb-2">
                        <p className="text-xs font-semibold truncate">{ft.name}</p>
                        <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{ft.description}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          {[ft.config.primaryColor, ft.config.accentColor].filter(Boolean).map((c, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: c }} />
                          ))}
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-auto">{ft.sections.length} seções</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Seção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {SECTION_TEMPLATES.map(tpl => (
              <button key={tpl.type} onClick={() => addSection(tpl.type)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary transition-all text-center">
                {tpl.icon}<span className="text-xs font-medium">{tpl.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader><DialogTitle>Salvar Página</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={pageName} onChange={e => { setPageName(e.target.value); if (!currentPageId) setPageSlug(generateSlug(e.target.value)); }} /></div>
            <div><Label>Slug (URL)</Label><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">/p/</span><Input value={pageSlug} onChange={e => setPageSlug(generateSlug(e.target.value))} className="flex-1" /></div><p className="text-[10px] text-muted-foreground mt-1">{window.location.origin}/p/{pageSlug}</p></div>
            <Button onClick={savePage} disabled={saving || !pageName.trim()} className="w-full">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}{currentPageId ? 'Atualizar' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-background max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0">
            <PreviewIframe sections={sections} config={config} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="bg-background sm:max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center justify-between">HTML<Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generateHTML()); toast.success('Copiado!'); }}><Copy className="h-3 w-3 mr-1" /> Copiar</Button></DialogTitle></DialogHeader>
          <ScrollArea className="h-[500px]"><pre className="text-xs bg-muted p-4 rounded font-mono whitespace-pre-wrap">{generateHTML()}</pre></ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Alterações não salvas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você tem alterações que ainda não foram salvas. O que deseja fazer?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleSaveAndBack} className="w-full gap-2">
                <Save className="h-4 w-4" /> Salvar e sair
              </Button>
              <Button variant="destructive" onClick={handleDiscardAndBack} className="w-full gap-2">
                <Trash2 className="h-4 w-4" /> Descartar alterações
              </Button>
              <Button variant="outline" onClick={() => setShowUnsavedDialog(false)} className="w-full">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation */}
      <Dialog open={!!sectionToDelete} onOpenChange={(open) => { if (!open) setSectionToDelete(null); }}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Remover Seção
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover esta seção? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setSectionToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteSection} className="gap-2">
              <Trash2 className="h-4 w-4" /> Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Main Component (Router) ────────────────────────────────────────────────────
const PageBuilder: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingPage, setEditingPage] = useState<SavedPage | null>(null);

  const handleOpen = (page: SavedPage) => {
    setEditingPage(page);
    setView('editor');
  };

  const handleCreateNew = () => {
    setEditingPage(null);
    setView('editor');
  };

  const handleBack = () => {
    setEditingPage(null);
    setView('list');
  };

  if (view === 'editor') {
    return <PageBuilderEditor key={editingPage?.id || 'new'} initialPage={editingPage} onBack={handleBack} />;
  }

  return <PageBuilderLanding onOpen={handleOpen} onCreateNew={handleCreateNew} />;
};

export default PageBuilder;
