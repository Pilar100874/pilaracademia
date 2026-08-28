import { useState, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
// useBodyAnalysisAutorun foi movido para <LibraryBackgroundRunner /> global.
import { ClassificationBadges } from '@/components/ClassificationBadges';
import {
  BodyAnalysisFilter,
  EMPTY_BODY_FILTER,
  bodyFilterIsActive,
  bodyFilterMatches,
  type BodyAnalysisFilterValue,
} from '@/components/BodyAnalysisFilter';
import { ExerciseLibraryDialog } from '@/components/ExerciseLibraryDialog';
import { ManageExtrasDialog } from '@/components/ManageExtrasDialog';
import { BulkExtrasDialog } from '@/components/BulkExtrasDialog';
import { ExtrasPicker } from '@/components/ExtrasPicker';
import { useExerciseExtras } from '@/hooks/useExerciseExtras';
import { ApifySettingsCard } from '@/components/ApifySettingsCard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, ChevronDown, Globe, Copy, Film } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { LazyVideoPreview } from '@/components/LazyVideoPreview';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { VideoPreviewDialog } from '@/components/VideoPreviewDialog';
import { getStorageStatus } from '@/lib/videoCache';
import { getFreshMediaUrl } from '@/lib/mediaUrl';
import { compressVideoFile } from '@/lib/compressVideo';
import { hashBlob, hashUrl } from '@/lib/videoHash';
import { gifToVideoFile, isGifFile } from '@/lib/gifToVideo';
import { exerciseNameFromFilename, translateExerciseNames } from '@/lib/gifNameToExercise';
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
import { Plus, Search, Dumbbell, Edit, Trash2, ImageIcon, ArrowLeft, Tag, Upload, Download, Loader2, CheckSquare, X, FolderInput, Pencil, FolderPlus, Instagram, KeyRound, ExternalLink, CheckCircle2, FileImage } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useBackgroundProgress } from '@/contexts/BackgroundProgressContext';
import { LIB_BG_JOB_ID, LIB_BG_JOB_LABEL, beginImport, endImport } from '@/lib/libraryBgJob';

const ALL_CATEGORIES = '__all__';
const NO_CATEGORY = '__none__';
const NEW_CATEGORY = '__new__';

const hasWebmUrl = (url?: string | null) =>
  !!url && lowerNoQuery(url).endsWith('.webm');

const lowerNoQuery = (url: string) => url.split('?')[0].toLowerCase();

