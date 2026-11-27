import "server-only";

import { cookies } from "next/headers";
import { cache, type ReactNode } from "react";
import { LocaleProvider } from "./client";
import { createTranslator, LOCALE_COOKIE, parseLocale } from "./messages";

export const getLocale = cache(async () =>
  parseLocale((await cookies()).get(LOCALE_COOKIE)?.value),
);
export const getTranslations = cache(async () => createTranslator(await getLocale()));

export async function LocaleBoundary({ children }: { children: ReactNode }) {
  return <LocaleProvider locale={await getLocale()}>{children}</LocaleProvider>;
}
