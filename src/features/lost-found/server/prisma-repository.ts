import type { Prisma, PrismaClient } from "@prisma/client";

import type { ImageMeta, LostFoundClaim, LostFoundPost } from "../types";
import type { ClaimPatch, LostFoundRepository, PostPatch } from "./repository";

type Client = PrismaClient | Prisma.TransactionClient;

const postShape = {
  include: { author: { select: { name: true } } },
} satisfies Prisma.LostFoundPostDefaultArgs;

const claimShape = {
  include: { claimant: { select: { name: true } } },
} satisfies Prisma.LostFoundClaimDefaultArgs;

type PostRow = Prisma.LostFoundPostGetPayload<typeof postShape>;
type ClaimRow = Prisma.LostFoundClaimGetPayload<typeof claimShape>;

/**
 * Prisma implementation of the storage contract (issue #31, item 2).
 *
 * Rows and domain objects differ on purpose: the domain keeps ISO strings and a
 * nested `image`, the database keeps `Date`s and four nullable columns. The
 * author/claimant name is joined here so a post list is still one query.
 */
export function createPrismaLostFoundRepository(client: Client): LostFoundRepository {
  return {
    async listPosts() {
      const rows = await client.lostFoundPost.findMany(postShape);
      return rows.map(toPost);
    },

    async getPost(id) {
      const row = await client.lostFoundPost.findUnique({ where: { id }, ...postShape });
      return row ? toPost(row) : null;
    },

    async createPost(post) {
      const row = await client.lostFoundPost.create({
        data: {
          id: post.id,
          authorId: post.authorId,
          kind: post.kind,
          category: post.category,
          title: post.title,
          description: post.description,
          location: post.location,
          occurredAt: new Date(post.occurredAt),
          status: post.status,
          ...imageColumns(post.image),
          createdAt: new Date(post.createdAt),
          updatedAt: new Date(post.updatedAt),
        },
        ...postShape,
      });
      return toPost(row);
    },

    async updatePost(id, patch: PostPatch) {
      const data: Prisma.LostFoundPostUpdateInput = {};
      if (patch.status) data.status = patch.status;
      if (patch.updatedAt) data.updatedAt = new Date(patch.updatedAt);
      if (patch.image !== undefined) Object.assign(data, imageColumns(patch.image));

      const row = await client.lostFoundPost.update({ where: { id }, data, ...postShape });
      return toPost(row);
    },

    async listClaimsForPost(postId) {
      const rows = await client.lostFoundClaim.findMany({
        where: { postId },
        orderBy: { createdAt: "asc" },
        ...claimShape,
      });
      return rows.map(toClaim);
    },

    async getClaim(id) {
      const row = await client.lostFoundClaim.findUnique({ where: { id }, ...claimShape });
      return row ? toClaim(row) : null;
    },

    async createClaim(claim) {
      const row = await client.lostFoundClaim.create({
        data: {
          id: claim.id,
          postId: claim.postId,
          claimantId: claim.claimantId,
          message: claim.message,
          status: claim.status,
          createdAt: new Date(claim.createdAt),
          decidedAt: claim.decidedAt ? new Date(claim.decidedAt) : null,
        },
        ...claimShape,
      });
      return toClaim(row);
    },

    async updateClaim(id, patch: ClaimPatch) {
      const row = await client.lostFoundClaim.update({
        where: { id },
        data: { status: patch.status, decidedAt: new Date(patch.decidedAt) },
        ...claimShape,
      });
      return toClaim(row);
    },

    async countPendingClaims(postId) {
      return client.lostFoundClaim.count({ where: { postId, status: "PENDING" } });
    },

    async countClaims(postIds) {
      const counts = new Map<string, number>();
      if (postIds.length === 0) return counts;

      const grouped = await client.lostFoundClaim.groupBy({
        by: ["postId"],
        where: { postId: { in: [...postIds] } },
        _count: { _all: true },
      });
      for (const postId of postIds) counts.set(postId, 0);
      for (const group of grouped) counts.set(group.postId, group._count._all);
      return counts;
    },

    async transaction(work) {
      if (!("$transaction" in client)) {
        throw new Error("Nested transactions need the root Prisma client.");
      }
      return client.$transaction((tx: Prisma.TransactionClient) =>
        work(createPrismaLostFoundRepository(tx)),
      );
    },
  };
}

function toPost(row: PostRow): LostFoundPost {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.author.name,
    kind: row.kind,
    category: row.category,
    title: row.title,
    description: row.description,
    location: row.location,
    occurredAt: row.occurredAt.toISOString(),
    status: row.status,
    image:
      row.imageName && row.imageType && row.imageSize
        ? { name: row.imageName, type: row.imageType, size: row.imageSize, url: row.imageUrl }
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toClaim(row: ClaimRow): LostFoundClaim {
  return {
    id: row.id,
    postId: row.postId,
    claimantId: row.claimantId,
    claimantName: row.claimant.name,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}

function imageColumns(image: ImageMeta | null): {
  imageName: string | null;
  imageType: string | null;
  imageSize: number | null;
  imageUrl: string | null;
} {
  if (!image) return { imageName: null, imageType: null, imageSize: null, imageUrl: null };
  return {
    imageName: image.name,
    imageType: image.type,
    imageSize: image.size,
    imageUrl: image.url ?? null,
  };
}
