import { getTranslations } from "@/lib/i18n/server";
import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

/** Cache Components: 本页需要按请求读取会话/参数，允许阻塞渲染（见 Next 16 文档 instant）。 */
export const instant = false;

export const metadata: Metadata = { title: "Create account" };

/** PG-01 Register（AUTH-AC-01）。新账号一律是 STUDENT。 */
export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-title-lg text-text">{t("Create your account")}</h1>
        <p className="text-body-sm text-text-muted">
          {t("One account for office hours, study spaces, your timetable and lost & found.")}
        </p>
      </header>

      <RegisterForm />
    </>
  );
}
