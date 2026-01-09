import { Droplets, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultProductImageProps {
  isLiquid: boolean;
  className?: string;
  iconClassName?: string;
}

export function DefaultProductImage({ isLiquid, className, iconClassName }: DefaultProductImageProps) {
  return (
    <div className={cn(
      "flex items-center justify-center bg-secondary rounded-xl",
      className
    )}>
      {isLiquid ? (
        <Droplets className={cn("text-sky-500", iconClassName || "h-6 w-6")} />
      ) : (
        <UtensilsCrossed className={cn("text-primary", iconClassName || "h-6 w-6")} />
      )}
    </div>
  );
}

interface ProductImageProps {
  imageUrl?: string | null;
  isLiquid: boolean;
  alt: string;
  className?: string;
  iconClassName?: string;
}

export function ProductImage({ imageUrl, isLiquid, alt, className, iconClassName }: ProductImageProps) {
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={alt} 
        className={cn("object-cover rounded-xl", className)} 
      />
    );
  }
  
  return (
    <DefaultProductImage 
      isLiquid={isLiquid} 
      className={className} 
      iconClassName={iconClassName} 
    />
  );
}
