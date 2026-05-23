import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
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

      <div className="glass rounded-3xl p-8">
        <h2 className="text-xl font-semibold mb-4">
          Analytics Workspace
        </h2>

        <p className="text-muted-foreground">
          Dataset insights, charts, AI summaries, and advanced analytics
          will appear here.
        </p>
      </div>
    </div>
  );
}