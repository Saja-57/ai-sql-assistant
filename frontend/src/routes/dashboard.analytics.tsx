import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Database,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  getDatasetInsights,
  type DatasetInsights,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [insights, setInsights] =
    useState<DatasetInsights | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const selectedDataset =
    sessionStorage.getItem("selected_dataset");

  if (selectedDataset) {
    loadInsights();
  } else {
    setLoading(false);
  }
}, []);

  async function loadInsights() {
    setLoading(true);

    const res = await getDatasetInsights();

    if (res.success) {
      setInsights(res);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Analytics
          </h1>

          <p className="text-muted-foreground mt-2">
            Loading analytics workspace...
          </p>
        </div>
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
            Upload a dataset to start exploring analytics.
          </p>
        </div>

        <div className="glass rounded-3xl p-8 text-center">
          <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

          <h2 className="text-xl font-semibold mb-2">
            No Dataset Uploaded
          </h2>

          <p className="text-muted-foreground">
            Upload a CSV file from the Query page to unlock AI insights,
            smart charts, and analytics.
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
          Advanced AI insights and visual analytics for your datasets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-primary" />

            <h2 className="font-semibold">
              Dataset Overview
            </h2>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">
                Table:
              </span>{" "}
              {insights.table_name}
            </div>

            <div>
              <span className="text-muted-foreground">
                Rows:
              </span>{" "}
              {insights.rows_count}
            </div>

            <div>
              <span className="text-muted-foreground">
                Columns:
              </span>{" "}
              {insights.columns_count}
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-5 h-5 text-primary" />

            <h2 className="font-semibold">
              Analytics Summary
            </h2>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              Numeric columns analyzed:
              {" "}
              {Object.keys(
                insights.numeric_summary || {}
              ).length}
            </div>

            <div>
              Suggested questions:
              {" "}
              {insights.suggested_questions?.length || 0}
            </div>

            <div>
              Dataset ready for AI analysis
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Lightbulb className="w-5 h-5 text-primary" />

            <h2 className="font-semibold">
              AI Recommendations
            </h2>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              • Explore average values
            </div>

            <div>
              • Compare categories
            </div>

            <div>
              • Analyze top-performing records
            </div>
          </div>
        </div>
      </div>

      {insights.numeric_summary &&
        Object.keys(insights.numeric_summary).length > 0 && (
          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-5">
              Numeric Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(insights.numeric_summary)
                .slice(0, 6)
                .map(([column, stats]) => (
                  <div
                    key={column}
                    className="rounded-2xl bg-muted/40 p-5"
                  >
                    <div className="font-semibold mb-3">
                      {column}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Average:
                        </span>{" "}
                        {stats.average.toFixed(2)}
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          Min:
                        </span>{" "}
                        {stats.min}
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          Max:
                        </span>{" "}
                        {stats.max}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      {insights.suggested_questions && (
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
      )}
    </div>
  );
}