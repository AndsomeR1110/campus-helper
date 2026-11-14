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
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-title-lg text-text">Welcome back</h1>
        <p className="text-body-sm text-text-muted">
          Sign in to book teacher office hours, reserve study spaces and track your schedule.
        </p>
      </header>

      <LoginForm nextPath={safeNext} />

      <dl className="rounded-md border border-dashed border-border-strong bg-surface-translucent px-4 py-3 text-body-sm text-text-muted">
        <dt className="font-medium text-text">Demo accounts</dt>
        <dd className="mt-1">
          student.mia@campus-helper.demo · teacher.smith@campus-helper.demo ·
          admin@campus-helper.demo
          <br />
          Password: <code className="font-mono">Password123!</code>
        </dd>
      </dl>

      <DemoDataNotice variant="footer" />
    </>
  );
}
