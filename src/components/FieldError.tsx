import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldErrorProps {
  message?: string | null;
  className?: string;
}

/**
 * Small red message shown below a required input that failed validation.
 * Renders nothing when `message` is empty.
 */
export function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        'flex items-center gap-1 text-[11px] font-medium text-destructive mt-1 animate-fade-in',
        className
      )}
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
