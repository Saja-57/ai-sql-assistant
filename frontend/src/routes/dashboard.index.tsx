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
  getDatasets,
  getDatasetInsights,
  getSelectedDatasetId,
  setSelectedDatasetId,
  type SqlResponse,
  type DatasetInsights,
  type DatasetItem,
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

  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetIdState, setSelectedDatasetIdState] =
    useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [insights, setInsights] = useState<DatasetInsights | null>(null);
  const [generatedQuestion, setGeneratedQuestion] = useState("");

  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const selectedDataset = datasets.find(
    (d) => d.id === selectedDatasetIdState
  );

  const selectedDatasetName =
    selectedDataset?.table_name || selectedDataset?.file_name || "";

  const hasDataset = datasets.length > 0 && selectedDatasetIdState !== null;

  async function loadInsights(datasetId: number) {
    const insightsRes = await getDatasetInsights(datasetId);

    if (insightsRes.success) {
      setInsights(insightsRes);
      setSuggestions(insightsRes.suggested_questions || []);
    } else {
      setInsights(null);
      setSuggestions([]);
    }
  }

  const loadDatasets = async () => {
    try {
      const data = await getDatasets();
      setDatasets(data);

      if (!Array.isArray(data) || data.length === 0) {
        setSelectedDatasetIdState(null);
        setInsights(null);
        setSuggestions([]);
        return;
      }

      const savedId = getSelectedDatasetId();

      const nextDataset =
        data.find((d) => d.id === savedId) || data[0];

      setSelectedDatasetIdState(nextDataset.id);
      setSelectedDatasetId(nextDataset.id);

      await loadInsights(nextDataset.id);
    } catch {
      setDatasets([]);
      setSelectedDatasetIdState(null);
      setInsights(null);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedToken =
      localStorage.getItem("access_token") || localStorage.getItem("token");

    setToken(savedToken);
    setIsGuest(localStorage.getItem("guest_mode") === "true" && !savedToken);

    const saved = sessionStorage.getItem("query-page-state");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuestion(parsed.question || "");
        setResult(parsed.result || null);
        setError(parsed.error || null);
        setUploadMsg(parsed.uploadMsg || null);
        setGeneratedQuestion(parsed.generatedQuestion || "");
      } catch {
        sessionStorage.removeItem("query-page-state");
      }
    }

    const pre = sessionStorage.getItem("prefill-question");

    if (pre) {
      setQuestion(pre);
      sessionStorage.removeItem("prefill-question");
    }
  }, []);

  useEffect(() => {
    if (!isGuest && token) {
      loadDatasets();
    } else {
      setDatasets([]);
      setSelectedDatasetIdState(null);
      setInsights(null);
      setSuggestions([]);
    }
  }, [token, isGuest]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    sessionStorage.setItem(
      "query-page-state",
      JSON.stringify({
        question,
        result,
        error,
        uploadMsg,
        generatedQuestion,
      })
    );
  }, [question, result, error, uploadMsg, generatedQuestion]);

  const run = async (q?: string) => {
    const ques = (q ?? question).trim();

    if (!ques) return;

    if (!selectedDatasetIdState) {
      setResult(null);
      setError("Please upload a CSV file before generating SQL.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await generateSQL(ques, selectedDatasetIdState);

      if (res.sql && FORBIDDEN.test(res.sql)) {
        setError(t.safetyNote);
        add({ question: ques, sql: res.sql, success: false });
        return;
      }

      if (!res.success) {
        setError(
          res.error ||
            `This question does not match ${selectedDatasetName}. Try asking about the uploaded dataset.`
        );
        add({ question: ques, sql: res.sql, success: false });
        return;
      }

      setResult(res);
      setQuestion(ques);
      setGeneratedQuestion(ques);

      add({ question: ques, sql: res.sql, success: true });
    } finally {
      setLoading(false);
    }
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
      setUploadMsg(`${t.uploaded} (${r.table_name || r.file_name || file.name})`);

      if (r.dataset_id) {
        setSelectedDatasetIdState(r.dataset_id);
        setSelectedDatasetId(r.dataset_id);
      }

      if (r.suggested_questions) {
        setSuggestions(r.suggested_questions);
      }

      await loadDatasets();

      if (r.dataset_id) {
        await loadInsights(r.dataset_id);
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
              value={selectedDatasetIdState ?? ""}
              onChange={async (e) => {
                const nextId = Number(e.target.value);

                if (!Number.isFinite(nextId)) return;

                setSelectedDatasetIdState(nextId);
                setSelectedDatasetId(nextId);
                setResult(null);
                setError(null);
                setGeneratedQuestion("");

                await loadInsights(nextId);
              }}
              className="w-full appearance-none rounded-xl glass px-4 py-2.5 pr-10 text-sm outline-none"
            >
              {datasets.length === 0 && (
                <option value="">No dataset uploaded yet</option>
              )}

              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.file_name || dataset.table_name}
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
                ? `Ask a question about ${selectedDatasetName}`
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

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Suggested Questions
            </div>

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
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
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

      {insights?.success && (
        <div className="glass rounded-3xl p-5 md:p-6 shadow-card space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Insights & Recommendations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Rows</div>
              <div className="text-2xl font-bold">
                {insights.rows_count ?? "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Columns</div>
              <div className="text-2xl font-bold">
                {insights.columns_count ?? insights.columns?.length ?? "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Table</div>
              <div className="text-lg font-semibold break-all">
                {insights.table_name || selectedDatasetName}
              </div>
            </div>
          </div>

          {insights.missing_values && (
            <div className="rounded-2xl bg-muted/30 p-4">
              <div className="font-semibold mb-2">Missing Values</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(insights.missing_values).map(([col, val]) => (
                  <div key={col} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{col}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.numeric_summary && (
            <div className="rounded-2xl bg-muted/30 p-4">
              <div className="font-semibold mb-2">Numeric Summary</div>
              <div className="space-y-2 text-sm">
                {Object.entries(insights.numeric_summary).map(([col, s]) => (
                  <div key={col} className="rounded-xl bg-background/40 p-3">
                    <div className="font-medium mb-1">{col}</div>
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      <span>Avg: {s.average}</span>
                      <span>Min: {s.min}</span>
                      <span>Max: {s.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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