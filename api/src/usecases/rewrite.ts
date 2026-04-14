import { REWRITE_SYSTEM_PROMPT, rewritePrompt } from "../prompts/mod.ts";
import { ApiError, readString } from "../lib/http.ts";
import { aiComplete } from "../services/openrouter.ts";

const VALID_INSTRUCTIONS = new Set(["improve", "shorter", "longer", "simpler", "rewrite"]);

export interface RewriteRequest {
  text: string;
  instruction: string;
}

export function parseRewriteRequest(body: Record<string, unknown>): RewriteRequest {
  const text = readString(body.text);
  const instruction = readString(body.instruction, "improve");

  if (!text.trim()) {
    throw new ApiError(400, "missing_text", "Vui lòng cung cấp đoạn văn muốn rewrite.");
  }

  if (text.length > 5000) {
    throw new ApiError(400, "text_too_long", "Đoạn văn quá dài. Tối đa 5.000 ký tự.");
  }

  if (!VALID_INSTRUCTIONS.has(instruction)) {
    throw new ApiError(400, "invalid_instruction", "Lệnh không hợp lệ.");
  }

  return { text, instruction };
}

export function rewriteContent(input: RewriteRequest): Promise<string> {
  const prompt = rewritePrompt(input);
  return aiComplete(prompt, {
    maxTokens: 800,
    systemPrompt: REWRITE_SYSTEM_PROMPT,
    temperature: 0.45,
  });
}
