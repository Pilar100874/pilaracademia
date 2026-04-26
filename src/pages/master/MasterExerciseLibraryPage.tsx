import { LibraryScopeProvider } from '@/hooks/useLibraryScope';
import ExerciseLibraryPage from '@/pages/ExerciseLibraryPage';

export default function MasterExerciseLibraryPage() {
  return (
    <LibraryScopeProvider scope={{ kind: 'global' }}>
      <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-sm text-amber-900 dark:text-amber-200 text-center">
        🌐 Biblioteca Global do Master — exercícios e categorias criados aqui ficam disponíveis para todas as clínicas.
      </div>
      <ExerciseLibraryPage />
    </LibraryScopeProvider>
  );
}
