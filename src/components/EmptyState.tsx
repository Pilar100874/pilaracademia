import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'compact';
  className?: string;
  children?: ReactNode;
}

/**
 * Estado vazio padrão do app: ícone + título + descrição + ação opcional.
 * Usado em listas, abas e telas que ainda não têm dados.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  children,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={cn(
        'rounded-md border border-dashed border-border bg-card text-center',
        variant === 'compact' ? 'p-5 space-y-2' : 'p-8 space-y-3',
        className,
      )}
    >
      <Icon
        className={cn(
          'text-muted-foreground mx-auto',
          variant === 'compact' ? 'h-6 w-6' : 'h-8 w-8',
        )}
      />
      <h2 className={cn('font-semibold', variant === 'compact' ? 'text-sm' : 'text-base')}>
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'text-muted-foreground max-w-sm mx-auto leading-relaxed',
            variant === 'compact' ? 'text-xs' : 'text-sm',
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          size={variant === 'compact' ? 'sm' : 'default'}
          onClick={action.onClick}
          asChild={!!action.href}
          className="mt-1"
        >
          {action.href ? (
            <a href={action.href}>
              {ActionIcon && <ActionIcon className="h-3.5 w-3.5 mr-1.5" />}
              {action.label}
            </a>
          ) : (
            <span>
              {ActionIcon && <ActionIcon className="h-3.5 w-3.5 mr-1.5" />}
              {action.label}
            </span>
          )}
        </Button>
      )}
      {children}
    </div>
  );
}
