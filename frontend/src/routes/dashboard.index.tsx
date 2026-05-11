import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Sparkles, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useHistory } from "@/lib/history";
import { generateSQL, uploadCSV, type SqlResponse } from "@/lib/api";
import { SQLBlock } from "@/components/SQLBlock";
import { ResultsTable } from "@/components/ResultsTable";

export const Route = createFileRoute("/dashboard/")({
  component: QueryPage,
});

const EXAMPLES = [
  "show all artists",
  "show albums",
  "show customers",
  "מי הלקוחות ששילמו הכי הרבה?",
  "مين هني العملاء الي بدفعوا اكثر اشي؟",
];

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

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pre = sessionStorage.getItem("prefill-question");

    if (pre) {
      setQuestion(pre);
      sessionStorage.removeItem("prefill-question");
      run(pre);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (q?: string) => {
    const ques = (q ?? question).trim();

    if (!ques) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await generateSQL(ques);

    setLoading(false);

    if (res.sql && FORBIDDEN.test(res.sql)) {
      setError(t.safetyNote);
      add({ question: ques, sql: res.sql, success: false });
      return;
    }

    if (!res.success) {
      setError(res.error || t.error);
      add({ question: ques, sql: res.sql, success: false });
      return;
    }

    setResult(res);
    add({ question: ques, sql: res.sql, success: true });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg(null);

    const r = await uploadCSV(file);

    setUploading(false);

    if (r.success) {
      setUploadMsg(t.uploaded);
    } else {
      setUploadMsg(r.error || r.message || t.error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir={dir}>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t.queryTitle}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {t.querySubtitle}
          </p>
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

      <div className="glass rounded-3xl p-5 md:p-6 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg-primary flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.placeholder}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                run();
              }
            }}
            className="flex-1 bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuestion(example);
                  run(example);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground transition"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            onClick={() => run()}
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-semibold shadow-elegant hover:shadow-glow transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}

            {loading ? t.generating : t.generateSQL}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 border-l-4 border-destructive flex items-start gap-3 animate-scale-in">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />

          <div>
            <div className="font-semibold text-destructive">
              {t.error}
            </div>

            <div className="text-sm text-muted-foreground mt-0.5">
              {error}
            </div>
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
          {t.noResults}
        </div>
      )}
    </div>
  );
}