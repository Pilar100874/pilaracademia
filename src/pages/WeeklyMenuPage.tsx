import { useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ListSkeleton';
import { useWeeklyMenus, WeeklyMenuRow, WeeklyMenuMeal } from '@/hooks/useWeeklyMenus';
import { CalendarDays, Sparkles, Loader2, Trash2, ShoppingBasket, Utensils, Plus, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WeeklyMenuPage() {
  const { menus, isLoading, generate, remove } = useWeeklyMenus();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [viewing, setViewing] = useState<WeeklyMenuRow | null>(null);
  const [deleting, setDeleting] = useState<WeeklyMenuRow | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const { addEntry } = useFoodEntries(new Date());

  const handleAddMeal = async (dayName: string, meal: WeeklyMenuMeal, mealIdx: number) => {
    const key = `${dayName}-${mealIdx}`;
    if (addedKeys.has(key)) return;
    try {
      const kcal = Math.round(meal.approx_calories || 0);
      await addEntry({
        name: meal.name,
        nutrition: {
          calories: kcal,
          // Estimativa simples de macros se IA não retornar (P 25% / C 50% / G 25%)
          protein: Math.round((kcal * 0.25) / 4),
          carbs: Math.round((kcal * 0.5) / 4),
          fat: Math.round((kcal * 0.25) / 9),
        },
        quantity: 1,
        unit: 'porção',
        source: 'manual',
      });
      setAddedKeys((p) => new Set(p).add(key));
      toast.success(`${meal.name} adicionado ao dia`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar refeição');
    }
  };

  const handleGenerate = async () => {
    await generate.mutateAsync(notes.trim() || undefined);
    setNotes('');
    setGenerateOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-3 sm:px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold truncate">Cardápio Semanal</h1>
          </div>
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Gerar com IA</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : menus.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="Nenhum cardápio criado"
            description="Gere um cardápio semanal personalizado com IA. Inclui refeições do dia a dia e a lista de compras consolidada."
            action={{ label: 'Gerar com IA', icon: Sparkles, onClick: () => setGenerateOpen(true) }}
          />
        ) : (
          <div className="space-y-3">
            {menus.map((m) => (
              <Card
                key={m.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setViewing(m)}
              >
                <CardHeader className="pb-2 flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">
                    Semana de {format(parseISO(m.week_start), "d 'de' MMM", { locale: ptBR })}
                  </CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(m);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {m.menu?.summary || `${m.menu?.days?.length ?? 0} dias planejados • ${m.shopping_list?.length ?? 0} categorias na lista`}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Gerar cardápio semanal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A IA usa seu perfil (metas, peso, objetivo) e já considera automaticamente suas{' '}
              <strong>preferências e restrições alimentares</strong> cadastradas — não precisa repeti-las aqui.
            </p>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              ✓ Restrições, alimentos a evitar e favoritos já entram no prompt. Use o campo abaixo só para
              instruções extras (ex.: "semana com mais peixe", "sem repetir refeições").
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional: instruções extras para esta semana..."
              rows={3}
            />
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="w-full"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar agora
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Cardápio — semana de {format(parseISO(viewing.week_start), "d 'de' MMM", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="menu" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="menu">
                    <Utensils className="h-4 w-4 mr-1" /> Refeições
                  </TabsTrigger>
                  <TabsTrigger value="shopping">
                    <ShoppingBasket className="h-4 w-4 mr-1" /> Lista de compras
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="menu" className="space-y-3 mt-3">
                  {viewing.menu?.days?.map((d) => (
                    <Card key={d.day}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{d.day}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {d.meals.map((meal, i) => {
                          const key = `${d.day}-${i}`;
                          const added = addedKeys.has(key);
                          return (
                            <div key={i} className="border-l-2 border-primary/40 pl-3 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">
                                  {meal.name}
                                  {meal.approx_calories ? (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ~{meal.approx_calories} kcal
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-sm text-muted-foreground">{meal.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant={added ? 'secondary' : 'outline'}
                                disabled={added}
                                onClick={() => handleAddMeal(d.day, meal, i)}
                                className="gap-1.5 h-7 text-xs shrink-0"
                              >
                                {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                {added ? 'Adicionado' : 'Registrar hoje'}
                              </Button>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="shopping" className="space-y-3 mt-3">
                  {viewing.shopping_list?.map((cat) => (
                    <Card key={cat.category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{cat.category}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                          {cat.items.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remover cardápio?"
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleting) {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
          }
        }}
      />

      <BottomNav />
    </div>
  );
}
