import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, History as HistoryIcon, RotateCw, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { getHistory } from "@/lib/api";

export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);

 useEffect(() => {
  async function loadHistory() {
    const data = await getHistory();

    if (Array.isArray(data)) {
      setItems(data);
    } else {
      setItems([]);
    }
  }

  loadHistory();
}, []);
  const rerun = (q: string) => {
    sessionStorage.setItem("prefill-question", q);
    Navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-primary" /> {t.historyTitle}
          </h1>
          <p className="text-muted-foreground mt-1.5">{t.historySubtitle}</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <HistoryIcon className="w-8 h-8 mx-auto mb-3 text-primary/60" />
          {t.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="glass rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3 hover:shadow-elegant transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {it.success ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-success/15 text-success">
                      <CheckCircle2 className="w-3 h-3" /> {t.success}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/15 text-destructive">
                      <XCircle className="w-3 h-3" /> {t.error}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {
  it.timestamp &&
  !isNaN(new Date(it.timestamp).getTime())
    ? new Date(it.timestamp).toLocaleString()
    : "No date"
}
                  </span>
                </div>
                <div className="font-medium text-sm truncate">{it.question}</div>
                {it.sql && (
                  <code className="block text-xs font-mono text-muted-foreground mt-1 truncate" dir="ltr">
                    {it.sql}
                  </code>
                )}
              </div>
              <button
                onClick={() => rerun(it.question)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-bg-primary text-white text-xs font-semibold shadow"
              >
                <RotateCw className="w-3.5 h-3.5" /> {t.rerun}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
