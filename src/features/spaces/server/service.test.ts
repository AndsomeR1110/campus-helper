import { describe, expect, it, vi } from "vitest";
import { DEMO_SPACES } from "../demo-data";
import type { Actor, SpaceBooking } from "../types";
import { createSpaceService, type SpaceRepository, type SpaceTransaction } from "./service";

const range = { startsAt: "2026-11-02T02:00:00Z", endsAt: "2026-11-02T03:00:00Z" };
const now = () => new Date("2026-11-01T00:00:00Z");

/** Serialized test double validates service orchestration, NOT PostgreSQL locking. */
function fixture() {
  const rows: SpaceBooking[] = [];
  let queue = Promise.resolve();
  const tx: SpaceTransaction = {
    getSpace: async (id) => DEMO_SPACES.find((s) => s.id === id) ?? null,
    getBooking: async (id) => rows.find((b) => b.id === id) ?? null,
    findConflicts: async () => rows,
    createBooking: async (input) => {
      const b = { ...input, id: `b${rows.length}` };
      rows.push(b);
      return b;
    },
    cancelBooking: async (id) => {
      const b = rows.find((b) => b.id === id)!;
      b.status = "CANCELLED";
      return b;
    },
  };
  const repository: SpaceRepository = {
    transaction: async (_keys, work) => {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await work(tx);
      } finally {
        release();
      }
    },
    listSpaces: async () => [...DEMO_SPACES],
    listConfirmed: async () => rows.filter((b) => b.status === "CONFIRMED"),
    listForUser: async (id) => rows.filter((b) => b.userId === id),
  };
  const service = (actor: Actor | null) =>
    createSpaceService({ repository, currentActor: async () => actor, now });
  return { rows, service, repository, tx };
}
const a: Actor = { id: "a", role: "STUDENT" };
const b: Actor = { id: "b", role: "STUDENT" };

describe("transactional service contract", () => {
  it("creates a confirmed booking with session identity (SP-AC-03)", async () => {
    const f = fixture();
    expect(await f.service(a).book("demo-seat-1", range)).toMatchObject({
      status: "CONFIRMED",
      userId: "a",
      spaceId: "demo-seat-1",
    });
    await expect(f.service(a).book("missing", range)).rejects.toMatchObject({ status: 404 });
  });
  it("permits one of two competing seat requests with serialized storage (SP-AC-04)", async () => {
    const f = fixture();
    const results = await Promise.allSettled([
      f.service(a).book("demo-seat-1", range),
      f.service(b).book("demo-seat-1", range),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "BOOKING_CONFLICT", status: 409 },
    });
    expect(f.rows).toHaveLength(1);
  });
  it("prevents the same student concurrently booking different seats (SP-AC-05)", async () => {
    const f = fixture();
    const results = await Promise.allSettled([
      f.service(a).book("demo-seat-1", range),
      f.service(a).book("demo-seat-2", range),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("cancels without deleting and restores availability (SP-AC-02, SP-AC-06)", async () => {
    const f = fixture();
    const booking = await f.service(a).book("demo-seat-1", range);
    await expect(f.service(b).cancel(booking.id)).rejects.toMatchObject({ status: 404 });
    expect((await f.service(a).search({}, range))[0].available).toBe(false);
    await f.service(a).cancel(booking.id);
    expect(f.rows).toHaveLength(1);
    expect((await f.service(a).search({}, range))[0].available).toBe(true);
    await expect(f.service(b).book("demo-seat-1", range)).resolves.toMatchObject({
      status: "CONFIRMED",
    });
  });
  it("requires authentication before reads and writes and rejects teacher mutations (AUTH-AC-03, AUTH-AC-04)", async () => {
    const f = fixture();
    await expect(f.service(null).listMine()).rejects.toMatchObject({ status: 401 });
    await expect(f.service(null).search({}, range)).rejects.toMatchObject({ status: 401 });
    await expect(f.service(null).book("demo-seat-1", range)).rejects.toMatchObject({ status: 401 });
    await expect(f.service(null).cancel("b1")).rejects.toMatchObject({ status: 401 });
    await expect(
      f.service({ id: "t", role: "TEACHER" }).book("demo-seat-1", range),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("scopes personal records and propagates storage failure without success (SP-AC-08)", async () => {
    const f = fixture();
    await f.service(a).book("demo-seat-1", range);
    expect(await f.service(b).listMine()).toEqual([]);
    vi.spyOn(f.tx, "createBooking").mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(f.service(b).book("demo-seat-2", range)).rejects.toThrow("storage unavailable");
    expect(f.rows).toHaveLength(1);
  });
});
