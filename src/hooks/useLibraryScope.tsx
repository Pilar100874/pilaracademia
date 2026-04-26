import { createContext, useContext, ReactNode } from 'react';

export type LibraryScope =
  | { kind: 'personal' }
  | { kind: 'global' }
  | { kind: 'clinic'; clinicId: string };

const LibraryScopeContext = createContext<LibraryScope>({ kind: 'personal' });

export function LibraryScopeProvider({ scope, children }: { scope: LibraryScope; children: ReactNode }) {
  return <LibraryScopeContext.Provider value={scope}>{children}</LibraryScopeContext.Provider>;
}

export function useLibraryScope(): LibraryScope {
  return useContext(LibraryScopeContext);
}
