import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type HistoryItem = {
  id: string;
  question: string;
  sql?: string;
  success: boolean;
  timestamp: number;
};

type Ctx = {
  items: HistoryItem[];
  add: (i: Omit<HistoryItem, "id" | "timestamp">) => void;
  clear: () => void;
};

const HistoryContext = createContext<Ctx | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("query-history");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const add = (i: Omit<HistoryItem, "id" | "timestamp">) => {
    setItems((prev) => {
      const next = [{ ...i, id: crypto.randomUUID(), timestamp: Date.now() }, ...prev].slice(0, 50);
      try { localStorage.setItem("query-history", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clear = () => {
    setItems([]);
    try { localStorage.removeItem("query-history"); } catch {}
  };

  return <HistoryContext.Provider value={{ items, add, clear }}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
