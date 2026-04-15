import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import routes from "./routes/mod.ts";
import { ApiError } from "./lib/http.ts";
import { startLogCapture } from "./lib/logStore.ts";

type AppVars = { reqId: string };

export function createApp() {
  const app = new Hono<{ Variables: AppVars }>();

  // Request ID middleware — attaches x-request-id header
  app.use("/*", async (c, next) => {
    const reqId = c.req.header("x-request-id") || crypto.randomUUID();
    c.set("reqId", reqId);
    c.res.headers.set("x-request-id", reqId);
    await next();
  });

  // CORS — cho phép mọi origin (dev)
  app.use("/*", cors());

  // Health check
  app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

  // API routes
  app.route("/api", routes);

  // Global error handler
  app.onError((err, c) => {
    const reqId = c.get("reqId") || "unknown";
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: "ERROR",
      msg: err.message,
      reqId,
      path: c.req.path,
      method: c.req.method,
    }));

    const status = (err as unknown as { status?: number }).status;
    if (err instanceof ApiError) {
      return c.json(
        { success: false, code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503,
      );
    }
    if (status === 429) {
      return c.json({ success: false, code: "ai_rate_limit", message: "AI đang quá tải. Vui lòng thử lại sau." }, 429);
    }
    if (status === 503 || status === 529) {
      return c.json({ success: false, code: "ai_unavailable", message: "Dịch vụ AI tạm thời không khả dụng." }, 503);
    }

    return c.json(
      { success: false, code: "internal_error", message: err.message || "Có lỗi xảy ra. Vui lòng thử lại." },
      500,
    );
  });

  // 404
  app.notFound((c) => {
    return c.json({ success: false, code: "not_found", message: "Route không tồn tại." }, 404);
  });

  return app;
}

const app = createApp();

if (import.meta.main) {
  console.log(`[server] ContentAI API :${config.port}`);
  console.log(`[server] Model: ${config.openrouterModel}`);

  startLogCapture();
  Deno.serve({ port: config.port }, app.fetch);
}

export default app;
