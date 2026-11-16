// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

import { createMatchRanker, readMatchConfig } from "./match-provider";

const lost = {
  title: "Black earbud case",
  description: "Left by the stairs.",
  location: "Library",
  occurredAt: "2026-11-03T10:00:00.000Z",
};
const candidates = [{ ...lost, candidate: 1 }];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("sends authenticated structured requests and reads the provider's JSON (LF-AI-AC-02)", async () => {
  const output = { matches: [{ candidate: 1, reason: "Same item and location." }] };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    createMatchRanker({ apiKey: "test-key", model: "test-model", provider: "openai" })(
      lost,
      candidates,
    ),
  ).resolves.toEqual(output);
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
  await expect(
    createMatchRanker({ apiKey: "test-key", model: "test-model", provider: "openai" })(
      lost,
      candidates,
    ),
  ).rejects.toThrow("Matching provider returned an error.");
});

it("sends a DeepSeek key only to DeepSeek with its JSON mode (LF-AI-AC-04)", async () => {
  vi.stubEnv("LOST_FOUND_AI_PROVIDER", "deepseek");
  vi.stubEnv("LOST_FOUND_AI_API_KEY", "deepseek-test-key");
  vi.stubEnv("LOST_FOUND_AI_MODEL", "");
  const output = { matches: [] };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(createMatchRanker(readMatchConfig()!)(lost, candidates)).resolves.toEqual(output);
  const [url, options] = fetchMock.mock.calls[0]!;
  expect(url).toBe("https://api.deepseek.com/chat/completions");
  expect(options?.headers).toMatchObject({ Authorization: "Bearer deepseek-test-key" });
  const body = JSON.parse(options?.body as string);
  expect(body).toMatchObject({
    model: "deepseek-flash",
    max_tokens: 500,
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
  });
  expect(body).not.toHaveProperty("store");
  expect(body).not.toHaveProperty("max_completion_tokens");
});

it("disables matching for an unknown provider instead of sending its key to OpenAI (LF-AI-AC-04)", () => {
  vi.stubEnv("LOST_FOUND_AI_PROVIDER", "misconfigured");
  vi.stubEnv("LOST_FOUND_AI_API_KEY", "test-key");
  expect(readMatchConfig()).toBeNull();
});
