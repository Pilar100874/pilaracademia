import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExerciseLibrary, LibraryExercise } from '@/hooks/useExerciseLibrary';
import { useExerciseCategories } from '@/hooks/useExerciseCategories';
import { ExerciseLibraryDialog } from '@/components/ExerciseLibraryDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Dumbbell, Edit, Trash2, ImageIcon, ArrowLeft, Tag, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const ALL_CATEGORIES = '__all__';
const NO_CATEGORY = '__none__';
const NEW_CATEGORY = '__new__';

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { exercises, isLoading, deleteExercise, createExercise } = useExerciseLibrary();
  const { categories, deleteCategory } = useExerciseCategories();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<LibraryExercise | null>(null);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [bulkUploading, setBulkUploading] = useState<{ done: number; total: number } | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    let matchesCategory = true;
    if (filterCategory === NO_CATEGORY) {
      matchesCategory = !ex.category_id;
    } else if (filterCategory !== ALL_CATEGORIES) {
      matchesCategory = ex.category_id === filterCategory;
    }
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (exercise: LibraryExercise) => {
    setEditingExercise(exercise);
    setDialogOpen(true);
  };

  const handleDelete = (exercise: LibraryExercise) => {
    setExerciseToDelete(exercise);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (exerciseToDelete) {
      await deleteExercise.mutateAsync(exerciseToDelete.id);
      setDeleteDialogOpen(false);
      setExerciseToDelete(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      if (filterCategory === categoryToDelete.id) setFilterCategory(ALL_CATEGORIES);
      setCategoryToDelete(null);
    }
  };

  const generateUniqueName = (baseName: string, used: Set<string>): string => {
    const prefix = `${baseName} `;
    const usedNumbers = new Set<number>();
    exercises.forEach((ex) => {
      if (ex.name.startsWith(prefix)) {
        const n = parseInt(ex.name.slice(prefix.length).trim(), 10);
        if (!Number.isNaN(n)) usedNumbers.add(n);
      }
    });
    used.forEach((name) => {
      if (name.startsWith(prefix)) {
        const n = parseInt(name.slice(prefix.length).trim(), 10);
        if (!Number.isNaN(n)) usedNumbers.add(n);
      }
    });
    let next = 1;
    while (usedNumbers.has(next)) next++;
    const name = `${baseName} ${next}`;
    used.add(name);
    return name;
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (!user) {
      toast.error('Faça login para enviar vídeos');
      return;
    }

    // Determine category to assign and base name
    const targetCategoryId =
      filterCategory !== ALL_CATEGORIES && filterCategory !== NO_CATEGORY
        ? filterCategory
        : null;
    const baseName = targetCategoryId
      ? categories.find((c) => c.id === targetCategoryId)?.name ?? 'Exercício'
      : 'Exercício';

    setBulkUploading({ done: 0, total: files.length });
    const usedNames = new Set<string>();
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (!file.type.startsWith('video/')) {
          toast.error(`${file.name}: não é um vídeo`);
          continue;
        }
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name}: maior que 50 MB`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'mp4';
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('exercise-videos')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(path);

        await createExercise.mutateAsync({
          name: generateUniqueName(baseName, usedNames),
          default_sets: 1,
          default_reps: 10,
          image_urls: [],
          video_type: 'upload',
          video_url: pub.publicUrl,
          video_start_seconds: 0,
          video_end_seconds: null,
          category_id: targetCategoryId,
        });
        successCount++;
      } catch (err) {
        console.error('Bulk upload error', err);
        toast.error(`Erro ao enviar ${file.name}`);
      } finally {
        setBulkUploading((prev) => prev && { ...prev, done: prev.done + 1 });
      }
    }

    setBulkUploading(null);
    if (successCount > 0) {
      toast.success(`${successCount} exercício(s) criado(s)`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workouts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Biblioteca de Exercícios</h1>
            <p className="text-sm text-muted-foreground">
              {exercises.length} exercício{exercises.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!!bulkUploading}
            onClick={() => bulkInputRef.current?.click()}
            title="Enviar vários vídeos de uma vez"
          >
            {bulkUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {bulkUploading.done}/{bulkUploading.total}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Vídeos
              </>
            )}
          </Button>
          <Button onClick={() => {
            setEditingExercise(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
          <input
            ref={bulkInputRef}
            type="file"
            accept="video/*"
            multiple
            className="sr-only"
            onChange={handleBulkUpload}
          />
        </div>

        {/* Search + Filter */}
        <div className="px-4 pb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercício..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
            {filterCategory !== ALL_CATEGORIES && filterCategory !== NO_CATEGORY && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                title="Excluir categoria"
                onClick={() => {
                  const cat = categories.find((c) => c.id === filterCategory);
                  if (cat) setCategoryToDelete({ id: cat.id, name: cat.name });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <Dumbbell className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">
                {search || filterCategory !== ALL_CATEGORIES
                  ? 'Nenhum exercício encontrado'
                  : 'Biblioteca vazia'}
              </p>
              <p className="text-sm text-muted-foreground">
                {search || filterCategory !== ALL_CATEGORIES
                  ? 'Tente outro filtro ou termo de busca'
                  : 'Crie seus exercícios para usar nos treinos'}
              </p>
            </div>
            {!search && filterCategory === ALL_CATEGORIES && (
              <Button onClick={() => {
                setEditingExercise(null);
                setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Exercício
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredExercises.map((exercise) => {
              const firstImage = exercise.image_urls?.[0];
              const imageCount = exercise.image_urls?.length || 0;
              const hasVideo = !!exercise.video_url && !!exercise.video_type;
              const categoryName = exercise.category_id
                ? categoryNameMap.get(exercise.category_id)
                : null;

              return (
                <div
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                >
                  <div
                    className={`relative w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0 ${
                      firstImage || hasVideo ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''
                    }`}
                    onClick={() => exercise.image_urls?.length && setZoomImages(exercise.image_urls)}
                  >
                    {firstImage ? (
                      <>
                        <img
                          src={firstImage}
                          alt={exercise.name}
                          className="w-full h-full object-cover"
                        />
                        {imageCount > 1 && (
                          <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-tl flex items-center gap-0.5">
                            <ImageIcon className="h-3 w-3" />
                            {imageCount}
                          </div>
                        )}
                      </>
                    ) : hasVideo ? (
                      <VideoThumbnail
                        videoType={exercise.video_type}
                        videoUrl={exercise.video_url}
                        startSeconds={exercise.video_start_seconds}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{exercise.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        {exercise.default_sets} séries × {exercise.default_reps} reps
                      </p>
                      {categoryName && (
                        <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {categoryName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => handleEdit(exercise)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(exercise)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ExerciseLibraryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingExercise(null);
        }}
        editingExercise={editingExercise}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Excluir exercício?"
        description={`O exercício "${exerciseToDelete?.name}" será removido da biblioteca. Os treinos que usam este exercício não serão afetados.`}
      />

      <ConfirmDeleteDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Excluir categoria?"
        description={`A categoria "${categoryToDelete?.name}" será removida. Os exercícios vinculados continuarão na biblioteca, apenas sem categoria.`}
      />

      <ImageZoomDialog
        images={zoomImages}
        open={zoomImages.length > 0}
        onOpenChange={(open) => !open && setZoomImages([])}
      />
    </div>
  );
}
