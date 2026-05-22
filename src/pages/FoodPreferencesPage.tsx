import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Loader2, UtensilsCrossed, Heart, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BottomNav } from '@/components/BottomNav';
import { useFoodPreferences, COMMON_RESTRICTIONS } from '@/hooks/useFoodPreferences';
import { cn } from '@/lib/utils';

function ChipList({
  items,
  onRemove,
  emptyText,
  tone,
}: {
  items: string[];
  onRemove: (i: number) => void;
  emptyText: string;
  tone: 'rose' | 'emerald' | 'muted';
}) {
  if (items.length === 0) {
    return <p className="text-[11px] text-muted-foreground italic">{emptyText}</p>;
  }
  const toneClasses = {
    rose: 'border-rose-300 bg-rose-50 text-rose-800',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    muted: 'border-border bg-muted/40 text-muted-foreground',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={cn(
            'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border',
            toneClasses[tone],
          )}
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="hover:opacity-70"
            aria-label={`Remover ${item}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function FoodPreferencesPage() {
  const navigate = useNavigate();
  const { data, upsert, isLoading } = useFoodPreferences();

  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [dislikedInput, setDislikedInput] = useState('');
  const [favoriteInput, setFavoriteInput] = useState('');

  useEffect(() => {
    if (data) {
      setRestrictions(data.restrictions || []);
      setDislikedFoods(data.disliked_foods || []);
      setFavoriteFoods(data.favorite_foods || []);
      setNotes(data.notes || '');
    }
  }, [data]);

  const toggleRestriction = (key: string) => {
    setRestrictions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const addItem = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[],
    clear: () => void,
  ) => {
    const v = value.trim();
    if (!v || list.includes(v) || list.length >= 30) return;
    setter([...list, v]);
    clear();
  };

  const handleSave = () => {
    upsert.mutate({
      restrictions,
      disliked_foods: dislikedFoods,
      favorite_foods: favoriteFoods,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Personalização
            </p>
            <h1 className="text-lg font-semibold leading-tight break-words line-clamp-2">
              Preferências alimentares
            </h1>
          </div>
        </div>
      </header>

      <div className="px-5 py-5 space-y-6 max-w-md mx-auto">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Suas preferências são consideradas em todos os cardápios e recomendações geradas pela IA.
        </p>

        {/* Restrições */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Restrições e estilos alimentares</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha as que se aplicam — afetam todas as sugestões.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_RESTRICTIONS.map((r) => {
              const active = restrictions.includes(r.key);
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleRestriction(r.key)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/40',
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Não gosta */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-rose-700" />
            <h2 className="text-sm font-semibold">Alimentos a evitar</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Ex.: peixe, brócolis, beterraba.
          </p>
          <div className="flex gap-2">
            <Input
              value={dislikedInput}
              onChange={(e) => setDislikedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem(dislikedInput, setDislikedFoods, dislikedFoods, () =>
                    setDislikedInput(''),
                  );
                }
              }}
              placeholder="Adicionar alimento"
              maxLength={50}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                addItem(dislikedInput, setDislikedFoods, dislikedFoods, () =>
                  setDislikedInput(''),
                )
              }
              disabled={!dislikedInput.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ChipList
            items={dislikedFoods}
            onRemove={(i) => setDislikedFoods((p) => p.filter((_, idx) => idx !== i))}
            emptyText="Nenhum alimento evitado."
            tone="rose"
          />
        </section>

        {/* Favoritos */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold">Alimentos favoritos</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Ex.: frango grelhado, batata-doce, abacate. A IA tentará incluí-los.
          </p>
          <div className="flex gap-2">
            <Input
              value={favoriteInput}
              onChange={(e) => setFavoriteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem(favoriteInput, setFavoriteFoods, favoriteFoods, () =>
                    setFavoriteInput(''),
                  );
                }
              }}
              placeholder="Adicionar alimento"
              maxLength={50}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                addItem(favoriteInput, setFavoriteFoods, favoriteFoods, () =>
                  setFavoriteInput(''),
                )
              }
              disabled={!favoriteInput.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ChipList
            items={favoriteFoods}
            onRemove={(i) => setFavoriteFoods((p) => p.filter((_, idx) => idx !== i))}
            emptyText="Nenhum favorito ainda."
            tone="emerald"
          />
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-semibold">
            Observações livres
          </Label>
          <p className="text-xs text-muted-foreground">
            Qualquer detalhe extra: alergias específicas, rotina de refeições, contexto cultural...
          </p>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: jantar leve antes das 20h; tenho intolerância leve a leite mas tolero queijos curados..."
            rows={4}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {notes.length}/500
          </p>
        </section>

        <Button
          onClick={handleSave}
          disabled={upsert.isPending || isLoading}
          className="w-full h-12"
        >
          {upsert.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              Salvar preferências
            </>
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
