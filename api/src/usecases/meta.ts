import { META_SYSTEM_PROMPT, metaPrompt } from "../prompts/mod.ts";
import { ApiError, readString } from "../lib/http.ts";
import { aiComplete, parseJSON } from "../services/openrouter.ts";

interface MetaResult {
  meta_title?: string;
  meta_description?: string;
}

export interface MetaRequest {
  title: string;
  content: string;
}

export function parseMetaRequest(body: Record<string, unknown>): MetaRequest {
  const title = readString(body.title);
  const content = readString(body.content);

  if (!title.trim()) {
    throw new ApiError(400, "missing_title", "Cần có tiêu đề bài viết.");
  }

  return { title, content };
}

export async function generateMeta(input: MetaRequest): Promise<{
  meta_title: string;
  meta_description: string;
}> {
  const excerpt = input.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  const prompt = metaPrompt({ title: input.title, excerpt });
  const raw = await aiComplete(prompt, {
    maxTokens: 250,
    systemPrompt: META_SYSTEM_PROMPT,
    temperature: 0.2,
  });

  try {
    const data = parseJSON<MetaResult>(raw);
    return {
      meta_title: (data.meta_title || "").slice(0, 60),
      meta_description: (data.meta_description || "").slice(0, 160),
    };
  } catch {
    throw new ApiError(500, "parse_error", "Lỗi xử lý kết quả AI. Vui lòng thử lại.");
  }
}
