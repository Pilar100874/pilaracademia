import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from './types';

interface CatalogWizardStepsProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const CatalogWizardSteps: React.FC<CatalogWizardStepsProps> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full mb-6">
      {/* Mobile: compact view */}
      <div className="flex md:hidden items-center justify-between mb-4">
        <span className="text-sm font-medium">
          Passo {currentStep + 1} de {WIZARD_STEPS.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {WIZARD_STEPS[currentStep].title}
        </span>
      </div>
      <div className="flex md:hidden h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Desktop: full steps */}
      <div className="hidden md:flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepClick(index)}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all",
                  (isCompleted || isCurrent) && "cursor-pointer",
                  !isCompleted && !isCurrent && "opacity-50"
                )}
                disabled={index > currentStep}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-primary"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </button>
              
              {index < WIZARD_STEPS.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
