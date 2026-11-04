import type { LostFoundPost } from "./types";

/**
 * Sample rows for `pnpm dev` before the database migration lands (PR-2).
 *
 * Two authors and one hidden post keep the review cases visible: the list page
 * shows what a visitor may see, and the admin queue has a post to restore.
 */
const author = { id: "u-1001", name: "Wei Chen" };
const other = { id: "u-1002", name: "Mei Lin" };

export const DEMO_POSTS: LostFoundPost[] = [
  {
    id: "post-01",
    authorId: other.id,
    authorName: other.name,
    kind: "FOUND",
    category: "OTHER",
    title: "Blue water bottle",
    description:
      "Found a blue insulated bottle on a desk by the window. There is a sticker on the lid.",
    location: "Library, 3rd floor",
    occurredAt: "2026-11-03T02:20:00.000Z",
    status: "OPEN",
    image: null,
    createdAt: "2026-11-03T02:30:00.000Z",
    updatedAt: "2026-11-03T02:30:00.000Z",
  },
  {
    id: "post-02",
    authorId: author.id,
    authorName: author.name,
    kind: "LOST",
    category: "CAMPUS_CARD",
    title: "Student card",
    description: "Lost my student card during lunch. The name on it starts with W.",
    location: "Canteen, second floor",
    occurredAt: "2026-11-02T04:10:00.000Z",
    status: "OPEN",
    image: null,
    createdAt: "2026-11-02T04:20:00.000Z",
    updatedAt: "2026-11-02T04:20:00.000Z",
  },
  {
    id: "post-03",
    authorId: other.id,
    authorName: other.name,
    kind: "FOUND",
    category: "ELECTRONICS",
    title: "AirPods case",
    description: "White charging case left on the last desk of the row nearest the door.",
    location: "Building C, room 204",
    occurredAt: "2026-11-01T09:40:00.000Z",
    status: "CLAIM_PENDING",
    image: null,
    createdAt: "2026-11-01T09:50:00.000Z",
    updatedAt: "2026-11-01T10:05:00.000Z",
  },
  {
    id: "post-04",
    authorId: other.id,
    authorName: other.name,
    kind: "LOST",
    category: "BOOKS",
    title: "Calculus textbook",
    description: "Third edition, my notes are on the first page. Already returned by a classmate.",
    location: "Study room 5",
    occurredAt: "2026-10-31T06:00:00.000Z",
    status: "RESOLVED",
    image: null,
    createdAt: "2026-10-31T06:10:00.000Z",
    updatedAt: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "post-05",
    authorId: author.id,
    authorName: author.name,
    kind: "LOST",
    category: "KEYS",
    title: "Dorm key with a red tag",
    description: "Single key on a red plastic tag, last used at the court entrance.",
    location: "Basketball court",
    occurredAt: "2026-10-30T11:15:00.000Z",
    status: "HIDDEN",
    image: null,
    createdAt: "2026-10-30T11:20:00.000Z",
    updatedAt: "2026-11-01T03:00:00.000Z",
  },
];
