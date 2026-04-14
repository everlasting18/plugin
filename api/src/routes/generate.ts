import { Hono } from "hono";
import type { AppRouteVars } from "./types.ts";
import { expectRecord, getReqId, parseJsonBody } from "../lib/http.ts";
import {
  createGenerateResultStream,
  logGenerateRequest,
  parseGenerateInput,
  validateGenerateRequest,
} from "../usecases/generate.ts";

const app = new Hono<{ Variables: AppRouteVars }>();

/**
 * POST /api/generate
 *
 * Agentic content generation: Research → Write → Editor review → (optional Revision)
 * Streams progress updates + final result as text/plain stream.
 *
 * Body params:
 *   keyword     — chủ đề bài viết
 *   tone        — professional | friendly | persuasive | simple | storytelling
 *   count       — 1 | 2 | 3 (số bài viết cần tạo)
 *   audience    — general | beginner | professional
 *   language    — vi | en
 *   framework   — auto | adaptive_hybrid | eeat_skyscraper | howto | pas | aida
 *   niche       — ngành/niche (tùy chọn)
 *
 * Response: text/plain stream
 *   Progress chunks: [Agent] message\n
 *   Final chunk:     [DONE] {"type":"done","content":"...","title":"...","editorReview":{...}}
 *   Error chunk:     [ERROR] error message
 */
app.post("/", async (c) => {
  const reqId = getReqId(c);
  const auth = c.get("license");
  const body = expectRecord(await parseJsonBody(c));
  const input = parseGenerateInput(body);

  logGenerateRequest(input, auth, reqId);
  validateGenerateRequest(input, auth, reqId);

  const stream = createGenerateResultStream(input, auth, reqId);

  return c.body(stream, 200, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Accel-Buffering": "no",
  });
});

export default app;
