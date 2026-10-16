import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, BookOpen, ArrowRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getContextHelp } from '@/content/helpTopics';

type HelpMenuProps = { inline?: boolean; className?: string };

export function HelpMenu({ className }: HelpMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  if (pathname.startsWith('/auth')) return null;
  const help = getContextHelp(pathname, search);
  return <>
    <Button variant="ghost" aria-label="Como usar esta tela" onClick={() => setOpen(true)} className={cn('h-auto min-w-0 flex-1 flex-col gap-0.5 rounded-md px-1 py-2 text-muted-foreground hover:text-foreground', className)}><HelpCircle className="my-1.5 h-5 w-5" /><span className="text-[9px] font-medium">Ajuda</span></Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" onOpenAutoFocus={event => event.preventDefault()} className="flex w-full min-w-0 flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-5 pr-12 text-left"><p className="text-xs text-muted-foreground">Ajuda desta tela</p><SheetTitle className="font-serif text-2xl">{help.title}</SheetTitle><SheetDescription className="text-sm leading-relaxed">{help.intro}</SheetDescription></SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6"><ol className="space-y-5">{help.steps.map((step, index) => <li key={step.label} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">{index + 1}</span><div className="min-w-0"><h3 className="text-sm font-medium">{step.label}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p></div></li>)}</ol>{help.tips && <aside className="mt-6 space-y-2 border-l-2 border-border pl-4"><h3 className="text-xs font-semibold">Importante</h3>{help.tips.map(tip => <p key={tip} className="text-sm leading-relaxed text-muted-foreground">{tip}</p>)}</aside>}</div>
        <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button variant="outline" className="w-full whitespace-normal" onClick={() => { setOpen(false); navigate('/ajuda'); }}><BookOpen />Ver todos os assuntos<ArrowRight /></Button></div>
      </SheetContent>
    </Sheet>
  </>;
}
