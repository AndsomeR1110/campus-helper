/**
 * In-memory demo store (temporary).
 *
 * Prisma does not exist on `main` yet (Member 2 owns `prisma/schema.prisma`).
 * To keep the lost-found pages and the acceptance-criteria tests runnable
 * without a database, posts and claims live in module state seeded with
 * fictional data. Replace `store` with Prisma queries in the same PR that adds
 * the models; the service layer is the only place that touches it.
 *
 * Data is fictional (CONTRIBUTING §7): no real names, student numbers or phone
 * numbers appear anywhere in the seed.
 */
import type { LostFoundClaim, LostFoundPost } from "../types";
import { DEMO_VIEWERS } from "./viewer";

export interface LostFoundStore {
  posts: LostFoundPost[];
  claims: LostFoundClaim[];
}

const STUDENT = DEMO_VIEWERS.student;
const OTHER = DEMO_VIEWERS.other;

/** Seed timestamps are fixed so builds and tests are deterministic. */
function seedPosts(): LostFoundPost[] {
  return [
    {
      id: "post-01",
      kind: "FOUND",
      status: "OPEN",
      title: "Blue water bottle",
      category: "OTHER",
      location: "Library, 3rd floor",
      occurredAt: "2026-11-05T02:20:00.000Z",
      description:
        "Found a blue insulated bottle on a desk by the window. There is a sticker on the lid.",
      image: null,
      authorId: OTHER.id,
      authorName: OTHER.name,
      createdAt: "2026-11-05T02:24:00.000Z",
      updatedAt: "2026-11-05T02:24:00.000Z",
    },
    {
      id: "post-02",
      kind: "LOST",
      status: "OPEN",
      title: "Student card",
      category: "CAMPUS_CARD",
      location: "Canteen, second floor",
      occurredAt: "2026-11-04T04:10:00.000Z",
      description: "Lost my student card during lunch. The name on it starts with M.",
      image: null,
      authorId: STUDENT.id,
      authorName: STUDENT.name,
      createdAt: "2026-11-04T05:02:00.000Z",
      updatedAt: "2026-11-04T05:02:00.000Z",
    },
    {
      id: "post-03",
      kind: "FOUND",
      status: "CLAIM_PENDING",
      title: "AirPods case",
      category: "ELECTRONICS",
      location: "Building C, room 204",
      occurredAt: "2026-11-03T09:40:00.000Z",
      description: "White charging case left on the last desk of the row nearest the door.",
      image: null,
      authorId: OTHER.id,
      authorName: OTHER.name,
      createdAt: "2026-11-03T10:05:00.000Z",
      updatedAt: "2026-11-03T11:30:00.000Z",
    },
    {
      id: "post-04",
      kind: "LOST",
      status: "RESOLVED",
      title: "Calculus textbook",
      category: "BOOKS",
      location: "Study room 5",
      occurredAt: "2026-11-01T06:00:00.000Z",
      description:
        "Third edition, my notes are on the first page. Already returned by a classmate.",
      image: null,
      authorId: STUDENT.id,
      authorName: STUDENT.name,
      createdAt: "2026-11-01T06:30:00.000Z",
      updatedAt: "2026-11-02T03:00:00.000Z",
    },
    {
      id: "post-05",
      kind: "FOUND",
      status: "OPEN",
      title: "Dorm key with a red tag",
      category: "KEYS",
      location: "Basketball court",
      occurredAt: "2026-11-05T11:15:00.000Z",
      description: "Single key on a red plastic tag, handed in at the court entrance.",
      image: null,
      authorId: OTHER.id,
      authorName: OTHER.name,
      createdAt: "2026-11-05T11:40:00.000Z",
      updatedAt: "2026-11-05T11:40:00.000Z",
    },
    {
      id: "post-06",
      kind: "LOST",
      status: "CLOSED",
      title: "Black umbrella",
      category: "OTHER",
      location: "Main gate",
      occurredAt: "2026-10-28T00:30:00.000Z",
      description: "Left it by the security desk. Closing this post, I bought a new one.",
      image: null,
      authorId: OTHER.id,
      authorName: OTHER.name,
      createdAt: "2026-10-28T01:00:00.000Z",
      updatedAt: "2026-10-30T02:00:00.000Z",
    },
    {
      id: "post-07",
      kind: "FOUND",
      status: "OPEN",
      title: "Scientific calculator",
      category: "ELECTRONICS",
      location: "Exam hall 2",
      occurredAt: "2026-11-02T08:00:00.000Z",
      description: "Left behind after the midterm. Ask me for the model number before claiming.",
      image: null,
      authorId: OTHER.id,
      authorName: OTHER.name,
      createdAt: "2026-11-02T08:20:00.000Z",
      updatedAt: "2026-11-02T08:20:00.000Z",
    },
    {
      id: "post-08",
      kind: "LOST",
      status: "OPEN",
      title: "Grey gym hoodie",
      category: "CLOTHING",
      location: "Sports centre, changing room",
      occurredAt: "2026-11-04T11:00:00.000Z",
      description: "Size M, has a small tear on the left sleeve.",
      image: null,
      authorId: STUDENT.id,
      authorName: STUDENT.name,
      createdAt: "2026-11-04T11:25:00.000Z",
      updatedAt: "2026-11-04T11:25:00.000Z",
    },
    {
      id: "post-09",
      kind: "FOUND",
      status: "OPEN",
      title: "USB drive",
      category: "ELECTRONICS",
      location: "Lab 3",
      occurredAt: "2026-11-05T07:30:00.000Z",
      description: "16 GB drive found in a machine. Describe the label to claim it.",
      image: null,
      authorId: STUDENT.id,
      authorName: STUDENT.name,
      createdAt: "2026-11-05T07:45:00.000Z",
      updatedAt: "2026-11-05T07:45:00.000Z",
    },
    {
      id: "post-10",
      kind: "LOST",
      status: "OPEN",
      title: "Prescription glasses",
      category: "OTHER",
      location: "Bus stop outside gate B",
      occurredAt: "2026-11-03T23:10:00.000Z",
      description: "Thin metal frame in a dark blue case.",
      image: null,
      authorId: OTHER.id,
      authorName: OTHER.name,
      createdAt: "2026-11-04T00:05:00.000Z",
      updatedAt: "2026-11-04T00:05:00.000Z",
    },
  ];
}

