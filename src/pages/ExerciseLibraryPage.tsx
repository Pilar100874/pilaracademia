import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExerciseLibrary, LibraryExercise } from '@/hooks/useExerciseLibrary';
import { ExerciseLibraryDialog } from '@/components/ExerciseLibraryDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ImageZoomDialog } from '@/components/ImageZoomDialog';
import { Plus, Search, Dumbbell, Edit, Trash2, ImageIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const { exercises, isLoading, deleteExercise } = useExerciseLibrary();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<LibraryExercise | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <Button onClick={() => {
            setEditingExercise(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercício..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
                {search ? 'Nenhum exercício encontrado' : 'Biblioteca vazia'}
              </p>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tente outro termo de busca'
                  : 'Crie seus exercícios para usar nos treinos'}
              </p>
            </div>
            {!search && (
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

              return (
                <div
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                >
                  <div 
                    className={`relative w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0 ${firstImage ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
                    onClick={() => firstImage && setZoomImage(firstImage)}
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
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.default_sets} séries × {exercise.default_reps} reps
                    </p>
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

      <ImageZoomDialog
        imageUrl={zoomImage}
        open={!!zoomImage}
        onOpenChange={(open) => !open && setZoomImage(null)}
      />
    </div>
  );
}
