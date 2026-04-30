/**
 * Lightweight required-field validation that:
 *  1. Identifies the first missing field
 *  2. Scrolls it into view (centered)
 *  3. Focuses it (when focusable)
 *  4. Returns its key + a user-friendly message so the form can render an
 *     inline error in red below the input.
 *
 * Use with `useFieldError`:
 *
 *   const { error, setError, clearError, fieldProps } = useFieldError();
 *
 *   const submit = () => {
 *     const first = validateRequired([
 *       { key: 'name', ref: nameRef, valid: !!name.trim(), message: 'Informe o nome' },
 *       { key: 'qty',  ref: qtyRef,  valid: qty > 0,       message: 'Informe a quantidade' },
 *     ]);
 *     if (first) { setError(first.key, first.message); return; }
 *     clearError();
 *     // ...save
 *   };
 *
 *   <Input {...fieldProps('name')} /> <FieldError {...} field="name" />
 */
import { useCallback, useState } from 'react';

export interface RequiredCheck {
  /** Logical field key — used to render the error message under that input. */
  key: string;
  /** Ref pointing to the input/textarea/select/button to focus & scroll into view. */
  ref?: React.RefObject<HTMLElement | null> | null;
  /** True when the field passes validation. */
  valid: boolean;
  /** Message shown to the user (red, below the input). */
  message: string;
}

export interface FieldErrorState {
  field: string;
  message: string;
}

export function validateRequired(
  checks: RequiredCheck[]
): { key: string; message: string } | null {
  for (const c of checks) {
    if (c.valid) continue;
    const el = c.ref?.current;
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        el.scrollIntoView();
      }
    }
    if (el && typeof (el as HTMLElement & { focus?: () => void }).focus === 'function') {
      // Delay so scroll animation can settle and mobile keyboards open reliably.
      setTimeout(() => {
        try {
          (el as HTMLElement).focus({ preventScroll: true });
        } catch {
          (el as HTMLElement).focus();
        }
      }, 80);
    }
    return { key: c.key, message: c.message };
  }
  return null;
}

export function useFieldError() {
  const [error, setErrorState] = useState<FieldErrorState | null>(null);

  const setError = useCallback((field: string, message: string) => {
    setErrorState({ field, message });
  }, []);

  const clearError = useCallback(() => setErrorState(null), []);

  const clearIf = useCallback(
    (field: string) => {
      setErrorState((prev) => (prev?.field === field ? null : prev));
    },
    []
  );

  const errorOf = useCallback(
    (field: string) => (error?.field === field ? error.message : null),
    [error]
  );

  return { error, setError, clearError, clearIf, errorOf };
}
