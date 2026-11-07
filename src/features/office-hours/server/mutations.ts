import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { canBook, canCancel, validateSlotDuration } from "@/features/office-hours/server/rules";
import { buildSlotCancelledNotification } from "@/features/office-hours/server/notify";

/**
 * Office Hour 写操作。
 *
 * ⭐ 防重复预约 = 两层：
 *   1. 数据库部分唯一索引（migration 手写 SQL）→ 硬保证，两个并发请求只有一个能成功
 *   2. 本文件的事务 + 唯一冲突捕获 → 给用户可读的 409，而不是 500
 * 详见 docs/database-foundation.md §3。
 */

// ---------------------------------------------------------------- 预约

export async function createBooking(
  input: { slotId: string; studentId: string; reason?: string },
  db: PrismaClient = prisma,
) {
  try {
    return await db.$transaction(
      async (tx) => {
        const slot = await tx.officeSlot.findUnique({
          where: { id: input.slotId },
          select: { id: true, status: true, startsAt: true },
        });
        if (!slot) throw new ApiError("NOT_FOUND", "This office hour slot no longer exists.");

        if (!canBook(slot)) {
          if (slot.status !== "OPEN") {
            throw new ApiError("SLOT_NOT_AVAILABLE", "This slot is closed.");
          }
          throw new ApiError("SLOT_ALREADY_STARTED", "This slot has already started.");
        }

        const existing = await tx.officeBooking.findFirst({
          where: { slotId: slot.id, studentId: input.studentId, status: "CONFIRMED" },
          select: { id: true },
        });
        if (existing) {
          throw new ApiError("SLOT_ALREADY_BOOKED", "You have already booked this slot.");
        }

        return await tx.officeBooking.create({
          data: {
            slotId: slot.id,
            studentId: input.studentId,
            reason: input.reason,
            status: "CONFIRMED",
          },
          select: { id: true, status: true, slotId: true, createdAt: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    // 部分唯一索引把并发写入挡下来了 → 转成可读的 409
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError("SLOT_ALREADY_BOOKED", "This slot has just been booked by someone else.");
    }
    throw error;
  }
}

// ---------------------------------------------------------------- 取消

export async function cancelBooking(
  input: { bookingId: string; studentId: string },
  db: PrismaClient = prisma,
) {
  return db.$transaction(async (tx) => {
    const booking = await tx.officeBooking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        status: true,
        studentId: true,
        slot: { select: { startsAt: true } },
      },
    });

    if (!booking) throw new ApiError("BOOKING_NOT_FOUND", "Booking not found.");
    // 不泄露别人的预约是否存在：非本人一律按「找不到」处理
    if (booking.studentId !== input.studentId) {
      throw new ApiError("BOOKING_NOT_FOUND", "Booking not found.");
    }

    if (!canCancel({ status: booking.status, startsAt: booking.slot.startsAt })) {
      throw new ApiError(
        "BOOKING_NOT_CANCELLABLE",
        booking.status !== "CONFIRMED"
          ? "Only confirmed bookings can be cancelled."
          : "This slot has already started and can no longer be cancelled.",
      );
    }

    return tx.officeBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      select: { id: true, status: true, cancelledAt: true },
    });
  });
}

// ---------------------------------------------------------------- 教师时段

export async function createSlot(input: {
  userId: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  note?: string;
}) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!teacher) throw new ApiError("FORBIDDEN", "Only teachers can create office hours.");

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  const problem = validateSlotDuration(startsAt, endsAt);
  if (problem === "TOO_SHORT") {
    throw new ApiError("VALIDATION_ERROR", "Slot must be at least 10 minutes.", {
      endsAt: "Slot must be at least 10 minutes.",
    });
  }
  if (problem === "TOO_LONG") {
    throw new ApiError("VALIDATION_ERROR", "Slot must be at most 120 minutes.", {
      endsAt: "Slot must be at most 120 minutes.",
    });
  }
  if (startsAt.getTime() <= Date.now()) {
    throw new ApiError("VALIDATION_ERROR", "Slot must start in the future.", {
      startsAt: "Slot must start in the future.",
    });
  }

  try {
    return await prisma.officeSlot.create({
      data: {
        teacherId: teacher.id,
        startsAt,
        endsAt,
        location: input.location,
        note: input.note,
        status: "OPEN",
      },
      select: { id: true, startsAt: true, endsAt: true, status: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError("SLOT_ALREADY_BOOKED", "You already have a slot starting at this time.");
    }
    throw error;
  }
}

export async function updateSlotStatus(
  input: { userId: string; slotId: string; status: "OPEN" | "CANCELLED" },
  db: PrismaClient = prisma,
) {
  return db.$transaction(async (tx) => {
    const slot = await tx.officeSlot.findUnique({
      where: { id: input.slotId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        teacher: { select: { userId: true, displayName: true } },
      },
    });
    if (!slot) throw new ApiError("NOT_FOUND", "Slot not found.");
    // 教师只能管理自己的时段
    if (slot.teacher.userId !== input.userId) {
      throw new ApiError("FORBIDDEN", "You can only manage your own office hours.");
    }

    if (input.status === "OPEN") {
      const reopened = await tx.officeSlot.update({
        where: { id: slot.id },
        data: { status: "OPEN" },
        select: { id: true, status: true },
      });
      return { ...reopened, cancelledBookings: 0 };
    }

    // ---- 撤销：时段 + 已有预约 + 通知必须在同一个事务里（OH-AC-07）
    const affected = await tx.officeBooking.findMany({
      where: { slotId: slot.id, status: "CONFIRMED" },
      select: { id: true, studentId: true },
    });

    const withdrawn = await tx.officeSlot.update({
      where: { id: slot.id },
      data: { status: "CANCELLED" },
      select: { id: true, status: true },
    });

    if (affected.length === 0) return { ...withdrawn, cancelledBookings: 0 };

    const now = new Date();
    await tx.officeBooking.updateMany({
      where: { slotId: slot.id, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledAt: now },
    });

    // 通知由本模块直接写入事务：M4 的 createNotification() 目前不接受事务客户端，
    // 拆成两次提交会出现"预约已取消但通知丢了"。见 PR 说明，后续交给 M4 收口。
    await tx.notification.createMany({
      data: affected.map((booking) => ({
        userId: booking.studentId,
        ...buildSlotCancelledNotification(
          { slotId: slot.id, startsAt: slot.startsAt, teacherName: slot.teacher.displayName },
          booking.id,
        ),
      })),
      skipDuplicates: true,
    });

    return { ...withdrawn, cancelledBookings: affected.length };
  });
}
