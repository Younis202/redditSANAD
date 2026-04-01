import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Card ─────────────────────────────────────────────── */
export function Card({ className, children, dark, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { dark?: boolean }) {
  return (
    <div
      className={cn(
        dark ? "glass-card-dark" : "glass-card",
        "rounded-[2rem]",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between px-6 py-4 border-b border-black/[0.055]", className)} {...props}>
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
    <div className={cn("p-6", className)} {...props}>
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
        "flex h-10 w-full rounded-[12px] border border-black/[0.1] bg-white px-4 py-2 text-[13px]",
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
        "flex h-10 w-full rounded-[12px] border border-black/[0.1] bg-white px-4 py-2 text-[13px]",
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
const BADGE_DOTS: Record<string, string> = {
  default:     "bg-primary",
  info:        "bg-sky-500",
  success:     "bg-emerald-500",
  warning:     "bg-amber-500",
  destructive: "bg-red-500",
  outline:     "",
  purple:      "bg-violet-500",
};

const BADGE_TEXT: Record<string, string> = {
  default:     "text-primary",
  info:        "text-sky-700",
  success:     "text-emerald-700",
  warning:     "text-amber-700",
  destructive: "text-red-700",
  outline:     "text-muted-foreground",
  purple:      "text-violet-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "info" | "purple";
  className?: string;
}) {
  const dotColor = BADGE_DOTS[variant];
  const textColor = BADGE_TEXT[variant];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold tracking-wide bg-secondary",
      variant === "outline" && "border border-black/[0.09]",
      textColor,
      className
    )}>
      {dotColor && (
        <span className={cn("w-[5px] h-[5px] rounded-full shrink-0", dotColor)} />
      )}
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
    <div className="flex items-start justify-between mb-8">
      <div>
        {breadcrumb && (
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.12em] mb-2 px-3 py-1 bg-primary/10 rounded-full inline-block">{breadcrumb}</p>
        )}
        <h1 className="text-5xl font-extrabold text-foreground tracking-tight leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>{title}</h1>
        {subtitle && <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed font-medium max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4 flex gap-3 items-center">{action}</div>}
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────── */
export function KpiCard({ title, value, sub, icon: Icon, iconBg = "bg-primary/10", iconColor = "text-primary", trend, trendUp }: {
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
    <Card className="card-lift">
      <CardBody className="p-6">
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className={cn("w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
          )}
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-secondary",
              trendUp === false ? "text-red-600" : "text-emerald-600"
            )}>
              <span className={cn(
                "w-[5px] h-[5px] rounded-full shrink-0",
                trendUp === false ? "bg-red-500" : "bg-emerald-500"
              )} />
              {trend}
            </span>
          )}
        </div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2">{title}</p>
        <p className="text-[44px] font-black text-foreground tabular-nums leading-none" style={{ fontFamily: "'Manrope', sans-serif" }}>{value}</p>
        {sub && <p className="text-[11.5px] text-muted-foreground mt-2.5 leading-relaxed font-medium">{sub}</p>}
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
    warning:     { text: "text-amber-800", dot: "bg-amber-500", border: "#f59e0b" },
    destructive: { text: "text-red-800",   dot: "bg-red-500",   border: "#ef4444" },
    info:        { text: "text-sky-800",   dot: "bg-sky-500",   border: "#0ea5e9" },
  };
  const s = styles[variant];
  return (
    <div
      className={cn("flex items-center gap-3 px-4 py-3 rounded-[14px] text-[13px] font-medium mb-5 bg-secondary", s.text)}
      style={{ borderLeft: `3px solid ${s.border}` }}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot)} />
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

/* ─── PortalHero ────────────────────────────────────────── */
export function PortalHero({
  title,
  subtitle,
  icon: Icon,
  gradient,
  badge,
  stats,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
  stats?: { label: string; value: string | number }[];
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] mb-8 overflow-hidden relative" style={{ background: gradient }}>
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.10)" }} />
      <div className="absolute top-0 right-0 w-80 h-full pointer-events-none" style={{ background: "linear-gradient(to left, rgba(0,0,0,0.15), transparent)" }} />
      <div className="relative px-8 py-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {badge && (
              <span className="text-[10px] font-black uppercase tracking-[0.15em] rounded-full px-3.5 py-1" style={{ color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.13)" }}>
                {badge}
              </span>
            )}
          </div>
          {stats && stats.length > 0 && (
            <div className="flex items-start gap-8">
              {stats.map((s, i) => (
                <div key={i} className="text-right">
                  <p className="font-black text-white leading-none tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", fontSize: "clamp(20px, 2.5vw, 30px)" }}>
                    {s.value}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-black text-white leading-none tracking-tight" style={{ fontFamily: "'Manrope', sans-serif", fontSize: "clamp(26px, 3.5vw, 40px)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-[13px] font-medium leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.60)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}

/* ─── LiveChip ──────────────────────────────────────────── */
export function LiveChip({ label, pulse = true }: { label: string; pulse?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 bg-secondary px-3 py-1.5 rounded-full">
      <span className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block", pulse && "animate-pulse")} />
      {label}
    </div>
  );
}

/* ─── EmptyState ────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-[20px] bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-[15px] font-bold text-foreground mb-1.5">{title}</p>
      {description && <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── StatRow ───────────────────────────────────────────── */
export function StatRow({ items }: {
  items: { label: string; value: string | number; color?: string }[];
}) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p
            className="text-[28px] font-black tabular-nums leading-none mb-1"
            style={{ fontFamily: "'Manrope', sans-serif", color: item.color ?? "hsl(var(--foreground))" }}
          >
            {item.value}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
