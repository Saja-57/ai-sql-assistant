import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Database,
  FileCode2,
  History,
  Home,
  Info,
  LogOut,
  Sparkles,
  Table2,
  UserRound,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const [email, setEmail] = useState("User");

  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("guest_mode");
      localStorage.removeItem("email");

      window.location.href = "/";
    }
  }

  const items = [
    { to: "/dashboard", label: t.nav.query, icon: Sparkles },
    { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/dashboard/schema", label: t.nav.schema, icon: Database },
    { to: "/dashboard/examples", label: t.nav.examples, icon: Table2 },
    { to: "/dashboard/history", label: t.nav.history, icon: History },
    { to: "/dashboard/about", label: t.nav.about, icon: Info },
  ];

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-2 p-4 border-e border-border/50 glass">
        <Link to="/" className="flex items-center gap-2 px-3 py-4">
          <div className="w-9 h-9 rounded-xl gradient-bg-primary flex items-center justify-center shadow-glow">
            <FileCode2 className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="font-bold text-sm leading-tight">{t.appName}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t.appTagline}
            </div>
          </div>
        </Link>

        <nav className="flex flex-col gap-1 mt-2">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;

            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "gradient-bg-primary text-white shadow-elegant"
                    : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-2 space-y-3">
          <div className="rounded-2xl glass p-3 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-bg-primary flex items-center justify-center shadow-glow">
                <UserRound className="w-4 h-4 text-white" />
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold">Signed in as</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {email}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-destructive/10 hover:text-destructive transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Home className="w-3.5 h-3.5" /> Welcome
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border/50 glass">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg-primary flex items-center justify-center">
              <FileCode2 className="w-4 h-4 text-white" />
            </div>

            <span className="font-bold text-sm">{t.appName}</span>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-bg-primary flex items-center justify-center shadow-glow">
              <UserRound className="w-4 h-4 text-white" />
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Welcome back</div>
              <div className="text-sm font-semibold">{email}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <button
  onClick={handleLogout}
  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold glass hover:bg-destructive/10 hover:text-destructive transition whitespace-nowrap"
>
  <LogOut className="w-3.5 h-3.5" />
  <span className="hidden sm:inline">Logout</span>
</button>
          </div>
        </header>

        <nav className="lg:hidden flex overflow-x-auto gap-1 px-3 py-2 border-b border-border/50">
          {items.map((it) => {
            const active = path === it.to;

            return (
              <Link
                key={it.to}
                to={it.to}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? "gradient-bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}