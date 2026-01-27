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

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    sets: number;
    reps: number;
    imageFile?: File;
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setSets(editingExercise.sets);
      setReps(editingExercise.reps);
      setImagePreview(editingExercise.image_url);
      setImageFile(null);
    } else {
      setName('');
      setSets(3);
      setReps(12);
      setImagePreview(null);
      setImageFile(null);
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
    setImageFile(croppedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(croppedFile);
    setImageToCrop(null);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  const handleRecrop = () => {
    if (imagePreview) {
      setImageToCrop(imagePreview);
      setCropDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        sets,
        reps,
        imageFile: imageFile || undefined,
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
              <Label>Foto do Exercício</Label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={handleRecrop}
                        title="Recortar novamente"
                      >
                        <Crop className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={handleRemoveImage}
                        title="Remover imagem"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center gap-3 p-4">
                    <Dumbbell className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Adicione uma foto do exercício
                    </p>
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
          aspectRatio={16 / 9}
        />
      )}
    </>
  );
}
