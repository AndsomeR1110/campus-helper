import { randomUUID } from "node:crypto";
import type { PrismaClient, SpaceBooking as Row } from "@prisma/client";
import type { SpaceBooking } from "../types";
import { SpaceError } from "./rules";
import type { SpaceRepository } from "./service";

function dto(row: Row): SpaceBooking {
  return {
    id: row.id,
    userId: row.userId,
    spaceId: row.spaceId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
  };
}

/** Member 3 persistence. The public server barrel guards runtime imports. */
export function createPrismaSpaceRepository(db: PrismaClient): SpaceRepository {
  return {
    listSpaces: () => db.space.findMany({ orderBy: { id: "asc" } }),
    async listConfirmed(range) {
      return (
        await db.spaceBooking.findMany({
          where: {
            status: "CONFIRMED",
            startsAt: { lt: new Date(range.endsAt) },
            endsAt: { gt: new Date(range.startsAt) },
          },
        })
      ).map(dto);
    },
    async listForUser(userId) {
      return (
        await db.spaceBooking.findMany({ where: { userId }, orderBy: { startsAt: "asc" } })
      ).map(dto);
    },
    async transaction(keys, work) {
      try {
        return await db.$transaction(async (tx) => {
          if (keys.bookingId)
            await tx.$queryRaw`SELECT "id" FROM "SpaceBooking" WHERE "id"=${keys.bookingId} AND "userId"=${keys.userId} FOR UPDATE`;
          return work({
            getSpace: (id) => tx.space.findUnique({ where: { id } }),
            async getBooking(id) {
              const row = await tx.spaceBooking.findUnique({ where: { id } });
              return row ? dto(row) : null;
            },
            async findConflicts(userId, spaceId, range) {
              return (
                await tx.spaceBooking.findMany({
                  where: {
                    status: "CONFIRMED",
                    OR: [{ userId }, { spaceId }],
                    startsAt: { lt: new Date(range.endsAt) },
                    endsAt: { gt: new Date(range.startsAt) },
                  },
                })
              ).map(dto);
            },
            async createBooking(input) {
              // Raw insert makes PostgreSQL SQLSTATE available as Prisma P2010 meta.code.
              // Both exclusion constraints protect writes even across separate connections.
              const rows = await tx.$queryRaw<
                Row[]
              >`INSERT INTO "SpaceBooking" ("id","userId","spaceId","startsAt","endsAt","status") VALUES (${randomUUID()},${input.userId},${input.spaceId},${new Date(input.startsAt)},${new Date(input.endsAt)},'CONFIRMED') RETURNING *`;
              return dto(rows[0]);
            },
            async cancelBooking(id) {
              return dto(
                await tx.spaceBooking.update({
                  where: { id },
                  data: { status: "CANCELLED", cancelledAt: new Date() },
                }),
              );
            },
          });
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2010" &&
          "meta" in error &&
          typeof error.meta === "object" &&
          error.meta !== null &&
          "code" in error.meta &&
          error.meta.code === "23P01"
        )
          throw new SpaceError(
            "BOOKING_CONFLICT",
            "This seat or your time is already booked.",
            409,
          );
        throw error;
      }
    },
  };
}
