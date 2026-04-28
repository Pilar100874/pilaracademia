import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function MarketingCampanhas() {
  const { openSubmenu } = useLayout();
  
  return (
    <div className="p-8 bg-background min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <SubMenuHeader 
          title="Marketing"
          onOpenSubmenu={() => openSubmenu("Desenho")}
        />
        <h1 className="text-lg font-bold text-foreground">Campanhas de Marketing</h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Gerencie suas campanhas de marketing
      </p>
      
      {/* Conteúdo de campanhas virá aqui */}
    </div>
  );
}
