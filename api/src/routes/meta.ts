import { Hono } from "hono";
import { aiComplete, parseJSON } from "../services/openrouter.ts";
import { metaPrompt } from "../prompts/mod.ts";

const app = new Hono();

interface MetaResult {
  meta_title?: string;
  meta_description?: string;
}

app.post("/", async (c) => {
  const body = await c.req.json();
  const { title = "", content = "" } = body;

  if (!title.trim()) {
    return c.json(
      { success: false, code: "missing_title", message: "Cần có tiêu đề bài viết." },
      400,
    );
  }

  const excerpt = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  const prompt = metaPrompt({ title, excerpt });

  try {
    const raw = await aiComplete(prompt, { maxTokens: 250 });
    const data = parseJSON<MetaResult>(raw);

    return c.json({
      success: true,
      meta_title: (data.meta_title || "").slice(0, 60),
      meta_description: (data.meta_description || "").slice(0, 160),
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return c.json(
        { success: false, code: "parse_error", message: "Lỗi xử lý kết quả AI. Vui lòng thử lại." },
        500,
      );
    }
    throw err;
  }
});

export default app;
