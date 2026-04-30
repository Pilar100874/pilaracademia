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
import { WorkoutExercise } from '@/hooks/useWorkoutPlans';
import { X, Dumbbell, Save, Crop, Camera, ImageIcon } from 'lucide-react';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { FieldError } from '@/components/FieldError';
import { useFieldError, validateRequired } from '@/lib/formValidation';

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    sets: number;
    reps: number;
    imageFiles?: File[];
  }) => Promise<void>;
  editingExercise: WorkoutExercise | null;
}

export function AddExerciseDialog({
  open,
  onOpenChange,
  onSave,
  editingExercise,
}: AddExerciseDialogProps) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(12);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { errorOf, setError, clearError, clearIf } = useFieldError();

  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setSets(editingExercise.sets);
      setReps(editingExercise.reps);
      // Use image_urls if available, otherwise fallback to image_url
      const urls = editingExercise.image_urls?.length 
        ? editingExercise.image_urls 
        : editingExercise.image_url 
          ? [editingExercise.image_url] 
          : [];
      setImagePreviews(urls);
      setImageFiles([]);
    } else {
      setName('');
      setSets(3);
      setReps(12);
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
    setImageFiles(prev => [...prev, croppedFile]);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviews(prev => [...prev, e.target?.result as string]);
    };
    reader.readAsDataURL(croppedFile);
    setImageToCrop(null);
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  const handleRecrop = (index: number) => {
    if (imagePreviews[index]) {
      setImageToCrop(imagePreviews[index]);
      setCropDialogOpen(true);
      // Remove the image being recropped
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
      setImageFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    const first = validateRequired([
      { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Informe o nome do exercício' },
      { key: 'sets', ref: null, valid: sets >= 1, message: 'Séries inválidas' },
      { key: 'reps', ref: null, valid: reps >= 1, message: 'Repetições inválidas' },
    ]);
    if (first) {
      setError(first.key, first.message);
      return;
    }
    clearError();

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        sets,
        reps,
        imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? 'Editar Exercício' : 'Adicionar Exercício'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Fotos do Exercício ({imagePreviews.length}/5)</Label>
              
              {/* Image previews grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
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
              
              {/* Add more photos button */}
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
                  {/* Hidden inputs */}
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
                ref={nameRef}
                value={name}
                onChange={(e) => { setName(e.target.value); clearIf('name'); }}
                placeholder="Ex: Supino Reto"
                aria-invalid={!!errorOf('name')}
              />
              <FieldError message={errorOf('name')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sets">Séries</Label>
                <Input
                  id="sets"
                  type="number"
                  min={1}
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reps">Repetições</Label>
                <Input
                  id="reps"
                  type="number"
                  min={1}
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                />
              </div>
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
