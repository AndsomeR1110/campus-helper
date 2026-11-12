"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, FormField, Input } from "@/components/ui";
import { loginSchema } from "@/lib/auth/schemas";

interface LoginFormProps {
  nextPath: string;
}

/**
 * PG-01 login form (AUTH-AC-01 / AUTH-AC-02).
 * Validation runs on both sides: zod here for instant feedback,
 * the route handler re-validates (never trust the client).
 */
export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as
        { data: unknown } | { error: { code: string; message: string } };

      if (!response.ok || "error" in payload) {
        setFormError("error" in payload ? payload.error.message : "Sign in failed.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormField label="Email" error={fieldErrors.email}>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@student.example.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>

      <FormField label="Password" error={fieldErrors.password}>
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>

      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-body-sm text-text-muted">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
