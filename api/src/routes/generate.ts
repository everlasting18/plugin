import { Hono } from "hono";
import { aiComplete } from "../services/openrouter.ts";
import { generatePrompt, generateMaxTokens } from "../prompts/mod.ts";

const app = new Hono();

const VALID_ACTIONS = new Set(["full_article", "intro", "conclusion", "cta", "outline"]);

app.post("/", async (c) => {
  const body = await c.req.json();
  const {
    action = "full_article",
    keyword = "",
    tone = "professional",
    length = "medium",
    audience = "general",
    framework = "none",
    // webSearch reserved for future use
  } = body;

  if (!keyword.trim()) {
    return c.json(
      { success: false, code: "missing_keyword", message: "Vui lòng nhập keyword hoặc chủ đề bài viết." },
      400,
    );
  }
  if (!VALID_ACTIONS.has(action)) {
    return c.json(
      { success: false, code: "invalid_action", message: "Action không hợp lệ." },
      400,
    );
  }

  const prompt = generatePrompt({ action, keyword, tone, length, audience, framework });
  const maxTokens = generateMaxTokens(action, length);
  const content = await aiComplete(prompt, { maxTokens });

  // Extract title from <h1> tag if present
  let title = "";
  if (action === "full_article") {
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      title = h1Match[1].replace(/<[^>]+>/g, "").trim();
    }
  }

  return c.json({ success: true, content, title, action });
});

export default app;
