import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Sparkles,
  Upload,
  Database,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useHistory } from "@/lib/history";
import {
  generateSQL,
  uploadCSV,
  getSchema,
  getDatasetInsights,
  type SqlResponse,
  type DatasetInsights,
} from "@/lib/api";
import { SQLBlock } from "@/components/SQLBlock";
import { ResultsTable } from "@/components/ResultsTable";

export const Route = createFileRoute("/dashboard/")({
  component: QueryPage,
});

const FORBIDDEN = /\b(DELETE|DROP|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)\b/i;

function QueryPage() {
  const { t, dir } = useI18n();
  const { add } = useHistory();

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SqlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [datasets, setDatasets] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [insights, setInsights] = useState<DatasetInsights | null>(null);
  const [generatedQuestion, setGeneratedQuestion] = useState("");

  const [token, setToken] = useState<string | null>(null);
const [isGuest, setIsGuest] = useState(false);

useEffect(() => {
  if (typeof window === "undefined") return;

  const savedToken =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  setToken(savedToken);

  setIsGuest(
    localStorage.getItem("guest_mode") === "true" &&
    !savedToken
  );
}, []);

  const fileRef = useRef<HTMLInputElement>(null);

  const hasDataset = datasets.length > 0 && selectedDataset.trim() !== "";

  const loadDatasets = async () => {
    try {
      const res = await getSchema();

      if (res.success && res.schema) {
        const names = Object.keys(res.schema);

        setDatasets(names);

        if (names.length === 0) {
          setSelectedDataset("");
          setInsights(null);
          return;
        }

        setSelectedDataset((current) => {
          if (!current || !names.includes(current)) {
            return names[0];
          }
          return current;
        });

        const insightsRes = await getDatasetInsights();

        if (insightsRes.success) {
          setInsights(insightsRes);

          if (insightsRes.suggested_questions) {
            setSuggestions(insightsRes.suggested_questions);
          }
        }
      } else {
        setDatasets([]);
        setSelectedDataset("");
        setInsights(null);
      }
    } catch {
      setDatasets([]);
      setSelectedDataset("");
      setInsights(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedToken =
      localStorage.getItem("token") || localStorage.getItem("access_token");

    setToken(savedToken);
    setIsGuest(localStorage.getItem("guest_mode") === "true" && !savedToken);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isGuest && token) {
      loadDatasets();
    } else {
      setDatasets([]);
      setSelectedDataset("");
      setInsights(null);
      setSuggestions([]);
    }

    const saved = sessionStorage.getItem("query-page-state");

    if (saved && !isGuest) {
      try {
        const parsed = JSON.parse(saved);

        setQuestion(parsed.question || "");
        setResult(parsed.result || null);
        setError(parsed.error || null);
        setUploadMsg(parsed.uploadMsg || null);
        setSelectedDataset(parsed.selectedDataset || "");
        setGeneratedQuestion(parsed.generatedQuestion || "");
      } catch {
        sessionStorage.removeItem("query-page-state");
      }
    }

    const pre = sessionStorage.getItem("prefill-question");

    if (pre) {
      setQuestion(pre);
      sessionStorage.removeItem("prefill-question");
      run(pre);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isGuest]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isGuest) {
      sessionStorage.setItem(
        "query-page-state",
        JSON.stringify({
          question,
          result,
          error,
          uploadMsg,
          selectedDataset,
          generatedQuestion,
        })
      );
    }
  }, [
    question,
    result,
    error,
    uploadMsg,
    selectedDataset,
    generatedQuestion,
    isGuest,
  ]);

  const run = async (q?: string) => {
    const ques = (q ?? question).trim();

    if (!ques) return;

    if (!hasDataset) {
      setResult(null);
      setError("Please upload a CSV file before generating SQL.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const finalQuestion = `Use table ${selectedDataset}. ${ques}`;
    const res = await generateSQL(finalQuestion);

    setLoading(false);

    if (res.sql && FORBIDDEN.test(res.sql)) {
      setError(t.safetyNote);
      add({ question: ques, sql: res.sql, success: false });
      return;
    }

    if (!res.success) {
      setError(
        res.error ||
          `This question does not match ${selectedDataset}. Try asking about the uploaded dataset.`
      );
      add({ question: ques, sql: res.sql, success: false });
      return;
    }

    setResult(res);
    setQuestion(ques);
    setGeneratedQuestion(ques);

    add({ question: ques, sql: res.sql, success: true });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    setError(null);
    setResult(null);
    setGeneratedQuestion("");

    const r = await uploadCSV(file);

    setUploading(false);

    if (r.success) {
      setUploadMsg(`${t.uploaded} (${r.table_name})`);

      if (r.table_name) {
        setSelectedDataset(r.table_name);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("selected_dataset", r.table_name);
        }
      }

      if (r.suggested_questions) {
        setSuggestions(r.suggested_questions);
      }

      await loadDatasets();

      const insightsRes = await getDatasetInsights();

      if (insightsRes.success) {
        setInsights(insightsRes);
      }
    } else {
      setUploadMsg(r.error || r.message || t.error);
    }
  };

  const clearQueryState = () => {
    setQuestion("");
    setResult(null);
    setError(null);
    setGeneratedQuestion("");

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("query-page-state");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir={dir}>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t.queryTitle}
          </h1>
          <p className="text-muted-foreground mt-1.5">{t.querySubtitle}</p>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium hover:bg-accent/30 transition disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? t.uploading : t.uploadCSV}
          </button>

          {uploadMsg && (
            <div className="text-xs text-muted-foreground mt-1.5 text-end">
              {uploadMsg}
            </div>
          )}
        </div>
      </header>

      <div className="glass rounded-3xl p-5 md:p-6 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Database className="w-4 h-4" />
            Dataset
          </div>

          <div className="relative w-full md:w-80">
            <select
              value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value);
                setResult(null);
                setError(null);
                setGeneratedQuestion("");
              }}
              className="w-full appearance-none rounded-xl glass px-4 py-2.5 pr-10 text-sm outline-none"
            >
              {datasets.length === 0 && (
                <option value="">No dataset uploaded yet</option>
              )}

              {datasets.map((dataset) => (
                <option key={dataset} value={dataset}>
                  {dataset}
                </option>
              ))}
            </select>

            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg-primary flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setGeneratedQuestion("");
            }}
            placeholder={
              hasDataset
                ? `Ask a question about ${selectedDataset}`
                : "Upload a CSV first, then ask questions about your data"
            }
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                run();
              }
            }}
            className="flex-1 bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuestion(example);
                  setGeneratedQuestion("");
                  run(example);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(question || result || error) && (
              <button
                onClick={clearQueryState}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-semibold hover:bg-accent/30 transition"
              >
                Clear
              </button>
            )}

            <button
              onClick={() => run()}
              disabled={
                loading ||
                !question.trim() ||
                !hasDataset ||
                (result !== null && generatedQuestion === question.trim())
              }
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-semibold shadow-elegant hover:shadow-glow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}

              {loading
                ? t.generating
                : result && generatedQuestion === question.trim()
                ? "Generated"
                : t.generateSQL}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 border-l-4 border-destructive flex items-start gap-3 animate-scale-in">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />

          <div>
            <div className="font-semibold text-destructive">{t.error}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded shimmer" />
          <div className="h-3 w-2/3 bg-muted rounded shimmer" />
          <div className="h-3 w-1/2 bg-muted rounded shimmer" />
        </div>
      )}

      {result?.sql && (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t.generatedSQL}
            </h2>
            <SQLBlock sql={result.sql} />
          </section>

          {result.explanation && (
            <section className="glass rounded-2xl p-5 animate-fade-in">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t.explanation}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.explanation}
              </p>
            </section>
          )}

          {result.columns && result.rows && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t.results}
              </h2>
              <ResultsTable columns={result.columns} rows={result.rows} />
            </section>
          )}
        </div>
      )}

      {insights?.success && (
        <div className="glass rounded-3xl p-5 md:p-6 shadow-card space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Dataset Insights
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Rows</div>
              <div className="text-2xl font-bold">{insights.rows_count}</div>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Columns</div>
              <div className="text-2xl font-bold">{insights.columns_count}</div>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Table</div>
              <div className="text-lg font-semibold">{insights.table_name}</div>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/60" />
          {hasDataset
            ? "Ask a question to generate SQL and view results."
            : "Upload a CSV file to start analyzing your data."}
        </div>
      )}
    </div>
  );
}