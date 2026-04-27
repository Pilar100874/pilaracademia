import { createContext } from 'react';

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export type PromptOptions = ConfirmOptions & {
  defaultValue?: string;
  placeholder?: string;
  inputType?: string;
};

export type ConfirmCtx = {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
  prompt: (opts: PromptOptions | string) => Promise<string | null>;
};

export const ConfirmContext = createContext<ConfirmCtx | null>(null);
