import React from "react";
import { useLanguage } from "../lib/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";
import { Language } from "../lib/translations";

interface LanguageSelectorProps {
  variant?: "light" | "dark";
  compact?: boolean;
}

export default function LanguageSelector({ variant = "light", compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; short: string; nativeLabel: string }[] = [
    { code: "en", label: "English", short: "EN", nativeLabel: "English" },
    { code: "ta", label: "Tamil", short: "தமிழ்", nativeLabel: "தமிழ்" },
    { code: "hi", label: "Hindi", short: "हिंदी", nativeLabel: "हिंदी" }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];
  const isLight = variant === "light";

  return (
    <div className="relative inline-flex flex-row items-center" id="language-selector-wrapper">
      <label className={`flex flex-row items-center gap-1 rounded-full py-1 px-2.5 shadow-2xs transition-all cursor-pointer group ${
        isLight
          ? "bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800"
          : "bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-200 hover:border-slate-600"
      }`}>
        <Globe size={12} className={isLight ? "text-[#2563EB]" : "text-blue-400"} />
        <span className="text-[10px] font-bold tracking-tight select-none">
          {compact ? currentLang.short : currentLang.short}
        </span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          id="language-select"
          aria-label="Select Language"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white text-xs font-semibold">
              {lang.nativeLabel} ({lang.label})
            </option>
          ))}
        </select>
        <ChevronDown size={10} className={isLight ? "text-slate-500 shrink-0 pointer-events-none" : "text-slate-400 shrink-0 pointer-events-none group-hover:translate-y-0.5 transition-transform"} />
      </label>
    </div>
  );
}

