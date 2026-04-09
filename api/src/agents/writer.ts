import { aiComplete } from "../services/openrouter.ts";
import { writerPrompt, writerMaxTokens } from "../prompts/writer.ts";
import type { ResearchData } from "./research.ts";
import { logger } from "../lib/logger.ts";

export interface WriterResult {
  content: string;
  title: string;
}

/**
 * Clean newline artifacts from Gutenberg HTML output.
 * Removes \n that appear inside/between HTML tags.
 */
function cleanHtml(html: string): string {
  return html
    // Remove \n immediately after opening tags (before content)
    .replace(/>(?:\n\s*)+/g, ">")
    // Remove \n immediately before closing tags
    .replace(/(?:\n\s*)+<\//g, "</")
    // Remove \n between block comments and the next tag
    .replace(/-->\s*\n\s*</g, "-->\n<")
    // Collapse multiple newlines between tags down to single
    .replace(/>\n{2,}</g, ">\n<")
    // Trim each line
    .split("\n")
    .map((line) => line.trim())
    .join("")
    // Collapse multiple spaces
    .replace(/  +/g, " ")
    .trim();
}

/**
 * Writer Agent:
 * Viết content dựa trên research data + parameters.
 * Nếu có editorFeedback → viết lại theo feedback.
 */
export async function runWriterAgent(
  keyword: string,
  tone: string,
  length: string,
  audience: string,
  framework: string,
  niche: string | undefined,
  research: ResearchData,
  editorFeedback?: string,
  onChunk?: (text: string) => void,
): Promise<WriterResult> {
  const label = editorFeedback ? "Writer (Revision)" : "Writer";
  onChunk?.(`[${label}] Đang viết content...\n`);

  // Defensive: ensure research fields are always arrays
  const safeResearch = {
    stats: Array.isArray(research?.stats) ? research.stats : [],
    trends: Array.isArray(research?.trends) ? research.trends : [],
    caseStudies: Array.isArray(research?.caseStudies) ? research.caseStudies : [],
    commonMistakes: Array.isArray(research?.commonMistakes) ? research.commonMistakes : [],
    uniqueAngles: Array.isArray(research?.uniqueAngles) ? research.uniqueAngles : [],
    painPoints: Array.isArray(research?.painPoints) ? research.painPoints : [],
    expertQuotes: Array.isArray(research?.expertQuotes) ? research.expertQuotes : [],
    suggestedOutline: research?.suggestedOutline ?? undefined,
  };

  const prompt = writerPrompt({
    keyword,
    tone,
    length,
    audience,
    framework,
    niche,
    research: safeResearch,
    editorFeedback,
  });

  const promptTokens = (prompt.length / 4) | 0; // rough estimate
  logger.info(`writer AI call`, { keyword, tone, length, audience, framework, statsCount: safeResearch.stats.length, caseStudiesCount: safeResearch.caseStudies.length, promptTokensEst: promptTokens, hasFeedback: !!editorFeedback });

  const maxTokens = writerMaxTokens(length);
  const aiStart = Date.now();
  const rawContent = await aiComplete(prompt, { maxTokens });
  const aiMs = Date.now() - aiStart;
  const content = cleanHtml(rawContent);

  // Extract title from <h1>
  let title = "";
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, "").trim();
  }

  onChunk?.(`[${label}] Hoàn tất — ${content.length} ký tự.\n`);
  logger.debug("writer AI completed", { durationMs: aiMs, contentLength: content.length, hasTitle: !!title });

  return { content, title };
}
