import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import routes from "./routes/mod.ts";

const app = new Hono();

// CORS — cho phép mọi origin (dev)
app.use("/*", cors());

// Health check
app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

// API routes
app.route("/api", routes);

// Global error handler
app.onError((err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err.message);

  const status = (err as unknown as { status?: number }).status;
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

console.log(`[server] ContentAI API :${config.port}`);
console.log(`[server] Model: ${config.openrouterModel}`);

Deno.serve({ port: config.port }, app.fetch);
