import React from "react";
import { Link, useLocation } from "wouter";
import {
  ShieldAlert, HeartPulse, User, Building2,
  LayoutDashboard, LogOut, Bell, Settings, LifeBuoy,
  Activity, FlaskConical, Pill, BedDouble,
  Shield, Brain, Users, Package
} from "lucide-react";
import { cn } from "./shared";

type Role = "emergency" | "doctor" | "citizen" | "admin" | "lab" | "pharmacy" | "hospital" | "insurance" | "ai-control" | "research" | "family" | "supply-chain";

const roleConfigs: Record<Role, {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accentBg: string;
  accentText: string;
  nav: { href: string; icon: React.ElementType; label: string }[];
  user: string;
  userRole: string;
  userInitial: string;
}> = {
  emergency: {
    label: "Sanad",
    sublabel: "Emergency Response",
    icon: ShieldAlert,
    accentBg: "bg-red-500",
    accentText: "text-white",
    user: "Unit 7 — Riyadh Central",
    userRole: "First Responder",
    userInitial: "U",
    nav: [
      { href: "/emergency", icon: ShieldAlert, label: "Emergency Lookup" },
    ],
  },
  doctor: {
    label: "Sanad",
    sublabel: "Health Intelligence",
    icon: HeartPulse,
    accentBg: "bg-primary",
    accentText: "text-white",
    user: "Dr. Ahmed Al-Rashidi",
    userRole: "Physician · King Fahd MC",
    userInitial: "A",
    nav: [
      { href: "/doctor", icon: LayoutDashboard, label: "Patient Dashboard" },
    ],
  },
  citizen: {
    label: "Sanad",
    sublabel: "Citizen Portal",
    icon: User,
    accentBg: "bg-amber-500",
    accentText: "text-white",
    user: "Citizen Portal",
    userRole: "National Health Record",
    userInitial: "C",
    nav: [
      { href: "/citizen", icon: User, label: "My Health Records" },
    ],
  },
  admin: {
    label: "Sanad",
    sublabel: "Ministry Dashboard",
    icon: Building2,
    accentBg: "bg-primary",
    accentText: "text-white",
    user: "Ministry Admin",
    userRole: "Population Health Intelligence",
    userInitial: "M",
    nav: [
      { href: "/admin", icon: LayoutDashboard, label: "Analytics Dashboard" },
    ],
  },
  lab: {
    label: "Sanad",
    sublabel: "Lab Portal",
    icon: FlaskConical,
    accentBg: "bg-teal-500",
    accentText: "text-white",
    user: "Lab Tech. Sara Al-Otaibi",
    userRole: "Senior Lab Technician",
    userInitial: "S",
    nav: [
      { href: "/lab", icon: FlaskConical, label: "Lab Results" },
    ],
  },
  pharmacy: {
    label: "Sanad",
    sublabel: "Pharmacy Portal",
    icon: Pill,
    accentBg: "bg-purple-500",
    accentText: "text-white",
    user: "Hassan Al-Ghamdi",
    userRole: "Clinical Pharmacist",
    userInitial: "H",
    nav: [
      { href: "/pharmacy", icon: Pill, label: "Dispense & Check" },
    ],
  },
  hospital: {
    label: "Sanad",
    sublabel: "Hospital Operations",
    icon: BedDouble,
    accentBg: "bg-blue-600",
    accentText: "text-white",
    user: "Operations Manager",
    userRole: "King Fahd Medical City",
    userInitial: "O",
    nav: [
      { href: "/hospital", icon: BedDouble, label: "Hospital Overview" },
    ],
  },
  insurance: {
    label: "Sanad",
    sublabel: "Insurance Operations",
    icon: Shield,
    accentBg: "bg-violet-600",
    accentText: "text-white",
    user: "Nora Al-Qahtani",
    userRole: "Insurance Operations Lead",
    userInitial: "N",
    nav: [
      { href: "/insurance", icon: Shield, label: "Claims & Fraud Detection" },
    ],
  },
  "ai-control": {
    label: "Sanad",
    sublabel: "AI Control Center",
    icon: Brain,
    accentBg: "bg-violet-700",
    accentText: "text-white",
    user: "Dr. Khalid Al-Mansouri",
    userRole: "AI Systems Lead",
    userInitial: "K",
    nav: [
      { href: "/ai-control", icon: Brain, label: "Engine Monitor" },
    ],
  },
  research: {
    label: "Sanad",
    sublabel: "Clinical Research",
    icon: FlaskConical,
    accentBg: "bg-teal-700",
    accentText: "text-white",
    user: "Dr. Reem Al-Zahrani",
    userRole: "Health Data Scientist",
    userInitial: "R",
    nav: [
      { href: "/research", icon: Microscope, label: "Research Insights" },
    ],
  },
  family: {
    label: "Sanad",
    sublabel: "Family Health Portal",
    icon: Users,
    accentBg: "bg-pink-700",
    accentText: "text-white",
    user: "Family Health Coordinator",
    userRole: "Preventive Care Unit",
    userInitial: "F",
    nav: [
      { href: "/family", icon: Users, label: "Family Health Map" },
    ],
  },
  "supply-chain": {
    label: "Sanad",
    sublabel: "Supply Chain Intel",
    icon: Package,
    accentBg: "bg-orange-600",
    accentText: "text-white",
    user: "Faisal Al-Harbi",
    userRole: "Drug Supply Chain Manager",
    userInitial: "F",
    nav: [
      { href: "/supply-chain", icon: Package, label: "Inventory & Logistics" },
    ],
  },
};

export function Layout({ children, role }: { children: React.ReactNode; role: Role }) {
  const [location] = useLocation();
  const config = roleConfigs[role];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "hsl(240 6% 97%)" }}>

      {/* ─── Sidebar ─── */}
      <aside
        className="w-[220px] shrink-0 flex flex-col h-full"
        style={{
          background: "white",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "1px 0 0 rgba(0,0,0,0.03)",
        }}
      >
        {/* Logo block */}
        <div className="h-[60px] flex items-center gap-3 px-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className={cn(
            "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
            config.accentBg
          )}>
            <img
              src={`${import.meta.env.BASE_URL}images/sanad-logo.png`}
              alt="Sanad"
              className="w-4 h-4 object-contain brightness-0 invert"
            />
          </div>
          <div>
            <p className="text-[15px] font-bold text-foreground leading-none tracking-tight">{config.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{config.sublabel}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 pb-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.1em] px-2.5 mb-2 ml-0.5">
            Menu
          </p>
          {config.nav.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium cursor-pointer transition-all duration-150",
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/[0.04]"
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}

          <div className="pt-5 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.1em] px-2.5 mb-2 ml-0.5">
              System
            </p>
          </div>
          {[
            { icon: Bell, label: "Notifications" },
            { icon: LifeBuoy, label: "Support" },
            { icon: Settings, label: "Settings" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.04] cursor-pointer transition-all duration-150"
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </nav>

        {/* User block */}
        <div className="px-3 pb-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "12px" }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] mb-1"
            style={{ background: "hsl(240 6% 97%)" }}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold",
              config.accentBg, config.accentText
            )}>
              {config.userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{config.user}</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{config.userRole}</p>
            </div>
          </div>
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] text-[12px] font-medium cursor-pointer transition-all duration-150">
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Switch Role</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header
          className="h-[60px] shrink-0 flex items-center justify-between px-7"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {config.sublabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              All Systems Operational
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-black/[0.05] hover:text-foreground transition-all">
              <Bell className="w-4 h-4" />
            </button>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ml-1",
              config.accentBg, config.accentText
            )}>
              {config.userInitial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-7 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
