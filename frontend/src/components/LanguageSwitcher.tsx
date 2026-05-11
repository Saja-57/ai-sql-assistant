import { Globe } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";

const opts: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "he", label: "עב" },
  { value: "ar", label: "ع" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 glass rounded-full p-1">
      <Globe className="w-4 h-4 mx-2 text-muted-foreground" />
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => setLang(o.value)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            lang === o.value
              ? "gradient-bg-primary text-white shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
