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
import { LibraryExercise, useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { X, Dumbbell, Save, Crop, Camera, ImageIcon } from 'lucide-react';
import { ImageCropDialog } from '@/components/ImageCropDialog';

interface ExerciseLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExercise: LibraryExercise | null;
}

export function ExerciseLibraryDialog({
  open,
  onOpenChange,
  editingExercise,
}: ExerciseLibraryDialogProps) {
  const { createExercise, updateExercise, uploadExerciseImage } = useExerciseLibrary();

  const [name, setName] = useState('');
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState(12);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setDefaultSets(editingExercise.default_sets);
      setDefaultReps(editingExercise.default_reps);
      setImagePreviews(editingExercise.image_urls || []);
      setImageFiles([]);
    } else {
      setName('');
      setDefaultSets(3);
      setDefaultReps(12);
      setImagePreviews([]);
      setImageFiles([]);
    }
  }, [editingExercise, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageToCrop(dataUrl);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setImageFiles((prev) => [...prev, croppedFile]);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviews((prev) => [...prev, e.target?.result as string]);
    };
    reader.readAsDataURL(croppedFile);
    setImageToCrop(null);
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecrop = (index: number) => {
    if (imagePreviews[index]) {
      setImageToCrop(imagePreviews[index]);
      setCropDialogOpen(true);
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      // Upload new images
      let newImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        newImageUrls = await Promise.all(
          imageFiles.map((file) => uploadExerciseImage(file))
        );
      }

      // Combine existing URLs (from editing) with new ones
      const existingUrls = editingExercise
        ? imagePreviews.filter((url) => url.startsWith('http'))
        : [];
      const allImageUrls = [...existingUrls, ...newImageUrls];

      if (editingExercise) {
        await updateExercise.mutateAsync({
          id: editingExercise.id,
          name: name.trim(),
          default_sets: defaultSets,
          default_reps: defaultReps,
          image_urls: allImageUrls,
        });
      } else {
        await createExercise.mutateAsync({
          name: name.trim(),
          default_sets: defaultSets,
          default_reps: defaultReps,
          image_urls: allImageUrls,
        });
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

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
              <Label>Fotos ({imagePreviews.length}/5)</Label>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={preview}
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

              {imagePreviews.length < 5 && (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center gap-3 p-4">
                  {imagePreviews.length === 0 && (
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
              <Label htmlFor="exercise-name">Nome do Exercício</Label>
              <Input
                id="exercise-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Supino Reto"
              />
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

            <Button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
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
