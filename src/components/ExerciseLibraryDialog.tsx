import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LibraryExercise, useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { useExerciseExtras } from '@/hooks/useExerciseExtras';
import { ExtrasPicker } from '@/components/ExtrasPicker';
import { Save } from 'lucide-react';

interface ExerciseLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExercise: LibraryExercise | null;
}

const NO_CATEGORY = '__none__';

export function ExerciseLibraryDialog({
  open,
  onOpenChange,
  editingExercise,
}: ExerciseLibraryDialogProps) {
  const { exercises, createExercise, updateExercise } = useExerciseLibrary();
  const { categories } = useExerciseCategories();
  const { bulkAssignExtra } = useExerciseExtras();

  const [name, setName] = useState('');
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState(10);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [initialExtraIds, setInitialExtraIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingExercise) {
        setName(editingExercise.name);
        setDefaultSets(editingExercise.default_sets);
        setDefaultReps(editingExercise.default_reps);
        setCategoryId(editingExercise.category_id ?? null);
        const initialExtras = editingExercise.extra_ids ?? [];
        setExtraIds(initialExtras);
        setInitialExtraIds(initialExtras);
      } else {
        setName('');
        setDefaultSets(1);
        setDefaultReps(10);
        setCategoryId(null);
        setExtraIds([]);
        setInitialExtraIds([]);
      }
    }
  }, [editingExercise?.id, open]);

  const handleCategoryChange = (value: string) => {
    if (value === NO_CATEGORY) {
      setCategoryId(null);
      return;
    }
    setCategoryId(value);
  };

  // Hierarchical ordering for category select (root → children indented).
  const orderedCategories = (() => {
    const childrenOf = new Map<string | null, typeof categories>();
    categories.forEach((c) => {
      const key = (c as any).parent_id ?? null;
      const arr = childrenOf.get(key) ?? [];
      arr.push(c);
      childrenOf.set(key, arr);
    });
    const out: { cat: typeof categories[number]; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const list = (childrenOf.get(parentId) ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      list.forEach((c) => {
        out.push({ cat: c, depth });
        walk(c.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  })();

  const generateAutoName = (): string => {
    const categoryName = categoryId
      ? categories.find((c) => c.id === categoryId)?.name ?? 'Exercício'
      : 'Exercício';

    // Find existing exercises with the same category prefix and pick next number
    const prefix = `${categoryName} `;
    const usedNumbers = new Set<number>();
    exercises.forEach((ex) => {
      if (editingExercise && ex.id === editingExercise.id) return;
      if (ex.name.startsWith(prefix)) {
        const rest = ex.name.slice(prefix.length).trim();
        const n = parseInt(rest, 10);
        if (!Number.isNaN(n)) usedNumbers.add(n);
      }
    });
    let next = 1;
    while (usedNumbers.has(next)) next++;
    return `${categoryName} ${next}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalName = name.trim() || generateAutoName();

      // Fotos e vídeos não são mais editados aqui: preservamos os valores já salvos.
      const payload = {
        name: finalName,
        default_sets: defaultSets,
        default_reps: defaultReps,
        image_urls: editingExercise?.image_urls ?? [],
        video_type: editingExercise?.video_type ?? null,
        video_url: editingExercise?.video_url ?? null,
        video_start_seconds: editingExercise?.video_start_seconds ?? null,
        video_end_seconds: editingExercise?.video_end_seconds ?? null,
        category_id: categoryId,
      };

      let exerciseId = editingExercise?.id ?? null;
      if (editingExercise) {
        await updateExercise.mutateAsync({ id: editingExercise.id, ...payload });
      } else {
        const created = await createExercise.mutateAsync(payload);
        exerciseId = (created as any)?.id ?? null;
      }

      // Sync extras (junction). For new exercise: insert all selected.
      // For edit: diff against initialExtraIds.
      if (exerciseId) {
        const initial = new Set(initialExtraIds);
        const next = new Set(extraIds);
        const toAdd = [...next].filter((id) => !initial.has(id));
        const toRemove = [...initial].filter((id) => !next.has(id));
        try {
          await Promise.all([
            ...toAdd.map((extraId) =>
              bulkAssignExtra.mutateAsync({ extraId, exerciseIds: [exerciseId!], mode: 'add', silent: true })
            ),
            ...toRemove.map((extraId) =>
              bulkAssignExtra.mutateAsync({ extraId, exerciseIds: [exerciseId!], mode: 'remove', silent: true })
            ),
          ]);
        } catch (err) {
          console.error('[ExerciseLibraryDialog] extras sync failed', err);
          // Don't block dialog close — exercise itself was saved.
        }
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const selectValue = categoryId ?? NO_CATEGORY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exercise-name">
              Nome do Exercício <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="exercise-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Em branco: usa categoria + número"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={selectValue} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                {orderedCategories.map(({ cat, depth }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ paddingLeft: depth * 12 }}>
                      {depth > 0 ? '↳ ' : ''}{cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Para criar categorias, use a tela da Biblioteca de Exercícios.
            </p>
          </div>

          {/* Equipamentos extras */}
          <div className="space-y-2">
            <Label>Equipamentos extras</Label>
            <ExtrasPicker
              selectedIds={extraIds}
              onToggle={(id) =>
                setExtraIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Bola, halter, elástico, arco, caixa... Selecione os que esse exercício usa.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
