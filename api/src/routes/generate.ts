import { Hono } from "hono";
import { createAgentStream } from "../agents/orchestrator.ts";
import { logger } from "../lib/logStore.ts";

const app = new Hono();

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
 *   audience    — general | professional | beginner | business
 *   framework   — app_pas | aida | pas | eeat_skyscraper | hero | listicle | howto | none
 *   niche       — ngành/niche (tùy chọn)
 *
 * Response: text/plain stream
 *   Progress chunks: [Agent] message\n
 *   Final chunk:     [DONE] {"type":"done","content":"...","title":"...","editorReview":{...}}
 *   Error chunk:     [ERROR] error message
 */
app.post("/", async (c) => {
  const reqId = c.get("reqId") as string || "unknown";
  const body = await c.req.json();
  const {
    keyword = "",
    tone = "professional",
    count = 1,
    audience = "general",
    framework = "none",
    niche,
  } = body;

  logger.info("generate request started", {
    reqId,
    keyword,
    tone,
    count,
    audience,
    framework,
    niche: niche || null,
  });

  if (!keyword.trim()) {
    logger.warn("generate request rejected — missing keyword", { reqId });
    return c.json(
      {
        success: false,
        code: "missing_keyword",
        message: "Vui lòng nhập keyword hoặc chủ đề bài viết.",
      },
      400,
    );
  }

  const input = { keyword, tone, count, audience, framework, niche };
  const stream = createAgentStream(input, reqId);

  return c.body(stream, 200, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Accel-Buffering": "no",
  });
});

export default app;
