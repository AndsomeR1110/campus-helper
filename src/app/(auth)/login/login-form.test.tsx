import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { LoginForm } from "./login-form";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("clears the App password while the request is pending, before the route can be cached", async () => {
  let finish!: (response: unknown) => void;
  const fetcher = vi.fn().mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const { container } = render(<LoginForm nextPath="/home" />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "fictional@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Example123!" } });
  fireEvent.submit(container.querySelector("form")!);
  expect(screen.getByLabelText("Password")).toHaveValue("");
  expect(fetcher).toHaveBeenCalledWith(
    "/api/auth/login",
    expect.objectContaining({
      body: JSON.stringify({ email: "fictional@example.test", password: "Example123!" }),
    }),
  );
  finish({
    ok: false,
    json: async () => ({ error: { code: "AUTH_FAILED", message: "Not accepted" } }),
  });
  await waitFor(() => expect(screen.getByText("Not accepted")).toBeInTheDocument());
  expect(screen.getByLabelText("Password")).toHaveValue("");
});
