// Full modern templates — premium designs with animations, glassmorphism, gradients & advanced responsiveness

export interface FullTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  config: {
    primaryColor: string;
    secondaryColor?: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontDisplay: string;
    fontBody: string;
    maxWidth?: string;
    heroStyle?: string;
    cardStyle?: string;
    borderRadius?: string;
  };
  sections: {
    id: string;
    type: string;
    title: string;
    visible: boolean;
    styles: Record<string, string>;
    content: Record<string, any>;
  }[];
}

export interface FullTemplateCategory {
  id: string;
  name: string;
  icon: string;
  templates: FullTemplate[];
}

const yr = new Date().getFullYear();

export const FULL_TEMPLATE_CATEGORIES: FullTemplateCategory[] = [
  {
    id: 'landing', name: 'Landing Pages', icon: '🚀',
    templates: [
      {
        id: 'ft-modern-dark', name: 'Startup Moderna', category: 'landing',
        description: 'Landing page escura com glassmorphism, gradientes animados e scroll-reveal',
        tags: ['dark', 'modern', 'saas', 'gradient', 'glassmorphism'],
        config: { primaryColor: '#0f172a', secondaryColor: '#1e293b', accentColor: '#818cf8', backgroundColor: '#020617', textColor: '#e2e8f0', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '20px', maxWidth: '1200px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'A plataforma que sua equipe merece', subheadline: 'Automatize processos, integre ferramentas e escale resultados — tudo em um só lugar. Mais de 2.000 empresas já confiam em nós.', cta_text: 'Comece grátis →', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Métricas', visible: true, styles: {}, content: { items: [{ number: '2.000+', label: 'Empresas ativas' }, { number: '99.9%', label: 'Uptime garantido' }, { number: '3x', label: 'Mais produtividade' }, { number: '< 5min', label: 'Para configurar' }] } },
          { id: 's3', type: 'features', title: 'Recursos', visible: true, styles: {}, content: { items: [{ icon: '⚡', title: 'Velocidade', description: 'Respostas em tempo real com latência inferior a 100ms.' }, { icon: '🔒', title: 'Segurança', description: 'Criptografia end-to-end, SOC2 e LGPD compliance.' }, { icon: '🤖', title: 'IA Integrada', description: 'Automações inteligentes que aprendem com seus dados.' }, { icon: '📊', title: 'Analytics', description: 'Dashboards customizáveis com insights acionáveis.' }, { icon: '🔗', title: 'Integrações', description: 'Conecte com 200+ ferramentas que você já usa.' }, { icon: '💬', title: 'Suporte 24/7', description: 'Especialistas disponíveis por chat e vídeo.' }] } },
          { id: 's4', type: 'process_steps', title: 'Como Funciona', visible: true, styles: {}, content: { title: 'Comece em 3 Passos', items: [{ step: '01', title: 'Crie sua conta', description: 'Cadastro gratuito em 30 segundos, sem cartão.' }, { step: '02', title: 'Configure', description: 'Conecte suas ferramentas e personalize.' }, { step: '03', title: 'Escale', description: 'Automatize e veja resultados imediatos.' }] } },
          { id: 's5', type: 'testimonials', title: 'Depoimentos', visible: true, styles: {}, content: { items: [{ name: 'Renato Dias', role: 'CTO, Fintech', text: 'Reduzimos 80% do trabalho manual da equipe em apenas 2 semanas de implementação.', metrics: '-80% trabalho manual' }, { name: 'Camila Lopes', role: 'Head de Operações', text: 'ROI de 400% no primeiro trimestre. Superou todas as expectativas do board.', metrics: '+400% ROI' }] } },
          { id: 's6', type: 'pricing', title: 'Planos', visible: true, styles: {}, content: { title: 'Preços Simples e Transparentes', items: [{ name: 'Starter', price: 'R$ 97/mês', features: ['1.000 automações', '5 integrações', 'Suporte por email'], highlighted: false }, { name: 'Growth', price: 'R$ 297/mês', features: ['10.000 automações', 'Todas integrações', 'IA inclusa', 'Suporte prioritário'], highlighted: true }, { name: 'Enterprise', price: 'Sob consulta', features: ['Volume ilimitado', 'SLA dedicado', 'Onboarding guiado', 'API custom'], highlighted: false }] } },
          { id: 's7', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Preciso de conhecimento técnico?', answer: 'Não. A interface visual permite configurar tudo sem escrever código.' }, { question: 'Posso cancelar a qualquer momento?', answer: 'Sim, sem multas ou contratos de fidelidade.' }, { question: 'Quanto tempo leva a integração?', answer: 'A maioria das integrações leva menos de 5 minutos.' }] } },
          { id: 's8', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Pronto para transformar seu negócio?', description: '14 dias grátis. Sem cartão de crédito. Cancele quando quiser.', button_text: 'Criar Conta Gratuita', button_url: '#' } },
          { id: 's9', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'SeuProduto', copyright: `© ${yr} SeuProduto. Todos os direitos reservados.` } },
        ]
      },
      {
        id: 'ft-clean-light', name: 'Clean & Minimal', category: 'landing',
        description: 'Landing page clara, limpa e sofisticada — tipografia refinada e espaçamento generoso',
        tags: ['light', 'minimal', 'clean', 'modern', 'elegant'],
        config: { primaryColor: '#0f172a', secondaryColor: '#334155', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', fontDisplay: 'DM Sans', fontBody: 'DM Sans', heroStyle: 'minimal', cardStyle: 'bordered', borderRadius: '16px', maxWidth: '1140px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Simplifique. Otimize. Cresça.', subheadline: 'A solução completa para gerenciar e escalar seu negócio com clareza e eficiência. Junte-se a 5.000+ empresas.', cta_text: 'Experimentar Grátis', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '5.000+', label: 'Clientes' }, { number: '4.9/5', label: 'Avaliação' }, { number: '99.9%', label: 'Uptime' }] } },
          { id: 's3', type: 'features', title: 'Funcionalidades', visible: true, styles: {}, content: { items: [{ icon: '📋', title: 'Gestão Visual', description: 'Kanban, timeline e lista em um só lugar.' }, { icon: '⏱️', title: 'Time Tracking', description: 'Acompanhe horas e produtividade automaticamente.' }, { icon: '📊', title: 'Relatórios', description: 'Dados e insights que fazem a diferença.' }] } },
          { id: 's4', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Equipe Acme', role: 'Startup', text: 'Economizamos 15 horas por semana em gestão de projetos. Game changer.' }] } },
          { id: 's5', type: 'pricing', title: 'Preços', visible: true, styles: {}, content: { title: 'Escolha o plano ideal', items: [{ name: 'Free', price: 'R$ 0', features: ['3 projetos', '5 membros', 'Recursos básicos'], highlighted: false }, { name: 'Pro', price: 'R$ 49/mês', features: ['Projetos ilimitados', 'Integrações', 'Relatórios avançados'], highlighted: true }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Comece hoje mesmo', description: 'Sem cartão de crédito. Configuração em 2 minutos.', button_text: 'Criar Conta Grátis', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'SeuNegócio', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'vendas', name: 'Páginas de Vendas', icon: '💰',
    templates: [
      {
        id: 'ft-vendas-premium', name: 'Vendas Premium', category: 'vendas',
        description: 'Página de alta conversão com prova social, urgência e garantia — estilo premium',
        tags: ['dark', 'conversion', 'authority', 'sales', 'gradient'],
        config: { primaryColor: '#1e1b4b', secondaryColor: '#312e81', accentColor: '#f59e0b', backgroundColor: '#0c0a2a', textColor: '#e0e7ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'gradient', cardStyle: 'glass', borderRadius: '20px', maxWidth: '1200px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'O Método Comprovado Para Escalar Seu Negócio', subheadline: 'Descubra a estratégia usada por mais de 3.000 empreendedores para gerar resultados consistentes e previsíveis.', cta_text: 'Quero Acesso Agora →', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Prova Social', visible: true, styles: {}, content: { items: [{ number: '3.200+', label: 'Alunos' }, { number: '97%', label: 'Recomendam' }, { number: '4.9/5', label: 'Avaliação' }, { number: 'R$ 47M', label: 'Gerados por alunos' }] } },
          { id: 's3', type: 'process_steps', title: 'Método', visible: true, styles: {}, content: { title: 'O Método em 3 Pilares', items: [{ step: '01', title: 'Posicionamento', description: 'Torne-se referência no seu nicho com autoridade.' }, { step: '02', title: 'Oferta Irresistível', description: 'Crie ofertas que vendem de forma natural.' }, { step: '03', title: 'Escala', description: 'Automatize e multiplique seus resultados.' }] } },
          { id: 's4', type: 'features', title: 'O Que Você Recebe', visible: true, styles: {}, content: { items: [{ icon: '📚', title: '12 Módulos Completos', description: 'Do zero ao avançado, passo a passo.' }, { icon: '🎯', title: '50+ Templates', description: 'Copys, criativos, funis e emails prontos.' }, { icon: '👥', title: 'Comunidade VIP', description: 'Networking com outros empreendedores.' }, { icon: '📞', title: 'Mentorias Ao Vivo', description: 'Tire dúvidas semanalmente com especialistas.' }] } },
          { id: 's5', type: 'testimonials', title: 'Cases', visible: true, styles: {}, content: { items: [{ name: 'Marcos Oliveira', role: 'Empreendedor Digital', text: 'Em 90 dias, saí do zero e construí um negócio rentável e sustentável online.', metrics: 'R$ 30K/mês em 90 dias' }, { name: 'Fernanda Costa', role: 'Consultora de Negócios', text: 'Transformei meu conhecimento em um negócio digital escalável e previsível.', metrics: 'R$ 150K em 6 meses' }] } },
          { id: 's6', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Garantia Total de 30 Dias', description: 'Se em 30 dias você não estiver satisfeito, devolvemos 100% do seu investimento. Sem perguntas, sem burocracia.', duration: '30 dias de garantia incondicional' } },
          { id: 's7', type: 'pricing', title: 'Oferta', visible: true, styles: {}, content: { title: 'Investimento', items: [{ name: 'Acesso Completo', price: 'R$ 997', features: ['12 Módulos', '50+ Templates', 'Comunidade VIP', 'Mentorias Semanais', 'Acesso Vitalício', 'Certificado'], highlighted: true }] } },
          { id: 's8', type: 'faq', title: 'FAQ', visible: true, styles: {}, content: { items: [{ question: 'Preciso de experiência prévia?', answer: 'Não. O programa foi desenhado para iniciantes e avançados.' }, { question: 'Quanto tempo preciso dedicar?', answer: '20 a 30 minutos por dia são suficientes.' }, { question: 'Posso cancelar?', answer: 'Sim, garantia incondicional de 30 dias.' }] } },
          { id: 's9', type: 'cta', title: 'CTA Final', visible: true, styles: {}, content: { headline: 'Vagas Limitadas — Comece Agora', description: 'O investimento pode mudar a qualquer momento.', button_text: 'GARANTIR MINHA VAGA', button_url: '#' } },
          { id: 's10', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Seu Produto', copyright: `© ${yr} — Todos os direitos reservados` } },
        ]
      },
      {
        id: 'ft-vendas-produto', name: 'Vitrine de Produto', category: 'vendas',
        description: 'Página elegante para apresentar e vender produto — layout split hero com animações',
        tags: ['product', 'elegant', 'light', 'ecommerce', 'split'],
        config: { primaryColor: '#0d9488', secondaryColor: '#115e59', accentColor: '#14b8a6', backgroundColor: '#fafffe', textColor: '#0f172a', fontDisplay: 'DM Sans', fontBody: 'DM Sans', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '20px', maxWidth: '1200px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'O Produto Que Vai Transformar Sua Rotina', subheadline: 'Desenvolvido com tecnologia de ponta e materiais premium. Já são mais de 20.000 unidades vendidas.', cta_text: 'Comprar Agora', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '20K+', label: 'Vendidos' }, { number: '4.8/5', label: 'Avaliação' }, { number: '97%', label: 'Aprovação' }] } },
          { id: 's3', type: 'features', title: 'Diferenciais', visible: true, styles: {}, content: { items: [{ icon: '✨', title: 'Qualidade Premium', description: 'Materiais selecionados com acabamento impecável.' }, { icon: '🌱', title: 'Sustentável', description: 'Produção consciente com embalagem reciclável.' }, { icon: '🚚', title: 'Entrega Rápida', description: 'Frete grátis e entrega em até 5 dias úteis.' }] } },
          { id: 's4', type: 'testimonials', title: 'Avaliações', visible: true, styles: {}, content: { items: [{ name: 'Marina S.', role: 'Cliente verificada', text: 'Superou todas as minhas expectativas. Qualidade incrível e entrega rápida!', metrics: '⭐⭐⭐⭐⭐' }, { name: 'Pedro H.', role: 'Cliente verificado', text: 'Melhor compra que fiz este ano. Recomendo para todos sem hesitar.' }] } },
          { id: 's5', type: 'guarantee', title: 'Garantia', visible: true, styles: {}, content: { icon: '🛡️', title: 'Satisfação Garantida', description: 'Se não amar, devolvemos seu dinheiro em até 30 dias. Sem complicação.', duration: '30 dias' } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Aproveite a Oferta Especial', description: 'Frete grátis + desconto exclusivo por tempo limitado.', button_text: 'Comprar com Desconto', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Marca', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'servicos', name: 'Serviços & Negócios', icon: '💼',
    templates: [
      {
        id: 'ft-agencia-moderna', name: 'Agência Digital', category: 'servicos',
        description: 'Página institucional dark com gradientes laranja, bold typography e glassmorphism',
        tags: ['dark', 'agency', 'bold', 'modern', 'gradient'],
        config: { primaryColor: '#18181b', secondaryColor: '#27272a', accentColor: '#f97316', backgroundColor: '#09090b', textColor: '#fafafa', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '20px', maxWidth: '1200px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Criamos Experiências Digitais Que Geram Resultado', subheadline: 'Estratégia, design e tecnologia para marcas que querem liderar seu mercado. +200 projetos entregues.', cta_text: 'Solicitar Proposta', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '200+', label: 'Projetos entregues' }, { number: 'R$ 50M+', label: 'Gerados para clientes' }, { number: '8+', label: 'Anos de mercado' }] } },
          { id: 's3', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🎨', title: 'Branding', description: 'Identidade visual que comunica e conecta.' }, { icon: '🖥️', title: 'Web & Apps', description: 'Sites e aplicativos de alta performance.' }, { icon: '📈', title: 'Growth Marketing', description: 'Estratégias de aquisição e conversão.' }, { icon: '🎬', title: 'Conteúdo', description: 'Vídeos, copy e design que vendem.' }] } },
          { id: 's4', type: 'process_steps', title: 'Método', visible: true, styles: {}, content: { title: 'Nosso Processo', items: [{ step: '01', title: 'Discovery', description: 'Entendemos seu negócio e objetivos a fundo.' }, { step: '02', title: 'Estratégia', description: 'Planejamos cada etapa com precisão cirúrgica.' }, { step: '03', title: 'Execução', description: 'Entregamos resultados acima do esperado.' }] } },
          { id: 's5', type: 'testimonials', title: 'Cases', visible: true, styles: {}, content: { items: [{ name: 'CEO, TechCorp', role: 'Tecnologia', text: 'A melhor agência que já trabalhamos. Resultados consistentes e acima do esperado em cada sprint.', metrics: '+240% conversão' }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Vamos construir algo incrível juntos?', description: 'A primeira conversa é por nossa conta. Sem compromisso.', button_text: 'Falar com a Gente', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Sua Agência', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-profissional-saude', name: 'Profissional & Clínica', category: 'servicos',
        description: 'Página limpa e confiável com tons azuis, split hero e cards com sombra suave',
        tags: ['light', 'trust', 'professional', 'clean', 'healthcare'],
        config: { primaryColor: '#0369a1', secondaryColor: '#0284c7', accentColor: '#38bdf8', backgroundColor: '#f8fafc', textColor: '#0c4a6e', fontDisplay: 'DM Sans', fontBody: 'DM Sans', heroStyle: 'split', cardStyle: 'shadow', borderRadius: '20px', maxWidth: '1140px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: { layout: 'split-left' }, content: { headline: 'Cuidado Personalizado Para Você', subheadline: 'Equipe especializada, tecnologia de ponta e atendimento humanizado. Sua confiança é nossa maior conquista.', cta_text: 'Agendar Consulta', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Credibilidade', visible: true, styles: {}, content: { items: [{ number: '15+', label: 'Anos de Experiência' }, { number: '50.000+', label: 'Atendimentos' }, { number: '4.9⭐', label: 'Google Reviews' }] } },
          { id: 's3', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🩺', title: 'Consultas', description: 'Atendimento completo e personalizado.' }, { icon: '🔬', title: 'Exames', description: 'Tecnologia de última geração.' }, { icon: '💊', title: 'Tratamentos', description: 'Abordagens modernas e eficazes.' }, { icon: '❤️', title: 'Acompanhamento', description: 'Suporte contínuo ao paciente.' }] } },
          { id: 's4', type: 'process_steps', title: 'Agendamento', visible: true, styles: {}, content: { title: 'Agende em 3 Passos', items: [{ step: '01', title: 'Escolha', description: 'Selecione o serviço desejado.' }, { step: '02', title: 'Agende', description: 'Escolha data e horário.' }, { step: '03', title: 'Consulte', description: 'Receba atendimento de excelência.' }] } },
          { id: 's5', type: 'testimonials', title: 'Pacientes', visible: true, styles: {}, content: { items: [{ name: 'Maria C.', role: 'Paciente', text: 'Atendimento impecável. Me senti acolhida do início ao fim. Super recomendo!' }, { name: 'João R.', role: 'Paciente', text: 'Profissionais dedicados e ambiente muito agradável. Nota 10.' }] } },
          { id: 's6', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Cuide de Você Hoje', description: 'Agende pelo WhatsApp ou telefone. Retorno rápido e sem burocracia.', button_text: 'Agendar Agora', button_url: '#' } },
          { id: 's7', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Seu Nome / Clínica', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
  {
    id: 'criativo', name: 'Portfólio & Criativo', icon: '🎨',
    templates: [
      {
        id: 'ft-portfolio-moderno', name: 'Portfólio Criativo', category: 'criativo',
        description: 'Portfólio dark minimalista com acento roxo, glassmorphism e tipografia bold',
        tags: ['dark', 'portfolio', 'minimal', 'creative', 'glassmorphism'],
        config: { primaryColor: '#18181b', secondaryColor: '#27272a', accentColor: '#a78bfa', backgroundColor: '#0a0a0a', textColor: '#e4e4e7', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '20px', maxWidth: '1100px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: 'Design com propósito.\nResultado com impacto.', subheadline: 'Diretor criativo com 10+ anos criando experiências memoráveis para marcas que querem se destacar.', cta_text: 'Ver Projetos', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Números', visible: true, styles: {}, content: { items: [{ number: '150+', label: 'Projetos' }, { number: '80+', label: 'Clientes' }, { number: '12', label: 'Prêmios' }] } },
          { id: 's3', type: 'features', title: 'Serviços', visible: true, styles: {}, content: { items: [{ icon: '🎨', title: 'Brand Identity', description: 'Marcas que comunicam e se destacam.' }, { icon: '🖥️', title: 'UI/UX Design', description: 'Interfaces intuitivas e elegantes.' }, { icon: '📱', title: 'Apps & Web', description: 'Experiências digitais fluidas.' }, { icon: '🎬', title: 'Motion Design', description: 'Animações que contam histórias.' }] } },
          { id: 's4', type: 'testimonials', title: 'Clientes', visible: true, styles: {}, content: { items: [{ name: 'Brand X', role: 'Tech Company', text: 'Trabalho excepcional. Entregou além do briefing com criatividade impressionante e atenção aos detalhes.' }, { name: 'Startup Y', role: 'Scale-up', text: 'Design que realmente converte. Uma parceria indispensável para nosso crescimento.' }] } },
          { id: 's5', type: 'cta', title: 'Contato', visible: true, styles: {}, content: { headline: 'Vamos criar algo incrível?', description: 'Disponível para projetos selecionados. Vamos conversar.', button_text: 'Entrar em contato', button_url: '#' } },
          { id: 's6', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: 'Seu Nome', copyright: `© ${yr}` } },
        ]
      },
      {
        id: 'ft-creator-bio', name: 'Bio & Links', category: 'criativo',
        description: 'Página de bio/links premium para criadores — estilo neon roxo com glassmorphism',
        tags: ['bio', 'links', 'creator', 'compact', 'neon'],
        config: { primaryColor: '#6d28d9', secondaryColor: '#7c3aed', accentColor: '#a78bfa', backgroundColor: '#0c0a1d', textColor: '#e9d5ff', fontDisplay: 'Inter', fontBody: 'Inter', heroStyle: 'minimal', cardStyle: 'glass', borderRadius: '24px', maxWidth: '640px' },
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', visible: true, styles: {}, content: { headline: '@seunome', subheadline: 'Creator • Estrategista • Empreendedor | +500K seguidores', cta_text: 'Me siga no Instagram', cta_url: '#', background_image: '' } },
          { id: 's2', type: 'social_proof', title: 'Stats', visible: true, styles: {}, content: { items: [{ number: '500K+', label: 'Seguidores' }, { number: '10M+', label: 'Views/mês' }, { number: '200+', label: 'Parcerias' }] } },
          { id: 's3', type: 'features', title: 'Links', visible: true, styles: {}, content: { items: [{ icon: '🎥', title: 'Meu Curso', description: 'Aprenda a criar conteúdo que converte.' }, { icon: '📱', title: 'Presets & Templates', description: 'Filtros e modelos exclusivos.' }, { icon: '📧', title: 'Newsletter', description: 'Dicas semanais no seu email.' }, { icon: '🤝', title: 'Parcerias', description: 'Mídia kit e propostas comerciais.' }] } },
          { id: 's4', type: 'cta', title: 'CTA', visible: true, styles: {}, content: { headline: 'Quer criar conteúdo que converte?', description: 'Entre para a comunidade de criadores.', button_text: 'Acessar Agora', button_url: '#' } },
          { id: 's5', type: 'footer', title: 'Rodapé', visible: true, styles: {}, content: { company: '@seunome', copyright: `© ${yr}` } },
        ]
      },
    ]
  },
];

export const ALL_FULL_TEMPLATES: FullTemplate[] = FULL_TEMPLATE_CATEGORIES.flatMap(c => c.templates);

export function getFullTemplateById(id: string): FullTemplate | undefined {
  return ALL_FULL_TEMPLATES.find(t => t.id === id);
}
