import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Search, BookOpen, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BottomNav } from '@/components/BottomNav';
import { CheckUpdateButton } from '@/components/CheckUpdateButton';
import { helpTopics } from '@/content/helpTopics';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function HelpPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const topics = helpTopics.filter(topic => normalize([topic.title, topic.intro, topic.location, ...topic.steps.flatMap(step => [step.label, step.desc]), ...(topic.tips ?? [])].join(' ')).includes(normalize(query.trim())));

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-5 -ml-3"><ArrowLeft />Voltar</Button>
          <div className="flex items-start gap-3">
            <BookOpen className="mt-2 h-6 w-6 shrink-0 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Pilar Saúde</p><h1 className="font-serif text-4xl">Central de ajuda</h1><p className="mt-2 text-sm text-muted-foreground">Encontre respostas para cada área do seu cuidado.</p></div>
          </div>
          <div className="relative mt-6"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input aria-label="Buscar na ajuda" placeholder="Buscar: treino, balança, medidas…" className="h-11 pl-10" value={query} onChange={event => setQuery(event.target.value)} /></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{topics.length} assuntos{query.trim() ? ' encontrados' : ' para consultar'}</p>{query && <Button variant="ghost" size="sm" onClick={() => setQuery('')}>Limpar busca</Button>}</div>
        {topics.length === 0 ? <div className="py-12 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" /><h2 className="font-serif text-2xl">Nenhum assunto encontrado</h2><p className="mt-2 text-sm text-muted-foreground">Tente outro termo, como exames, peso ou Samsung.</p></div> :
          <Accordion type="multiple" value={expanded} onValueChange={setExpanded}>
            {topics.map(topic => {
              const Icon = topic.icon;
              return <AccordionItem key={topic.id} value={topic.id} className="border-border">
                <AccordionTrigger className="gap-3 py-5 text-left hover:no-underline [&>svg]:shrink-0"><div className="flex min-w-0 items-center gap-3"><Icon className="h-5 w-5 shrink-0 text-muted-foreground" /><div className="min-w-0"><h2 className="text-base font-medium">{topic.title}</h2><p className="mt-1 text-xs font-normal text-muted-foreground">{topic.location}</p></div></div></AccordionTrigger>
                <AccordionContent className="pb-6 sm:pl-8">
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{topic.intro}</p>
                  <ol className="grid gap-5 md:grid-cols-2">{topic.steps.map((step, index) => <li key={step.label} className="flex min-w-0 gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">{index + 1}</span><div className="min-w-0"><h3 className="text-sm font-semibold">{step.label}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p></div></li>)}</ol>
                  {topic.tips && <aside className="mt-5 border-l-2 border-border pl-4"><h3 className="mb-2 text-xs font-semibold text-foreground">Importante</h3><ul className="space-y-2">{topic.tips.map(tip => <li key={tip} className="text-sm leading-relaxed text-muted-foreground">{tip}</li>)}</ul></aside>}
                  <Button variant="outline" size="sm" className="mt-5" asChild><Link to={topic.route}>Abrir {topic.id === 'manager' ? 'Meus usuários' : topic.location.split(' → ')[0]}<ArrowUpRight /></Link></Button>
                </AccordionContent>
              </AccordionItem>;
            })}
          </Accordion>
        }
        <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-border py-5"><div className="flex items-center gap-3"><RefreshCw className="h-5 w-5 text-muted-foreground" /><div><h2 className="text-sm font-semibold">Atualizações do app</h2><p className="text-xs text-muted-foreground">Confira se há uma nova versão disponível.</p></div></div><CheckUpdateButton /></section>
        <footer className="mt-5 flex flex-wrap gap-4"><Button variant="link" className="h-auto p-0" asChild><Link to="/privacidade">Política de Privacidade</Link></Button><Button variant="link" className="h-auto p-0" asChild><Link to="/termos">Termos de Uso</Link></Button></footer>
      </main>
      <BottomNav />
    </div>
  );
}
