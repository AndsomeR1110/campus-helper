// @vitest-environment node
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { LostFoundClaim, Viewer } from "../types";
import { createPrismaLostFoundRepository } from "./prisma-repository";
import { createLostFoundService } from "./service";

// Explicit opt-in to an isolated, migrated test database. Never uses DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Lost & Found Prisma storage", () => {
  const clients = [
    new PrismaClient({ datasourceUrl: url }),
    new PrismaClient({ datasourceUrl: url }),
  ];
  const repos = clients.map(createPrismaLostFoundRepository);
  const prefix = `lf-test-${randomUUID()}`;
  const authorId = `${prefix}-author`;
  const claimantId = `${prefix}-claimant`;
  const otherId = `${prefix}-other`;

  const author: Viewer = { id: authorId, role: "STUDENT", name: "Wei Chen" };

  const stranger: Viewer = { id: otherId, role: "STUDENT", name: "Student One" };

  let counter = 0;
  const nextId = () => `${prefix}-id-${(counter += 1)}`;

  function serviceFor(index: number, viewer: Viewer | null) {
    return createLostFoundService({
      repository: repos[index],
      currentViewer: async () => viewer,
      now: () => new Date("2026-11-04T08:00:00.000Z"),
      nextId,
    });
  }

  const validPost = {
    kind: "LOST" as const,
    category: "ELECTRONICS" as const,
    title: "Grey headphones",
    description: "Left them in the library on the second floor, near the stairs.",
    location: "Library, 2nd floor",
    occurredAt: "2026-11-03T10:00:00.000Z",
    image: null,
  };

  beforeAll(async () => {
    for (const [id, name] of [
      [authorId, "Wei Chen"],
      [claimantId, "Mei Lin"],
      [otherId, "Student One"],
    ]) {
      await clients[0].user.create({
        data: { id, email: `${id}@example.test`, name, passwordHash: "not-a-login-hash" },
      });
    }
  });

  afterAll(async () => {
    try {
      await clients[0].lostFoundClaim.deleteMany({ where: { post: { authorId } } });
      await clients[0].lostFoundPost.deleteMany({ where: { authorId } });
      await clients[0].user.deleteMany({ where: { id: { in: [authorId, claimantId, otherId] } } });
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });

  async function newPost(): Promise<string> {
    const post = await serviceFor(0, author).createPost(validPost);
    return post.id;
  }

  function claimFor(
    postId: string,
    claimantIdValue: string,
    status: LostFoundClaim["status"],
  ): LostFoundClaim {
    return {
      id: nextId(),
      postId,
      claimantId: claimantIdValue,
      claimantName: "",
      message: "The cable is white and there is a sticker under the left pad.",
      status,
      createdAt: "2026-11-04T08:10:00.000Z",
      decidedAt: null,
    };
  }

  it("round-trips a post with the joined author name", async () => {
    const postId = await newPost();
    await expect(repos[0].getPost(postId)).resolves.toMatchObject({
      id: postId,
      authorId,
      authorName: "Wei Chen",
      status: "OPEN",
      image: null,
    });
  });

  it("lets only one of two concurrent pending claims through (LF-AC-05)", async () => {
    const postId = await newPost();
    const results = await Promise.allSettled(
      repos.map((repo) => repo.createClaim(claimFor(postId, claimantId, "PENDING"))),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "P2002" },
    });
    await expect(repos[0].countPendingClaims(postId)).resolves.toBe(1);
  });

  it("allows a single approved claim per post (#31)", async () => {
    const postId = await newPost();
    await repos[0].createClaim(claimFor(postId, claimantId, "APPROVED"));

    await expect(repos[1].createClaim(claimFor(postId, otherId, "APPROVED"))).rejects.toMatchObject(
      {
        code: "P2002",
      },
    );
  });

  it("counts claims in one query and keeps private claims private (LF-AC-06)", async () => {
    const postId = await newPost();
    await repos[0].createClaim(claimFor(postId, claimantId, "PENDING"));
    await repos[0].createClaim(claimFor(postId, otherId, "PENDING"));

    const authorView = await serviceFor(0, author).getPost(postId);
    expect(authorView.claims).toHaveLength(2);
    expect(authorView.claimCount).toBe(2);

    const strangerView = await serviceFor(1, stranger).getPost(postId);
    expect(strangerView.claims).toBeNull();
    expect(strangerView.claimCount).toBe(2);

    await expect(repos[0].countClaims([postId])).resolves.toEqual(new Map([[postId, 2]]));
  });
});
