import { useState } from 'react';
import { useClinicStaff, useStudentInstructors } from '@/hooks/useStaff';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, GraduationCap } from 'lucide-react';

interface Props {
  clinicId: string;
  studentId: string;
}

export function StudentInstructorsManager({ clinicId, studentId }: Props) {
  const { user } = useAuth();
  const { data: staff = [] } = useClinicStaff(clinicId);
  const { data: links = [], link, unlink } = useStudentInstructors(clinicId, studentId);
  const [open, setOpen] = useState(false);

  const instructors = staff.filter((s) => s.role === 'instructor' || s.role === 'clinic_admin');
  const linkedIds = new Set(links.map((l) => l.instructor_user_id));
  const linkedStaff = instructors.filter((s) => linkedIds.has(s.user_id));
  const available = instructors.filter((s) => !linkedIds.has(s.user_id));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <GraduationCap className="h-3.5 w-3.5" />
        Professores fixos:
      </span>
      {linkedStaff.length === 0 && <span className="text-xs text-muted-foreground italic">nenhum</span>}
      {linkedStaff.map((s) => {
        const linkRow = links.find((l) => l.instructor_user_id === s.user_id);
        return (
          <Badge key={s.user_id} variant="secondary" className="gap-1 pr-1">
            {s.name || s.email}
            <button
              type="button"
              onClick={() => linkRow && unlink.mutate(linkRow.id)}
              className="hover:bg-destructive/20 rounded-full p-0.5"
              title="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 gap-1">
            <Plus className="h-3.5 w-3.5" />Vincular
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">
              {instructors.length === 0
                ? 'Cadastre professores em Equipe.'
                : 'Todos os professores já foram vinculados.'}
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {available.map((s) => (
                <button
                  key={s.user_id}
                  type="button"
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                  onClick={() => {
                    if (!user) return;
                    link.mutate({ instructor_user_id: s.user_id, created_by: user.id });
                    setOpen(false);
                  }}
                >
                  <div className="font-medium">{s.name || '(sem nome)'}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
