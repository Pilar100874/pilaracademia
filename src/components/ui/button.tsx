import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-tight ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-glow",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-foreground underline underline-offset-4 hover:opacity-70 rounded-none",
        gradient:
          "bg-primary text-primary-foreground hover:bg-primary-glow",
        brand:
          "bg-primary text-primary-foreground hover:bg-primary-glow",
        fab: "bg-primary text-primary-foreground rounded-full shadow-card hover:shadow-elevated",
        soft: "bg-secondary text-foreground hover:bg-secondary/70 border border-border",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs uppercase tracking-widest",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-base uppercase tracking-[0.18em]",
        icon: "h-10 w-10",
        fab: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
