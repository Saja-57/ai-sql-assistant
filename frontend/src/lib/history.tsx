import { useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  question: string;
  sql?: string;
  success: boolean;
  timestamp: string;
};

const STORAGE_KEY = "query-history";

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      setItems([]);
    }
  }, []);

  const save = (next: HistoryItem[]) => {
    setItems(next);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
  };

  const add = (item: {
    question: string;
    sql?: string;
    success: boolean;
  }) => {
    const nextItem: HistoryItem = {
      id: crypto.randomUUID(),
      question: item.question,
      sql: item.sql,
      success: item.success,
      timestamp: new Date().toISOString(),
    };

    save([nextItem, ...items]);
  };

  const clear = () => {
    save([]);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  return { items, add, clear };
}