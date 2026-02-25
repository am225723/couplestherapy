import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
    " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          "border-primary-border bg-primary/90 text-primary-foreground shadow-xs",
        secondary:
          "border-secondary-border bg-secondary/90 text-secondary-foreground",
        destructive:
          "border-destructive-border bg-destructive text-destructive-foreground shadow-xs",
        outline:
          "border [border-color:var(--badge-outline)] bg-card/45 backdrop-blur-sm shadow-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
