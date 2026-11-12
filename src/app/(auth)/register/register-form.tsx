"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, FormField, Input } from "@/components/ui";
import { registerSchema } from "@/lib/auth/schemas";

/** PG-01 registration form (AUTH-AC-01). New accounts are always STUDENT. */
export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "", studentNo: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse({
      ...values,
      studentNo: values.studentNo || undefined,
    });
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as
        | { data: unknown }
        | { error: { code: string; message: string; fields?: Record<string, string> } };

      if (!response.ok || "error" in payload) {
        if ("error" in payload) {
          setFormError(payload.error.message);
          if (payload.error.fields) setFieldErrors(payload.error.fields);
        } else {
          setFormError("Registration failed.");
        }
        return;
      }

      router.replace("/office-hours");
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fields = [
    { key: "name" as const, label: "Full name", type: "text", placeholder: "Mia Chen" },
    {
      key: "studentNo" as const,
      label: "Student number (optional)",
      type: "text",
      placeholder: "2270001",
    },
    {
      key: "email" as const,
      label: "Email",
      type: "email",
      placeholder: "you@student.example.edu",
    },
    {
      key: "password" as const,
      label: "Password",
      type: "password",
      placeholder: "At least 8 characters",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {fields.map((field) => (
        <FormField key={field.key} label={field.label} error={fieldErrors[field.key]}>
          <Input
            type={field.type}
            name={field.key}
            autoComplete={field.key === "password" ? "new-password" : "on"}
            placeholder={field.placeholder}
            value={values[field.key]}
            onChange={update(field.key)}
          />
        </FormField>
      ))}

      {formError ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-body-sm text-danger">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-body-sm text-text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