function seedClaims(): LostFoundClaim[] {
  return [
    {
      id: "claim-01",
      postId: "post-03",
      claimantId: "u-1003",
      claimantName: "Jia Liu",
      message:
        "It is mine — there is a small scratch on the back and I can show the serial number.",
      status: "PENDING",
      createdAt: "2026-11-03T11:30:00.000Z",
      decidedAt: null,
    },
    {
      id: "claim-02",
      postId: "post-03",
      claimantId: "u-1004",
      claimantName: "Hao Zhang",
      message:
        "I think I lost mine in that room too. Happy to describe the case before you decide.",
      status: "PENDING",
      createdAt: "2026-11-03T12:10:00.000Z",
      decidedAt: null,
    },
    {
      id: "claim-03",
      postId: "post-04",
      claimantId: "u-1005",
      claimantName: "Yuki Sato",
      message: "Found this book in study room 5 and left it at the front desk on Sunday morning.",
      status: "APPROVED",
      createdAt: "2026-11-01T09:00:00.000Z",
      decidedAt: "2026-11-02T03:00:00.000Z",
    },
  ];
}

function createStore(): LostFoundStore {
  return { posts: seedPosts(), claims: seedClaims() };
}

export const store: LostFoundStore = createStore();

/** Restores the seed. Used by tests so one test cannot affect the next. */
export function resetStore(): void {
  const fresh = createStore();
  store.posts.splice(0, store.posts.length, ...fresh.posts);
  store.claims.splice(0, store.claims.length, ...fresh.claims);
}

let sequence = 0;

/** Monotonic ids; good enough for the demo store, replaced by the database. */
export function nextId(prefix: "post" | "claim" | "report" | "audit"): string {
  sequence += 1;
  return `${prefix}-new-${sequence}`;
}
