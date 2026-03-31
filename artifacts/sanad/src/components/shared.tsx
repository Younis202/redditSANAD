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
        "rounded-[28px]",
        "shadow-[0_1px_4px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]",
        "border border-black/[0.055]",
        className
      )}
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between px-5 py-4 border-b border-black/[0.055]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[13px] font-semibold text-foreground tracking-tight", className)} {...props}>
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
    sm: "h-8 px-3.5 text-[12px] gap-1.5 rounded-[10px]",
    md: "h-9 px-4 text-[13px] gap-2 rounded-[11px]",
    lg: "h-10 px-5 text-[13px] font-semibold gap-2 rounded-[13px]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold",
        "transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant], sizes[size], className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
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
        "flex h-9 w-full rounded-[11px] border border-black/[0.1] bg-white px-4 py-2 text-[13px]",
        "placeholder:text-muted-foreground/55",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/35",
        "transition-all duration-150",
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
        "flex h-9 w-full rounded-[11px] border border-black/[0.1] bg-white px-4 py-2 text-[13px]",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/35",
        "transition-all duration-150",
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
    outline:     "bg-white text-muted-foreground border border-black/[0.08]",
    purple:      "bg-violet-100 text-violet-700",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide",
      variants[variant], className
    )}>
      {children}
    </span>
  );
}

/* ─── PageHeader ────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action, breadcrumb }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        {breadcrumb && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-1.5">{breadcrumb}</p>
        )}
        <h1 className="text-[21px] font-bold text-foreground tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────── */
export function KpiCard({ title, value, sub, icon: Icon, iconBg = "bg-secondary", iconColor = "text-primary", trend, trendUp }: {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className={cn("w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("w-[18px] h-[18px]", iconColor)} />
            </div>
          )}
          {trend && (
            <span className={cn(
              "text-[10.5px] font-semibold px-2 py-0.5 rounded-full",
              trendUp === false
                ? "text-red-600 bg-red-50"
                : "text-emerald-600 bg-emerald-50"
            )}>{trend}</span>
          )}
        </div>
        <p className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-[0.09em] mb-1">{title}</p>
        <p className="text-[30px] font-bold text-foreground tabular-nums leading-none" style={{ fontFamily: "'Manrope', sans-serif" }}>{value}</p>
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
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0 mt-0.5", colors[status])} />;
}

/* ─── Tabs ──────────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; count?: number; icon?: React.ElementType }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="flex border-b overflow-x-auto"
      style={{ borderColor: "rgba(0,0,0,0.07)", scrollbarWidth: "none" }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-[12.5px] font-semibold border-b-2 -mb-px",
              "transition-all duration-150 whitespace-nowrap shrink-0",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-black/[0.1]"
            )}
          >
            {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "text-[9.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[17px] text-center",
                isActive ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Alert Banner ──────────────────────────────────────── */
export function AlertBanner({ children, variant = "warning" }: {
  children: React.ReactNode;
  variant?: "warning" | "destructive" | "info";
}) {
  const styles = {
    warning:     "bg-amber-50 border-amber-200/70 text-amber-900",
    destructive: "bg-red-50 border-red-200/70 text-red-900",
    info:        "bg-sky-50 border-sky-200/70 text-sky-900",
  };
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-[14px] border text-[13px] font-medium mb-5",
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
      <p className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-[0.09em]">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

/* ─── SectionDivider ────────────────────────────────────── */
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <p className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-[0.1em] whitespace-nowrap">{label}</p>
      <div className="flex-1 h-px bg-black/[0.06]" />
    </div>
  );
}
