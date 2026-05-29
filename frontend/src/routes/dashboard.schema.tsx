import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Database, Table2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getDatasetSchema } from "@/lib/api";

export const Route = createFileRoute("/dashboard/schema")({
  component: SchemaPage,
});

type Column = {
  column_name: string;
  data_type: string;
};

type SchemaResponse = {
  success: boolean;
  error?: string;
  schema?: Record<string, Column[]>;
  tables?: any[];
};

function SchemaPage() {
  const { t } = useI18n();

  const [schema, setSchema] = useState<Record<string, Column[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSchema() {
      try {
        setLoading(true);
        setError("");

        const savedDataset = localStorage.getItem("selected_dataset");

        if (!savedDataset) {
          setSchema({});
          return;
        }

        const dataset = JSON.parse(savedDataset);
        const response: SchemaResponse = await getDatasetSchema(dataset.id);

        if (!response.success) {
          setSchema({});
          setError(response.error || "Failed to load schema");
          return;
        }

        let realSchema: Record<string, Column[]> = {};

        if (response.schema && Object.keys(response.schema).length > 0) {
          realSchema = response.schema;
        } else if (response.tables) {
          response.tables.forEach((table: any) => {
            realSchema[table.name] = (table.columns || []).map((col: any) => ({
              column_name: col.column_name || col.name,
              data_type: col.data_type || col.type || "TEXT",
            }));
          });
        }

        setSchema(realSchema);

        setOpen(
          Object.fromEntries(
            Object.keys(realSchema).map((k) => [k, true])
          )
        );
      } catch (err) {
        setSchema({});
        setError("Failed to load schema");
      } finally {
        setLoading(false);
      }
    }

    loadSchema();
  }, []);

  const tables = Object.entries(schema);

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Loading schema...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Database className="w-7 h-7 text-primary" />
          {t.schemaTitle}
        </h1>

        <p className="text-muted-foreground mt-1.5">
          {t.schemaSubtitle}
        </p>

        <div className="text-xs text-muted-foreground mt-2">
          {tables.length} {t.tables}
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(([name, cols]) => (
          <div
            key={name}
            className="glass rounded-2xl overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-0.5"
          >
            <button
              onClick={() =>
                setOpen((o) => ({
                  ...o,
                  [name]: !o[name],
                }))
              }
              className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg gradient-bg-primary flex items-center justify-center">
                  <Table2 className="w-4 h-4 text-white" />
                </div>

                <div className="text-start">
                  <div className="font-semibold text-sm">
                    {name}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {cols.length} columns
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  open[name] ? "rotate-180" : ""
                }`}
              />
            </button>

            {open[name] && (
              <ul className="px-4 pb-4 space-y-1 animate-fade-in">
                {cols.map((c) => (
                  <li
                    key={c.column_name}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      {c.column_name}
                    </div>

                    <span className="text-muted-foreground text-[10px] uppercase">
                      {c.data_type}
                    </span>
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