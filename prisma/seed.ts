/**
 * 种子数据（虚构数据，CONTRIBUTING.md §7）。
 *
 * 运行： npm run db:seed   或   npx prisma db seed
 *        （两者都执行 node --experimental-strip-types prisma/seed.ts，Node 22.12+ 可用）
 *
 * 只使用虚构人名 / 学号 / 邮箱，绝不使用真实个人信息。
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

/** 以「今天 00:00 UTC+8」为基准，往后的第 dayOffset 天 + hour 点 */
function at(dayOffset: number, hour: number, minute = 0): Date {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
  // 目标时间按 Asia/Shanghai（UTC+8）表达
  return new Date(base + (dayOffset * 24 + hour - 8) * 60 * 60 * 1000 + minute * 60 * 1000);
}

interface TeacherSeed {
  email: string;
  name: string;
  displayName: string;
  department: string;
  office: string;
  keywords: string[];
  /** [天偏移, 开始小时, 时长分钟] */
  slots: Array<[number, number, number]>;
}

const TEACHERS: TeacherSeed[] = [
  {
    email: "teacher.smith@campus-helper.demo",
    name: "Alex Smith",
    displayName: "Prof. Smith",
    department: "Computer Science",
    office: "B-301",
    keywords: ["algorithms", "data structures", "cs", "programming"],
    slots: [
      [1, 10, 30],
      [1, 11, 30],
      [3, 14, 30],
    ],
  },
  {
    email: "teacher.wang@campus-helper.demo",
    name: "Lina Wang",
    displayName: "Dr. Wang",
    department: "Mathematical Sciences",
    office: "B-215",
    keywords: ["calculus", "linear algebra", "math", "statistics"],
    slots: [
      [1, 14, 30],
      [2, 10, 30],
      [4, 9, 30],
    ],
  },
  {
    email: "teacher.chen@campus-helper.demo",
    name: "Wei Chen",
    displayName: "Prof. Chen",
    department: "Computer Science",
    office: "E-512",
    keywords: ["machine learning", "ai", "networking", "python"],
    slots: [
      [2, 13, 30],
      [3, 15, 30],
    ],
  },
  {
    email: "teacher.liu@campus-helper.demo",
    name: "Mei Liu",
    displayName: "Dr. Liu",
    department: "Language Centre",
    office: "C-308",
    keywords: ["english", "academic writing", "language", "ielts"],
    slots: [
      [2, 15, 30],
      [5, 11, 30],
    ],
  },
  {
    email: "teacher.zhao@campus-helper.demo",
    name: "Hao Zhao",
    displayName: "Dr. Zhao",
    department: "Design School",
    office: "D-104",
    keywords: ["ux", "design", "prototyping", "figma"],
    slots: [[3, 10, 30]],
  },
];

const STUDENTS = [
  { email: "student.mia@campus-helper.demo", name: "Mia Chen", studentNo: "2270001" },
  { email: "student.leo@campus-helper.demo", name: "Leo Park", studentNo: "2270002" },
];

const ADMIN = { email: "admin@campus-helper.demo", name: "Campus Admin", studentNo: "STAFF01" };

async function upsertUser(input: {
  email: string;
  name: string;
  role: Role;
  studentNo?: string;
}): Promise<string> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, role: input.role },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      studentNo: input.studentNo,
      passwordHash,
    },
    select: { id: true },
  });
  return user.id;
}

async function main() {
  console.log("→ seeding teachers …");
  const teacherProfileIds: string[] = [];

  for (const t of TEACHERS) {
    const userId = await upsertUser({
      email: t.email,
      name: t.name,
      role: "TEACHER" as Role,
    });

    const profile = await prisma.teacherProfile.upsert({
      where: { userId },
      update: {
        displayName: t.displayName,
        department: t.department,
        office: t.office,
        keywords: t.keywords,
      },
      create: {
        userId,
        displayName: t.displayName,
        department: t.department,
        office: t.office,
        keywords: t.keywords,
      },
      select: { id: true },
    });
    teacherProfileIds.push(profile.id);

    for (const [dayOffset, hour, duration] of t.slots) {
      const startsAt = at(dayOffset, hour);
      const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
      await prisma.officeSlot.upsert({
        where: { teacherId_startsAt: { teacherId: profile.id, startsAt } },
        update: { endsAt, status: "OPEN" },
        create: {
          teacherId: profile.id,
          startsAt,
          endsAt,
          status: "OPEN",
          location: t.office,
        },
      });
    }
  }

  console.log("→ seeding students …");
  const studentIds: string[] = [];
  for (const s of STUDENTS) {
    studentIds.push(
      await upsertUser({
        email: s.email,
        name: s.name,
        role: "STUDENT" as Role,
        studentNo: s.studentNo,
      }),
    );
  }

  console.log("→ seeding admin …");
  await upsertUser({
    email: ADMIN.email,
    name: ADMIN.name,
    role: "ADMIN" as Role,
    studentNo: ADMIN.studentNo,
  });

  console.log("→ seeding one demo booking (Mia → Smith, first slot) …");
  const firstSlot = await prisma.officeSlot.findFirst({
    where: { teacherId: teacherProfileIds[0], status: "OPEN" },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
  if (firstSlot && studentIds[0]) {
    await prisma.officeBooking.upsert({
      where: {
        slotId_studentId_status: {
          slotId: firstSlot.id,
          studentId: studentIds[0],
          status: "CONFIRMED",
        },
      },
      update: {},
      create: {
        slotId: firstSlot.id,
        studentId: studentIds[0],
        status: "CONFIRMED",
        reason: "Problem set 3, question 4",
      },
    });
  }

  const [users, teachers, slots, bookings] = await Promise.all([
    prisma.user.count(),
    prisma.teacherProfile.count(),
    prisma.officeSlot.count(),
    prisma.officeBooking.count(),
  ]);

  console.log(
    `✓ seed done — users=${users} teachers=${teachers} slots=${slots} bookings=${bookings}`,
  );
  console.log(`  demo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
