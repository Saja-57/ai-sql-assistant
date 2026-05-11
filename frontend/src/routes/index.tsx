import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileCode2, Sparkles, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Text-to-SQL — Natural Language Interface" },
      { name: "description", content: "AI-powered Text-to-SQL interface that turns natural language questions into instant database insights." },
      { property: "og:title", content: "Text-to-SQL — Natural Language Interface" },
      { property: "og:description", content: "AI-powered Text-to-SQL interface that turns natural language into SQL." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-5 lg:p-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-bg-primary flex items-center justify-center shadow-glow">
            <FileCode2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold">{t.appName}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.appTagline}</div>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-3xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-xs font-medium text-primary mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI · NLP · SQL
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            <span className="gradient-text">{t.welcomeTitle}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">{t.welcomeSubtitle}</p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl gradient-bg-primary text-white font-semibold shadow-elegant hover:shadow-glow transition-all hover:-translate-y-0.5"
            >
              {t.signIn}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl glass font-semibold text-foreground hover:bg-accent/30 transition-all hover:-translate-y-0.5"
            >
              <UserRound className="w-4 h-4" />
              {t.continueGuest}
            </Link>
          </div>

          <div className="mt-20 grid sm:grid-cols-3 gap-4">
            {[
              { title: "Natural Language", desc: "Ask in English, Hebrew or Arabic" },
              { title: "Instant SQL", desc: "AI generates queries in real time" },
              { title: "Safe & Read-only", desc: "SELECT-only execution layer" },
            ].map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 text-start animate-slide-up">
                <div className="w-8 h-8 rounded-lg gradient-bg-primary mb-3 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
