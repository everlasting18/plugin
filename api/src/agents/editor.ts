import { aiComplete, parseJSON } from "../services/openrouter.ts";
import { editorPrompt, type EditorOutput } from "../prompts/editor.ts";
import { logger } from "../lib/logger.ts";

const MAX_REVISION_LOOPS = 2;

/**
 * Editor Agent:
 * Review content, đưa ra feedback.
 * Quyết định có cần revision hay không.
 */
export async function runEditorAgent(
  keyword: string,
  tone: string,
  audience: string,
  content: string,
  research: {
    stats: string[];
    caseStudies: string[];
    painPoints: string[];
  },
  onChunk?: (text: string) => void,
  reqId?: string,
): Promise<{
  review: EditorOutput;
  needsRevision: boolean;
}> {
  onChunk?.("[Editor] Đang review content...\n");
  logger.info("editor AI call", { reqId, keyword, contentChars: content.length });

  const prompt = editorPrompt({ keyword, tone, audience, content, research });

  const aiStart = Date.now();
  const rawResponse = await aiComplete(prompt, { maxTokens: 1500 });
  const aiMs = Date.now() - aiStart;

  let review: EditorOutput;
  try {
    review = parseJSON<EditorOutput>(rawResponse);
  } catch {
    review = {
      qualityScore: 7,
      seoScore: 7,
      engagementScore: 7,
      overallPass: true,
      strengths: ["Content đạt yêu cầu."],
      issues: [],
      summary: "Không thể parse review chi tiết.",
    };
  }

  onChunk?.(`[Editor] Quality: ${review.qualityScore}/10 | SEO: ${review.seoScore}/10 | Engagement: ${review.engagementScore}/10\n`);
  logger.debug("editor AI completed", {
    reqId,
    durationMs: aiMs,
    overallPass: review.overallPass,
    qualityScore: review.qualityScore,
    seoScore: review.seoScore,
    engagementScore: review.engagementScore,
    issuesCount: review.issues.length,
    summary: review.summary,
  });

  if (!review.overallPass) {
    onChunk?.(`[Editor] Cần revision — ${review.issues.length} issues.\n`);
    logger.info("editor needs revision", {
      reqId,
      issues: review.issues.map(i => `${i.severity}: ${i.issue}`),
    });
  } else {
    onChunk?.(`[Editor] Content đạt yêu cầu ✓\n`);
  }

  return {
    review,
    needsRevision: !review.overallPass,
  };
}

/**
 * Chạy revision loop: Writer → Editor → (Writer revise) → Editor → ...
 * Cho đến khi Editor pass HOẶC đạt max loops.
 */
export async function runRevisionLoop(
  initialContent: string,
  keyword: string,
  tone: string,
  audience: string,
  framework: string,
  length: string,
  niche: string | undefined,
  research: {
    stats: string[];
    caseStudies: string[];
    painPoints: string[];
  },
  onChunk?: (text: string) => void,
  reqId?: string,
): Promise<{
  content: string;
  title: string;
  loops: number;
  review: EditorOutput;
}> {
  let currentContent = initialContent;
  let title = "";
  let review: EditorOutput;
  let loops = 0;

  // Extract initial title
  const h1Match = currentContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, "").trim();
  }

  while (loops < MAX_REVISION_LOOPS) {
    loops++;
    onChunk?.(`\n[Revision Loop ${loops}/${MAX_REVISION_LOOPS}] Running editor review...\n`);
    logger.info(`revision loop[${loops}/${MAX_REVISION_LOOPS}]`, { reqId, keyword });

    const result = await runEditorAgent(keyword, tone, audience, currentContent, research, onChunk, reqId);
    review = result.review;

    if (!result.needsRevision) {
      onChunk?.("[Revision Loop] Content đã pass editorial review.\n");
      logger.info("revision loop pass", { reqId, loop: loops, qualityScore: review.qualityScore, seoScore: review.seoScore });
      break;
    }

    if (loops >= MAX_REVISION_LOOPS) {
      onChunk?.("[Revision Loop] Đạt giới hạn revision loops.\n");
      logger.warn("revision loop max reached", { reqId, loop: loops });
      break;
    }

    // Build feedback string từ editor
    const feedback = buildFeedbackString(review);
    const feedbackPreview = review.issues.slice(0, 3).map(i => i.issue).join("; ");

    onChunk?.(`[Revision Loop ${loops}] Đang viết lại theo feedback...\n`);
    logger.info(`revision write[${loops}]`, { reqId, keyword, feedbackPreview });

    // Import dynamically to avoid circular
    const { runWriterAgent } = await import("./writer.ts");
    const writerResult = await runWriterAgent(
      keyword, tone, length, audience, framework, niche,
      { ...research, webSearchResults: "", suggestedOutline: undefined } as any,
      feedback,
      onChunk,
    );

    logger.info(`revision write[${loops}] done`, { reqId, title: writerResult.title, chars: writerResult.content.length });

    currentContent = writerResult.content;
    if (!title && writerResult.title) {
      title = writerResult.title;
    }
  }

  return { content: currentContent, title, loops, review: review! };
}

function buildFeedbackString(review: EditorOutput): string {
  const lines: string[] = [
    `Quality Score: ${review.qualityScore}/10. SEO Score: ${review.seoScore}/10. Engagement: ${review.engagementScore}/10.`,
    `Summary: ${review.summary}`,
    "",
    "STRENGTHS:",
    ...review.strengths.map(s => `- ${s}`),
    "",
    "ISSUES TO FIX:",
  ];

  for (const issue of review.issues) {
    lines.push(`[${issue.severity.toUpperCase()}] ${issue.location}: ${issue.issue}`);
    lines.push(`  → Fix: ${issue.fix}`);
  }

  return lines.join("\n");
}
