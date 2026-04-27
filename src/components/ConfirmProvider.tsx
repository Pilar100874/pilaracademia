import { useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ConfirmContext, type PromptOptions, type ConfirmOptions } from './confirm-context';

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<PromptOptions>({});
  const [isPrompt, setIsPrompt] = useState(false);
  const [value, setValue] = useState('');
  const resolverRef = useRef<((v: any) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions | string) => {
    const normalized = typeof o === 'string' ? { description: o } : o;
    setOpts(normalized);
    setIsPrompt(false);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const prompt = useCallback((o: PromptOptions | string) => {
    const normalized = typeof o === 'string' ? { description: o } : o;
    setOpts(normalized);
    setValue(normalized.defaultValue ?? '');
    setIsPrompt(true);
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleResolve = (result: boolean | string | null) => {
    setOpen(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    if (r) r(result);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o && resolverRef.current) handleResolve(isPrompt ? null : false);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title ?? (isPrompt ? 'Informe o valor' : 'Confirmar')}</AlertDialogTitle>
            {opts.description && (
              <AlertDialogDescription className="whitespace-pre-line">
                {opts.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {isPrompt && (
            <Input
              autoFocus
              type={opts.inputType ?? 'text'}
              value={value}
              placeholder={opts.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleResolve(value);
              }}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleResolve(isPrompt ? null : false)}>
              {opts.cancelText ?? 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResolve(isPrompt ? value : true)}
              className={opts.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {opts.confirmText ?? (opts.destructive ? 'Excluir' : 'Confirmar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
