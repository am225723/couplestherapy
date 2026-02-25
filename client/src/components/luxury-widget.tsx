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
    iconBg:
      "bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800",
    iconColor: "text-zinc-700 dark:text-zinc-200",
    gradient:
      "from-zinc-400/20 via-zinc-500/15 to-zinc-600/10 dark:from-zinc-500/30 dark:via-zinc-600/25 dark:to-zinc-700/20",
    ring: "ring-1 ring-zinc-300/60 dark:ring-zinc-600/60",
    glow: "shadow-zinc-500/10",
    border: "border-l-4 border-l-zinc-500",
  },
  primary: {
    iconBg:
      "bg-gradient-to-br from-amber-300 to-amber-500 dark:from-amber-400 dark:to-amber-600",
    iconColor: "text-zinc-900",
    gradient:
      "from-amber-400/25 via-orange-400/20 to-yellow-300/15 dark:from-amber-300/35 dark:via-orange-300/30 dark:to-yellow-300/25",
    ring: "ring-1 ring-amber-300/70 dark:ring-amber-700/70",
    glow: "shadow-amber-500/20",
    border: "border-l-4 border-l-amber-500",
  },
  accent: {
    iconBg:
      "bg-gradient-to-br from-rose-300 to-orange-300 dark:from-rose-400 dark:to-orange-400",
    iconColor: "text-white",
    gradient:
      "from-rose-400/25 via-orange-300/20 to-amber-300/15 dark:from-rose-400/35 dark:via-orange-300/30 dark:to-amber-300/25",
    ring: "ring-1 ring-rose-300/70 dark:ring-rose-700/70",
    glow: "shadow-rose-500/20",
    border: "border-l-4 border-l-rose-400",
  },
  success: {
    iconBg:
      "bg-gradient-to-br from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500",
    iconColor: "text-white",
    gradient:
      "from-emerald-500/25 via-teal-500/20 to-cyan-400/15 dark:from-emerald-400/35 dark:via-teal-400/30 dark:to-cyan-400/25",
    ring: "ring-1 ring-emerald-300/70 dark:ring-emerald-700/70",
    glow: "shadow-emerald-500/20",
    border: "border-l-4 border-l-emerald-500",
  },
  warning: {
    iconBg:
      "bg-gradient-to-br from-sky-400 to-cyan-500 dark:from-sky-500 dark:to-cyan-600",
    iconColor: "text-white",
    gradient:
      "from-sky-500/25 via-cyan-500/20 to-blue-500/15 dark:from-sky-400/35 dark:via-cyan-400/30 dark:to-blue-400/25",
    ring: "ring-1 ring-sky-300/70 dark:ring-sky-700/70",
    glow: "shadow-sky-500/20",
    border: "border-l-4 border-l-sky-500",
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
        className,
      )}
      data-testid={testId}
      {...dragHandleProps}
    >
      <div
        className={cn(
          "gradient-animate rounded-2xl bg-gradient-to-br",
          colors.gradient,
        )}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-shrink-0 flex items-start justify-between mb-3">
          <div className={cn("p-2.5 rounded-xl flex-shrink-0", colors.iconBg)}>
            <Icon className={cn("h-6 w-6", colors.iconColor)} />
          </div>
        </div>

        {stat !== undefined && (
          <div className="flex-1 flex flex-col justify-center mb-3">
            <div className="stat-value">{stat}</div>
            {statLabel && <div className="stat-label mt-1">{statLabel}</div>}
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <h3 className="font-bold text-base text-foreground leading-tight tracking-tight mb-2">
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                "text-sm text-muted-foreground leading-relaxed flex-1",
                isLargeHeight ? "" : "line-clamp-3",
              )}
            >
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
        className,
      )}
      data-testid={testId}
    >
      <div
        className={cn(
          "gradient-animate rounded-2xl bg-gradient-to-br",
          colors.gradient,
        )}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-xl", colors.iconBg)}>
            <Icon className={cn("h-4 w-4", colors.iconColor)} />
          </div>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                trend.positive
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300",
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>

        <div className="stat-value text-3xl">{value}</div>
        {label && <div className="stat-label mt-1.5">{label}</div>}
        <p className="text-xs text-muted-foreground mt-3 font-medium">
          {title}
        </p>
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
          className,
        )}
        data-testid={testId}
      >
        <div
          className={cn(
            "gradient-animate rounded-2xl bg-gradient-to-br",
            colors.gradient,
          )}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", colors.iconBg)}>
              <Icon className={cn("h-6 w-6", colors.iconColor)} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground tracking-tight">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "text-sm font-medium flex items-center gap-1",
              colors.iconColor,
            )}
          >
            {cta}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
