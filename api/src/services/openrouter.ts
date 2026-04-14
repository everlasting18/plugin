import OpenAI from "openai";
import { config } from "../config.ts";
import { logger } from "../lib/logger.ts";

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
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Gọi OpenRouter, trả về text thuần.
 * Tự fallback sang model phụ nếu primary bị lỗi 429/503.
 */
export async function aiComplete(
  prompt: string,
  { maxTokens = 1500, model, systemPrompt, temperature = 0.7 }: AiOptions = {},
): Promise<string> {
  const primaryModel = model || config.openrouterModel;
  const fallbackModel = config.openrouterFallback;

  try {
    return await callModel(prompt, primaryModel, maxTokens, systemPrompt, temperature);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    const isRetryable = status === 429 || status === 503 || status === 529;
    if (isRetryable && fallbackModel && fallbackModel !== primaryModel) {
      logger.warn("ai model fallback triggered", {
        primaryModel,
        fallbackModel,
        status,
      });
      return callModel(prompt, fallbackModel, maxTokens, systemPrompt, temperature);
    }
    logger.error("ai model call failed", {
      model: primaryModel,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function callModel(
  prompt: string,
  model: string,
  maxTokens: number,
  systemPrompt?: string,
  temperature = 0.7,
): Promise<string> {
  const start = Date.now();
  const messages: { role: "system" | "user"; content: string }[] = [];
  if (systemPrompt?.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
    temperature,
  });
  const ms = Date.now() - start;
  const usage = completion.usage;
  logger.debug("ai model call completed", {
    model,
    durationMs: ms,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
  });
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Parse JSON từ AI response — bỏ markdown fences và text thừa.
 * Tìm JSON block hoặc object đầu tiên trong response.
 */
export function parseJSON<T = Record<string, unknown>>(raw: string): T {
  // Ưu tiên: tìm block ```json...```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // fall through
    }
  }

  // Tìm object {} hoặc array [] đầu tiên
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  const arrayMatch = raw.match(/\[[\s\S]*\]/);

  let candidate = "";
  if (objectMatch && arrayMatch) {
    // Chọn cái nào xuất hiện trước
    candidate = objectMatch.index! < arrayMatch.index!
      ? objectMatch[0]
      : arrayMatch[0];
  } else if (objectMatch) {
    candidate = objectMatch[0];
  } else if (arrayMatch) {
    candidate = arrayMatch[0];
  }

  if (candidate) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // fall through
    }
  }

  // Last resort: thử trim toàn bộ
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    throw new Error(`Cannot parse JSON from response: ${raw.slice(0, 100)}`);
  }
}
