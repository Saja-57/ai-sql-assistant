import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Database, Table2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getSchema } from "@/lib/api";

export const Route = createFileRoute("/dashboard/schema")({
  component: SchemaPage,
});

function SchemaPage() {
  const { t } = useI18n();
  const [schema, setSchema] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getSchema().then((s) => {
      setSchema(s);
      setOpen(Object.fromEntries(Object.keys(s).map((k) => [k, true])));
    });
  }, []);

  const tables = Object.entries(schema);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Database className="w-7 h-7 text-primary" /> {t.schemaTitle}
        </h1>
        <p className="text-muted-foreground mt-1.5">{t.schemaSubtitle}</p>
        <div className="text-xs text-muted-foreground mt-2">
          {tables.length} {t.tables}
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(([name, cols]) => (
          <div key={name} className="glass rounded-2xl overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-0.5">
            <button
              onClick={() => setOpen((o) => ({ ...o, [name]: !o[name] }))}
              className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg gradient-bg-primary flex items-center justify-center">
                  <Table2 className="w-4 h-4 text-white" />
                </div>
                <div className="text-start">
                  <div className="font-semibold text-sm">{name}</div>
                  <div className="text-xs text-muted-foreground">{cols.length} {t.columns}</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${open[name] ? "rotate-180" : ""}`} />
            </button>
            {open[name] && (
              <ul className="px-4 pb-4 space-y-1 animate-fade-in">
                {cols.map((c) => (
                  <li key={c} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono bg-muted/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
