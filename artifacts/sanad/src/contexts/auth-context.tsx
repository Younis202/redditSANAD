import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole =
  | "emergency" | "doctor" | "citizen" | "admin" | "lab"
  | "pharmacy" | "hospital" | "insurance" | "ai-control"
  | "research" | "family" | "supply-chain";

export interface AuthUser {
  role: UserRole;
  name: string;
  jobTitle: string;
  organization: string;
  initial: string;
  nationalId?: string;
}

const ROLE_USERS: Record<UserRole, AuthUser> = {
  emergency: { role: "emergency", name: "Unit 7 — Riyadh Central", jobTitle: "First Responder", organization: "SRCA Emergency Services", initial: "U" },
  doctor: { role: "doctor", name: "Dr. Ahmed Al-Rashidi", jobTitle: "Consultant Physician", organization: "King Fahd Medical City", initial: "A" },
  citizen: { role: "citizen", name: "Mohammed Al-Ghamdi", jobTitle: "Citizen", organization: "National Health Record", initial: "M", nationalId: "1000000001" },
  admin: { role: "admin", name: "Eng. Saad Al-Otaibi", jobTitle: "National Health Operations Director", organization: "Ministry of Health — KSA", initial: "S" },
  lab: { role: "lab", name: "Sara Al-Otaibi", jobTitle: "Senior Lab Technician", organization: "SANAD Lab Network", initial: "S" },
  pharmacy: { role: "pharmacy", name: "Hassan Al-Ghamdi", jobTitle: "Clinical Pharmacist", organization: "Central Pharmacy — Riyadh", initial: "H" },
  hospital: { role: "hospital", name: "Operations Manager", jobTitle: "Hospital Operations Director", organization: "King Fahd Medical City", initial: "O" },
  insurance: { role: "insurance", name: "Nora Al-Qahtani", jobTitle: "Insurance Operations Lead", organization: "Tawuniya Insurance", initial: "N" },
  "ai-control": { role: "ai-control", name: "Dr. Khalid Al-Mansouri", jobTitle: "AI Systems Lead", organization: "SANAD AI Division", initial: "K" },
  research: { role: "research", name: "Dr. Reem Al-Zahrani", jobTitle: "Clinical Research Director", organization: "King Abdulaziz University", initial: "R" },
  family: { role: "family", name: "Fatima Al-Harbi", jobTitle: "Family Health Coordinator", organization: "SANAD Family Health", initial: "F" },
  "supply-chain": { role: "supply-chain", name: "Ibrahim Al-Dosari", jobTitle: "Supply Chain Manager", organization: "National Pharma Supply", initial: "I" },
};

interface AuthContextValue {
  user: AuthUser | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

const SESSION_KEY = "sanad_session";
const ROLE_HEADER = "x-user-role";

let _currentRole: string | null = null;
const _nativeFetch = window.fetch.bind(window);

function patchFetch(role: string | null) {
  _currentRole = role;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (_currentRole && url.startsWith("/api")) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has(ROLE_HEADER)) {
        headers.set(ROLE_HEADER, _currentRole);
      }
      const nextInit = input instanceof Request
        ? new Request(input, { headers })
        : { ...init, headers };
      return _nativeFetch(input instanceof Request ? new Request(input.url, { ...input, headers }) : input, nextInit as RequestInit);
    }
    return _nativeFetch(input, init);
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      const u = stored ? JSON.parse(stored) : null;
      if (u?.role) patchFetch(u.role);
      return u;
    } catch {
      return null;
    }
  });

  const login = (role: UserRole) => {
    const u = ROLE_USERS[role];
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    patchFetch(role);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    patchFetch(null);
    window.fetch = _nativeFetch;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { ROLE_USERS };
