export function ResultsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Record<string, unknown> | unknown[]>;
}) {
  const getCell = (row: Record<string, unknown> | unknown[], col: string, i: number) =>
    Array.isArray(row) ? row[i] : row[col];

  return (
    <div className="rounded-2xl glass overflow-hidden shadow-card animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-primary/10 to-accent/30">
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 text-start font-semibold text-foreground/80 whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border/40 hover:bg-accent/20 transition">
                {columns.map((c, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-foreground/90 whitespace-nowrap">
                    {String(getCell(r, c, ci) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/40">
        {rows.length} {rows.length === 1 ? "row" : "rows"}
      </div>
    </div>
  );
}
