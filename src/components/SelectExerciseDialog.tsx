import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExerciseLibrary, LibraryExercise } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { LazyVideoPreview } from '@/components/LazyVideoPreview';
import { Dumbbell, Search, Plus, Check, ImageIcon, Tag, Loader2, Globe } from 'lucide-react';
import { getFreshMediaUrl } from '@/lib/mediaUrl';
import {
  BodyAnalysisFilter,
  EMPTY_BODY_FILTER,
  bodyFilterMatches,
  type BodyAnalysisFilterValue,
} from '@/components/BodyAnalysisFilter';

interface SelectExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: LibraryExercise, sets: number, reps: number) => void | Promise<void>;
  onCreateNew: () => void;
}

const ALL_CATEGORIES = '__all__';
const NO_CATEGORY = '__none__';

export function SelectExerciseDialog({
  open,
  onOpenChange,
  onSelect,
  onCreateNew,
}: SelectExerciseDialogProps) {
  const { exercises, isLoading } = useExerciseLibrary();
  const { categories } = useExerciseCategories();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES);
  const [bodyFilter, setBodyFilter] = useState<BodyAnalysisFilterValue>(EMPTY_BODY_FILTER);
  // Ordered list of selected exercise ids — defines insertion order
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const exerciseMap = useMemo(() => {
    const m = new Map<string, LibraryExercise>();
    exercises.forEach((ex) => m.set(ex.id, ex));
    return m;
  }, [exercises]);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    let matchesCategory = true;
    if (filterCategory === NO_CATEGORY) {
      matchesCategory = !ex.category_id;
    } else if (filterCategory !== ALL_CATEGORIES) {
      matchesCategory = ex.category_id === filterCategory;
    }
    const matchesBody = bodyFilterMatches(ex.body_analysis, ex.aesthetic_analysis, ex.mobility_analysis, bodyFilter);
    return matchesSearch && matchesCategory && matchesBody;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!selectedIds.length || isAdding) return;
    const idsToAdd = [...selectedIds];
    // Close the dialog immediately for snappy UX; do the inserts in the
    // background so the user isn't stuck waiting on N sequential round-trips.
    setIsAdding(true);
    onOpenChange(false);
    setSelectedIds([]);
    setSearch('');
    setFilterCategory(ALL_CATEGORIES);
    setBodyFilter(EMPTY_BODY_FILTER);

    (async () => {
      try {
        for (const id of idsToAdd) {
          const ex = exerciseMap.get(id);
          if (!ex) continue;
          await onSelect(ex, ex.default_sets, ex.default_reps);
        }
      } finally {
        setIsAdding(false);
      }
    })();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedIds([]);
      setSearch('');
      setFilterCategory(ALL_CATEGORIES);
      setBodyFilter(EMPTY_BODY_FILTER);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] h-[90vh] !flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Adicionar Exercícios ao Treino</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercício..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
                <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BodyAnalysisFilter value={bodyFilter} onChange={setBodyFilter} compact />
          </div>

          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} selecionado(s) — serão adicionados na ordem em que você clicou
            </p>
          )}

          {/* Exercise grid */}
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {isLoading ? (
              <div className="py-4">
                <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Carregando biblioteca de exercícios...</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border overflow-hidden animate-pulse"
                    >
                      <div className="w-full min-h-[12rem] sm:min-h-[13rem] bg-muted/60" />
                      <div className="p-2.5 space-y-2">
                        <div className="h-3 w-3/4 bg-muted rounded" />
                        <div className="h-2.5 w-1/3 bg-muted/70 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {search || filterCategory !== ALL_CATEGORIES
                    ? 'Nenhum exercício encontrado'
                    : 'Sua biblioteca está vazia'}
                </p>
                <Button variant="outline" onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Exercício
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-2">
                {filteredExercises.map((exercise) => {
                  const selectionIdx = selectedIds.indexOf(exercise.id);
                  const isSelected = selectionIdx !== -1;
                      const firstImage = getFreshMediaUrl(exercise.image_urls?.[0]);
                  const imageCount = exercise.image_urls?.length || 0;
                  const hasVideo = !!exercise.video_url && !!exercise.video_type;
                  const categoryName = exercise.category_id
                    ? categoryNameMap.get(exercise.category_id)
                    : null;

                  return (
                    <button
                      key={exercise.id}
                      onClick={() => toggleSelect(exercise.id)}
                      className={`group relative flex flex-col rounded-xl border overflow-hidden text-left transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                      }`}
                    >
                      {/* Large media area */}
                      <div
                        className={`relative w-full overflow-hidden ${
                          firstImage || hasVideo
                            ? 'min-h-[12rem] sm:min-h-[13rem] bg-muted/40 flex items-center justify-center p-2 sm:p-3'
                            : 'aspect-video bg-muted'
                        }`}
                        onClick={(e) => {
                          if (exercise.image_urls?.length) {
                            e.stopPropagation();
                            setZoomImages(exercise.image_urls);
                          }
                        }}
                      >
                        {firstImage ? (
                          <>
                            <img
                              src={firstImage}
                              alt={exercise.name}
                              className="max-h-[16rem] w-full object-contain"
                              loading="lazy"
                            />
                            {imageCount > 1 && (
                              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                {imageCount}
                              </div>
                            )}
                          </>
                        ) : hasVideo ? (
                          <LazyVideoPreview
                            videoType={exercise.video_type}
                            videoUrl={exercise.video_url}
                            startSeconds={exercise.video_start_seconds}
                            endSeconds={exercise.video_end_seconds}
                            className="w-full h-full"
                            iconSize="md"
                            objectFit="contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}

                        {/* Selection badge with order number */}
                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg text-xs font-bold">
                            {selectionIdx + 1}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5 space-y-1">
                        <p className="font-medium text-sm leading-tight line-clamp-2">{exercise.name}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {exercise.default_sets}×{exercise.default_reps}
                          </p>
                          {categoryName && (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[60%]">
                              {categoryName}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Action buttons */}
          <div className="border-t pt-4 flex flex-col gap-2">
            <Button
              onClick={handleConfirm}
              className="w-full"
              disabled={selectedIds.length === 0 || isAdding}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isAdding
                ? 'Adicionando...'
                : selectedIds.length > 1
                ? `Adicionar ${selectedIds.length} ao Treino`
                : 'Adicionar ao Treino'}
            </Button>
            <Button variant="outline" onClick={onCreateNew} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Criar Novo Exercício
            </Button>
          </div>
        </div>

        <ImageZoomDialog
          images={zoomImages}
          open={zoomImages.length > 0}
          onOpenChange={(open) => !open && setZoomImages([])}
        />
      </DialogContent>
    </Dialog>
  );
}
