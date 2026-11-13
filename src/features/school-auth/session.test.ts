import { describe, expect, it, vi } from "vitest";
import { SchoolSignInSession } from "./session";
import type { SchoolAuthState } from "./bridge";
const state: SchoolAuthState = {
  actorId: "owner",
  operationId: "d8419bd2-aea7-43fa-b7a6-5b3c33b91859",
  service: "timetable",
  status: "credentialsRequired",
};
function fixture() {
  const port = {
    begin: vi.fn().mockResolvedValue(state),
    credentials: vi.fn(),
    image: vi.fn(),
    refresh: vi.fn(),
    official: vi.fn(),
    cancel: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn(),
    disconnect: vi.fn(),
  };
  const view = vi.fn(),
    connected = vi.fn();
  const session = new SchoolSignInSession("owner", "timetable", port, view, connected);
  return { port, view, connected, session };
}
describe("school UI and native session integration", () => {
  it("only reports connected after the existing server save completes", async () => {
    const { session, port, view, connected } = fixture();
    port.begin.mockResolvedValue({ ...state, status: "authenticated" });
    let finish!: (value: unknown) => void;
    port.complete.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = session.start();
    await Promise.resolve();
    expect(view).toHaveBeenLastCalledWith({ step: "continuing", service: "timetable" });
    expect(connected).not.toHaveBeenCalled();
    finish({ service: "timetable", synced: { count: 7 } });
    await pending;
    expect(connected).toHaveBeenCalledOnce();
    expect(view).toHaveBeenLastCalledWith({ step: "connected", service: "timetable" });
  });
  it("keeps only the account after rejection and passes passwords unchanged once", async () => {
    const { session, port, view } = fixture();
    await session.start();
    port.credentials.mockResolvedValue({ ...state, errorCode: "SSO10121" });
    await session.submitCredentials("student", " pass word ");
    expect(port.credentials).toHaveBeenCalledWith(state, "student", " pass word ");
    expect(view).toHaveBeenLastCalledWith({
      step: "credentials",
      account: "student",
      error: { kind: "not-activated" },
    });
    expect(JSON.stringify(session)).not.toContain("pass word");
  });
  it("maps real image and official-only slider states without fabricated puzzle images", async () => {
    const { session, port, view } = fixture();
    port.begin.mockResolvedValue({
      ...state,
      status: "imageRequired",
      image: "data:image/png;base64,AAAA",
    });
    await session.start();
    expect(view).toHaveBeenLastCalledWith({
      step: "image-challenge",
      image: "data:image/png;base64,AAAA",
      length: 4,
    });
    port.image.mockResolvedValue({ ...state, status: "interactiveRequired" });
    await session.submitImageCode("1234");
    expect(view).toHaveBeenLastCalledWith({ step: "official-challenge" });
  });
  it("cancels a pending begin using its preallocated UUID and ignores late replies", async () => {
    const { session, port, view } = fixture();
    let finish!: (value: unknown) => void;
    port.begin.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = session.start();
    const operationId = port.begin.mock.calls[0][2];
    session.dispose();
    expect(port.cancel).toHaveBeenCalledWith({ actorId: "owner", operationId });
    finish({ ...state, status: "authenticated" });
    await pending;
    expect(port.complete).not.toHaveBeenCalled();
    expect(view).not.toHaveBeenCalledWith({ step: "connected", service: "timetable" });
  });
  it("blocks duplicate submissions and ignores a save after account disposal", async () => {
    const { session, port, connected } = fixture();
    await session.start();
    let finish!: (value: unknown) => void;
    port.credentials.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const first = session.submitCredentials("student", "one");
    await session.submitCredentials("student", "two");
    expect(port.credentials).toHaveBeenCalledOnce();
    session.dispose();
    finish({ ...state, status: "authenticated" });
    await first;
    expect(connected).not.toHaveBeenCalled();
  });
});
