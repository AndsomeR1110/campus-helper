import { describe, expect, it } from "vitest";

import { DEMO_POSTS } from "../demo-data";
import { createLostFoundHandlers } from "../server/handlers";
import { createMemoryRepository } from "../server/memory-repository";
import { createLostFoundService } from "../server/service";
import type { Viewer } from "../types";
import { jsonRequest, NOW, teacher, VALID_POST, wei } from "./fixtures";

function makeHandlers(viewer: Viewer | null = wei) {
  let current = viewer;
  let sequence = 0;
  const service = createLostFoundService({
    repository: createMemoryRepository({ posts: DEMO_POSTS }),
    currentViewer: async () => current,
    now: () => NOW,
    nextId: () => `id-${++sequence}`,
  });
  return {
    handlers: createLostFoundHandlers(service),
    as: (next: Viewer | null) => (current = next),
  };
}

async function body(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("handler envelopes (CONTRIBUTING §6)", () => {
  it("returns 201 with { data } for a created post", async () => {
    const { handlers } = makeHandlers();
    const response = await handlers.createPost(jsonRequest(VALID_POST));
    expect(response.status).toBe(201);
    const payload = await body(response);
    expect(payload).toMatchObject({ data: { title: "Grey notebook", status: "OPEN" } });
  });

  it("maps a failing schema to 400 VALIDATION_ERROR with the field name", async () => {
    const { handlers } = makeHandlers();
    const response = await handlers.createPost(jsonRequest({ ...VALID_POST, title: "abc" }));
    expect(response.status).toBe(400);
    const payload = (await body(response)) as {
      error: { code: string; fields?: Record<string, string> };
    };
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(payload.error.fields).toHaveProperty("title");
  });

  it("returns 401 when no session is available", async () => {
    const { handlers } = makeHandlers(null);
    const response = await handlers.createPost(jsonRequest(VALID_POST));
    expect(response.status).toBe(401);
    expect((await body(response)) as { error: { code: string } }).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("returns 403 for a claim on a finished item", async () => {
    const { handlers } = makeHandlers(teacher);
    const response = await handlers.submitClaim(
      jsonRequest({ message: "This book is mine, I lost it in the study room." }),
      "post-04",
    );
    expect(response.status).toBe(403);
    expect((await body(response)) as { error: { code: string } }).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("returns 409 for a second pending claim from the same person", async () => {
    const { handlers } = makeHandlers(teacher);
    const claim = { message: "The bottle has a scratch on the base and a blue lid." };
    expect((await handlers.submitClaim(jsonRequest(claim), "post-01")).status).toBe(201);

    const duplicate = await handlers.submitClaim(jsonRequest(claim), "post-01");
    expect(duplicate.status).toBe(409);
    expect((await body(duplicate)) as { error: { code: string } }).toMatchObject({
      error: { code: "CONFLICT" },
    });
  });

  it("returns 404 for an unknown claim and 400 for a bad decision", async () => {
    const { handlers } = makeHandlers();
    const missing = await handlers.decideClaim(jsonRequest({ decision: "ACCEPT" }), "claim-404");
    expect(missing.status).toBe(404);

    const bad = await handlers.decideClaim(jsonRequest({ decision: "MAYBE" }), "claim-1");
    expect(bad.status).toBe(400);
  });

  it("returns the updated post when the author closes it", async () => {
    const { handlers } = makeHandlers();
    const response = await handlers.setPostStatus(jsonRequest({ status: "CLOSED" }), "post-02");
    expect(response.status).toBe(200);
    expect((await body(response)) as { data: { status: string } }).toMatchObject({
      data: { status: "CLOSED" },
    });
  });
});
