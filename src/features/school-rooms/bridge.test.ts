import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ invoke: vi.fn(), getCapabilities: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android", isPluginAvailable: () => true },
  registerPlugin: () => mock,
}));
import { bookRoom, cancelRoom, readRoomReservations } from "./bridge";
const draft = {
  floorId: "2",
  roomId: "13",
  date: "2026-11-17",
  start: "10:00",
  minutes: 60,
  memberIds: ["student.ab24"],
};
beforeEach(() => vi.clearAllMocks());
it("requires explicit confirmation before invoking either native write", async () => {
  await expect(bookRoom("owner", draft, { confirmed: false })).rejects.toThrow(
    "CONFIRMATION_REQUIRED",
  );
  await expect(cancelRoom("owner", "id", { confirmed: false })).rejects.toThrow(
    "CONFIRMATION_REQUIRED",
  );
  expect(mock.invoke).not.toHaveBeenCalled();
});
it("validates booking input and native result boundaries", async () => {
  await expect(
    bookRoom("owner", { ...draft, memberIds: [] }, { confirmed: true }),
  ).rejects.toThrow();
  expect(mock.invoke).not.toHaveBeenCalled();
  mock.invoke.mockResolvedValue({ kind: "unknown", token: "leak" });
  await expect(bookRoom("owner", draft, { confirmed: true })).rejects.toThrow();
});
it("generates one explicit operation ID and never retries a native failure", async () => {
  mock.invoke.mockRejectedValue({ code: "RESULT_UNKNOWN" });
  await expect(bookRoom("owner", draft, { confirmed: true })).rejects.toEqual({
    code: "RESULT_UNKNOWN",
  });
  expect(mock.invoke).toHaveBeenCalledOnce();
  expect(mock.invoke).toHaveBeenCalledWith(
    expect.objectContaining({
      operation: "book",
      confirmed: true,
      operationId: expect.stringMatching(/^[a-f\d-]{36}$/),
    }),
  );
});
it("does not accept raw school fields in reservation DTOs", async () => {
  mock.invoke.mockResolvedValue({ reservations: [{ id: "id", token: "secret" }] });
  await expect(readRoomReservations("owner")).rejects.toThrow();
});
