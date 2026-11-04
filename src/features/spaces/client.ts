import type { SpaceBooking } from "./types";
export class SpaceRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function requestSpaceBooking(path: string, body?: unknown): Promise<SpaceBooking> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new SpaceRequestError(
      response.status,
      result.error?.code ?? "INTERNAL_ERROR",
      result.error?.message ?? "Please try again.",
    );
  return result.data;
}
