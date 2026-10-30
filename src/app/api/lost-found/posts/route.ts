import {
  createPost,
  getViewer,
  jsonOk,
  readJson,
  toErrorResponse,
} from "@/features/lost-found/server";

/** POST /api/lost-found/posts — create a post (LF-AC-01/02/03). */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const post = createPost(body, getViewer());
    return jsonOk({ post }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
