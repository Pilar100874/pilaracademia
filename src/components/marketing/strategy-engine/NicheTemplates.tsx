import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LayoutTemplate, Rocket, Loader2, Search } from 'lucide-react';

const NICHE_TEMPLATES = [
  {
    id: 'saude',
    icon: '🏥',
    name: 'Saúde & Bem-estar',
    description: 'Clínicas, profissionais de saúde, suplementos, fitness',
    example: 'Clínica de dermatologia especializada em tratamentos estéticos faciais para mulheres 25-45 anos, localizada em São Paulo. Oferecemos procedimentos como harmonização facial, botox e skincare personalizado.',
    tags: ['Saúde', 'Estética', 'Fitness'],
  },
  {
    id: 'educacao',
    icon: '📚',
    name: 'Educação & Cursos',
    description: 'Infoprodutos, cursos online, mentorias, coaching',
    example: 'Mentoria online de marketing digital para empreendedores iniciantes que querem faturar seus primeiros R$10k/mês com vendas na internet. O programa dura 12 semanas com aulas ao vivo e suporte individual.',
    tags: ['Educação', 'Infoproduto', 'Mentoria'],
  },
  {
    id: 'saas',
    icon: '💻',
    name: 'SaaS & Tecnologia',
    description: 'Software, aplicativos, plataformas B2B e B2C',
    example: 'Plataforma SaaS de gestão de agendamentos para salões de beleza e barbearias. Inclui agendamento online, lembretes por WhatsApp, controle financeiro e relatórios. Plano a partir de R$99/mês.',
    tags: ['SaaS', 'B2B', 'Tech'],
  },
  {
    id: 'ecommerce',
    icon: '🛒',
    name: 'E-commerce & Varejo',
    description: 'Lojas online, dropshipping, marketplaces',
    example: 'Loja online de moda feminina plus size com foco em roupas para o dia a dia e trabalho. Entregamos para todo Brasil com frete grátis acima de R$200. Público: mulheres 30-50 anos, classe B/C.',
    tags: ['E-commerce', 'Moda', 'Varejo'],
  },
  {
    id: 'servicos',
    icon: '🔧',
    name: 'Serviços Profissionais',
    description: 'Consultorias, escritórios, agências',
    example: 'Escritório de contabilidade especializado em MEIs e pequenas empresas. Oferecemos abertura de empresa, declaração de IR, folha de pagamento e consultoria fiscal. Atendimento 100% digital.',
    tags: ['Serviços', 'B2B', 'Consultoria'],
  },
  {
    id: 'alimentacao',
    icon: '🍔',
    name: 'Alimentação & Gastronomia',
    description: 'Restaurantes, delivery, alimentos saudáveis',
    example: 'Delivery de marmitas fitness com cardápio semanal personalizado. Atendemos pessoas que querem comer saudável sem perder tempo cozinhando. Planos semanais e mensais com opções low carb, vegana e tradicional.',
    tags: ['Food', 'Delivery', 'Saudável'],
  },
  {
    id: 'imobiliario',
    icon: '🏠',
    name: 'Imobiliário',
    description: 'Imobiliárias, construtoras, corretores',
    example: 'Construtora que vende apartamentos compactos (studio e 1 quarto) para jovens profissionais em capitais brasileiras. Imóveis de R$250k a R$450k com financiamento facilitado e entrega em 24 meses.',
    tags: ['Imobiliário', 'B2C', 'Alto ticket'],
  },
  {
    id: 'financeiro',
    icon: '💰',
    name: 'Financeiro & Investimentos',
    description: 'Assessorias, fintechs, educação financeira',
    example: 'Assessoria de investimentos independente focada em profissionais liberais (médicos, advogados, dentistas) com patrimônio acima de R$500k que querem diversificar seus investimentos além da poupança.',
    tags: ['Finanças', 'Investimentos', 'Alto ticket'],
  },
];

interface Props {
  onSelectTemplate: (nome: string, descricao: string) => void;
}

export function NicheTemplates({ onSelectTemplate }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof NICHE_TEMPLATES[0] | null>(null);
  const [customDesc, setCustomDesc] = useState('');

  const filtered = NICHE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    const desc = customDesc.trim() || selectedTemplate.example;
    onSelectTemplate(`${selectedTemplate.icon} ${selectedTemplate.name}`, desc);
    setOpen(false);
    setSelectedTemplate(null);
    setCustomDesc('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutTemplate className="h-4 w-4 mr-1" />
          Templates de Nicho
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Templates por Segmento de Mercado
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar segmento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!selectedTemplate ? (
          <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {filtered.map(template => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => { setSelectedTemplate(template); setCustomDesc(template.example); }}
              >
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">{template.icon}</span>
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="flex gap-1 flex-wrap">
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                ← Voltar
              </Button>
              <span className="text-lg">{selectedTemplate.icon}</span>
              <h3 className="font-semibold">{selectedTemplate.name}</h3>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição do Negócio</label>
              <p className="text-xs text-muted-foreground mb-2">
                Personalize a descrição ou use o exemplo pré-preenchido para o segmento
              </p>
              <Textarea
                value={customDesc}
                onChange={e => setCustomDesc(e.target.value)}
                rows={6}
                placeholder="Descreva seu negócio..."
              />
            </div>

            <Button onClick={handleUseTemplate} className="w-full">
              <Rocket className="h-4 w-4 mr-1" />
              Criar Projeto com este Template
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
