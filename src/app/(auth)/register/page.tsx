import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

/** Cache Components: 本页需要按请求读取会话/参数，允许阻塞渲染（见 Next 16 文档 instant）。 */
export const instant = false;

export const metadata: Metadata = { title: "Create account" };

/** PG-01 Register（AUTH-AC-01）。新账号一律是 STUDENT。 */
export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-[--container-content] flex-1 flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-display text-text">Create your account</h1>
        <p className="text-body text-text-muted">
          One account for office hours, study spaces, your timetable and lost &amp; found.
        </p>
      </header>

      <RegisterForm />
    </main>
  );
}
