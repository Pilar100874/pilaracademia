import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Dumbbell, Play, Maximize2, CheckCircle2, X, Filter, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { getFreshMediaUrl } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

export interface PickableExercise {
  id: string;
  name: string;
  image_urls: string[] | null;
  default_sets: number;
  default_reps: number;
  video_url: string | null;
  video_type: string | null;
  video_start_seconds?: number | null;
  video_end_seconds?: number | null;
  category_id?: string | null;
  is_global?: boolean;
}

export interface PickableCategory {
  id: string;
  name: string;
  is_global?: boolean;
}

const ALL = '__all__';
const NONE = '__none__';
const GLOBAL = '__global__';
const CLINIC = '__clinic__';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: PickableExercise[];
  categories: PickableCategory[];
  onConfirm: (selected: PickableExercise[]) => void | Promise<void>;
  /** When true, shows tab to filter Global vs Clinic exercises (used in clinic scope). */
  showOriginFilter?: boolean;
  title?: string;
  confirmLabel?: (count: number) => string;
}

export function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  categories,
  onConfirm,
  showOriginFilter,
  title = 'Adicionar exercícios',
  confirmLabel,
}: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [originFilter, setOriginFilter] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Fullscreen zoom navigator: index within `filtered`
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const [zoomImgIdx, setZoomImgIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset on close
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelected(new Set());
      setSearch('');
      setCategoryFilter(ALL);
      setOriginFilter(ALL);
      setZoomIdx(null);
      setZoomImgIdx(0);
      setShowVideo(false);
    }
    onOpenChange(o);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (categoryFilter === NONE && ex.category_id) return false;
      if (categoryFilter !== ALL && categoryFilter !== NONE && ex.category_id !== categoryFilter) return false;
      if (showOriginFilter) {
        if (originFilter === GLOBAL && !ex.is_global) return false;
        if (originFilter === CLINIC && ex.is_global) return false;
      }
      return true;
    });
  }, [exercises, search, categoryFilter, originFilter, showOriginFilter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allSelected = filtered.every((ex) => selected.has(ex.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((ex) => next.delete(ex.id));
      else filtered.forEach((ex) => next.add(ex.id));
      return next;
    });
  };

  const handleConfirm = async () => {
    const picks = exercises.filter((ex) => selected.has(ex.id));
    if (!picks.length) return;
    setSubmitting(true);
    try {
      await onConfirm(picks);
      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-5xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              {title}
              {selected.size > 0 && (
                <Badge variant="secondary" className="ml-1">{selected.size} selecionado{selected.size === 1 ? '' : 's'}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Search + filters */}
          <div className="px-4 sm:px-5 py-3 border-b space-y-2 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercício..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
                autoFocus
              />
            </div>

            {/* Category chips */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <button
                  onClick={() => setCategoryFilter(ALL)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                    categoryFilter === ALL
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border',
                  )}
                >
                  Todos
                </button>
                <button
                  onClick={() => setCategoryFilter(NONE)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                    categoryFilter === NONE
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border',
                  )}
                >
                  Sem categoria
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                      categoryFilter === c.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border',
                    )}
                  >
                    {c.name}
                    {c.is_global && <span className="ml-1 opacity-60">🌐</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Origin filter */}
            {showOriginFilter && (
              <div className="flex items-center gap-1.5">
                {[
                  { v: ALL, label: 'Todos' },
                  { v: CLINIC, label: 'Da clínica' },
                  { v: GLOBAL, label: 'Globais 🌐' },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setOriginFilter(o.v)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                      originFilter === o.v
                        ? 'bg-secondary text-secondary-foreground border-secondary'
                        : 'bg-background hover:bg-muted border-border',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>{filtered.length} exercício{filtered.length === 1 ? '' : 's'}</span>
              <button
                onClick={toggleAllVisible}
                disabled={!filtered.length}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {filtered.every((ex) => selected.has(ex.id)) && filtered.length > 0
                  ? 'Desmarcar visíveis'
                  : 'Selecionar visíveis'}
              </button>
            </div>
          </div>

          {/* Grid */}
          <ScrollArea className="flex-1 px-4 sm:px-5 py-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Nenhum exercício encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filtered.map((ex, fIdx) => {
                  const isSelected = selected.has(ex.id);
                  const hasImg = (ex.image_urls?.length ?? 0) > 0;
                  const hasVideo = !!ex.video_url;
                  return (
                    <div
                      key={ex.id}
                      className={cn(
                        'group relative rounded-xl border overflow-hidden bg-card cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40 shadow-md'
                          : 'hover:border-primary/40 hover:shadow-sm',
                      )}
                      onClick={() => toggle(ex.id)}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-square bg-muted/40 flex items-center justify-center">
                        {hasImg ? (
                          <img
                            src={ex.image_urls![0]}
                            alt={ex.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Dumbbell className="h-10 w-10 text-muted-foreground/50" />
                        )}

                        {/* Selection overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-primary fill-primary-foreground" />
                          </div>
                        )}

                        {/* Image count */}
                        {(ex.image_urls?.length ?? 0) > 1 && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">
                            +{(ex.image_urls?.length ?? 1) - 1}
                          </span>
                        )}

                        {/* Action buttons (zoom & video) */}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {(hasImg || hasVideo) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomIdx(fIdx);
                                setZoomImgIdx(0);
                                setShowVideo(false);
                              }}
                              className="h-7 w-7 rounded-full bg-background/90 hover:bg-background flex items-center justify-center shadow"
                              title="Ampliar / Ver mídia"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {hasVideo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomIdx(fIdx);
                                setZoomImgIdx(0);
                                setShowVideo(true);
                              }}
                              className="h-7 w-7 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white flex items-center justify-center shadow"
                              title="Ver vídeo"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </button>
                          )}
                        </div>

                        {/* Global badge */}
                        {ex.is_global && (
                          <span className="absolute top-1 left-1 text-[9px] bg-amber-500/90 text-white px-1.5 py-0.5 rounded">
                            🌐
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2 space-y-0.5">
                        <p className="text-xs font-medium line-clamp-2 leading-tight" title={ex.name}>
                          {ex.name}
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-primary font-medium">
                            {ex.default_sets}×{ex.default_reps}
                          </span>
                          {hasVideo && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              <Play className="h-2 w-2 fill-current" />
                              vídeo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-4 border-t bg-muted/10 flex-row justify-between gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0 || submitting}
              className="min-w-[180px]"
            >
              {confirmLabel
                ? confirmLabel(selected.size)
                : `Adicionar ${selected.size || ''} exercício${selected.size === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageZoomDialog
        images={zoomImages}
        open={zoomImages.length > 0}
        onOpenChange={(o) => !o && setZoomImages([])}
      />

      <Dialog open={!!videoEx} onOpenChange={(o) => !o && setVideoEx(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle className="text-base">{videoEx?.name}</DialogTitle>
          </DialogHeader>
          {videoEx?.video_url && (
            <ExerciseVideoPlayer
              videoUrl={videoEx.video_url}
              videoType={(videoEx.video_type as any) || undefined}
              startSeconds={videoEx.video_start_seconds ?? undefined}
              endSeconds={videoEx.video_end_seconds ?? undefined}
              autoPlay
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
