import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  restore: vi.fn(),
  floors: vi.fn(),
  availability: vi.fn(),
  reservations: vi.fn(),
  prepare: vi.fn(),
}));
vi.mock("@/features/school-auth", () => ({
  restoreSchoolConnection: api.restore,
  SchoolAccountSignIn: () => <div>School sign-in</div>,
}));
vi.mock("./bridge", () => ({
  schoolRoomsAvailable: () => true,
  readRoomFloors: api.floors,
  readRoomAvailability: api.availability,
  readRoomReservations: api.reservations,
  prepareRoomBooking: api.prepare,
}));
import { SchoolRoomsConnection } from "./connection";
beforeEach(() => {
  vi.resetAllMocks();
  api.floors.mockResolvedValue({ floors: [{ id: "2", label: "1F" }], selfId: "student.ab24" });
  api.availability.mockResolvedValue({
    rules: {
      minPeople: 2,
      maxPeople: 5,
      minMinutes: 30,
      maxMinutes: 180,
      stepMinutes: 5,
      opensAt: "08:00",
      closesAt: "22:00",
      maxDaysAhead: 3,
      noShowMinutes: 30,
    },
    availability: [],
    selfId: "student.ab24",
  });
  api.reservations.mockResolvedValue({ reservations: [] });
});
it("does not read rooms until the scoped connection is confirmed", async () => {
  let confirm!: (result: unknown) => void;
  api.restore.mockReturnValue(
    new Promise((resolve) => {
      confirm = resolve;
    }),
  );
  render(<SchoolRoomsConnection actorId="owner" today="2026-11-16" />);
  await waitFor(() => expect(api.restore).toHaveBeenCalledOnce());
  expect(api.floors).not.toHaveBeenCalled();
  confirm({ service: "rooms" });
  await waitFor(() => expect(api.availability).toHaveBeenCalledWith("owner", "2026-11-16", "2"));
  expect(api.prepare).not.toHaveBeenCalled();
});
it("keeps gateway rejection distinct from empty availability", async () => {
  api.restore.mockRejectedValue(new Error("GATEWAY_BLOCKED"));
  render(<SchoolRoomsConnection actorId="owner" today="2026-11-16" />);
  await screen.findByText("The school didn’t let us in");
  expect(api.availability).not.toHaveBeenCalled();
});
it("shows a verified empty response without inventing room rules", async () => {
  api.restore.mockResolvedValue({ service: "rooms" });
  api.availability.mockResolvedValue({ rules: null, availability: [], selfId: "student.ab24" });
  render(<SchoolRoomsConnection actorId="owner" today="2026-11-16" />);
  await screen.findByText("No rooms listed");
});
it("requires a user sign-in after auth failure without opening a form automatically", async () => {
  api.restore.mockRejectedValue(new Error("AUTH_REQUIRED"));
  render(<SchoolRoomsConnection actorId="owner" today="2026-11-16" />);
  await screen.findByText("Sign in to your school account");
  expect(screen.queryByText("School sign-in")).toBeNull();
  expect(api.reservations).not.toHaveBeenCalled();
});
