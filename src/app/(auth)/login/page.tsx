import type { Metadata } from "next";

import { DemoDataNotice } from "@/components/ui";
import { safeRedirectPath } from "@/lib/auth/redirect";

import { LoginForm } from "./login-form";

/** Cache Components: 本页需要按请求读取会话/参数，允许阻塞渲染（见 Next 16 文档 instant）。 */
export const instant = false;

export const metadata: Metadata = { title: "Sign in" };

/**
 * PG-01 Login（AUTH-AC-02）。
 * 登录成功后返回 `next` 指定的原页面（架构规范 §3 / AUTH-AC-03）。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // 只接受站内路径，防止开放重定向；默认进入 Home（AUTH-AC-01）
  const safeNext = safeRedirectPath(next);

  return (
    <main className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center gap-8 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-display text-text">CAMPUS HELPER</h1>
        <p className="text-body text-text-muted">
          Sign in to book teacher office hours, reserve study spaces and track your schedule.
        </p>
      </header>

      <LoginForm nextPath={safeNext} />

      <dl className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-text-muted">
        <dt className="font-medium text-text">Demo accounts</dt>
        <dd className="mt-1">
          student.mia@campus-helper.demo · teacher.smith@campus-helper.demo ·
          admin@campus-helper.demo
          <br />
          Password: <code className="font-mono">Password123!</code>
        </dd>
      </dl>

      <DemoDataNotice variant="footer" />
    </main>
  );
}
