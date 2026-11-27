import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const native = vi.hoisted(() => ({
  beginSchoolAuth: vi.fn(),
  submitSchoolCredentials: vi.fn(),
  submitSchoolImageCode: vi.fn(),
  refreshSchoolImage: vi.fn(),
  showSchoolChallenge: vi.fn(),
  cancelSchoolAuth: vi.fn(),
  completeSchoolConnection: vi.fn(),
  disconnectSchoolAccount: vi.fn(),
  onSchoolAuthActivity: vi.fn(),
  onSchoolAuthEnd: vi.fn(),
  resumeExistingSchoolConnection: vi.fn(),
}));
vi.mock("../bridge", () => native);
import { SchoolAccountSignIn } from "./connected-sign-in";
beforeEach(() => {
  vi.clearAllMocks();
  native.beginSchoolAuth.mockImplementation(async (actorId, service, operationId) => ({
    actorId,
    service,
    operationId,
    status: "credentialsRequired",
  }));
  native.cancelSchoolAuth.mockResolvedValue(undefined);
  native.disconnectSchoolAccount.mockResolvedValue(undefined);
  native.onSchoolAuthActivity.mockResolvedValue({ remove: vi.fn() });
  native.onSchoolAuthEnd.mockResolvedValue({ remove: vi.fn() });
  native.resumeExistingSchoolConnection.mockRejectedValue(new Error("AUTH_REQUIRED"));
});
describe("connected school sign-in sheet", () => {
  it("silently closes when the existing connection is valid, without a login sheet", async () => {
    native.resumeExistingSchoolConnection.mockResolvedValue({
      service: "timetable",
      synced: { count: 7 },
    });
    const onClose = vi.fn(),
      onConnected = vi.fn();
    const { container } = render(
      <SchoolAccountSignIn
        actorId="owner"
        service="timetable"
        onClose={onClose}
        onConnected={onConnected}
      />,
    );
    await waitFor(() => expect(onConnected).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
    expect(native.beginSchoolAuth).not.toHaveBeenCalled();
    expect(container.querySelector("dialog[open]")).toBeNull();
  });
  it("clears the visible password immediately and retains the account after rejection", async () => {
    let reject!: (value: unknown) => void;
    native.submitSchoolCredentials.mockImplementation(
      (state) =>
        new Promise((resolve) => {
          reject = () => resolve({ ...state, errorCode: "SSO10121" });
        }),
    );
    const { container } = render(
      <SchoolAccountSignIn
        actorId="owner"
        service="timetable"
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );
    await screen.findByText("University account");
    const account = container.querySelector<HTMLInputElement>('input[name="username"]')!;
    const password = container.querySelector<HTMLInputElement>('input[name="password"]')!;
    fireEvent.change(account, { target: { value: "fictional.student" } });
    fireEvent.change(password, { target: { value: " unmodified password " } });
    fireEvent.submit(password.closest("form")!);
    expect(container.querySelector<HTMLInputElement>('input[name="password"]')!.value).toBe("");
    expect(native.submitSchoolCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "owner" }),
      "fictional.student",
      " unmodified password ",
    );
    reject(undefined);
    await screen.findByText("Activate your account first");
    expect(container.querySelector<HTMLInputElement>('input[name="username"]')!.value).toBe(
      "fictional.student",
    );
    expect(container.querySelector<HTMLInputElement>('input[name="password"]')!.value).toBe("");
  });
  it("clears inputs and cancels the original actor when the account changes", async () => {
    const props = { service: "timetable" as const, onClose: vi.fn(), onConnected: vi.fn() };
    const { container, rerender } = render(<SchoolAccountSignIn {...props} actorId="old-owner" />);
    await screen.findByText("University account");
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "temporary" },
    });
    const id = native.beginSchoolAuth.mock.calls[0][2];
    rerender(<SchoolAccountSignIn {...props} actorId="new-owner" />);
    await waitFor(() =>
      expect(native.beginSchoolAuth).toHaveBeenCalledWith(
        "new-owner",
        "timetable",
        expect.any(String),
      ),
    );
    expect(native.cancelSchoolAuth).toHaveBeenCalledWith({ actorId: "old-owner", operationId: id });
    await waitFor(() =>
      expect(container.querySelector<HTMLInputElement>('input[name="password"]')?.value).toBe(""),
    );
  });
  it("requires confirmation before disconnecting the previous university session", async () => {
    native.beginSchoolAuth.mockRejectedValueOnce(
      Object.assign(new Error("scope mismatch"), { code: "ACCOUNT_SWITCH_REQUIRED" }),
    );
    render(
      <SchoolAccountSignIn
        actorId="owner"
        service="timetable"
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect previous session" }));
    expect(native.disconnectSchoolAccount).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect and sign in" }));
    await screen.findByText("University account");
    expect(native.disconnectSchoolAccount).toHaveBeenCalledWith("owner", true);
  });
  it("clears typed credentials and cancels the operation when the app is backgrounded", async () => {
    const { container } = render(
      <SchoolAccountSignIn
        actorId="owner"
        service="timetable"
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );
    await screen.findByText("University account");
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "temporary" },
    });
    const id = native.beginSchoolAuth.mock.calls[0][2];
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    try {
      fireEvent(document, new Event("visibilitychange"));
      await waitFor(() => expect(container.querySelector('input[name="password"]')).toBeNull());
      expect(native.cancelSchoolAuth).toHaveBeenCalledWith({ actorId: "owner", operationId: id });
    } finally {
      delete (document as unknown as Record<string, unknown>).hidden;
    }
  });
  it("also clears inputs from the Android lifecycle signal without a DOM visibility event", async () => {
    const { container } = render(
      <SchoolAccountSignIn
        actorId="owner"
        service="timetable"
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );
    await screen.findByText("University account");
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "temporary" },
    });
    native.onSchoolAuthActivity.mock.calls[0][0]({ active: false });
    await waitFor(() => expect(container.querySelector('input[name="password"]')).toBeNull());
  });
  it("clears unsubmitted credentials when native expires an idle operation", async () => {
    const { container } = render(
      <SchoolAccountSignIn
        actorId="owner"
        service="timetable"
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );
    await screen.findByText("University account");
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "temporary" },
    });
    const id = native.beginSchoolAuth.mock.calls[0][2];
    native.onSchoolAuthEnd.mock.calls[0][0]({
      actorId: "owner",
      operationId: id,
      code: "TIMED_OUT",
    });
    await screen.findByText("Sign-in timed out");
    expect(container.querySelector('input[name="password"]')).toBeNull();
  });
});
