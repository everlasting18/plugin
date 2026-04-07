import { Hono } from "hono";
import { aiComplete } from "../services/openrouter.ts";
import { rewritePrompt } from "../prompts/mod.ts";

const app = new Hono();

const VALID_INSTRUCTIONS = new Set(["improve", "shorter", "longer", "simpler", "rewrite"]);

app.post("/", async (c) => {
  const body = await c.req.json();
  const { text = "", instruction = "improve" } = body;

  if (!text.trim()) {
    return c.json(
      { success: false, code: "missing_text", message: "Vui lòng cung cấp đoạn văn muốn rewrite." },
      400,
    );
  }
  if (text.length > 5000) {
    return c.json(
      { success: false, code: "text_too_long", message: "Đoạn văn quá dài. Tối đa 5.000 ký tự." },
      400,
    );
  }
  if (!VALID_INSTRUCTIONS.has(instruction)) {
    return c.json(
      { success: false, code: "invalid_instruction", message: "Lệnh không hợp lệ." },
      400,
    );
  }

  const prompt = rewritePrompt({ text, instruction });
  const content = await aiComplete(prompt, { maxTokens: 800 });

  return c.json({ success: true, content, original: text });
});

export default app;
