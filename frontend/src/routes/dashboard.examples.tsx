import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Globe2, Music, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/examples")({
  component: ExamplesPage,
});

const examples = [
  { q: "Show all artists", desc: "List every artist in the catalog", icon: Music },
  { q: "Show all albums", desc: "Browse the album collection", icon: Music },
  { q: "Show the top 10 customers by total spending", desc: "Big spenders, ranked", icon: TrendingUp },
  { q: "Show total sales by country", desc: "Geographic breakdown of revenue", icon: Globe2 },
  { q: "Show the most popular genres", desc: "What's trending in the catalog", icon: BarChart3 },
  { q: "Show tracks with price greater than 1", desc: "Premium tracks above $1", icon: ShoppingCart },
  { q: "Show invoices by customer", desc: "Group invoices per customer", icon: Users },
];

function ExamplesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const tryIt = (q: string) => {
    sessionStorage.setItem("prefill-question", q);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t.examplesTitle}</h1>
        <p className="text-muted-foreground mt-1.5">{t.examplesSubtitle}</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map((e) => {
          const Icon = e.icon;
          return (
            <button
              key={e.q}
              onClick={() => tryIt(e.q)}
              className="glass rounded-2xl p-5 text-start hover:shadow-elegant hover:-translate-y-1 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl gradient-bg-primary flex items-center justify-center mb-3 shadow-glow">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-semibold text-sm mb-1">{e.q}</div>
              <div className="text-xs text-muted-foreground">{e.desc}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary group-hover:gap-2.5 transition-all">
                {t.tryIt} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
