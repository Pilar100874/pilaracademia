import { Droplets } from 'lucide-react';

interface DefaultLiquidImageProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DefaultLiquidImage({ className = '', size = 'md' }: DefaultLiquidImageProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-24 w-24',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 ${className}`}>
      <Droplets className={`${iconSizes[size]} text-white`} />
    </div>
  );
}

// SVG data URL for water image (for use in places that need a URL)
export const WATER_IMAGE_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='waterGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2338bdf8'/%3E%3Cstop offset='100%25' style='stop-color:%233b82f6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23waterGrad)' width='100' height='100' rx='12'/%3E%3Cpath d='M50 20 C35 40 25 55 25 65 C25 80 35 85 50 85 C65 85 75 80 75 65 C75 55 65 40 50 20Z' fill='white' opacity='0.9'/%3E%3Cellipse cx='40' cy='55' rx='5' ry='8' fill='%2338bdf8' opacity='0.5'/%3E%3C/svg%3E";
