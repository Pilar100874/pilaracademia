import { Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalDisclaimerProps {
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Aviso legal: a IA do app interpreta exames de forma educativa, mas
 * não substitui consulta médica nem diagnóstico profissional.
 */
export function MedicalDisclaimer({ variant = 'default', className }: MedicalDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <p className={cn('text-[11px] text-muted-foreground leading-relaxed', className)}>
        ⚕️ As interpretações têm caráter educativo e não substituem orientação médica.
        Sempre discuta seus exames com um profissional de saúde.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-muted/40 p-3 flex gap-3',
        className,
      )}
    >
      <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-[12px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground/80 mb-1">Aviso importante</p>
        <p>
          As análises e recomendações geradas a partir dos seus exames têm finalidade
          <strong className="text-foreground/80"> educativa e informativa</strong>. Elas não constituem
          diagnóstico, prescrição ou substituem consulta com médico, nutricionista ou outro
          profissional de saúde habilitado. Sempre valide alterações alimentares, de treino ou de
          medicação com seu profissional de confiança.
        </p>
      </div>
    </div>
  );
}
