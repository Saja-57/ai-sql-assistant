import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  History as HistoryIcon,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { getHistory } from "@/lib/api";

export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
});

type HistoryItem = {
  id: number;

  dataset_id?: number;
  dataset_name?: string;
  dataset?: string;

  question: string;

  generated_sql?: string;
  sql?: string;

  result_summary?: string | {
    columns?: string[];
    rows?: any[][];
    rows_count?: number;
  };

  answer?: string;
  error?: string;
  success?: boolean;

  created_at?: string;
  timestamp?: string;
};

function HistoryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

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

  function rerun(q: string) {
    sessionStorage.setItem("prefill-question", q);
    navigate({ to: "/dashboard" });
  }

  function formatDate(item: HistoryItem) {
    const rawDate = item.created_at || item.timestamp;

    if (!rawDate) return "No date";

    const date = new Date(rawDate);

    if (isNaN(date.getTime())) return "No date";

    return date.toLocaleString();
  }

  function getDatasetName(item: HistoryItem) {
    return item.dataset_name || item.dataset || "Unknown dataset";
  }

  function getSql(item: HistoryItem) {
    return item.generated_sql || item.sql || "";
  }

  function getAnswer(item: HistoryItem) {
    return item.result_summary || item.answer || item.error || "No saved answer";
  }

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
          {items.map((it) => {
            const isOpen = openId === it.id;
            const sql = getSql(it);
            const answer = getAnswer(it);

            return (
              <div
                key={it.id}
                className="glass rounded-2xl p-4 hover:shadow-elegant transition"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : it.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
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
                        {formatDate(it)}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Database className="w-3 h-3" />
                        {getDatasetName(it)}
                      </span>
                    </div>

                    <div className="font-semibold text-sm truncate">
                      {it.question}
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : it.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg glass text-xs font-semibold"
                    >
                      {isOpen ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View answer
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => rerun(it.question)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-bg-primary text-white text-xs font-semibold shadow"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> {t.rerun}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                    {sql && (
                      <div>
                        <div className="text-xs font-semibold mb-1">
                          Generated SQL
                        </div>

                        <pre
                          className="text-xs font-mono bg-muted/60 rounded-xl p-3 overflow-x-auto"
                          dir="ltr"
                        >
                          {sql}
                        </pre>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-semibold mb-1">Answer</div>

                      <div className="text-sm bg-muted/40 rounded-xl p-3 whitespace-pre-wrap">
                       {typeof answer === "string"
  ? answer
  : JSON.stringify(answer, null, 2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}