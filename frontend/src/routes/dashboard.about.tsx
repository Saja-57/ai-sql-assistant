import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Brain, Database, FileCode2, Shield, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/about")({
  head: () => ({
    meta: [
      { title: "About — Text-to-SQL" },
      { name: "description", content: "About the Text-to-SQL Natural Language Interface project." },
    ],
  }),
  component: AboutPage,
});

const cards = [
  { icon: Brain, title: "Natural Language Processing", desc: "Understands questions in plain English, Hebrew and Arabic." },
  { icon: FileCode2, title: "SQL Generation", desc: "Generates accurate SQL queries from natural language." },
  { icon: Database, title: "Relational Databases", desc: "Designed around the Chinook SQLite schema." },
  { icon: Shield, title: "Query Validation", desc: "SELECT-only safety layer blocks destructive operations." },
  { icon: BarChart3, title: "Data Visualization", desc: "Clean tables, code blocks and explanations." },
  { icon: Sparkles, title: "AI-powered UX", desc: "A premium AI dashboard built for clarity and speed." },
];

function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.aboutTitle}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          This project demonstrates how natural language processing and AI can help non-technical
          users interact with relational databases without writing SQL manually.
        </p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="glass rounded-2xl p-5 hover:-translate-y-1 hover:shadow-elegant transition-all">
              <div className="w-10 h-10 rounded-xl gradient-bg-primary flex items-center justify-center mb-3 shadow-glow">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-semibold mb-1">{c.title}</div>
              <div className="text-sm text-muted-foreground">{c.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-3xl p-6 md:p-8 text-sm text-muted-foreground leading-relaxed">
        Built as a final-year Information Systems / AI project. The frontend is a modern React +
        TanStack Router application with a glassmorphism design system and full RTL multilingual
        support. It connects to a FastAPI backend at <code className="font-mono">127.0.0.1:8001</code>{" "}
        and falls back gracefully to mock data when offline.
      </div>
    </div>
  );
}
