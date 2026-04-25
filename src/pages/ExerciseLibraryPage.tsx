import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { VideoPreviewDialog } from '@/components/VideoPreviewDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Dumbbell, Edit, Trash2, ImageIcon, ArrowLeft, Tag, Upload, Loader2, CheckSquare, X, FolderInput, Pencil, FolderPlus, Instagram, KeyRound, ExternalLink, CheckCircle2 } from 'lucide-react';
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
  const { exercises, isLoading, deleteExercise, createExercise, moveExercises } = useExerciseLibrary();
  const { categories, deleteCategory, createCategory, updateCategory } = useExerciseCategories();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<LibraryExercise | null>(null);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<LibraryExercise | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [bulkUploading, setBulkUploading] = useState<{ done: number; total: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [bulkCategoryChoice, setBulkCategoryChoice] = useState<string>(NO_CATEGORY);
  const [newBulkCategoryName, setNewBulkCategoryName] = useState('');
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveCategoryChoice, setMoveCategoryChoice] = useState<string>(NO_CATEGORY);
  const [newMoveCategoryName, setNewMoveCategoryName] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteBlocked, setBulkDeleteBlocked] = useState<{
    deletableIds: string[];
    blocked: { id: string; name: string; plans: string[] }[];
  } | null>(null);
  const [bulkDeleteChecking, setBulkDeleteChecking] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [renameCategory, setRenameCategory] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [igDialogOpen, setIgDialogOpen] = useState(false);
  const [igUrl, setIgUrl] = useState('');
  const [igNamePrefix, setIgNamePrefix] = useState('');
  const [igCategoryChoice, setIgCategoryChoice] = useState<string>(NO_CATEGORY);
  const [igNewCategoryName, setIgNewCategoryName] = useState('');
  const [igImporting, setIgImporting] = useState(false);
  const [igProgress, setIgProgress] = useState(0);
  const [igProgressLabel, setIgProgressLabel] = useState('');
  const [igError, setIgError] = useState<string | null>(null);
  const [igPartialErrors, setIgPartialErrors] = useState<string[]>([]);



  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const runMoveSelected = async () => {
    let targetCategoryId: string | null = null;
    if (moveCategoryChoice === NEW_CATEGORY) {
      const name = newMoveCategoryName.trim();
      if (!name) {
        toast.error('Informe o nome da nova categoria');
        return;
      }
      try {
        const created = await createCategory.mutateAsync(name);
        targetCategoryId = created.id;
      } catch {
        return;
      }
    } else if (moveCategoryChoice !== NO_CATEGORY) {
      targetCategoryId = moveCategoryChoice;
    }
    await moveExercises.mutateAsync({
      ids: Array.from(selectedIds),
      category_id: targetCategoryId,
    });
    setMoveDialogOpen(false);
    setNewMoveCategoryName('');
    exitSelectionMode();
  };

  // Check which exercise IDs are referenced by any workout plan.
  // Matches by exercise_library_id (new entries) AND by name (legacy entries
  // added before we started persisting the link).
  const checkExerciseUsage = async (
    ids: string[]
  ): Promise<Map<string, string[]>> => {
    const usage = new Map<string, string[]>();
    if (!ids.length) return usage;

    const targetExercises = exercises.filter((e) => ids.includes(e.id));
    const names = Array.from(new Set(targetExercises.map((e) => e.name)));

    const [byIdRes, byNameRes] = await Promise.all([
      supabase
        .from('workout_exercises')
        .select('exercise_library_id, name, workout_plans(name)')
        .in('exercise_library_id', ids),
      names.length
        ? supabase
            .from('workout_exercises')
            .select('exercise_library_id, name, workout_plans(name)')
            .in('name', names)
        : Promise.resolve({ data: [] as any[], error: null } as any),
    ]);
    if (byIdRes.error) {
      console.error('Usage check failed', byIdRes.error);
      throw byIdRes.error;
    }
    if (byNameRes.error) {
      console.error('Usage check (name) failed', byNameRes.error);
      throw byNameRes.error;
    }

    const addUse = (exId: string, planName?: string) => {
      const list = usage.get(exId) ?? [];
      if (planName && !list.includes(planName)) list.push(planName);
      usage.set(exId, list);
    };

    (byIdRes.data ?? []).forEach((row: any) => {
      const exId = row.exercise_library_id as string | null;
      if (!exId) return;
      addUse(exId, row.workout_plans?.name);
    });

    const nameToIds = new Map<string, string[]>();
    targetExercises.forEach((e) => {
      const arr = nameToIds.get(e.name) ?? [];
      arr.push(e.id);
      nameToIds.set(e.name, arr);
    });
    (byNameRes.data ?? []).forEach((row: any) => {
      if (row.exercise_library_id && ids.includes(row.exercise_library_id)) return;
      const matchIds = nameToIds.get(row.name) ?? [];
      matchIds.forEach((exId) => addUse(exId, row.workout_plans?.name));
    });

    return usage;
  };

  const openBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteChecking(true);
    try {
      const ids = Array.from(selectedIds);
      const usage = await checkExerciseUsage(ids);
      const deletableIds: string[] = [];
      const blocked: { id: string; name: string; plans: string[] }[] = [];
      ids.forEach((id) => {
        const plans = usage.get(id);
        const ex = exercises.find((e) => e.id === id);
        if (plans && plans.length > 0) {
          blocked.push({ id, name: ex?.name ?? 'Exercício', plans });
        } else {
          deletableIds.push(id);
        }
      });
      setBulkDeleteBlocked({ deletableIds, blocked });
      setBulkDeleteOpen(true);
    } catch {
      toast.error('Erro ao verificar uso dos exercícios');
    } finally {
      setBulkDeleteChecking(false);
    }
  };

  const runBulkDelete = async () => {
    if (!bulkDeleteBlocked) return;
    const { deletableIds } = bulkDeleteBlocked;
    if (!deletableIds.length) {
      setBulkDeleteOpen(false);
      return;
    }
    setBulkDeleting(true);
    try {
      for (const id of deletableIds) {
        await deleteExercise.mutateAsync(id);
      }
      setBulkDeleteOpen(false);
      setBulkDeleteBlocked(null);
      exitSelectionMode();
    } catch {
      // toast handled in mutation
    } finally {
      setBulkDeleting(false);
    }
  };

  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  // Build hierarchical list (root first, then children indented).
  // Also map descendants for filtering.
  const { orderedCategories, descendantsMap } = useMemo(() => {
    const childrenOf = new Map<string | null, typeof categories>();
    categories.forEach((c) => {
      const key = c.parent_id ?? null;
      const arr = childrenOf.get(key) ?? [];
      arr.push(c);
      childrenOf.set(key, arr);
    });
    const ordered: { cat: typeof categories[number]; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const list = (childrenOf.get(parentId) ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      list.forEach((c) => {
        ordered.push({ cat: c, depth });
        walk(c.id, depth + 1);
      });
    };
    walk(null, 0);

    const descendants = new Map<string, Set<string>>();
    const collect = (id: string): Set<string> => {
      if (descendants.has(id)) return descendants.get(id)!;
      const set = new Set<string>([id]);
      (childrenOf.get(id) ?? []).forEach((child) => {
        collect(child.id).forEach((d) => set.add(d));
      });
      descendants.set(id, set);
      return set;
    };
    categories.forEach((c) => collect(c.id));
    return { orderedCategories: ordered, descendantsMap: descendants };
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

  const handleDelete = async (exercise: LibraryExercise) => {
    try {
      const usage = await checkExerciseUsage([exercise.id]);
      const plans = usage.get(exercise.id);
      if (plans && plans.length > 0) {
        toast.error(
          `Não é possível excluir: usado em ${plans.length} treino(s) — ${plans.join(', ')}`
        );
        return;
      }
      setExerciseToDelete(exercise);
      setDeleteDialogOpen(true);
    } catch {
      toast.error('Erro ao verificar uso do exercício');
    }
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

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (!user) {
      toast.error('Faça login para enviar vídeos');
      return;
    }
    // Pre-select category from current filter when applicable
    const initial =
      filterCategory !== ALL_CATEGORIES && filterCategory !== NO_CATEGORY
        ? filterCategory
        : NO_CATEGORY;
    setBulkCategoryChoice(initial);
    setNewBulkCategoryName('');
    setPendingFiles(files);
  };

  const runInstagramImport = async () => {
    if (!user) return;
    const url = igUrl.trim();
    if (!url) {
      toast.error('Cole a URL do post do Instagram');
      return;
    }

    let targetCategoryId: string | null = null;
    if (igCategoryChoice === NEW_CATEGORY) {
      const name = igNewCategoryName.trim();
      if (!name) {
        toast.error('Informe o nome da nova categoria');
        return;
      }
      try {
        const created = await createCategory.mutateAsync(name);
        targetCategoryId = created.id;
      } catch {
        return;
      }
    } else if (igCategoryChoice !== NO_CATEGORY) {
      targetCategoryId = igCategoryChoice;
    }

    setIgImporting(true);
    setIgError(null);
    setIgPartialErrors([]);
    setIgProgress(5);
    setIgProgressLabel('Conectando ao Instagram...');
    // Simula progresso enquanto a edge function trabalha (não há streaming)
    const progressTimer = setInterval(() => {
      setIgProgress((p) => {
        if (p < 30) {
          setIgProgressLabel('Conectando ao Instagram...');
          return p + 2;
        }
        if (p < 70) {
          setIgProgressLabel('Baixando vídeo(s)...');
          return p + 1.5;
        }
        if (p < 92) {
          setIgProgressLabel('Enviando para a biblioteca...');
          return p + 0.5;
        }
        return p;
      });
    }, 250);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke('import-instagram', {
        body: {
          url,
          category_id: targetCategoryId,
          name_prefix: igNamePrefix.trim() || undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      clearInterval(progressTimer);
      setIgProgress(100);
      setIgProgressLabel('Concluído');

      if (error) {
        // Tenta extrair payload de erro do edge function
        const ctx = (error as any).context;
        let payload: any = null;
        try {
          if (ctx && typeof ctx.json === 'function') payload = await ctx.json();
        } catch { /* ignore */ }
        const msg = payload?.error || error.message || 'Falha ao importar do Instagram';
        setIgError(msg);
        toast.error(msg);
        return; // mantém o dialog aberto para o usuário ver o erro
      }
      if (!data?.success) {
        const msg = data?.error || 'Nenhum vídeo importado';
        setIgError(msg);
        if (Array.isArray(data?.errors)) setIgPartialErrors(data.errors);
        toast.error(msg);
        return;
      }

      // Sucesso parcial: alguns vídeos falharam
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        setIgPartialErrors(data.errors);
        toast.warning(
          `${data.created_count} importado(s), ${data.errors.length} falharam`
        );
      } else {
        toast.success(`${data.created_count} vídeo(s) importado(s) do Instagram`);
      }
      // Ajusta o filtro para mostrar onde os novos exercícios foram parar
      if (targetCategoryId) {
        setFilterCategory(targetCategoryId);
      } else {
        setFilterCategory(ALL_CATEGORIES);
      }
      setIgDialogOpen(false);
      setIgUrl('');
      setIgNamePrefix('');
      setIgNewCategoryName('');
    } catch (e) {
      clearInterval(progressTimer);
      console.error(e);
      const msg = (e as Error)?.message || 'Erro ao importar do Instagram';
      setIgError(msg);
      toast.error(msg);
    } finally {
      clearInterval(progressTimer);
      setIgImporting(false);
      setTimeout(() => {
        setIgProgress(0);
        setIgProgressLabel('');
      }, 400);
    }
  };

  const runBulkUpload = async () => {
    if (!pendingFiles || !user) return;
    const files = pendingFiles;

    // Resolve target category (create new if requested)
    let targetCategoryId: string | null = null;
    if (bulkCategoryChoice === NEW_CATEGORY) {
      const name = newBulkCategoryName.trim();
      if (!name) {
        toast.error('Informe o nome da nova categoria');
        return;
      }
      try {
        const created = await createCategory.mutateAsync(name);
        targetCategoryId = created.id;
      } catch {
        return;
      }
    } else if (bulkCategoryChoice !== NO_CATEGORY) {
      targetCategoryId = bulkCategoryChoice;
    }

    const baseName = targetCategoryId
      ? categories.find((c) => c.id === targetCategoryId)?.name ??
        (bulkCategoryChoice === NEW_CATEGORY ? newBulkCategoryName.trim() : 'Exercício')
      : 'Exercício';

    setPendingFiles(null);
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
        <div className="flex items-center gap-3 p-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workouts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">Biblioteca de Exercícios</h1>
            <p className="text-sm text-muted-foreground">
              {exercises.length} exercício{exercises.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
          {selectionMode ? (
            <>
              <Button variant="outline" size="sm" onClick={exitSelectionMode}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              {(() => {
                const allSelected =
                  filteredExercises.length > 0 &&
                  filteredExercises.every((ex) => selectedIds.has(ex.id));
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filteredExercises.length === 0}
                    onClick={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (allSelected) {
                          filteredExercises.forEach((ex) => next.delete(ex.id));
                        } else {
                          filteredExercises.forEach((ex) => next.add(ex.id));
                        }
                        return next;
                      });
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    {allSelected ? 'Limpar' : 'Todos'}
                  </Button>
                );
              })()}
              <Button
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  setMoveCategoryChoice(NO_CATEGORY);
                  setNewMoveCategoryName('');
                  setMoveDialogOpen(true);
                }}
              >
                <FolderInput className="h-4 w-4 mr-1" />
                Mover ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedIds.size === 0 || bulkDeleteChecking}
                onClick={openBulkDelete}
              >
                {bulkDeleteChecking ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Excluir ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
                title="Selecionar para mover"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Selecionar
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIgUrl('');
                  setIgNamePrefix('');
                  setIgCategoryChoice(
                    filterCategory !== ALL_CATEGORIES &&
                      filterCategory !== NO_CATEGORY
                      ? filterCategory
                      : NO_CATEGORY
                  );
                  setIgNewCategoryName('');
                  setIgDialogOpen(true);
                }}
                title="Importar vídeos de um post do Instagram"
              >
                <Instagram className="h-4 w-4 mr-1" />
                Instagram
              </Button>
              <Button onClick={() => {
                setEditingExercise(null);
                setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </>
          )}
          <input
            ref={bulkInputRef}
            type="file"
            accept="video/*"
            multiple
            className="sr-only"
            onChange={handleBulkUpload}
          />
          </div>
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
                {orderedCategories.map(({ cat, depth }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span style={{ paddingLeft: depth * 12 }}>
                      {depth > 0 ? '↳ ' : ''}{cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              title="Criar categoria"
              onClick={() => {
                setNewCategoryValue('');
                setNewCategoryParentId(null);
                setCreateCategoryOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            {filterCategory !== ALL_CATEGORIES && filterCategory !== NO_CATEGORY && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  title="Criar subcategoria"
                  onClick={() => {
                    setNewCategoryValue('');
                    setNewCategoryParentId(filterCategory);
                    setCreateCategoryOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  title="Renomear categoria"
                  onClick={() => {
                    const cat = categories.find((c) => c.id === filterCategory);
                    if (cat) {
                      setRenameValue(cat.name);
                      setRenameCategory({ id: cat.id, name: cat.name });
                    }
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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
              </>
            )}
          </div>
        </div>
        {bulkUploading && (
          <div className="px-4 pb-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando vídeos... {bulkUploading.done}/{bulkUploading.total}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round((bulkUploading.done / Math.max(bulkUploading.total, 1)) * 100)}%
              </span>
            </div>
            <Progress
              value={(bulkUploading.done / Math.max(bulkUploading.total, 1)) * 100}
              className="h-2"
            />
          </div>
        )}
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
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredExercises.map((exercise) => {
              const firstImage = exercise.image_urls?.[0];
              const imageCount = exercise.image_urls?.length || 0;
              const hasVideo = !!exercise.video_url && !!exercise.video_type;
              const categoryName = exercise.category_id
                ? categoryNameMap.get(exercise.category_id)
                : null;

              const isSelected = selectedIds.has(exercise.id);
              const mediaClickable = !selectionMode && (firstImage || hasVideo);
              return (
                <div
                  key={exercise.id}
                  onClick={selectionMode ? () => toggleSelected(exercise.id) : undefined}
                  className={`group flex flex-col rounded-xl border bg-card overflow-hidden transition-colors ${
                    selectionMode ? 'cursor-pointer' : ''
                  } ${isSelected ? 'border-primary ring-2 ring-primary/40' : ''}`}
                >
                  <div
                    className={`relative w-full overflow-hidden ${
                      firstImage || hasVideo
                        ? 'h-48 sm:h-52 lg:h-56 bg-muted/40 flex items-center justify-center p-2 sm:p-3'
                        : 'aspect-video bg-muted'
                    } ${mediaClickable ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      if (selectionMode) return;
                      e.stopPropagation();
                      if (hasVideo) {
                        setVideoPreview(exercise);
                      } else if (exercise.image_urls?.length) {
                        setZoomImages(exercise.image_urls);
                      }
                    }}
                  >
                    {firstImage ? (
                      <>
                        <img
                          src={firstImage}
                          alt={exercise.name}
                          loading="lazy"
                          className="max-h-[16rem] w-full object-contain"
                        />
                        {imageCount > 1 && (
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
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
                        objectFit="contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}

                    {selectionMode && (
                      <div className="absolute top-1.5 left-1.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(exercise.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-background/90 border-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold text-sm leading-tight line-clamp-2">{exercise.name}</p>
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

                    {!selectionMode && (
                      <div className="flex flex-col -mr-1 -mt-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleEdit(exercise); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(exercise); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
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

      {/* Full-screen video preview popup with prev/next navigation */}
      {(() => {
        const videoList = filteredExercises.filter(
          (ex) => ex.video_url && ex.video_type
        );
        const currentIndex = videoPreview
          ? videoList.findIndex((ex) => ex.id === videoPreview.id)
          : -1;
        const goTo = (delta: number) => {
          if (currentIndex < 0) return;
          const next = videoList[currentIndex + delta];
          if (next) setVideoPreview(next);
        };
        return (
          <VideoPreviewDialog
            open={!!videoPreview}
            onOpenChange={(open) => !open && setVideoPreview(null)}
            name={videoPreview?.name}
            videoType={videoPreview?.video_type}
            videoUrl={videoPreview?.video_url}
            startSeconds={videoPreview?.video_start_seconds}
            endSeconds={videoPreview?.video_end_seconds}
            onPrev={() => goTo(-1)}
            onNext={() => goTo(1)}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex >= 0 && currentIndex < videoList.length - 1}
            position={
              currentIndex >= 0
                ? { current: currentIndex + 1, total: videoList.length }
                : undefined
            }
          />
        );
      })()}

      {/* Bulk delete dialog */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) setBulkDeleteBlocked(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir exercícios?</DialogTitle>
            <DialogDescription>
              {bulkDeleteBlocked && bulkDeleteBlocked.deletableIds.length > 0
                ? `${bulkDeleteBlocked.deletableIds.length} exercício(s) serão removidos da biblioteca.`
                : 'Nenhum dos selecionados pode ser excluído.'}
            </DialogDescription>
          </DialogHeader>
          {bulkDeleteBlocked && bulkDeleteBlocked.blocked.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-destructive">
                {bulkDeleteBlocked.blocked.length} exercício(s) em uso e serão ignorados:
              </p>
              <ul className="space-y-1 text-sm">
                {bulkDeleteBlocked.blocked.map((b) => (
                  <li key={b.id} className="text-muted-foreground">
                    <span className="text-foreground font-medium">{b.name}</span>
                    {' '}— treino(s): {b.plans.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={runBulkDelete}
              disabled={
                bulkDeleting ||
                !bulkDeleteBlocked ||
                bulkDeleteBlocked.deletableIds.length === 0
              }
            >
              {bulkDeleting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Excluindo...</>
              ) : (
                `Excluir ${bulkDeleteBlocked?.deletableIds.length ?? 0}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move selected exercises dialog */}
      <Dialog
        open={moveDialogOpen}
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) setNewMoveCategoryName('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover exercícios</DialogTitle>
            <DialogDescription>
              {selectedIds.size} exercício(s) selecionado(s). Escolha a categoria de destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Categoria de destino</Label>
              <Select value={moveCategoryChoice} onValueChange={setMoveCategoryChoice}>
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
                  <SelectItem value={NEW_CATEGORY}>+ Criar nova categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moveCategoryChoice === NEW_CATEGORY && (
              <div className="space-y-2">
                <Label>Nome da nova categoria</Label>
                <Input
                  autoFocus
                  placeholder="Ex.: Peito, Costas, Pernas..."
                  value={newMoveCategoryName}
                  onChange={(e) => setNewMoveCategoryName(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={runMoveSelected}
              disabled={
                moveExercises.isPending ||
                (moveCategoryChoice === NEW_CATEGORY && !newMoveCategoryName.trim())
              }
            >
              {moveExercises.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Movendo...</>
              ) : 'Mover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk upload category picker */}
      <Dialog
        open={!!pendingFiles}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFiles(null);
            setNewBulkCategoryName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categoria dos vídeos</DialogTitle>
            <DialogDescription>
              {pendingFiles?.length} vídeo(s) selecionado(s). Escolha em qual categoria criar os exercícios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={bulkCategoryChoice}
                onValueChange={setBulkCategoryChoice}
              >
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
                  <SelectItem value={NEW_CATEGORY}>+ Criar nova categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bulkCategoryChoice === NEW_CATEGORY && (
              <div className="space-y-2">
                <Label>Nome da nova categoria</Label>
                <Input
                  autoFocus
                  placeholder="Ex.: Peito, Costas, Pernas..."
                  value={newBulkCategoryName}
                  onChange={(e) => setNewBulkCategoryName(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingFiles(null);
                setNewBulkCategoryName('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={runBulkUpload}
              disabled={
                bulkCategoryChoice === NEW_CATEGORY && !newBulkCategoryName.trim()
              }
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename category dialog */}
      <Dialog
        open={!!renameCategory}
        onOpenChange={(open) => {
          if (!open) {
            setRenameCategory(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear categoria</DialogTitle>
            <DialogDescription>
              Atualize o nome de "{renameCategory?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Novo nome</Label>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Nome da categoria"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCategory(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                updateCategory.isPending ||
                !renameValue.trim() ||
                renameValue.trim() === renameCategory?.name
              }
              onClick={async () => {
                if (!renameCategory) return;
                try {
                  await updateCategory.mutateAsync({
                    id: renameCategory.id,
                    name: renameValue.trim(),
                  });
                  setRenameCategory(null);
                  setRenameValue('');
                } catch {
                  // toast handled in hook
                }
              }}
            >
              {updateCategory.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</>
              ) : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create category dialog */}
      <Dialog
        open={createCategoryOpen}
        onOpenChange={(open) => {
          setCreateCategoryOpen(open);
          if (!open) {
            setNewCategoryValue('');
            setNewCategoryParentId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newCategoryParentId ? 'Nova subcategoria' : 'Nova categoria'}
            </DialogTitle>
            <DialogDescription>
              {newCategoryParentId
                ? `Será criada dentro de "${categoryNameMap.get(newCategoryParentId) ?? ''}".`
                : 'Crie uma categoria para organizar seus exercícios.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Categoria pai (opcional)</Label>
              <Select
                value={newCategoryParentId ?? NO_CATEGORY}
                onValueChange={(v) => setNewCategoryParentId(v === NO_CATEGORY ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Nenhuma (categoria raiz)</SelectItem>
                  {orderedCategories.map(({ cat, depth }) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span style={{ paddingLeft: depth * 12 }}>
                        {depth > 0 ? '↳ ' : ''}{cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                autoFocus
                value={newCategoryValue}
                onChange={(e) => setNewCategoryValue(e.target.value)}
                placeholder="Ex.: Peito, Costas, Pernas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={createCategory.isPending || !newCategoryValue.trim()}
              onClick={async () => {
                try {
                  const created = await createCategory.mutateAsync({
                    name: newCategoryValue.trim(),
                    parent_id: newCategoryParentId,
                  });
                  setCreateCategoryOpen(false);
                  setNewCategoryValue('');
                  setNewCategoryParentId(null);
                  setFilterCategory(created.id);
                } catch {
                  // toast handled in hook
                }
              }}
            >
              {createCategory.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Criando...</>
              ) : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Instagram import dialog */}
      <Dialog
        open={igDialogOpen}
        onOpenChange={(open) => {
          if (igImporting) return;
          if (!open) {
            setIgError(null);
            setIgPartialErrors([]);
          }
          setIgDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar do Instagram</DialogTitle>
            <DialogDescription>
              Cole a URL de um post ou reel público. Se for carrossel, todos os vídeos serão importados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>URL do post</Label>
              <Input
                autoFocus
                placeholder="https://www.instagram.com/p/..."
                value={igUrl}
                onChange={(e) => setIgUrl(e.target.value)}
                disabled={igImporting}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome (opcional)</Label>
              <Input
                placeholder="Ex.: Agachamento Búlgaro"
                value={igNamePrefix}
                onChange={(e) => setIgNamePrefix(e.target.value)}
                disabled={igImporting}
              />
              <p className="text-xs text-muted-foreground">
                Se vier mais de um vídeo, será numerado: "Nome (1)", "Nome (2)"...
              </p>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={igCategoryChoice}
                onValueChange={setIgCategoryChoice}
                disabled={igImporting}
              >
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
                  <SelectItem value={NEW_CATEGORY}>+ Criar nova categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {igCategoryChoice === NEW_CATEGORY && (
              <div className="space-y-2">
                <Label>Nome da nova categoria</Label>
                <Input
                  placeholder="Ex.: Peito, Costas, Pernas..."
                  value={igNewCategoryName}
                  onChange={(e) => setIgNewCategoryName(e.target.value)}
                  disabled={igImporting}
                />
              </div>
            )}
          </div>



          {/* Barra de progresso durante o import */}
          {igImporting && (
            <div className="space-y-1">
              <Progress value={igProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {igProgressLabel} {Math.round(igProgress)}%
              </p>
            </div>
          )}

          {/* Erro principal */}
          {igError && !igImporting && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium mb-1">Falha ao importar</p>
              <p className="break-words whitespace-pre-wrap">{igError}</p>
            </div>
          )}

          {/* Erros parciais (quando alguns vídeos falharam) */}
          {igPartialErrors.length > 0 && !igImporting && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1 max-h-40 overflow-auto">
              <p className="font-medium">Alguns vídeos falharam:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {igPartialErrors.map((err, i) => (
                  <li key={i} className="break-words">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIgDialogOpen(false)}
              disabled={igImporting}
            >
              Cancelar
            </Button>
            <Button onClick={runInstagramImport} disabled={igImporting || !igUrl.trim()}>
              {igImporting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Importando...</>
              ) : (
                <><Instagram className="h-4 w-4 mr-1" /> Importar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
