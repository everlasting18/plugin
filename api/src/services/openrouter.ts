import OpenAI from "openai";
import { config } from "../config.ts";

const client = new OpenAI({
  apiKey: config.openrouterKey,
  baseURL: config.openrouterBase,
  defaultHeaders: {
    "HTTP-Referer": "https://contentai.vn",
    "X-Title": "ContentAI WordPress Plugin",
  },
});

interface AiOptions {
  maxTokens?: number;
  model?: string;
}

/**
 * Gọi OpenRouter, trả về text thuần.
 * Tự fallback sang model phụ nếu primary bị lỗi 429/503.
 */
export async function aiComplete(
  prompt: string,
  { maxTokens = 1500, model }: AiOptions = {},
): Promise<string> {
  const primaryModel = model || config.openrouterModel;
  const fallbackModel = config.openrouterFallback;

  try {
    return await callModel(prompt, primaryModel, maxTokens);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    const isRetryable = status === 429 || status === 503 || status === 529;
    if (isRetryable && fallbackModel && fallbackModel !== primaryModel) {
      console.warn(
        `[openrouter] Primary ${primaryModel} failed (${status}), trying fallback ${fallbackModel}`,
      );
      return callModel(prompt, fallbackModel, maxTokens);
    }
    throw err;
  }
}

async function callModel(
  prompt: string,
  model: string,
  maxTokens: number,
): Promise<string> {
  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Parse JSON từ AI response — bỏ markdown fences nếu có.
 */
export function parseJSON<T = Record<string, unknown>>(raw: string): T {
  const clean = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  return JSON.parse(clean) as T;
}
