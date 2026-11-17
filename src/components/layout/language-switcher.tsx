"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/messages";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function LanguageSwitcher() {
  const [pending, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();

  function selectLanguage(language: Locale) {
    if (language === locale || pending) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE}=${language}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
    startTransition(() => router.refresh());
  }

  return (
    <div role="group" aria-label={t("Language")} className="flex flex-wrap items-center gap-2">
      <Languages className="size-5 text-text-muted" aria-hidden />
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "secondary" : "ghost"}
        aria-pressed={locale === "en"}
        lang="en"
        disabled={pending}
        onClick={() => selectLanguage("en")}
      >
        English
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "zh-CN" ? "secondary" : "ghost"}
        aria-pressed={locale === "zh-CN"}
        lang="zh-CN"
        disabled={pending}
        onClick={() => selectLanguage("zh-CN")}
      >
        简体中文
      </Button>
    </div>
  );
}