const isUploadVideoOptimized = (ex: Pick<LibraryExercise, 'video_type' | 'video_url' | 'video_optimized_at'>) =>
  ex.video_type === 'upload' && !!ex.video_url && (!!ex.video_optimized_at || hasWebmUrl(ex.video_url));

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { exercises, globalExercises, gifExercises, isLoading, deleteExercise, createExercise, moveExercises, updateExercise, toggleExerciseCategory, copyGlobalToPersonal, isMaster } = useExerciseLibrary();
  const { categories, deleteCategory, createCategory, updateCategory } = useExerciseCategories();
  const { extras, bulkAssignExtra } = useExerciseExtras();

  // Realtime: sincroniza alterações da biblioteca de exercícios entre dispositivos/abas
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('exercise-library-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercise_library', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['exercise-library', user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Auto-análise corporal + otimização de vídeos rodam globalmente em
  // <LibraryBackgroundRunner /> (montado no App.tsx). A barra inline foi
  // removida — o progresso aparece como toast persistente em qualquer página.
  const analysisProgress: { done: number; total: number; current?: string } | null = null;
  const { addWork, tick, remove: removeBgJob } = useBackgroundProgress();

  const [activeTab, setActiveTab] = useState<'mine' | 'global' | 'gif'>('mine');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES);
  const [bodyFilter, setBodyFilter] = useState<BodyAnalysisFilterValue>(EMPTY_BODY_FILTER);
  const [filterExtras, setFilterExtras] = useState<string[]>([]);
  const [filterNoExtras, setFilterNoExtras] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<LibraryExercise | null>(null);
  const [plansForDelete, setPlansForDelete] = useState<string[]>([]);
  const [zoomExercise, setZoomExercise] = useState<LibraryExercise | null>(null);
  const [videoPreview, setVideoPreview] = useState<LibraryExercise | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [bulkUploading, setBulkUploading] = useState<{ done: number; total: number } | null>(null);
  const [recompressing, setRecompressing] = useState<{ done: number; total: number; saved: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [bulkCategoryChoice, setBulkCategoryChoice] = useState<string>(NO_CATEGORY);
  const [newBulkCategoryName, setNewBulkCategoryName] = useState('');
  const [bulkExtras, setBulkExtras] = useState<string[]>([]);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const [gifConverting, setGifConverting] = useState<{ done: number; total: number } | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [zipStatus, setZipStatus] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [bulkExtrasOpen, setBulkExtrasOpen] = useState(false);
  const [moveCategoryChoice, setMoveCategoryChoice] = useState<string>(NO_CATEGORY);
  const [newMoveCategoryName, setNewMoveCategoryName] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteBlocked, setBulkDeleteBlocked] = useState<{
    ids: string[];
    inUse: { id: string; name: string; plans: string[] }[];
  } | null>(null);
  const [bulkDeleteChecking, setBulkDeleteChecking] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exporting, setExporting] = useState<{ done: number; total: number } | null>(null);

  const [renameCategory, setRenameCategory] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameParentId, setRenameParentId] = useState<string | null>(null);
  const [renameGlobal, setRenameGlobal] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [manageExtrasOpen, setManageExtrasOpen] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [newCategoryGlobal, setNewCategoryGlobal] = useState(false);
  const [igDialogOpen, setIgDialogOpen] = useState(false);
  const [igUrl, setIgUrl] = useState('');
  const [igNamePrefix, setIgNamePrefix] = useState('');
  const [igCategoryChoice, setIgCategoryChoice] = useState<string>(NO_CATEGORY);
  const [igNewCategoryName, setIgNewCategoryName] = useState('');
  const [igExtras, setIgExtras] = useState<string[]>([]);
  const [igImporting, setIgImporting] = useState(false);
  const [igProgress, setIgProgress] = useState(0);
  const [igProgressLabel, setIgProgressLabel] = useState('');
  const [igError, setIgError] = useState<string | null>(null);
  const [igPartialErrors, setIgPartialErrors] = useState<string[]>([]);
  const [igResult, setIgResult] = useState<
    | { kind: 'success'; created: number; failed: number; categoryId: string | null }
    | null
  >(null);


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

  const exportSelectedVideos = async () => {
    if (selectedIds.size === 0) return;
    const pool = new Map<string, LibraryExercise>();
    for (const ex of [...exercises, ...(globalExercises ?? []), ...(gifExercises ?? [])]) pool.set(ex.id, ex);

    // Qualquer mídia baixável: vídeo enviado, vídeo do Instagram já convertido
    // para o storage, ou (na ausência de vídeo) a primeira imagem do exercício.
    const isDownloadable = (u?: string | null) =>
      !!u && /^https?:\/\//i.test(u) && !/youtu\.?be|youtube\.com|instagram\.com/i.test(u);

    const targets = Array.from(pool.values())
      .filter((e) => selectedIds.has(e.id))
      .map((e) => {
        if (e.video_type !== 'youtube' && isDownloadable(e.video_url)) {
          return { ex: e, url: e.video_url as string };
        }
        const img = e.image_urls?.find((u) => isDownloadable(u));
        return img ? { ex: e, url: img } : null;
      })
      .filter(Boolean) as { ex: LibraryExercise; url: string }[];

    if (targets.length === 0) {
      toast.error('Nenhuma mídia exportável na seleção (links do YouTube/Instagram não podem ser baixados).');
      return;
    }
    setExporting({ done: 0, total: targets.length });
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const used = new Set<string>();
      let failed = 0;

      const { stripAudioFromBlob } = await import('@/lib/stripAudio');

      for (let i = 0; i < targets.length; i++) {
        const { ex, url: srcUrl } = targets[i];
        try {
          const url = await getFreshMediaUrl(srcUrl);
          const res = await fetch(url);
          if (!res.ok) throw new Error('fetch failed');
          let blob = await res.blob();
          let ext = (lowerNoQuery(srcUrl).split('.').pop() || '').slice(0, 5) || 'mp4';
          const isVideo =
            (blob.type || '').startsWith('video/') ||
            ['mp4', 'webm', 'mov', 'm4v', 'ogg'].includes(ext);
          if (isVideo) {
            const stripped = await stripAudioFromBlob(blob, `video.${ext}`);
            blob = stripped.blob;
            if (stripped.ext) ext = stripped.ext;
          }
          const base = (ex.name || 'exercicio').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'exercicio';
          let fileName = `${base}.${ext}`;
          let n = 2;
          while (used.has(fileName)) fileName = `${base} (${n++}).${ext}`;
          used.add(fileName);
          zip.file(fileName, blob);
        } catch {
          failed++;
        }
        setExporting({ done: i + 1, total: targets.length });
      }


      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      const objUrl = URL.createObjectURL(content);
      a.href = objUrl;
      a.download = `videos-biblioteca-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);

      toast.success(
        `${targets.length - failed} arquivo(s) exportado(s)${failed ? ` — ${failed} falharam` : ''}`
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar arquivos");
    } finally {
      setExporting(null);
    }
  };

  const openBulkDelete = async () => {

    if (selectedIds.size === 0) return;
    setBulkDeleteChecking(true);
    try {
      const ids = Array.from(selectedIds);
      const usage = await checkExerciseUsage(ids);
      const inUse: { id: string; name: string; plans: string[] }[] = [];
      ids.forEach((id) => {
        const plans = usage.get(id);
        if (plans && plans.length > 0) {
          const ex = exercises.find((e) => e.id === id);
          inUse.push({ id, name: ex?.name ?? 'Exercício', plans });
        }
      });
      setBulkDeleteBlocked({ ids, inUse });
      setBulkDeleteOpen(true);
    } catch {
      toast.error('Erro ao verificar uso dos exercícios');
    } finally {
      setBulkDeleteChecking(false);
    }
  };

  const runBulkDelete = async () => {
    if (!bulkDeleteBlocked) return;
    const { ids, inUse } = bulkDeleteBlocked;
    if (!ids.length) {
      setBulkDeleteOpen(false);
      return;
    }
    setBulkDeleting(true);
    try {
      // Cascade-remove from workouts for items in use
      if (inUse.length > 0) {
        const inUseSet = new Set(inUse.map((i) => i.id));
        const toCascade = exercises.filter((e) => inUseSet.has(e.id));
        await Promise.all(toCascade.map((e) => cascadeRemoveFromWorkouts(e)));
      }
      for (const id of ids) {
        await deleteExercise.mutateAsync(id);
      }
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
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

  /**
   * Categorias visíveis na aba atual. A aba "Global Gif" tem o seu próprio
   * conjunto de categorias/subcategorias (`is_gif`), que não aparece em
   * "Meus" nem em "Global" — e vice-versa.
   */
  const scopedCategories = useMemo(
    () => categories.filter((c) => (activeTab === 'gif' ? !!c.is_gif : !c.is_gif)),
    [categories, activeTab],
  );

  // Build hierarchical list (root first, then children indented).
  // Also map descendants for filtering.
  const { orderedCategories, descendantsMap } = useMemo(() => {
    const childrenOf = new Map<string | null, typeof categories>();
    scopedCategories.forEach((c) => {
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
    scopedCategories.forEach((c) => collect(c.id));
    return { orderedCategories: ordered, descendantsMap: descendants };
  }, [scopedCategories]);

  const sourceList =
    activeTab === 'global' ? globalExercises : activeTab === 'gif' ? gifExercises : exercises;
  const filteredExercises = sourceList.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const primaryCategoryIds = ex.category_id
      ? [ex.category_id]
      : ex.category_ids ?? [];
    let matchesCategory = true;
    if (filterCategory === NO_CATEGORY) {
      matchesCategory = primaryCategoryIds.length === 0;
    } else if (filterCategory !== ALL_CATEGORIES) {
      const allowed = descendantsMap.get(filterCategory) ?? new Set([filterCategory]);
      matchesCategory = primaryCategoryIds.some((cid) => allowed.has(cid));
    }
    const matchesBody = bodyFilterMatches(ex.body_analysis, ex.aesthetic_analysis, ex.mobility_analysis, bodyFilter);
    const matchesExtras =
      filterExtras.length === 0 ||
      filterExtras.every((id) => (ex.extra_ids ?? []).includes(id));
    const matchesNoExtras = !filterNoExtras || !ex.extra_ids || ex.extra_ids.length === 0;
    return matchesSearch && matchesCategory && matchesBody && matchesExtras && matchesNoExtras;
  });

  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleConvertInstagram = async (exercise: LibraryExercise) => {
    if (convertingId) return;
    setConvertingId(exercise.id);
    beginImport();
    const tId = toast.loading(`Importando "${exercise.name}" para o storage...`);
    try {
      const { data, error } = await supabase.functions.invoke(
        'convert-instagram-to-storage',
        { body: { exercise_id: exercise.id } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Vídeo importado! Reprodução agora é fluida.', { id: tId });
      await queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
    } catch (e) {
      toast.error(
        `Falha ao importar: ${e instanceof Error ? e.message : 'erro desconhecido'}`,
        { id: tId },
      );
    } finally {
      setConvertingId(null);
      endImport();
    }
  };

  const handleEdit = (exercise: LibraryExercise) => {
    setEditingExercise(exercise);
    setDialogOpen(true);
  };

  // Removes workout_exercises rows that reference this library exercise
  // (matching either by exercise_library_id or legacy by name with null link).
  const cascadeRemoveFromWorkouts = async (ex: LibraryExercise) => {
    await Promise.all([
      supabase.from('workout_exercises').delete().eq('exercise_library_id', ex.id),
      supabase
        .from('workout_exercises')
        .delete()
        .is('exercise_library_id', null)
        .eq('name', ex.name),
    ]);
  };

  const handleDelete = async (exercise: LibraryExercise) => {
    try {
      const usage = await checkExerciseUsage([exercise.id]);
      const plans = usage.get(exercise.id) ?? [];
      setExerciseToDelete(exercise);
      setPlansForDelete(plans);
      setDeleteDialogOpen(true);
    } catch {
      toast.error('Erro ao verificar uso do exercício');
    }
  };

  const confirmDelete = async () => {
    if (exerciseToDelete) {
      if (plansForDelete.length > 0) {
        await cascadeRemoveFromWorkouts(exerciseToDelete);
      }
      await deleteExercise.mutateAsync(exerciseToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setDeleteDialogOpen(false);
      setExerciseToDelete(null);
      setPlansForDelete([]);
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
    setBulkExtras([]);
    setPendingFiles(files);
  };

  /** Importa GIFs animados convertendo-os em vídeo antes do fluxo normal. */
  const handleGifImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (!user) {
      toast.error('Faça login para enviar GIFs');
      return;
    }

    const gifs = files.filter(isGifFile);
    if (!gifs.length) {
      toast.error('Selecione arquivos .gif');
      return;
    }

    setGifConverting({ done: 0, total: gifs.length });
    const converted: File[] = [];
    let failed = 0;
    for (const gif of gifs) {
      try {
        const out = await gifToVideoFile(gif);
        // Já sai otimizado da conversão — evita recompressão que degrada.
        (out as any).__noRecompress = true;
        // Nome derivado do arquivo original (antes de "(female)"/"(male)").
        (out as any).__sourceName = exerciseNameFromFilename(gif.name);
        // Vai para a biblioteca global de GIFs.
        (out as any).__isGif = true;
        converted.push(out);

      } catch (err) {
        console.error('GIF conversion failed', err);
        failed++;
      } finally {
        setGifConverting((prev) => prev && { ...prev, done: prev.done + 1 });
      }
    }
    setGifConverting(null);

    if (failed > 0) {
      toast.warning(`${failed} GIF(s) não puderam ser convertidos.`);
    }
    if (!converted.length) return;

    // Traduz os nomes extraídos dos arquivos para português (IA).
    const withNames = converted.filter((f) => (f as any).__sourceName);
    if (withNames.length) {
      const translated = await translateExerciseNames(
        withNames.map((f) => (f as any).__sourceName as string),
      );
      withNames.forEach((f, i) => {
        (f as any).__desiredName = translated[i];
      });
    }


    const initial =
      filterCategory !== ALL_CATEGORIES && filterCategory !== NO_CATEGORY
        ? filterCategory
        : NO_CATEGORY;
    setBulkCategoryChoice(initial);
    setNewBulkCategoryName('');
    setBulkExtras([]);
    setPendingFiles(converted);
  };


  /**
   * Importa um .zip com GIFs animados. Cada pasta do zip vira uma categoria
   * (e subpastas viram subcategorias) da biblioteca **Global Gif**, com o
   * nome traduzido para português do Brasil.
   */
  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      toast.error('Faça login para importar');
      return;
    }

    let zipReader: any = null;
    try {
      setZipStatus('Lendo arquivo...');
      // Leitura em streaming (random access no File) — suporta zips de vários GB
      // sem carregar tudo na memória, ao contrário do JSZip.
      const { ZipReader, BlobReader, BlobWriter, configure } = await import('@zip.js/zip.js');
      configure({ useWebWorkers: true });
      zipReader = new ZipReader(new BlobReader(file));
      const zipEntries = await zipReader.getEntries();

      type Entry = { path: string[]; name: string; obj: any };
      const entries: Entry[] = [];
      for (const entry of zipEntries) {
        if (entry.directory) continue;
        const parts = entry.filename.split('/').filter(Boolean);
        const fileName = parts.pop() as string;
        if (!fileName || fileName.startsWith('.')) continue;
        if (!/\.gif$/i.test(fileName)) continue;
        entries.push({ path: parts, name: fileName, obj: entry });
      }


      if (!entries.length) {
        toast.error('Nenhum GIF encontrado no zip');
        setZipStatus(null);
        return;
      }

      // Se o zip tiver uma única pasta raiz envolvendo tudo, ignora-a.
      const roots = new Set(entries.map((en) => en.path[0] ?? ''));
      if (roots.size === 1 && !roots.has('')) {
        entries.forEach((en) => en.path.shift());
      }

      // --- Categorias a partir das pastas (traduzidas) ---
      setZipStatus('Traduzindo categorias...');
      const folderNames = Array.from(
        new Set(entries.flatMap((en) => en.path).filter(Boolean)),
      );
      let translatedFolders: string[] = folderNames;
      if (folderNames.length) {
        translatedFolders = await translateExerciseNames(
          folderNames.map((f) => f.replace(/[-_]+/g, ' ').trim()),
        );
      }
      const folderLabel = new Map<string, string>();
      folderNames.forEach((f, i) => folderLabel.set(f, (translatedFolders[i] || f).trim()));

      // Cria/reaproveita as categorias GIF por caminho.
      const catByPath = new Map<string, string>();
      const findExisting = (name: string, parentId: string | null) =>
        categories.find(
          (c) =>
            !!c.is_gif &&
            (c.parent_id ?? null) === parentId &&
            c.name.toLowerCase() === name.toLowerCase(),
        )?.id ?? null;

      const ensureCategory = async (path: string[]): Promise<string | null> => {
        let parentId: string | null = null;
        for (let i = 0; i < path.length; i++) {
          const key = path.slice(0, i + 1).join('/');
          const cached = catByPath.get(key);
          if (cached) {
            parentId = cached;
            continue;
          }
          const label = folderLabel.get(path[i]) || path[i];
          let id = findExisting(label, parentId);
          if (!id) {
            const created = await createCategory.mutateAsync({
              name: label,
              parent_id: parentId,
              is_gif: true,
              is_global: isMaster,
            });
            id = created.id;
          }
          catByPath.set(key, id);
          parentId = id;
        }
        return parentId;
      };

      let failedZip = 0;
      // --- Nomes dos exercícios (traduzidos em lotes) ---

      setZipStatus('Traduzindo nomes...');
      const rawNames = entries.map((en) => exerciseNameFromFilename(en.name) || en.name);
      const finalNames: string[] = [...rawNames];
      const CHUNK = 80;
      for (let i = 0; i < rawNames.length; i += CHUNK) {
        const slice = rawNames.slice(i, i + CHUNK);
        try {
          const out = await translateExerciseNames(slice);
          out.forEach((n, j) => {
            if (n && n.trim()) finalNames[i + j] = n.trim();
          });
        } catch {
          /* mantém original */
        }
      }

      // --- Conversão + upload, um GIF por vez (streaming) ---
      setZipStatus(null);
      setBulkUploading({ done: 0, total: entries.length });
      beginImport();
      const usedNames = new Set<string>();
      const sessionHashes = new Set<string>();
      let successCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < entries.length; i++) {
        const en = entries[i];
        try {
          const categoryId = await ensureCategory(en.path);
          const blob: Blob = await en.obj.getData(new BlobWriter('image/gif'));
          const gifFile = new File([blob], en.name, { type: 'image/gif' });
          const toUpload = await gifToVideoFile(gifFile);

          let videoHash: string | null = null;
          try { videoHash = await hashBlob(toUpload); } catch { /* ignore */ }

          if (videoHash) {
            if (sessionHashes.has(videoHash)) {
              duplicateCount++;
              continue;
            }
            const { data: existing } = await supabase
              .from('exercise_library')
              .select('id')
              .eq('video_hash', videoHash)
              .or(`user_id.eq.${user.id},is_global.eq.true`)
              .limit(1)
              .maybeSingle();
            if (existing) {
              duplicateCount++;
              continue;
            }
            sessionHashes.add(videoHash);
          }

          const ext = (toUpload.name.split('.').pop() || 'webm').toLowerCase();
          const path = `${user.id}/${Date.now()}-${i}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('exercise-videos')
            .upload(path, toUpload, { contentType: toUpload.type || 'video/webm', upsert: false });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from('exercise-videos').getPublicUrl(path);

          const desired = finalNames[i];
          let candidate = desired;
          let n = 2;
          while (usedNames.has(candidate)) candidate = `${desired} ${n++}`;
          usedNames.add(candidate);

          await createExercise.mutateAsync({
            name: candidate,
            default_sets: 1,
            default_reps: 10,
            image_urls: [],
            video_type: 'upload',
            video_url: pub.publicUrl,
            video_optimized_at: new Date().toISOString(),
            video_hash: videoHash,
            video_start_seconds: 0,
            video_end_seconds: null,
            category_id: categoryId,
            is_gif: true,
            is_global: true,
            _silent: true,
          });
          successCount++;
        } catch (err) {
          console.error('ZIP gif import failed', en.name, err);
          failedZip++;
        } finally {
          setBulkUploading((prev) => prev && { ...prev, done: prev.done + 1 });
        }
      }

      setBulkUploading(null);
      endImport();
      if (successCount > 0) toast.success(`${successCount} exercício(s) importado(s) do ZIP`);
      if (duplicateCount > 0) toast.warning(`${duplicateCount} GIF(s) ignorado(s) por já existirem.`);
      if (failedZip > 0) toast.warning(`${failedZip} GIF(s) não puderam ser importados.`);
      if (!successCount && !duplicateCount) toast.error('Nenhum GIF pôde ser importado do ZIP');
    } catch (err) {
      console.error('ZIP import failed', err);
      toast.error('Erro ao ler o arquivo zip');
      setZipStatus(null);
      setGifConverting(null);
      setBulkUploading(null);
      endImport();
    } finally {
      try {
        await zipReader?.close();
      } catch {
        /* ignore */
      }
    }
  };



  const runInstagramImport = async () => {
    if (!user) return;
    const url = igUrl.trim();
    if (!url) {
      toast.error('Cole a URL do post do Instagram');
      return;
    }

    // Bloqueia importação quando o armazenamento do dispositivo está cheio —
    // o navegador pode travar ("Algo deu errado") ao baixar o vídeo.
    const storage = await getStorageStatus();
    if (storage.low) {
      const detalhe =
        storage.freeMB !== null
          ? ` Restam apenas ~${storage.freeMB}MB livres no navegador.`
          : '';
      toast.error(
        `Espaço insuficiente no dispositivo para baixar o vídeo.${detalhe} Libere espaço no celular (apague fotos/apps ou limpe o cache do navegador) e tente novamente.`,
        { duration: 8000 }
      );
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
    beginImport();
    setIgError(null);
    setIgPartialErrors([]);
    setIgResult(null);
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
        return;
      }
      if (!data?.success) {
        const msg = data?.error || 'Nenhum vídeo importado';
        setIgError(msg);
        if (Array.isArray(data?.errors)) setIgPartialErrors(data.errors);
        return;
      }

      const partial = Array.isArray(data?.errors) ? data.errors : [];
      if (partial.length > 0) setIgPartialErrors(partial);

      // Atualiza a lista de exercícios imediatamente
      await queryClient.invalidateQueries({ queryKey: ['exercise-library'] });

      // Ajusta filtro para mostrar onde os novos foram parar
      if (targetCategoryId) {
        setFilterCategory(targetCategoryId);
      } else {
        setFilterCategory(ALL_CATEGORIES);
      }

      // Salva resultado para mostrar tela final dentro do dialog
      setIgResult({
        kind: 'success',
        created: data.created_count ?? 0,
        failed: partial.length,
        categoryId: targetCategoryId,
      });

      // Auto-otimiza os vídeos recém-importados em background (re-codifica
      // para 720p WebM no navegador para carregarem mais rápido).
      let createdList = Array.isArray(data?.created) ? data.created : [];

      // Detecta duplicatas: hashea cada vídeo recém-criado e remove
      // os que já existiam na biblioteca (ou que aparecem mais de uma
      // vez no próprio lote do IG).
      if (createdList.length > 0) {
        const dupRemoved: { id: string; name: string; existing?: string }[] = [];
        const seen = new Map<string, { id: string; name: string }>();
        const kept: any[] = [];
        for (const c of createdList) {
          const h = c.video_url ? await hashUrl(c.video_url) : null;
          if (!h) {
            kept.push(c);
            continue;
          }
          // Duplicado dentro do mesmo lote
          if (seen.has(h)) {
            dupRemoved.push({ id: c.id, name: c.name, existing: seen.get(h)!.name });
            continue;
          }
          // Duplicado contra exercícios anteriores no banco
          const { data: existing } = await supabase
            .from('exercise_library')
            .select('id, name')
            .eq('video_hash', h)
            .neq('id', c.id)
            .or(`user_id.eq.${user.id},is_global.eq.true`)
            .limit(1)
            .maybeSingle();
          if (existing) {
            dupRemoved.push({ id: c.id, name: c.name, existing: (existing as any).name });
            continue;
          }
          // Salva o hash no recém-criado para futuras checagens
          await supabase
            .from('exercise_library')
            .update({ video_hash: h } as never)
            .eq('id', c.id);
          seen.set(h, { id: c.id, name: c.name });
          kept.push(c);
        }
        if (dupRemoved.length > 0) {
          // Apaga os duplicados criados (e seus arquivos no storage)
          for (const d of dupRemoved) {
            try {
              await deleteExercise.mutateAsync(d.id);
            } catch (err) { console.warn('[ig-dup] delete failed', d.id, err); }
          }
          toast.warning(
            `${dupRemoved.length} vídeo(s) duplicado(s) descartado(s) — já existem na biblioteca.`,
          );
          await queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
        }
        createdList = kept;
      }

      // Apply selected equipment to each newly created exercise
      if (createdList.length > 0 && igExtras.length > 0) {
        const ids = createdList.map((c: any) => c.id).filter(Boolean);
        if (ids.length > 0) {
          await Promise.all(
            igExtras.map((extraId) =>
              bulkAssignExtra.mutateAsync({
                extraId,
                exerciseIds: ids,
                mode: 'add',
                silent: true,
                skipInvalidate: true,
              })
            )
          );
          await queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
        }
      }
      if (createdList.length > 0) {
        const toCompress: LibraryExercise[] = createdList.map((c: any) => ({
          id: c.id,
          name: c.name,
          video_type: 'upload',
          video_url: c.video_url,
          video_optimized_at: c.video_optimized_at ?? null,
        } as LibraryExercise));
        // Don't await — let it run in background while the user continues
        recompressExercises(toCompress, { silent: true }).catch((err) =>
          console.error('Auto-compress after IG import failed', err)
        );
      }
    } catch (e) {
      clearInterval(progressTimer);
      console.error(e);
      const msg = (e as Error)?.message || 'Erro ao importar do Instagram';
      setIgError(msg);
      toast.error(msg);
    } finally {
      clearInterval(progressTimer);
      setIgImporting(false);
      endImport();
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
        const created = await createCategory.mutateAsync({
          name,
          is_gif: activeTab === 'gif',
          is_global: isMaster && activeTab === 'gif',
        });
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
    beginImport();
    const usedNames = new Set<string>();
    let successCount = 0;
    let duplicateCount = 0;
    const sessionHashes = new Set<string>();

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

        // Compress to ~720p WebM in the browser before upload. Falls back
        // to the original file if the browser can't transcode.
        let toUpload: File = file;
        try {
          toUpload = (file as any).__noRecompress ? file : await compressVideoFile(file);
        } catch {
          toUpload = file;
        }


        // Hashea os bytes que SERÃO armazenados (pós-compressão) — assim
        // bate com o hash dos vídeos já otimizados na biblioteca.
        // Também tenta um hash do arquivo bruto como fallback (caso o
        // mesmo arquivo já tenha sido importado anteriormente quando a
        // compressão ainda não estava ativa).
        let videoHash: string | null = null;
        let rawHash: string | null = null;
        try { videoHash = await hashBlob(toUpload); } catch { /* ignore */ }
        try { if (toUpload !== file) rawHash = await hashBlob(file); } catch { /* ignore */ }

        const candidateHashes = [videoHash, rawHash].filter(Boolean) as string[];
        if (candidateHashes.length > 0) {
          // Já importado nesta mesma sessão?
          if (candidateHashes.some((h) => sessionHashes.has(h))) {
            toast.warning(`${file.name}: vídeo duplicado — não importado.`);
            duplicateCount++;
            continue;
          }
          // Já existe no banco? (próprios + globais visíveis)
          const { data: existing } = await supabase
            .from('exercise_library')
            .select('id, name')
            .in('video_hash', candidateHashes)
            .or(`user_id.eq.${user.id},is_global.eq.true`)
            .limit(1)
            .maybeSingle();
          if (existing) {
            toast.warning(
              `${file.name}: já existe como "${(existing as any).name}" — não importado.`,
            );
            duplicateCount++;
            continue;
          }
          for (const h of candidateHashes) sessionHashes.add(h);
        }

        const ext = (toUpload.name.split('.').pop() || 'mp4').toLowerCase();
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('exercise-videos')
          .upload(path, toUpload, { contentType: toUpload.type || file.type, upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(path);
        const optimizedAt = hasWebmUrl(pub.publicUrl) || toUpload === file ? new Date().toISOString() : null;

        const created = await createExercise.mutateAsync({
          name: (() => {
            const desired = ((file as any).__desiredName as string | undefined)?.trim();
            if (!desired) return generateUniqueName(baseName, usedNames);
            let candidate = desired;
            let n = 2;
            while (usedNames.has(candidate)) candidate = `${desired} ${n++}`;
            usedNames.add(candidate);
            return candidate;
          })(),
          default_sets: 1,
          default_reps: 10,
          image_urls: [],
          video_type: 'upload',
          video_url: pub.publicUrl,
          video_optimized_at: optimizedAt,
          video_hash: videoHash,
          video_start_seconds: 0,
          video_end_seconds: null,
          category_id: ((file as any).__categoryId as string | undefined) ?? targetCategoryId,
          is_gif: !!(file as any).__isGif,
          is_global: (file as any).__isGif ? true : undefined,
          _silent: true,
        });
        // Apply selected extras to the new exercise
        const newId = (created as any)?.id;
        if (newId && bulkExtras.length) {
          await Promise.all(
            bulkExtras.map((extraId) =>
              bulkAssignExtra.mutateAsync({ extraId, exerciseIds: [newId], mode: 'add', silent: true })
            )
          );
        }
        successCount++;
      } catch (err) {
        console.error('Bulk upload error', err);
        toast.error(`Erro ao enviar ${file.name}`);
      } finally {
        setBulkUploading((prev) => prev && { ...prev, done: prev.done + 1 });
      }
    }

    setBulkUploading(null);
    endImport();
    setBulkExtras([]);
    if (successCount > 0) {
      toast.success(`${successCount} exercício(s) criado(s)`);
    }
    if (duplicateCount > 0) {
      toast.warning(
        `${duplicateCount} vídeo(s) ignorado(s) por já existirem na biblioteca.`,
      );
    }
  };

  /**
   * Re-encodes a list of 'upload' exercises in-browser to 720p WebM and
   * replaces the storage object + video_url. Used automatically after
   * Instagram imports (since the edge function uploads the original MP4).
   */
  const recompressExercises = async (
    list: LibraryExercise[],
    opts: { silent?: boolean } = {}
  ) => {
    if (!user) return;
    const candidates = list.filter(
      (ex) => ex.video_type === 'upload' && !!ex.video_url && !isUploadVideoOptimized(ex)
    );
    if (candidates.length === 0) {
      if (!opts.silent) toast.info('Nenhum vídeo para otimizar');
      return;
    }

    setRecompressing({ done: 0, total: candidates.length, saved: 0 });
    addWork(LIB_BG_JOB_ID, LIB_BG_JOB_LABEL, candidates.length);
    let savedBytes = 0;
    let successCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const ex = candidates[i];
      try {
        const url = ex.video_url!;
        const res = await fetch(url);
        if (!res.ok) throw new Error('download failed');
        const blob = await res.blob();
        const origSize = blob.size;
        const origName = url.split('/').pop()?.split('?')[0] || `video-${i}.mp4`;
        const inputFile = new File([blob], origName, {
          type: blob.type || 'video/mp4',
        });

        const compressed = await compressVideoFile(inputFile);
        if (compressed === inputFile || compressed.size >= origSize) {
          const checkedAt = new Date().toISOString();
          await supabase
            .from('exercise_library')
            .update({ video_optimized_at: checkedAt } as never)
            .eq('id', ex.id);
          // `done` será incrementado pelo bloco `finally` abaixo.
          continue;
        }

        const path = `${user.id}/${Date.now()}-rc-${i}.webm`;
        const { error: upErr } = await supabase.storage
          .from('exercise-videos')
          .upload(path, compressed, {
            contentType: 'video/webm',
            upsert: false,
          });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(path);

        const { error: updErr } = await supabase
          .from('exercise_library')
          .update({ video_url: pub.publicUrl, video_optimized_at: new Date().toISOString() } as never)
          .eq('id', ex.id);
        if (updErr) throw updErr;

        // Best-effort delete of the old object
        try {
          const marker = '/exercise-videos/';
          const idx = url.indexOf(marker);
          if (idx >= 0) {
            const oldPath = url.substring(idx + marker.length).split('?')[0];
            await supabase.storage.from('exercise-videos').remove([oldPath]);
          }
        } catch {
          // ignore — orphan cleanup
        }

        savedBytes += origSize - compressed.size;
        successCount++;
      } catch (err) {
        console.error('Recompress error', err);
      } finally {
        setRecompressing((p) =>
          p ? { ...p, done: p.done + 1, saved: savedBytes } : p
        );
        tick(LIB_BG_JOB_ID, ex.name);
      }
    }

    setRecompressing(null);
    queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
    if (!opts.silent && successCount > 0) {
      const mb = (savedBytes / (1024 * 1024)).toFixed(1);
      toast.success(`${successCount} vídeo(s) otimizado(s) — ${mb} MB economizado(s)`);
    }
  };

  /**
   * Background auto-optimizer: recompresses legacy MP4 'upload' videos a few
   * at a time while the user is on the library page. Runs only when the tab
   * is visible to save bandwidth/battery. Marks attempted IDs in
   * sessionStorage so failures aren't retried in a loop.
   */
  const optimizeAllVideos = async () => {
    if (!user) return;
    if (recompressing) return;

    const FAILED_KEY = 'pilar:autocompress-failed';
    // Reset failed list when manually triggered, so user can retry everything
    try { sessionStorage.removeItem(FAILED_KEY); } catch { /* ignore */ }

    const queue = exercises.filter(
      (ex) =>
        ex.video_type === 'upload' &&
        !!ex.video_url &&
        !isUploadVideoOptimized(ex)
    );
    if (queue.length === 0) {
      toast.success('Não há vídeos pendentes de otimização.');
      return;
    }

    const addFailed = (id: string) => {
      try {
        const raw = sessionStorage.getItem(FAILED_KEY);
        const s = new Set<string>(raw ? JSON.parse(raw) : []);
        s.add(id);
        sessionStorage.setItem(FAILED_KEY, JSON.stringify([...s]));
      } catch { /* ignore */ }
    };

    let totalSaved = 0;
    let successCount = 0;
    let skippedCount = 0;
    let failCount = 0;

    const runOne = async (ex: LibraryExercise): Promise<'converted' | 'checked' | 'failed'> => {
      try {
        const url = ex.video_url!;
        const res = await fetch(url);
        if (!res.ok) throw new Error('download failed');
        const blob = await res.blob();
        const origSize = blob.size;
        const inputFile = new File([blob], 'video.mp4', {
          type: blob.type || 'video/mp4',
        });
        const compressed = await compressVideoFile(inputFile);
        if (compressed === inputFile || compressed.size >= origSize) {
          const checkedAt = new Date().toISOString();
          const { error: updErr } = await supabase
            .from('exercise_library')
            .update({ video_optimized_at: checkedAt } as never)
            .eq('id', ex.id);
          if (updErr) throw updErr;
          queryClient.setQueryData<LibraryExercise[]>(
            ['exercise-library', user.id],
            (old) => old?.map((e) => (e.id === ex.id ? { ...e, video_optimized_at: checkedAt } : e)) ?? old
          );
          return 'checked';
        }
        const path = `${user.id}/${Date.now()}-auto.webm`;
        const { error: upErr } = await supabase.storage
          .from('exercise-videos')
          .upload(path, compressed, { contentType: 'video/webm', upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from('exercise-videos')
          .getPublicUrl(path);
        const optimizedAt = new Date().toISOString();
        const { error: updErr } = await supabase
          .from('exercise_library')
          .update({ video_url: pub.publicUrl, video_optimized_at: optimizedAt } as never)
          .eq('id', ex.id);
        if (updErr) throw updErr;
        totalSaved += origSize - compressed.size;
        // Atualiza o cache local imediatamente — assim, se o usuário fechar a aba,
        // ao reabrir o vídeo já estará marcado como otimizado (.webm) e não será refeito.
        queryClient.setQueryData<LibraryExercise[]>(
          ['exercise-library', user.id],
          (old) => old?.map((e) => (e.id === ex.id ? { ...e, video_url: pub.publicUrl, video_optimized_at: optimizedAt } : e)) ?? old
        );
        try {
          const marker = '/exercise-videos/';
          const idx = url.indexOf(marker);
          if (idx >= 0) {
            const oldPath = url.substring(idx + marker.length).split('?')[0];
            await supabase.storage.from('exercise-videos').remove([oldPath]);
          }
        } catch { /* ignore */ }
        return 'converted';
      } catch (err) {
        console.warn('Optimize failed for', ex.id, err);
        addFailed(ex.id);
        return 'failed';
      }
    };

    setRecompressing({ done: 0, total: queue.length, saved: 0 });
    addWork(LIB_BG_JOB_ID, LIB_BG_JOB_LABEL, queue.length);
    let done = 0;
    for (const ex of queue) {
      const result = await runOne(ex);
      if (result === 'converted') successCount++;
      else if (result === 'checked') skippedCount++;
      else failCount++;
      done++;
      setRecompressing({ done, total: queue.length, saved: totalSaved });
      tick(LIB_BG_JOB_ID, ex.name);
    }
    setRecompressing(null);
    queryClient.invalidateQueries({ queryKey: ['exercise-library'] });
    toast.success(
      `Otimização concluída: ${successCount} convertidos, ${skippedCount} já estavam no melhor formato, ${failCount} falharam${
        totalSaved > 0 ? ` — ${(totalSaved / (1024 * 1024)).toFixed(1)} MB economizados` : ''
      }.`
    );
  };

  const pendingOptimizationCount = exercises.filter(
    (ex) =>
      ex.video_type === 'upload' &&
      !!ex.video_url &&
      !isUploadVideoOptimized(ex)
  ).length;



  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="flex items-center gap-3 p-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workouts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold break-words line-clamp-2">Biblioteca de Exercícios</h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'global'
                ? `${globalExercises.length} global${globalExercises.length !== 1 ? 'is' : ''}`
                : activeTab === 'gif'
                  ? `${gifExercises.length} GIF${gifExercises.length !== 1 ? 's' : ''} global${gifExercises.length !== 1 ? 'is' : ''}`
                  : `${exercises.length} exercício${exercises.length !== 1 ? 's' : ''}`}
              {isMaster && activeTab !== 'mine' && ' • você é o curador'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
          {!selectionMode && pendingOptimizationCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!recompressing}
              onClick={optimizeAllVideos}
              title={`${pendingOptimizationCount} vídeo(s) pendente(s) de otimização`}
            >
              {recompressing
                ? `Otimizando... ${recompressing.done}/${recompressing.total}`
                : `Otimizar ${pendingOptimizationCount} vídeo${pendingOptimizationCount !== 1 ? 's' : ''}`}
            </Button>
          )}
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
                variant="outline"
                disabled={selectedIds.size === 0}
                onClick={() => setBulkExtrasOpen(true)}
              >
                <Dumbbell className="h-4 w-4 mr-1" />
                Equipar ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedIds.size === 0 || exporting !== null}
                onClick={exportSelectedVideos}
                title="Baixar os vídeos selecionados em um arquivo .zip"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                {exporting
                  ? `Exportando ${exporting.done}/${exporting.total}`
                  : `Exportar (${selectedIds.size})`}
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
                disabled={!!gifConverting || !!bulkUploading}
                onClick={() => gifInputRef.current?.click()}
                title="Importar vários GIFs animados como vídeo"
              >
                {gifConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {gifConverting.done}/{gifConverting.total}
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4 mr-1" />
                    GIFs
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!gifConverting || !!bulkUploading || !!zipStatus}
                onClick={() => zipInputRef.current?.click()}
                title="Importar um .zip com GIFs — as pastas viram categorias"
              >
                {zipStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {zipStatus}
                  </>
                ) : (
                  <>
                    <FolderInput className="h-4 w-4 mr-1" />
                    ZIP de GIFs
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
                  setIgExtras([]);
                  setIgUrl('');
                  setIgNamePrefix('');
                  setIgError(null);
                  setIgPartialErrors([]);
                  setIgResult(null);
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
          <input
            ref={gifInputRef}
            type="file"
            accept="image/gif,.gif"
            multiple
            className="sr-only"
            onChange={handleGifImport}
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            onChange={handleZipImport}
          />
          </div>
        </div>

        {/* Tabs: Mine / Global / Global GIF */}
        <div className="px-4 pb-2">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'mine' | 'global' | 'gif'); setFilterCategory(ALL_CATEGORIES); exitSelectionMode(); }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mine">Meus ({exercises.length})</TabsTrigger>
              <TabsTrigger value="global" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Global ({globalExercises.length})
              </TabsTrigger>
              <TabsTrigger value="gif" className="flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5" />
                Global Gif ({gifExercises.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Search + Filter (sticky) */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3 space-y-2 shadow-sm">
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
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              title="Gerenciar equipamentos extras"
              onClick={() => setManageExtrasOpen(true)}
            >
              <Dumbbell className="h-4 w-4" />
            </Button>
            <BodyAnalysisFilter value={bodyFilter} onChange={setBodyFilter} compact />
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
                      setRenameParentId(cat.parent_id ?? null);
                      setRenameGlobal(!!cat.is_global);
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
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Filtrar por equipamento
              </span>
              {(filterExtras.length > 0 || filterNoExtras) && (
                <button
                  type="button"
                  onClick={() => { setFilterExtras([]); setFilterNoExtras(false); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <ExtrasPicker
              selectedIds={filterExtras}
              onToggle={(id) =>
                setFilterExtras((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
              noneSelected={filterNoExtras}
              onToggleNone={() => setFilterNoExtras((v) => !v)}
              allowCreate={false}
              compact
              emptyHint="Crie equipamentos no botão 🏋️ acima."
            />
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
              const firstImage = getFreshMediaUrl(exercise.image_urls?.[0]);
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
                        setZoomExercise(exercise);
                      }
                    }}
                  >
                    {firstImage ? (
                      <>
                        <img
                          src={firstImage}
                          alt={exercise.name}
                          loading="lazy"
                          decoding="async"
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
                      <LazyVideoPreview
                        videoType={exercise.video_type}
                        videoUrl={exercise.video_url}
                        startSeconds={exercise.video_start_seconds}
                        endSeconds={exercise.video_end_seconds}
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
                      <ClassificationBadges
                        body={exercise.body_analysis}
                        mobility={exercise.mobility_analysis}
                        aesthetic={exercise.aesthetic_analysis}
                        perDimension={2}
                        className="pt-0.5"
                      />
                    </div>

                    {!selectionMode && (
                      <div className="flex flex-col -mr-1 -mt-1 shrink-0">
                        {exercise.video_type === 'instagram' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-primary hover:text-primary"
                            title="Importar vídeo do Instagram para o storage (mais rápido)"
                            disabled={convertingId === exercise.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvertInstagram(exercise);
                            }}
                          >
                            {convertingId === exercise.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
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

      <ManageExtrasDialog
        open={manageExtrasOpen}
        onOpenChange={setManageExtrasOpen}
      />

      <BulkExtrasDialog
        open={bulkExtrasOpen}
        onOpenChange={setBulkExtrasOpen}
        exerciseIds={Array.from(selectedIds)}
        onDone={exitSelectionMode}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) { setExerciseToDelete(null); setPlansForDelete([]); }
        }}
        onConfirm={confirmDelete}
        title="Excluir exercício?"
        description={
          plansForDelete.length > 0
            ? `"${exerciseToDelete?.name}" está sendo usado em ${plansForDelete.length} treino(s): ${plansForDelete.join(', ')}. Ao excluir, ele também será removido desses treinos. Deseja continuar?`
            : `O exercício "${exerciseToDelete?.name}" será removido da biblioteca.`
        }
      />

      <ConfirmDeleteDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Excluir categoria?"
        description={`A categoria "${categoryToDelete?.name}" será removida. Os exercícios vinculados continuarão na biblioteca, apenas sem categoria.`}
      />

      {(() => {
        const imageList = filteredExercises.filter(
          (ex) => (ex.image_urls?.length ?? 0) > 0
        );
        const zoomIndex = zoomExercise
          ? imageList.findIndex((ex) => ex.id === zoomExercise.id)
          : -1;
        const goZoom = (delta: number) => {
          if (zoomIndex < 0) return;
          const next = imageList[zoomIndex + delta];
          if (next) setZoomExercise(next);
        };
        return (
          <ImageZoomDialog
            images={zoomExercise?.image_urls ?? []}
            open={!!zoomExercise}
            onOpenChange={(open) => !open && setZoomExercise(null)}
            name={zoomExercise?.name}
            onPrev={() => goZoom(-1)}
            onNext={() => goZoom(1)}
            hasPrev={zoomIndex > 0}
            hasNext={zoomIndex >= 0 && zoomIndex < imageList.length - 1}
            position={
              zoomIndex >= 0
                ? { current: zoomIndex + 1, total: imageList.length }
                : undefined
            }
          />
        );
      })()}
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

        // Build flat list of categories for the multi-pick pills (no "no category" option in multi-mode)
        const categoryOptions = orderedCategories.map(({ cat }) => ({
          id: cat.id,
          name: cat.name,
          parentId: cat.parent_id ?? null,
        }));

        const handleToggleCategory = (categoryId: string, checked: boolean) => {
          if (!videoPreview) return;
          toggleExerciseCategory.mutate({
            exerciseId: videoPreview.id,
            categoryId,
            checked,
          });
        };

        const handleToggleExtra = (extraId: string, checked: boolean) => {
          if (!videoPreview) return;
          bulkAssignExtra.mutate({
            extraId,
            exerciseIds: [videoPreview.id],
            mode: checked ? 'add' : 'remove',
            silent: true,
          });
        };

        const currentLib = videoPreview
          ? exercises.find((e) => e.id === videoPreview.id)
          : undefined;

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
            currentCategoryIds={currentLib?.category_ids ?? []}
            categoryOptions={categoryOptions}
            onToggleCategory={handleToggleCategory}
            currentExtraIds={currentLib?.extra_ids ?? []}
            extraOptions={(() => {
              // Lista somente equipamentos efetivamente utilizados na
              // biblioteca (pelo menos 1 exercício referencia) + os já
              // marcados no exercício atual (para permitir desmarcar).
              const usedIds = new Set<string>();
              for (const ex of [...exercises, ...(globalExercises ?? []), ...(gifExercises ?? [])]) {
                for (const id of ex.extra_ids ?? []) usedIds.add(id);
              }
              for (const id of currentLib?.extra_ids ?? []) usedIds.add(id);
              return extras
                .filter((e) => usedIds.has(e.id))
                .map((e) => ({ id: e.id, name: e.name }));
            })()}
            onToggleExtra={handleToggleExtra}
            bodyAnalysis={
              videoPreview ? videoList.find((e) => e.id === videoPreview.id)?.body_analysis ?? videoPreview.body_analysis ?? null : null
            }
            aestheticAnalysis={
              videoPreview ? videoList.find((e) => e.id === videoPreview.id)?.aesthetic_analysis ?? videoPreview.aesthetic_analysis ?? null : null
            }
            mobilityAnalysis={
              videoPreview ? videoList.find((e) => e.id === videoPreview.id)?.mobility_analysis ?? videoPreview.mobility_analysis ?? null : null
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
              {bulkDeleteBlocked && bulkDeleteBlocked.ids.length > 0
                ? `${bulkDeleteBlocked.ids.length} exercício(s) serão removidos da biblioteca.`
                : 'Nenhum exercício selecionado.'}
            </DialogDescription>
          </DialogHeader>
          {bulkDeleteBlocked && bulkDeleteBlocked.inUse.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-destructive">
                {bulkDeleteBlocked.inUse.length} exercício(s) em uso — também serão removidos dos treinos:
              </p>
              <ul className="space-y-1 text-sm">
                {bulkDeleteBlocked.inUse.map((b) => (
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
                bulkDeleteBlocked.ids.length === 0
              }
            >
              {bulkDeleting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Excluindo...</>
              ) : (
                `Excluir ${bulkDeleteBlocked?.ids.length ?? 0}`
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
            setBulkExtras([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categoria e equipamentos</DialogTitle>
            <DialogDescription>
              {pendingFiles?.length} vídeo(s) selecionado(s). Escolha a categoria e (opcional) os equipamentos usados.
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
            <div className="space-y-2">
              <Label>Equipamentos extras <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <ExtrasPicker
                selectedIds={bulkExtras}
                onToggle={(id) =>
                  setBulkExtras((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Será aplicado a todos os exercícios criados nesse upload.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingFiles(null);
                setNewBulkCategoryName('');
                setBulkExtras([]);
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

      {/* Rename / move category dialog */}
      <Dialog
        open={!!renameCategory}
        onOpenChange={(open) => {
          if (!open) {
            setRenameCategory(null);
            setRenameValue('');
            setRenameParentId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Renomeie ou mova "{renameCategory?.name}" para dentro de outra categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Nome da categoria"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria pai</Label>
              <Select
                value={renameParentId ?? '__root__'}
                onValueChange={(v) => setRenameParentId(v === '__root__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">— Sem pai (raiz) —</SelectItem>
                  {(() => {
                    if (!renameCategory) return null;
                    // Disallow self and descendants to prevent cycles
                    const forbidden =
                      descendantsMap.get(renameCategory.id) ?? new Set([renameCategory.id]);
                    return orderedCategories
                      .filter(({ cat }) => !forbidden.has(cat.id))
                      .map(({ cat, depth }) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {'— '.repeat(depth)}
                          {cat.name}
                        </SelectItem>
                      ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            {isMaster && (
              <label className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs cursor-pointer">
                <Checkbox
                  checked={renameGlobal}
                  onCheckedChange={(v) => setRenameGlobal(v === true)}
                />
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Publicar como <strong>global</strong> (visível a todos os usuários)</span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCategory(null)}>
              Cancelar
            </Button>
            <Button
              disabled={(() => {
                if (updateCategory.isPending) return true;
                if (!renameValue.trim()) return true;
                const cat = categories.find((c) => c.id === renameCategory?.id);
                const nameUnchanged = renameValue.trim() === cat?.name;
                const parentUnchanged =
                  (renameParentId ?? null) === (cat?.parent_id ?? null);
                const globalUnchanged = renameGlobal === !!cat?.is_global;
                return nameUnchanged && parentUnchanged && globalUnchanged;
              })()}
              onClick={async () => {
                if (!renameCategory) return;
                const cat = categories.find((c) => c.id === renameCategory.id);
                const update: { id: string; name?: string; parent_id?: string | null; is_global?: boolean } = {
                  id: renameCategory.id,
                };
                if (renameValue.trim() !== cat?.name) update.name = renameValue.trim();
                if ((renameParentId ?? null) !== (cat?.parent_id ?? null)) {
                  update.parent_id = renameParentId;
                }
                if (isMaster && renameGlobal !== !!cat?.is_global) {
                  update.is_global = renameGlobal;
                }
                try {
                  await updateCategory.mutateAsync(update);
                  setRenameCategory(null);
                  setRenameValue('');
                  setRenameParentId(null);
                  setRenameGlobal(false);
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
            setNewCategoryGlobal(false);
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
          {isMaster && (
            <label className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs cursor-pointer">
              <Checkbox
                checked={newCategoryGlobal}
                onCheckedChange={(v) => setNewCategoryGlobal(v === true)}
              />
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Publicar como <strong>global</strong> (visível a todos os usuários)</span>
            </label>
          )}
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
                    is_global: isMaster && newCategoryGlobal,
                    is_gif: activeTab === 'gif',
                  });
                  setCreateCategoryOpen(false);
                  setNewCategoryValue('');
                  setNewCategoryParentId(null);
                  setNewCategoryGlobal(false);
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
            setIgResult(null);
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
          {igResult ? (
            // Tela de resultado final (sucesso)
            <div className="py-2 space-y-3">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="rounded-full bg-green-500/15 p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
                </div>
                <p className="text-base font-semibold">
                  {igResult.created} vídeo(s) importado(s) com sucesso
                </p>
                <p className="text-sm text-muted-foreground">
                  {igResult.categoryId
                    ? 'Os exercícios foram adicionados à categoria selecionada.'
                    : 'Os exercícios foram salvos sem categoria.'}
                  {' '}A biblioteca já foi atualizada.
                </p>
                {igResult.failed > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {igResult.failed} vídeo(s) falharam (veja detalhes abaixo)
                  </p>
                )}
              </div>
              {igPartialErrors.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1 max-h-40 overflow-auto">
                  <p className="font-medium">Detalhes das falhas:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {igPartialErrors.map((err, i) => (
                      <li key={i} className="break-words">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
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
                <div className="space-y-2">
                  <Label>Equipamentos extras <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
                  <ExtrasPicker
                    selectedIds={igExtras}
                    onToggle={(id) =>
                      setIgExtras((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Será aplicado a todos os exercícios importados.
                  </p>
                </div>

                {/* Configuração do token Apify — visível apenas para o master (pilar). Demais usuários usam o token compartilhado do servidor automaticamente. */}
                {isMaster && (
                  <Collapsible>
                    <CollapsibleTrigger
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      disabled={igImporting}
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Configurar token Apify (avançado)
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <ApifySettingsCard />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Barra de progresso durante o import */}
              {igImporting && (
                <div className="space-y-1 mt-3">
                  <Progress value={igProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {igProgressLabel} {Math.round(igProgress)}%
                  </p>
                </div>
              )}

              {/* Erro principal */}
              {igError && !igImporting && (
                <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium mb-1">Falha ao importar</p>
                  <p className="break-words whitespace-pre-wrap">{igError}</p>
                </div>
              )}

              {/* Erros parciais antes de qualquer sucesso */}
              {igPartialErrors.length > 0 && !igImporting && (
                <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1 max-h-40 overflow-auto">
                  <p className="font-medium">Alguns vídeos falharam:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {igPartialErrors.map((err, i) => (
                      <li key={i} className="break-words">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            {igResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIgResult(null);
                    setIgError(null);
                    setIgPartialErrors([]);
                    setIgUrl('');
                    setIgNamePrefix('');
                    setIgExtras([]);
                  }}
                >
                  Importar outro
                </Button>
                <Button
                  onClick={() => {
                    // Garante que o filtro fica na categoria onde os vídeos foram importados
                    setFilterCategory(igResult.categoryId ?? NO_CATEGORY);
                    setIgDialogOpen(false);
                  }}
                >
                  Fechar
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
