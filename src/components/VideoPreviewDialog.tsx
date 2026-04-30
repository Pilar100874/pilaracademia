import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ExerciseVideoPlayer } from '@/components/ExerciseVideoPlayer';
import { AnalysisOverlay } from '@/components/AnalysisOverlay';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useEffect } from 'react';

export interface VideoPreviewCategoryOption {
  id: string; // category id (no "no category" option in multi-mode)
  name: string;
  parentId?: string | null;
}

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string | null;
  videoType: string | null | undefined;
  videoUrl: string | null | undefined;
  startSeconds?: number | null;
  endSeconds?: number | null;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  position?: { current: number; total: number };
  /** Categorias atualmente atribuídas (multi). */
  currentCategoryIds?: string[];
  /** Lista achatada de categorias disponíveis. */
  categoryOptions?: VideoPreviewCategoryOption[];
  /**
   * Toggle de uma categoria. NÃO avança automaticamente — a navegação acontece
   * apenas pelos botões prev/next ou setas do teclado.
   */
  onToggleCategory?: (categoryId: string, checked: boolean) => void;
  /** AI classifications to display as floating overlay. */
  bodyAnalysis?: Record<string, number> | null;
  aestheticAnalysis?: Record<string, number> | null;
  mobilityAnalysis?: Record<string, number> | null;
}

/**
 * Full-screen video preview dialog with floating title and large close button.
 * Supports prev/next navigation and a multi-category quick-picker:
 *  - Clicking a parent toggles it AND reveals/hides its children inline.
 *  - Clicking a child toggles only that child.
 *  - Subcategory groups for ALL currently selected parents are shown so the
 *    user can fine-tune across multiple parents at once.
 */
export function VideoPreviewDialog({
  open,
  onOpenChange,
  name,
  videoType,
  videoUrl,
  startSeconds,
  endSeconds,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
  currentCategoryIds,
  categoryOptions,
  onToggleCategory,
  bodyAnalysis,
  aestheticAnalysis,
  mobilityAnalysis,
}: VideoPreviewDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      else if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  if (!videoUrl || !videoType) return null;

  const showNav = !!(onPrev || onNext);
  const selected = new Set(currentCategoryIds ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 gap-0 border-none bg-black block overflow-hidden [&>button]:!top-5 [&>button]:!right-5 [&>button]:z-50 [&>button]:h-12 [&>button]:w-12 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:backdrop-blur-2xl [&>button]:border [&>button]:border-white/25 [&>button]:text-white [&>button]:opacity-100 [&>button]:shadow-[0_4px_20px_rgba(0,0,0,0.6)] [&>button]:transition-all [&>button]:hover:bg-black/70 [&>button]:hover:scale-110 [&>button]:hover:border-white/40 [&>button]:active:scale-95 [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden z-0">
          <ExerciseVideoPlayer
            key={videoUrl}
            videoType={videoType}
            videoUrl={videoUrl}
            startSeconds={startSeconds}
            endSeconds={endSeconds}
            
            autoPlay
            loop
            className="w-full h-full"
          />
        </div>
        {name && (
          <div className="absolute top-5 left-5 right-20 z-40 pointer-events-none">
            <div className="inline-block bg-black/40 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/10 shadow-xl max-w-full">
              <h2 className="text-white font-extrabold text-base sm:text-lg leading-tight tracking-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {name}
              </h2>
              {position && position.total > 1 && (
                <p className="text-white/70 text-xs font-medium mt-0.5">
                  {position.current} / {position.total}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Multi-select quick category picker */}
        {categoryOptions && categoryOptions.length > 0 && onToggleCategory && (() => {
          const parents = categoryOptions.filter((o) => !o.parentId);
          const childrenByParent = new Map<string, VideoPreviewCategoryOption[]>();
          categoryOptions.forEach((o) => {
            if (o.parentId) {
              const arr = childrenByParent.get(o.parentId) ?? [];
              arr.push(o);
              childrenByParent.set(o.parentId, arr);
            }
          });

          // Walk all categories that have children (any depth) so we can render
          // a sub-row per node — this exposes sub-subcategories too.
          const nodesWithChildren: { id: string; name: string }[] = [];
          const collectNodes = (parentId: string | null) => {
            const list = parentId === null
              ? parents
              : (childrenByParent.get(parentId) ?? []);
            list.forEach((opt) => {
              if ((childrenByParent.get(opt.id)?.length ?? 0) > 0) {
                nodesWithChildren.push({ id: opt.id, name: opt.name });
              }
              collectNodes(opt.id);
            });
          };
          collectNodes(null);

          const renderPill = (opt: VideoPreviewCategoryOption) => {
            const active = selected.has(opt.id);
            const hasChildren = childrenByParent.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggleCategory(opt.id, !active)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border backdrop-blur-2xl transition-all active:scale-95 ${
                  active
                    ? 'bg-white text-black border-white shadow-[0_4px_20px_rgba(255,255,255,0.4)]'
                    : 'bg-black/50 text-white border-white/25 hover:bg-black/70 hover:border-white/40'
                }`}
              >
                {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                <span className="whitespace-nowrap">{opt.name}</span>
                {hasChildren && !opt.parentId && (
                  <span
                    className={`text-[10px] leading-none ${active ? 'text-black/60' : 'text-white/50'}`}
                  >
                    ▾
                  </span>
                )}
              </button>
            );
          };

          return (
            <div
              className={`absolute left-0 right-0 z-40 px-3 ${
                showNav ? 'bottom-24 sm:bottom-28' : 'bottom-6 pb-safe'
              }`}
            >
              <div className="mx-auto max-w-3xl">
                <p className="text-white/70 text-[11px] font-medium mb-1.5 text-center drop-shadow">
                  Toque para adicionar/remover. Use ◀ ▶ para mudar de vídeo.
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-thin">
                  {parents.map(renderPill)}
                </div>
                {nodesWithChildren.map((node) => {
                  const subs = childrenByParent.get(node.id) ?? [];
                  if (subs.length === 0) return null;
                  return (
                    <div
                      key={node.id}
                      className="mt-1.5 ml-2 flex items-center gap-2 overflow-x-auto pb-1 px-1 pl-3 scrollbar-thin border-l-2 border-white/20"
                    >
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                        {node.name}
                      </span>
                      {subs.map(renderPill)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {!showNav && (
          <AnalysisOverlay
            body={bodyAnalysis}
            aesthetic={aestheticAnalysis}
            mobility={mobilityAnalysis}
            positionClass="right-6 bottom-6 pb-safe"
          />
        )}

        {showNav && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 pb-safe">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Vídeo anterior"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 hover:border-white/40 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-7 w-7 stroke-[2.5]" />
            </button>
            <AnalysisOverlay
              body={bodyAnalysis}
              aesthetic={aestheticAnalysis}
              mobility={mobilityAnalysis}
              variant="inline-icon"
            />
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Próximo vídeo"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all hover:bg-black/70 hover:scale-110 hover:border-white/40 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-7 w-7 stroke-[2.5]" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
