import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SQLBlock({ sql }: { sql: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-2xl overflow-hidden bg-[oklch(0.18_0.04_270)] text-[oklch(0.95_0.01_270)] shadow-elegant animate-scale-in" dir="ltr">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          <span className="ms-3 text-[11px] uppercase tracking-wider text-white/50">SQL</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition px-2 py-1 rounded-md hover:bg-white/10"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
        <code>{sql}</code>
      </pre>
    </div>
  );
}
