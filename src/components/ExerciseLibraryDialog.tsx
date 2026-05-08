import { useState, useEffect, useRef } from 'react';
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
import { X, Dumbbell, Save, Crop, Camera, ImageIcon, Plus } from 'lucide-react';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { ExerciseVideoEditor, ExerciseVideoData } from '@/components/ExerciseVideoEditor';

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
  const { exercises, createExercise, updateExercise, uploadExerciseImage } = useExerciseLibrary();
  const { categories } = useExerciseCategories();
  const { toggleExerciseExtra } = useExerciseExtras();

  const [name, setName] = useState('');
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState(10);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [initialExtraIds, setInitialExtraIds] = useState<string[]>([]);
  const [images, setImages] = useState<Array<{ type: 'url' | 'file'; value: string; file?: File }>>([]);
  const [video, setVideo] = useState<ExerciseVideoData>({
    video_type: null,
    video_url: null,
    video_start_seconds: null,
    video_end_seconds: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editingExercise) {
        setName(editingExercise.name);
        setDefaultSets(editingExercise.default_sets);
        setDefaultReps(editingExercise.default_reps);
        setCategoryId(editingExercise.category_id ?? null);
        const existingImages = (editingExercise.image_urls || []).map(url => ({
          type: 'url' as const,
          value: url,
        }));
        setImages(existingImages);
        setVideo({
          video_type: editingExercise.video_type ?? null,
          video_url: editingExercise.video_url ?? null,
          video_start_seconds: editingExercise.video_start_seconds ?? null,
          video_end_seconds: editingExercise.video_end_seconds ?? null,
        });
      } else {
        setName('');
        setDefaultSets(1);
        setDefaultReps(10);
        setCategoryId(null);
        setImages([]);
        setVideo({
          video_type: null,
          video_url: null,
          video_start_seconds: null,
          video_end_seconds: null,
        });
      }
    }
  }, [editingExercise?.id, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageToCrop(dataUrl);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImages((prev) => [...prev, { type: 'file', value: dataUrl, file: croppedFile }]);
    };
    reader.readAsDataURL(croppedFile);
    setImageToCrop(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecrop = (index: number) => {
    const imageToRecrop = images[index];
    if (imageToRecrop) {
      setImageToCrop(imageToRecrop.value);
      setCropDialogOpen(true);
      setImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

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

      const newFiles = images
        .filter((img) => img.type === 'file' && img.file)
        .map((img) => img.file!);

      let newImageUrls: string[] = [];
      if (newFiles.length > 0) {
        newImageUrls = await Promise.all(
          newFiles.map((file) => uploadExerciseImage(file))
        );
      }

      let fileIndex = 0;
      const allImageUrls = images.map((img) => {
        if (img.type === 'url') return img.value;
        return newImageUrls[fileIndex++];
      });

      const payload = {
        name: finalName,
        default_sets: defaultSets,
        default_reps: defaultReps,
        image_urls: allImageUrls,
        video_type: video.video_type,
        video_url: video.video_url,
        video_start_seconds: video.video_start_seconds,
        video_end_seconds: video.video_end_seconds,
        category_id: categoryId,
      };

      if (editingExercise) {
        await updateExercise.mutateAsync({ id: editingExercise.id, ...payload });
      } else {
        await createExercise.mutateAsync(payload);
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const selectValue = categoryId ?? NO_CATEGORY;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Fotos ({images.length}/5)</Label>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={image.value}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-6 w-6"
                          onClick={() => handleRecrop(index)}
                          title="Recortar"
                        >
                          <Crop className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-6 w-6"
                          onClick={() => handleRemoveImage(index)}
                          title="Remover"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {images.length < 5 && (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center gap-3 p-4">
                  {images.length === 0 && (
                    <>
                      <Dumbbell className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Adicione fotos do exercício
                      </p>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Câmera
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Galeria
                    </Button>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </div>
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-sets">Séries Padrão</Label>
                <Input
                  id="default-sets"
                  type="number"
                  min={1}
                  value={defaultSets}
                  onChange={(e) => setDefaultSets(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-reps">Repetições Padrão</Label>
                <Input
                  id="default-reps"
                  type="number"
                  min={1}
                  value={defaultReps}
                  onChange={(e) => setDefaultReps(Number(e.target.value))}
                />
              </div>
            </div>

            <ExerciseVideoEditor value={video} onChange={setVideo} />

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

      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open) setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          freeform={true}
        />
      )}
    </>
  );
}
