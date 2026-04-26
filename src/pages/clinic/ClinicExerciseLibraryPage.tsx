import { LibraryScopeProvider } from '@/hooks/useLibraryScope';
import ExerciseLibraryPage from '@/pages/ExerciseLibraryPage';
import { useUserRoles } from '@/hooks/useUserRoles';

export default function ClinicExerciseLibraryPage() {
  const { activeClinicId } = useUserRoles();
  if (!activeClinicId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Selecione uma clínica para acessar a biblioteca.
      </div>
    );
  }
  return (
    <LibraryScopeProvider scope={{ kind: 'clinic', clinicId: activeClinicId }}>
      <ExerciseLibraryPage />
    </LibraryScopeProvider>
  );
}
