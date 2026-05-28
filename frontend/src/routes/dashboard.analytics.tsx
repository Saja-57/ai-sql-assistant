import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Database, BarChart3, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getDatasetInsights,
  getSelectedDatasetId,
  type DatasetInsights,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [insights, setInsights] = useState<DatasetInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    setLoading(true);

    const datasetId = getSelectedDatasetId();

    if (!datasetId) {
      setInsights(null);
      setLoading(false);
      return;
    }

    const res = await getDatasetInsights(datasetId);

    if (res.success) {
      setInsights(res);
    } else {
      setInsights(null);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Loading analytics workspace...
        </p>
      </div>
    );
  }

  if (!insights?.success) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Analytics
          </h1>

          <p className="text-muted-foreground mt-2">
            Upload or select a dataset first.
          </p>
        </div>

        <div className="glass rounded-3xl p-8 text-center">
          <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Dataset Selected</h2>
          <p className="text-muted-foreground">
            Go to the Query page, upload/select a CSV, then return here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Analytics
        </h1>

        <p className="text-muted-foreground mt-2">
          AI insights and recommendations for {insights.file_name || insights.table_name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-3xl p-6">
          <Database className="w-5 h-5 text-primary mb-3" />
          <h2 className="font-semibold mb-3">Dataset Overview</h2>
          <div className="space-y-2 text-sm">
            <div>Table: {insights.table_name}</div>
            <div>Rows: {insights.rows_count}</div>
            <div>Columns: {insights.columns_count}</div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <BarChart3 className="w-5 h-5 text-primary mb-3" />
          <h2 className="font-semibold mb-3">Analytics Summary</h2>
          <div className="space-y-2 text-sm">
            <div>
              Numeric columns: {Object.keys(insights.numeric_summary || {}).length}
            </div>
            <div>
              Suggested questions: {insights.suggested_questions?.length || 0}
            </div>
            <div>Dataset ready for AI analysis</div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <Lightbulb className="w-5 h-5 text-primary mb-3" />
          <h2 className="font-semibold mb-3">AI Recommendations</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>• Start by checking row count and missing values</div>
            <div>• Explore averages for numeric columns</div>
            <div>• Compare top values in categorical columns</div>
          </div>
        </div>
      </div>

      {insights.suggested_questions?.length ? (
        <div className="glass rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-5">
            AI Suggested Questions
          </h2>

          <div className="flex flex-wrap gap-3">
            {insights.suggested_questions.map((q) => (
              <div
                key={q}
                className="px-4 py-2 rounded-full bg-muted text-sm text-muted-foreground"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {insights.numeric_summary &&
        Object.keys(insights.numeric_summary).length > 0 && (
          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-5">Numeric Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(insights.numeric_summary).map(
                ([column, stats]) => (
                  <div key={column} className="rounded-2xl bg-muted/40 p-5">
                    <div className="font-semibold mb-3">{column}</div>
                    <div className="space-y-2 text-sm">
                      <div>Average: {Number(stats.average).toFixed(2)}</div>
                      <div>Min: {stats.min}</div>
                      <div>Max: {stats.max}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
    </div>
  );
}