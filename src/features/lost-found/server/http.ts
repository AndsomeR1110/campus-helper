import type { HttpError } from "./errors";

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function jsonFail(error: HttpError): Response {
  const errorBody = error.fields
    ? { code: error.code, message: error.message, fields: error.fields }
    : { code: error.code, message: error.message };
  return Response.json({ error: errorBody }, { status: error.status });
}

/** Turns any thrown value into the response shape from CONTRIBUTING §6. */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof Error && "code" in error && "status" in error) {
    return jsonFail(error as HttpError);
  }
  console.error("[lost-found] unexpected error", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/** Reads a JSON body without throwing on malformed input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** `true` for an absolute http(s) URL, used to reject cross-site form posts. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
