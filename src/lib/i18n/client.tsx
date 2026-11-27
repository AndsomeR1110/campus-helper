"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { createTranslator, type Locale } from "./messages";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function LocalizedText({ value }: { value: string }) {
  const t = useTranslations();
  return t(value);
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslations() {
  const locale = useLocale();
  return useMemo(() => createTranslator(locale), [locale]);
}
