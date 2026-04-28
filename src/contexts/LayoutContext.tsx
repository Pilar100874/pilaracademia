import { createContext, useContext, useState, ReactNode } from "react";

interface LayoutContextValue {
  activeSubmenu: string | null;
  openSubmenu: (name: string) => void;
  closeSubmenu: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  activeSubmenu: null,
  openSubmenu: () => {},
  closeSubmenu: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  return (
    <LayoutContext.Provider
      value={{
        activeSubmenu,
        openSubmenu: (n) => setActiveSubmenu(n),
        closeSubmenu: () => setActiveSubmenu(null),
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
