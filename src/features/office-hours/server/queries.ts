import "server-only";

import { prisma } from "@/lib/db";
import { createScheduleEvent, type ScheduleEvent } from "@/features/schedule";
import { matchesKeyword } from "@/features/office-hours/server/rules";
import type { BookingSummary, SlotSummary, TeacherSummary } from "@/features/office-hours/types";

/**
 * Office Hour 只读查询。
 * 所有面向「当前用户」的查询都必须显式接收 userId，并在调用方校验会话。
 */

export async function listTeachers(params: {
  q?: string;
  department?: string;
}): Promise<TeacherSummary[]> {
  const now = new Date();

  const rows = await prisma.teacherProfile.findMany({
    select: {
      id: true,
      displayName: true,
      department: true,
      office: true,
      keywords: true,
      slots: {
        where: { status: "OPEN", startsAt: { gt: now } },
        select: { id: true },
      },
    },
    orderBy: { displayName: "asc" },
  });

  const filtered = rows
    .filter((t) => (params.department ? t.department === params.department : true))
    .filter((t) => (params.q ? matchesKeyword(t, params.q) : true));

  return filtered.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    department: t.department,
    office: t.office,
    keywords: t.keywords,
    openSlotCount: t.slots.length,
  }));
}

export async function listDepartments(): Promise<string[]> {
  const rows = await prisma.teacherProfile.findMany({
    distinct: ["department"],
    select: { department: true },
    orderBy: { department: "asc" },
  });
  return rows.map((r) => r.department);
}

export async function getTeacherDetail(
  teacherId: string,
  currentUserId: string | null,
): Promise<{ teacher: TeacherSummary; slots: SlotSummary[] } | null> {
  const now = new Date();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      displayName: true,
      department: true,
      office: true,
      keywords: true,
      slots: {
        where: { startsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          location: true,
          note: true,
          bookings: {
            where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
            select: { studentId: true },
          },
        },
      },
    },
  });

  if (!teacher) return null;

  const slots: SlotSummary[] = teacher.slots.map((s) => ({
    id: s.id,
    teacherId: teacher.id,
    teacherName: teacher.displayName,
    department: teacher.department,
    office: teacher.office,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    status: s.status,
    location: s.location,
    note: s.note,
    bookingCount: s.bookings.length,
    bookedByMe: currentUserId ? s.bookings.some((b) => b.studentId === currentUserId) : false,
    isPast: s.startsAt.getTime() <= now.getTime(),
  }));

  return {
    teacher: {
      id: teacher.id,
      displayName: teacher.displayName,
      department: teacher.department,
      office: teacher.office,
      keywords: teacher.keywords,
      openSlotCount: slots.filter((s) => s.status === "OPEN" && !s.bookedByMe).length,
    },
    slots,
  };
}

export async function listMyBookings(userId: string): Promise<BookingSummary[]> {
  const rows = await prisma.officeBooking.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      cancelledAt: true,
      slot: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          location: true,
          teacher: { select: { displayName: true, department: true } },
        },
      },
    },
  });

  return rows.map((b) => ({
    id: b.id,
    status: b.status,
    reason: b.reason,
    createdAt: b.createdAt.toISOString(),
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    slotId: b.slot.id,
    startsAt: b.slot.startsAt.toISOString(),
    endsAt: b.slot.endsAt.toISOString(),
    location: b.slot.location,
    teacherName: b.slot.teacher.displayName,
    department: b.slot.teacher.department,
  }));
}

/**
 * 转换为统一日程事件（架构规范 §7.1）。
 *
 * 返回 M4 定义在 `@/features/schedule` 的 `ScheduleEvent`，而不是模块私有的形状：
 * `id` 由 `createScheduleEvent()` 拼成 `OFFICE_HOUR:<bookingId>`，跨模块稳定且唯一。
 * href 用 M3「我的预约」的 id 约定 `<kind>-<sourceId>`（office-…），点进去就是预约详情。
 */
export async function toScheduleEvents(userId: string): Promise<ScheduleEvent[]> {
  const bookings = await listMyBookings(userId);
  return bookings
    .filter((b) => b.status === "CONFIRMED")
    .map((b) =>
      createScheduleEvent({
        type: "OFFICE_HOUR",
        sourceId: b.id,
        title: `Office Hour · ${b.teacherName}`,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        location: b.location,
        status: b.status,
        href: `/bookings/office-${b.id}`,
      }),
    );
}

/** 教师自己的时段（PG-07 Teacher Dashboard） */
export async function listSlotsForTeacher(userId: string): Promise<SlotSummary[]> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      displayName: true,
      department: true,
      office: true,
      slots: {
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          location: true,
          note: true,
          bookings: {
            where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
            select: { studentId: true, student: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!teacher) return [];
  const now = new Date();

  return teacher.slots.map((s) => ({
    id: s.id,
    teacherId: teacher.id,
    teacherName: teacher.displayName,
    department: teacher.department,
    office: teacher.office,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    status: s.status,
    location: s.location,
    note: s.note,
    bookingCount: s.bookings.length,
    bookedByMe: false,
    isPast: s.startsAt.getTime() <= now.getTime(),
  }));
}
