import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { AIWorkoutDialog } from '@/components/AIWorkoutDialog';
import { WorkoutWizardContent, WorkoutWizardResult } from '@/components/WorkoutWizardContent';

export function WorkoutWizardPage() {
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [result, setResult] = useState<WorkoutWizardResult | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <header className="sticky top-0 z-30 glass border-b border-border/50 px-3 sm:px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center gap-2 min-w-0">
          <Button size="icon" variant="ghost" onClick={() => navigate('/workouts')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ListChecks className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold min-w-0 flex-1 break-words">Assistente de treino</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 flex flex-col">
        <WorkoutWizardContent
          onCancel={() => navigate('/workouts')}
          onDone={(r) => {
            setResult(r);
            setAiOpen(true);
          }}
        />
      </main>

      <AIWorkoutDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        initialPrompt={result?.prompt}
        initialName={result?.name}
        initialCount={result?.count}
        initialDays={result?.days}
      />

      <BottomNav />
    </div>
  );
}
