import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
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
  type DatasetInsights,
  type SqlResponse,
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

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generatedQuestion, setGeneratedQuestion] = useState("");

  const [currentDatasetName, setCurrentDatasetName] = useState("");
  const [currentDatasetId, setCurrentDatasetId] = useState<number | null>(null);
  const [currentRowsCount, setCurrentRowsCount] = useState<number | null>(null);
  const [currentColumnsCount, setCurrentColumnsCount] = useState<number | null>(null);

  const [insights, setInsights] = useState<DatasetInsights | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const hasDataset = currentDatasetName.trim() !== "";
  const selectedDatasetName = currentDatasetName || "your uploaded dataset";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = sessionStorage.getItem("query-page-state");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setQuestion(parsed.question || "");
        setResult(parsed.result || null);
        setError(parsed.error || null);
        setUploadMsg(parsed.uploadMsg || null);
        setGeneratedQuestion(parsed.generatedQuestion || "");

        setCurrentDatasetName(parsed.currentDatasetName || "");
        setCurrentDatasetId(parsed.currentDatasetId ?? null);
        setCurrentRowsCount(parsed.currentRowsCount ?? null);
        setCurrentColumnsCount(parsed.currentColumnsCount ?? null);
        setSuggestions(parsed.suggestions || []);
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
    if (typeof window === "undefined") return;

    sessionStorage.setItem(
      "query-page-state",
      JSON.stringify({
        question,
        result,
        error,
        uploadMsg,
        generatedQuestion,
        currentDatasetName,
        currentDatasetId,
        currentRowsCount,
        currentColumnsCount,
        suggestions,
      })
    );
  }, [
    question,
    result,
    error,
    uploadMsg,
    generatedQuestion,
    currentDatasetName,
    currentDatasetId,
    currentRowsCount,
    currentColumnsCount,
    suggestions,
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

    try {
      const res = await generateSQL(ques, currentDatasetId as any);

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
      const fileName = r.file_name || r.table_name || file.name;

      setUploadMsg(`${t.uploaded} (${fileName})`);

      setCurrentDatasetName(fileName);
      setCurrentDatasetId(r.dataset_id ?? null);
      setCurrentRowsCount(r.rows_count ?? null);
      setCurrentColumnsCount(r.columns?.length ?? null);

      if (r.suggested_questions) {
        setSuggestions(r.suggested_questions);
      } else {
        setSuggestions([]);
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

const DatasetInsightsPanel = () => {
  if (!hasDataset) return null;

  const numericColumnsCount = 0;
const missingValuesCount = 0;

  return (
    <div className="glass rounded-3xl p-5 md:p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Dataset Insights
        </h2>

        <span className="text-xs text-muted-foreground">
          {selectedDatasetName}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <div className="text-xs text-muted-foreground">Rows</div>
          <div className="text-2xl font-bold">{currentRowsCount ?? "-"}</div>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <div className="text-xs text-muted-foreground">Columns</div>
          <div className="text-2xl font-bold">{currentColumnsCount ?? "-"}</div>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <div className="text-xs text-muted-foreground">Numeric</div>
          <div className="text-2xl font-bold">{numericColumnsCount}</div>
        </div>

        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <div className="text-xs text-muted-foreground">Missing</div>
          <div className="text-2xl font-bold">{missingValuesCount}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
        This dataset contains{" "}
        <span className="font-semibold text-foreground">
          {currentRowsCount ?? "-"}
        </span>{" "}
        rows and{" "}
        <span className="font-semibold text-foreground">
          {currentColumnsCount ?? "-"}
        </span>{" "}
        columns. You can ask questions about counts, averages, filters,
        comparisons, trends, and summaries.
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">
            Smart questions to try
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuestion(q);
                  setGeneratedQuestion("");
                  run(q);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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

          <div className="flex items-center gap-2 w-full md:w-80">
            <div className="rounded-xl glass px-4 py-2.5 text-sm w-full">
              <span className="text-muted-foreground">Current dataset: </span>
              <strong>{currentDatasetName || "Upload a CSV to start"}</strong>
            </div>
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

      {!result && !loading && !error && <DatasetInsightsPanel />}

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

         <DatasetInsightsPanel />
        </div>
      )}

      {!result && !loading && !error && !hasDataset && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/60" />
          Upload a CSV file to start analyzing your data.
        </div>
      )}

      {!result && !loading && !error && hasDataset && (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/60" />
          Ask a question to generate SQL and view results.
        </div>
      )}
    </div>
  );
}