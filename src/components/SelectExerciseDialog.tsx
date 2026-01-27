import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExerciseLibrary, LibraryExercise } from '@/hooks/useExerciseLibrary';
import { Dumbbell, Search, Plus, Check, ImageIcon } from 'lucide-react';

interface SelectExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: LibraryExercise, sets: number, reps: number) => void;
  onCreateNew: () => void;
}

export function SelectExerciseDialog({
  open,
  onOpenChange,
  onSelect,
  onCreateNew,
}: SelectExerciseDialogProps) {
  const { exercises, isLoading } = useExerciseLibrary();
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<LibraryExercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(12);

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectExercise = (exercise: LibraryExercise) => {
    setSelectedExercise(exercise);
    setSets(exercise.default_sets);
    setReps(exercise.default_reps);
  };

  const handleConfirm = () => {
    if (selectedExercise) {
      onSelect(selectedExercise, sets, reps);
      onOpenChange(false);
      setSelectedExercise(null);
      setSearch('');
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedExercise(null);
      setSearch('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Exercício ao Treino</DialogTitle>
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

          {/* Exercise list */}
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {search ? 'Nenhum exercício encontrado' : 'Sua biblioteca está vazia'}
                </p>
                <Button variant="outline" onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Exercício
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                {filteredExercises.map((exercise) => {
                  const isSelected = selectedExercise?.id === exercise.id;
                  const firstImage = exercise.image_urls?.[0];
                  const imageCount = exercise.image_urls?.length || 0;

                  return (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelectExercise(exercise)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {firstImage ? (
                          <>
                            <img
                              src={firstImage}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                            />
                            {imageCount > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl flex items-center gap-0.5">
                                <ImageIcon className="h-2.5 w-2.5" />
                                {imageCount}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Dumbbell className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{exercise.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {exercise.default_sets} séries × {exercise.default_reps} reps
                        </p>
                      </div>

                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected exercise config */}
          {selectedExercise && (
            <div className="border-t pt-4 space-y-4">
              <p className="font-medium text-sm">
                Configurar: {selectedExercise.name}
              </p>
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
              <Button onClick={handleConfirm} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar ao Treino
              </Button>
            </div>
          )}

          {/* Create new button */}
          {!selectedExercise && filteredExercises.length > 0 && (
            <Button variant="outline" onClick={onCreateNew} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Criar Novo Exercício
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
