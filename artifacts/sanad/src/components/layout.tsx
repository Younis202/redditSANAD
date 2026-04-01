import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ShieldAlert, HeartPulse, User, Building2,
  LayoutDashboard, LogOut, Bell,
  FlaskConical, Pill, BedDouble,
  Shield, Brain, Users, Package, AlertTriangle, CheckCircle2, X,
  Clock
} from "lucide-react";
import { cn } from "./shared";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Role = "emergency" | "doctor" | "citizen" | "admin" | "lab" | "pharmacy" | "hospital" | "insurance" | "ai-control" | "research" | "family" | "supply-chain";

const roleConfigs: Record<Role, {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accentBg: string;
  accentText: string;
  accentHex: string;
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
    accentHex: "#ef4444",
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
    accentHex: "#007AFF",
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
    accentHex: "#f59e0b",
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
    accentHex: "#007AFF",
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
    accentBg: "bg-emerald-600",
    accentText: "text-white",
    accentHex: "#059669",
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
    accentHex: "#a855f7",
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
    accentHex: "#2563eb",
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
    accentHex: "#7c3aed",
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
    accentHex: "#6d28d9",
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
    accentBg: "bg-indigo-700",
    accentText: "text-white",
    accentHex: "#4338ca",
    user: "Dr. Reem Al-Zahrani",
    userRole: "Health Data Scientist",
    userInitial: "R",
    nav: [
      { href: "/research", icon: FlaskConical, label: "Research Insights" },
    ],
  },
  family: {
    label: "Sanad",
    sublabel: "Family Health Portal",
    icon: Users,
    accentBg: "bg-pink-700",
    accentText: "text-white",
    accentHex: "#be185d",
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
    accentHex: "#ea580c",
    user: "Faisal Al-Harbi",
    userRole: "Drug Supply Chain Manager",
    userInitial: "F",
    nav: [
      { href: "/supply-chain", icon: Package, label: "Inventory & Logistics" },
    ],
  },
};

function LiveClock() {
  const [time, setTime] = React.useState(() => new Date().toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}

function BottomBar({ config, logout }: { config: typeof roleConfigs[Role]; logout: () => void }) {
  const IconEl = config.icon;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-2 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.14)] z-50"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.50)",
      }}
    >
      {/* Portal identity */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-[1.8rem]" style={{ background: "rgba(0,0,0,0.04)" }}>
        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", config.accentBg)}>
          <IconEl className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-bold text-foreground whitespace-nowrap">{config.sublabel}</span>
          <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">{config.userRole}</span>
        </div>
      </div>

      <div className="w-px h-7 bg-black/[0.08] mx-1" />

      {/* Overview */}
      <Link href={config.nav[0]?.href ?? "/"}>
        <div className="flex items-center gap-2 text-slate-500 hover:text-primary cursor-pointer px-3 py-2.5 rounded-2xl hover:bg-black/[0.05] transition-all">
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-xs font-bold whitespace-nowrap">Dashboard</span>
        </div>
      </Link>

      <div className="w-px h-7 bg-black/[0.08] mx-1" />

      {/* Live time */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 text-muted-foreground select-none">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-xs font-mono font-semibold"><LiveClock /></span>
      </div>

      <div className="w-px h-7 bg-black/[0.08] mx-1" />

      {/* Sign out */}
      <div
        onClick={() => { logout(); window.location.href = "/login"; }}
        className="flex items-center gap-2 text-slate-500 hover:text-red-500 cursor-pointer px-3 py-2.5 rounded-2xl hover:bg-secondary transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-xs font-bold">Sign Out</span>
      </div>
    </div>
  );
}

export function Layout({ children, role }: { children: React.ReactNode; role: Role }) {
  const [location] = useLocation();
  const config = roleConfigs[role];
  const { user: authUser, logout } = useAuth();
  const [showAlerts, setShowAlerts] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: alertsData } = useQuery({
    queryKey: ["system-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/system?limit=10");
      if (!res.ok) return { alerts: [], unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 15000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/alerts/read-all", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-alerts"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = alertsData?.unreadCount ?? 0;
  const systemAlerts = alertsData?.alerts ?? [];

  return (
    <div className="min-h-screen" style={{ background: "#F5F5F7" }}>

      {/* ─── Fixed Top Navigation ─── */}
      <header
        className="fixed top-0 w-full z-50 h-20 flex items-center px-8"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <nav className="flex justify-between items-center w-full max-w-[1800px] mx-auto">

          {/* Left: Logo + nav links */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <img
                  src={`${import.meta.env.BASE_URL}images/sanad-logo.png`}
                  alt="Sanad"
                  className="w-5 h-5 object-contain brightness-0 invert"
                />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight leading-none" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  SANAD <span className="font-light text-slate-400">HQ</span>
                </p>
                <p className="text-[9.5px] text-slate-400 font-medium leading-none mt-0.5">{config.sublabel}</p>
              </div>
            </div>

            <div className="hidden lg:flex gap-8">
              {config.nav.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-semibold transition-all relative pb-1",
                      isActive
                        ? "text-primary after:content-[''] after:absolute after:-bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded-full"
                        : "text-slate-500 hover:text-primary"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Status + Bell + User */}
          <div className="flex items-center gap-4">

            {/* All Systems Live */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-secondary px-3.5 py-2 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              All Systems Live
            </div>

            {/* Bell + dropdown */}
            <div className="relative">
              <button
                ref={bellRef}
                onClick={() => setShowAlerts(v => !v)}
                className="relative p-2.5 text-slate-500 hover:bg-black/[0.05] rounded-full transition-all"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              {showAlerts && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 top-[54px] w-[340px] bg-white rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-black/[0.07] z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">System Alerts</p>
                      {unreadCount > 0 && (
                        <p className="text-[10px] text-muted-foreground">{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => setShowAlerts(false)} className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {systemAlerts.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                        <p className="text-[13px] font-semibold text-foreground">All clear</p>
                        <p className="text-[11px] mt-0.5">No system alerts at this time</p>
                      </div>
                    ) : (
                      systemAlerts.map((alert: any) => (
                        <div
                          key={alert.id}
                          className={cn(
                            "px-4 py-3 border-b border-black/[0.04] last:border-0 transition-colors",
                            !alert.isRead ? "bg-primary/[0.03]" : ""
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-secondary">
                              <AlertTriangle className={cn(
                                "w-3 h-3",
                                alert.severity === "critical" ? "text-red-600" :
                                alert.severity === "warning" ? "text-amber-600" : "text-sky-600"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className={cn("text-[12px] font-semibold leading-snug", !alert.isRead ? "text-foreground" : "text-muted-foreground")}>
                                  {alert.title}
                                </p>
                                {!alert.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                              </div>
                              {alert.patientName && (
                                <p className="text-[10px] text-muted-foreground font-mono mb-0.5">
                                  {alert.patientName} · {alert.patientNationalId}
                                </p>
                              )}
                              <p className="text-[11px] text-muted-foreground leading-snug">{alert.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar + name */}
            <div className="flex items-center gap-3 hover:bg-black/[0.05] p-1 pr-4 rounded-full cursor-pointer transition-all">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0",
                config.accentBg, config.accentText
              )}>
                {authUser?.initial ?? config.userInitial}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">{authUser?.name ?? config.user}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">{authUser?.jobTitle ?? config.userRole}</span>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* ─── Page Content ─── */}
      <main className="pt-28 pb-36 px-8 max-w-[1800px] mx-auto page-enter">
        {children}
      </main>

      {/* ─── Floating Bottom Action Bar ─── */}
      <BottomBar config={config} logout={logout} />

    </div>
  );
}
