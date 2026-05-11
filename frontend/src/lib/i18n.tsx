import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "he" | "ar";

const dict = {
  en: {
    appName: "Text-to-SQL",
    appTagline: "Natural Language Interface",
    welcome: "Welcome",
    welcomeTitle: "Query your database in plain English",
    welcomeSubtitle: "An AI-powered Text-to-SQL interface that turns natural language into instant insights.",
    signIn: "Sign In",
    continueGuest: "Continue as Guest",
    nav: { query: "Query", schema: "Schema", examples: "Examples", history: "History", about: "About" },
    queryTitle: "Ask anything about your data",
    querySubtitle: "Type a question and let AI generate the SQL.",
    placeholder: "e.g. Show the top 5 selling tracks",
    generateSQL: "Generate SQL",
    generating: "Generating…",
    runQuery: "Run Query",
    generatedSQL: "Generated SQL",
    explanation: "Explanation",
    results: "Results",
    copy: "Copy",
    copied: "Copied",
    noResults: "No results yet — ask a question to get started.",
    schemaTitle: "Database Schema",
    schemaSubtitle: "Explore tables and columns of your connected database.",
    examplesTitle: "Example Queries",
    examplesSubtitle: "One-click prompts to explore what the system can do.",
    tryIt: "Try it",
    historyTitle: "Query History",
    historySubtitle: "All your previous questions in one place.",
    rerun: "Rerun",
    empty: "Nothing here yet.",
    aboutTitle: "About this project",
    success: "Success",
    error: "Error",
    safetyNote: "Only SELECT queries are allowed for safety reasons.",
    uploadCSV: "Upload CSV",
    uploading: "Uploading…",
    uploaded: "CSV uploaded",
    columns: "Columns",
    tables: "Tables",
    language: "Language",
  },
  he: {
    appName: "טקסט ל-SQL",
    appTagline: "ממשק בשפה טבעית",
    welcome: "ברוכים הבאים",
    welcomeTitle: "שאל את מסד הנתונים בעברית פשוטה",
    welcomeSubtitle: "ממשק חכם שהופך שאלות טבעיות ל-SQL בלחיצה.",
    signIn: "התחברות",
    continueGuest: "המשך כאורח",
    nav: { query: "שאילתה", schema: "סכמה", examples: "דוגמאות", history: "היסטוריה", about: "אודות" },
    queryTitle: "שאל הכל על הנתונים שלך",
    querySubtitle: "כתוב שאלה והבינה המלאכותית תייצר את ה-SQL.",
    placeholder: "לדוגמה: הצג את 5 הרצועות הנמכרות ביותר",
    generateSQL: "צור SQL",
    generating: "יוצר…",
    runQuery: "הרץ שאילתה",
    generatedSQL: "SQL שנוצר",
    explanation: "הסבר",
    results: "תוצאות",
    copy: "העתק",
    copied: "הועתק",
    noResults: "אין תוצאות עדיין — שאל שאלה כדי להתחיל.",
    schemaTitle: "סכמת מסד הנתונים",
    schemaSubtitle: "סייר בטבלאות ובעמודות של מסד הנתונים.",
    examplesTitle: "שאילתות לדוגמה",
    examplesSubtitle: "פקודות מוכנות לבדיקה מהירה של המערכת.",
    tryIt: "נסה",
    historyTitle: "היסטוריית שאילתות",
    historySubtitle: "כל השאלות הקודמות במקום אחד.",
    rerun: "הרץ שוב",
    empty: "אין כאן כלום עדיין.",
    aboutTitle: "אודות הפרויקט",
    success: "הצלחה",
    error: "שגיאה",
    safetyNote: "מטעמי בטיחות, מותרות רק שאילתות SELECT.",
    uploadCSV: "העלה CSV",
    uploading: "מעלה…",
    uploaded: "ה-CSV הועלה",
    columns: "עמודות",
    tables: "טבלאות",
    language: "שפה",
  },
  ar: {
    appName: "نص إلى SQL",
    appTagline: "واجهة باللغة الطبيعية",
    welcome: "مرحبًا",
    welcomeTitle: "استعلم عن قاعدة بياناتك بلغة طبيعية",
    welcomeSubtitle: "واجهة ذكية تحوّل أسئلتك إلى استعلامات SQL فورية.",
    signIn: "تسجيل الدخول",
    continueGuest: "المتابعة كضيف",
    nav: { query: "استعلام", schema: "المخطط", examples: "أمثلة", history: "السجل", about: "حول" },
    queryTitle: "اسأل أي شيء عن بياناتك",
    querySubtitle: "اكتب سؤالًا ودع الذكاء الاصطناعي يولّد SQL.",
    placeholder: "مثال: اعرض أفضل 5 مقاطع مبيعًا",
    generateSQL: "إنشاء استعلام SQL",
    generating: "جارٍ الإنشاء…",
    runQuery: "تشغيل الاستعلام",
    generatedSQL: "الاستعلام المُولَّد",
    explanation: "شرح",
    results: "النتائج",
    copy: "نسخ",
    copied: "تم النسخ",
    noResults: "لا توجد نتائج بعد — اطرح سؤالًا للبدء.",
    schemaTitle: "مخطط قاعدة البيانات",
    schemaSubtitle: "استعرض الجداول والأعمدة.",
    examplesTitle: "أمثلة استعلامات",
    examplesSubtitle: "طلبات جاهزة لاستكشاف إمكانيات النظام.",
    tryIt: "جرّبه",
    historyTitle: "سجل الاستعلامات",
    historySubtitle: "جميع أسئلتك السابقة في مكان واحد.",
    rerun: "إعادة التشغيل",
    empty: "لا يوجد شيء هنا بعد.",
    aboutTitle: "حول هذا المشروع",
    success: "نجاح",
    error: "خطأ",
    safetyNote: "يُسمح فقط باستعلامات SELECT لأسباب أمنية.",
    uploadCSV: "رفع CSV",
    uploading: "جارٍ الرفع…",
    uploaded: "تم رفع الملف",
    columns: "الأعمدة",
    tables: "الجداول",
    language: "اللغة",
  },
} as const;

type Translations = {
  [K in keyof typeof dict.en]: typeof dict.en[K] extends object ? { [P in keyof typeof dict.en[K]]: string } : string;
};
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Translations; dir: "ltr" | "rtl" };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (stored && ["en", "he", "ar"].includes(stored)) setLangState(stored);
  }, []);

  const dir: "ltr" | "rtl" = lang === "en" ? "ltr" : "rtl";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dict[lang] as Translations, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
