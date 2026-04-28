import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface SubMenuHeaderProps {
  title: string;
  onOpenSubmenu?: () => void;
}

export function SubMenuHeader({ title, onOpenSubmenu }: SubMenuHeaderProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onOpenSubmenu} className="gap-2">
      <Menu className="h-4 w-4" />
      <span className="font-semibold">{title}</span>
    </Button>
  );
}

export default SubMenuHeader;
