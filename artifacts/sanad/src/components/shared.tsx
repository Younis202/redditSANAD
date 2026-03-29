import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Card ─────────────────────────────────────────────── */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-[20px]",
        "shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]",
        "border border-black/[0.05]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between px-5 py-4 border-b border-black/[0.05]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-sm font-semibold text-foreground tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}

/* ─── Button ────────────────────────────────────────────── */
export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}) {
  const variants = {
    primary:     "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-[0.97]",
    secondary:   "bg-secondary text-foreground hover:bg-border active:scale-[0.97]",
    outline:     "border border-black/[0.1] bg-white text-foreground hover:bg-secondary active:scale-[0.97]",
    destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-sm shadow-destructive/20 active:scale-[0.97]",
    accent:      "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-[0.97]",
    ghost:       "bg-transparent text-foreground hover:bg-secondary active:scale-[0.97]",
  };
  const sizes = {
    sm: "h-8 px-3.5 text-xs gap-1.5 rounded-[10px]",
    md: "h-9 px-4.5 text-sm gap-2 rounded-[12px]",
    lg: "h-11 px-6 text-sm font-semibold gap-2 rounded-[14px]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold",
        "transition-all duration-150 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant], sizes[size], className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : children}
    </button>
  );
}

/* ─── Input ─────────────────────────────────────────────── */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-[12px] border border-black/[0.1] bg-white px-4 py-2 text-sm",
        "placeholder:text-muted-foreground/60",
        "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40",
        "transition-all duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/* ─── Select ────────────────────────────────────────────── */
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-[12px] border border-black/[0.1] bg-white px-4 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40",
        "transition-all duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/* ─── Badge ─────────────────────────────────────────────── */
export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "info" | "purple";
  className?: string;
}) {
  const variants = {
    default:     "bg-primary/10 text-primary",
    info:        "bg-sky-100 text-sky-700",
    success:     "bg-emerald-100 text-emerald-700",
    warning:     "bg-amber-100 text-amber-700",
    destructive: "bg-red-100 text-red-700",
    outline:     "bg-secondary text-muted-foreground border border-black/[0.07]",
    purple:      "bg-violet-100 text-violet-700",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
      variants[variant], className
    )}>
      {children}
    </span>
  );
}

/* ─── PageHeader ────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────── */
export function KpiCard({ title, value, sub, icon: Icon, iconBg = "bg-secondary", iconColor = "text-primary", trend }: {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  trend?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className={cn("w-10 h-10 rounded-[14px] flex items-center justify-center", iconBg)}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
          )}
          {trend && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
          )}
        </div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1">{title}</p>
        <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{sub}</p>}
      </CardBody>
    </Card>
  );
}

/* ─── StatusDot ─────────────────────────────────────────── */
export function StatusDot({ status }: { status: "normal" | "abnormal" | "critical" | "active" | "inactive" }) {
  const colors = {
    normal:   "bg-emerald-500",
    active:   "bg-emerald-500",
    abnormal: "bg-amber-500",
    inactive: "bg-muted-foreground",
    critical: "bg-red-500 animate-pulse",
  };
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", colors[status])} />;
}

/* ─── Tabs — iOS segment style ──────────────────────────── */
export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-black/[0.06] overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold border-b-2 -mb-px transition-all duration-150 whitespace-nowrap shrink-0",
            active === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
              active === tab.id
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Alert Banner ──────────────────────────────────────── */
export function AlertBanner({ children, variant = "warning" }: {
  children: React.ReactNode;
  variant?: "warning" | "destructive" | "info";
}) {
  const styles = {
    warning:     "bg-amber-50 border-amber-200/60 text-amber-900",
    destructive: "bg-red-50 border-red-200/60 text-red-900",
    info:        "bg-sky-50 border-sky-200/60 text-sky-900",
  };
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-[16px] border text-sm font-medium mb-5",
      styles[variant]
    )}>
      {children}
    </div>
  );
}

/* ─── DataLabel ─────────────────────────────────────────── */
export function DataLabel({ label, children, className }: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
