import chinese from "./zh-CN.json";

export const LOCALE_COOKIE = "campus-helper-language";
export type Locale = "en" | "zh-CN";
type MessageValues = Record<string, string | number>;
export type Translate = (message: string, values?: MessageValues) => string;

const translations: Readonly<Record<string, string>> = chinese;

export function parseLocale(value: string | null | undefined): Locale {
  return value === "zh-CN" ? "zh-CN" : "en";
}

export function createTranslator(locale: Locale): Translate {
  return (message, values) => {
    const copy =
      locale === "zh-CN"
        ? Object.hasOwn(translations, message)
          ? translations[message]
          : message
        : message;
    return values
      ? copy.replace(/\{(\w+)\}/g, (part, key: string) => String(values[key] ?? part))
      : copy;
  };
}
