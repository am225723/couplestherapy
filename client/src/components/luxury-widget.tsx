import { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface LuxuryWidgetProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  path: string;
  stat?: string | number;
  statLabel?: string;
  variant?: "default" | "primary" | "accent" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  "data-testid"?: string;
  isDragging?: boolean;
  dragHandleProps?: any;
  disableNavigation?: boolean;
  isLargeHeight?: boolean;
}

const variantColors = {
  default: {
    iconBg: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
    gradient: "from-slate-400/20 via-slate-500/15 to-slate-600/10 dark:from-slate-500/30 dark:via-slate-600/25 dark:to-slate-700/20",
    ring: "ring-1 ring-slate-300/60 dark:ring-slate-600/60",
    glow: "",
    border: "border-l-4 border-l-slate-500",
  },
  primary: {
    iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-500 dark:to-indigo-600",
    iconColor: "text-white",
    gradient: "from-blue-500/25 via-indigo-500/20 to-cyan-500/15 dark:from-blue-400/35 dark:via-indigo-400/30 dark:to-cyan-400/25",
    ring: "ring-1 ring-blue-300/70 dark:ring-blue-700/70",
    glow: "shadow-blue-500/10",
    border: "border-l-4 border-l-blue-500",
  },
  accent: {
    iconBg: "bg-gradient-to-br from-purple-400 to-pink-500 dark:from-purple-500 dark:to-pink-600",
    iconColor: "text-white",
    gradient: "from-purple-500/25 via-pink-500/20 to-fuchsia-500/15 dark:from-purple-400/35 dark:via-pink-400/30 dark:to-fuchsia-400/25",
    ring: "ring-1 ring-purple-300/70 dark:ring-purple-700/70",
    glow: "shadow-purple-500/10",
    border: "border-l-4 border-l-purple-500",
  },
  success: {
    iconBg: "bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-600",
    iconColor: "text-white",
    gradient: "from-emerald-500/25 via-teal-500/20 to-green-500/15 dark:from-emerald-400/35 dark:via-teal-400/30 dark:to-green-400/25",
    ring: "ring-1 ring-emerald-300/70 dark:ring-emerald-700/70",
    glow: "shadow-emerald-500/10",
    border: "border-l-4 border-l-emerald-500",
  },
  warning: {
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600",
    iconColor: "text-white",
    gradient: "from-amber-500/25 via-orange-500/20 to-yellow-500/15 dark:from-amber-400/35 dark:via-orange-400/30 dark:to-yellow-400/25",
    ring: "ring-1 ring-amber-300/70 dark:ring-amber-700/70",
    glow: "shadow-amber-500/10",
    border: "border-l-4 border-l-amber-500",
  },
};

const sizeClasses = {
  sm: "widget-sm",
  md: "widget-md",
  lg: "widget-lg",
  xl: "widget-xl",
};

export function LuxuryWidget({
  title,
  description,
  icon: Icon,
  path,
  stat,
  statLabel,
  variant = "default",
  size = "sm",
  className,
  "data-testid": testId,
  isDragging,
  dragHandleProps,
  disableNavigation = false,
  isLargeHeight = false,
}: LuxuryWidgetProps) {
  const colors = variantColors[variant];
  
  const content = (
    <div
      className={cn(
        "luxury-widget rounded-2xl p-4 relative cursor-pointer h-full",
        "flex flex-col",
        "shadow-lg hover:shadow-xl transition-shadow duration-300",
        colors.ring,
        colors.glow,
        colors.border,
        isDragging && "opacity-50 scale-105",
        className
      )}
      data-testid={testId}
      {...dragHandleProps}
    >
      <div className={cn("gradient-animate rounded-2xl bg-gradient-to-br", colors.gradient)} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-shrink-0 flex items-start justify-between mb-3">
          <div className={cn("p-2.5 rounded-xl flex-shrink-0", colors.iconBg)}>
            <Icon className={cn("h-5 w-5", colors.iconColor)} />
          </div>
        </div>
        
        {stat !== undefined && (
          <div className="flex-1 flex flex-col justify-center mb-3">
            <div className="stat-value">{stat}</div>
            {statLabel && <div className="stat-label mt-1">{statLabel}</div>}
          </div>
        )}
        
        <div className="flex-1 flex flex-col">
          <h3 className="font-bold text-sm text-foreground leading-tight tracking-tight mb-2">
            {title}
          </h3>
          {description && (
            <p className={cn("text-xs text-muted-foreground leading-relaxed flex-1", isLargeHeight ? "" : "line-clamp-3")}>
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (disableNavigation) {
    return <div className="block h-full">{content}</div>;
  }

  return (
    <Link href={path} className="block h-full">
      {content}
    </Link>
  );
}

interface StatWidgetProps {
  title: string;
  value: string | number;
  label?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "primary" | "accent" | "success" | "warning";
  className?: string;
  "data-testid"?: string;
}

export function StatWidget({
  title,
  value,
  label,
  icon: Icon,
  trend,
  variant = "default",
  className,
  "data-testid": testId,
}: StatWidgetProps) {
  const colors = variantColors[variant];

  return (
    <div
      className={cn(
        "luxury-widget rounded-2xl p-touch relative",
        "min-h-[120px] flex flex-col justify-between",
        className
      )}
      data-testid={testId}
    >
      <div className={cn("gradient-animate rounded-2xl bg-gradient-to-br", colors.gradient)} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-xl", colors.iconBg)}>
            <Icon className={cn("h-4 w-4", colors.iconColor)} />
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.positive 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {trend.positive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
        
        <div className="stat-value text-3xl">{value}</div>
        {label && <div className="stat-label mt-1.5">{label}</div>}
        <p className="text-xs text-muted-foreground mt-3 font-medium">{title}</p>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  cta?: string;
  variant?: "default" | "primary" | "accent";
  className?: string;
  "data-testid"?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  path,
  cta = "Get Started",
  variant = "primary",
  className,
  "data-testid": testId,
}: FeatureCardProps) {
  const colors = variantColors[variant];

  return (
    <Link href={path} className="block">
      <div
        className={cn(
          "luxury-widget rounded-2xl p-6 relative cursor-pointer widget-full",
          className
        )}
        data-testid={testId}
      >
        <div className={cn("gradient-animate rounded-2xl bg-gradient-to-br", colors.gradient)} />
        
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", colors.iconBg)}>
              <Icon className={cn("h-6 w-6", colors.iconColor)} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <div className={cn("text-sm font-medium flex items-center gap-1", colors.iconColor)}>
            {cta}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
