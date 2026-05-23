import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AutoChartProps = {
  columns: string[];
  rows: any[][];
};

export function AutoChart({ columns, rows }: AutoChartProps) {
  if (!columns || !rows || columns.length < 2 || rows.length === 0) {
    return null;
  }

  const labelColumn = columns[0];
  const valueColumn = columns[1];

  const data = rows.slice(0, 10).map((row) => ({
    name:
  row[0] === 1
    ? "Yes"
    : row[0] === 0
    ? "No"
    : String(row[0]),
    value: Number(row[1]),
  }));

  const hasValidNumbers = data.every(
    (item) => !Number.isNaN(item.value)
  );

  if (!hasValidNumbers) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-5 animate-fade-in">
      <h3 className="font-semibold mb-4">
           {valueColumn} by {labelColumn}
         </h3>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
  contentStyle={{
    backgroundColor: "#111827",
    border: "none",
    borderRadius: "12px",
    color: "white",
  }}
/>
            <Bar dataKey="value"
             fill="#6366f1"
               radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Showing top 10 rows using {labelColumn} and {valueColumn}
      </p>
    </div>
  );
}