// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

import { createOpenAiRanker } from "./match-provider";

const lost = {
  title: "Black earbud case",
  description: "Left by the stairs.",
  location: "Library",
  occurredAt: "2026-11-03T10:00:00.000Z",
};
const candidates = [{ ...lost, candidate: 1 }];

afterEach(() => vi.unstubAllGlobals());

it("sends authenticated structured requests and reads the provider's JSON (LF-AI-AC-02)", async () => {
  const output = { matches: [{ candidate: 1, reason: "Same item and location." }] };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(createOpenAiRanker("test-key", "test-model")(lost, candidates)).resolves.toEqual(
    output,
  );
  const [url, options] = fetchMock.mock.calls[0]!;
  expect(url).toBe("https://api.openai.com/v1/chat/completions");
  expect(options).toMatchObject({
    headers: { Authorization: "Bearer test-key" },
    redirect: "error",
    signal: expect.any(AbortSignal),
  });
  expect(JSON.parse(options?.body as string)).toMatchObject({
    model: "test-model",
    store: false,
    response_format: { type: "json_schema" },
    messages: [expect.any(Object), { role: "user", content: JSON.stringify({ lost, candidates }) }],
  });
});

it("returns a generic error without exposing the provider response (LF-AI-AC-03)", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret detail", { status: 429 })));
  await expect(createOpenAiRanker("test-key", "test-model")(lost, candidates)).rejects.toThrow(
    "Matching provider returned an error.",
  );
});
