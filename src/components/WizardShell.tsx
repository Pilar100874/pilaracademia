import { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WizardStepperProps {
  steps: { key: string; label: string }[];
  current: number;
  onJump?: (idx: number) => void;
}

export function WizardStepper({ steps, current, onJump }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border/60 bg-muted/20">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = onJump && i <= current;
        return (
          <div key={s.key} className="flex items-center gap-1.5 flex-1 min-w-0">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump?.(i)}
              className={cn(
                "shrink-0 h-6 w-6 rounded-full border text-[11px] font-semibold flex items-center justify-center transition-colors",
                active && "bg-primary text-primary-foreground border-primary",
                done && "bg-primary/15 text-primary border-primary/40",
                !active && !done && "bg-background text-muted-foreground border-border",
                reachable && !active && "hover:border-primary/60",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span
              className={cn(
                "text-[11px] truncate",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="flex-1 h-px bg-border/60 mx-1" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface WizardFooterProps {
  current: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onFinish: () => void;
  finishLabel?: ReactNode;
  finishDisabled?: boolean;
  nextDisabled?: boolean;
}

export function WizardFooter({
  current,
  total,
  onBack,
  onNext,
  onCancel,
  onFinish,
  finishLabel,
  finishDisabled,
  nextDisabled,
}: WizardFooterProps) {
  const isFirst = current === 0;
  const isLast = current === total - 1;
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-t border-border/60 bg-background">
      {isFirst ? (
        <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
      ) : (
        <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-none">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      )}
      {isLast ? (
        <Button onClick={onFinish} disabled={finishDisabled} className="flex-1">
          {finishLabel ?? "Concluir"}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={nextDisabled} className="flex-1">
          Avançar <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
