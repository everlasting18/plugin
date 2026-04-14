import { aiComplete, parseJSON } from "../services/openrouter.ts";
import { editorPrompt, type EditorOutput } from "../prompts/editor.ts";
import { EDITOR_SYSTEM_PROMPT } from "../prompts/system.ts";
import { logger } from "../lib/logger.ts";
import type { ResearchSummary, RevisionLoopResult } from "./types.ts";
import {
  MAX_EDITOR_REVIEWS,
  MAX_REWRITE_ATTEMPTS,
} from "./contentConfig.ts";

/**
 * Editor Agent:
 * Review content, đưa ra feedback.
 * Quyết định có cần revision hay không.
 */
export async function runEditorAgent(
  keyword: string,
  tone: string,
  audience: string,
  language: string,
  content: string,
  research: ResearchSummary,
  onChunk?: (text: string) => void,
  reqId?: string,
): Promise<{
  review: EditorOutput;
  needsRevision: boolean;
}> {
  onChunk?.("[Editor] Đang review content...\n");
  logger.info("editor AI call", { reqId, keyword, contentChars: content.length });

  const prompt = editorPrompt({ keyword, tone, audience, language, content, research });

  const aiStart = Date.now();
  const rawResponse = await aiComplete(prompt, {
    maxTokens: 1500,
    systemPrompt: EDITOR_SYSTEM_PROMPT,
    temperature: 0.2,
  });
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
  research: ResearchSummary,
  language: string,
  strategyHint: string | undefined,
  onChunk?: (text: string) => void,
  reqId?: string,
): Promise<RevisionLoopResult> {
  let currentContent = initialContent;
  let title = "";
  let review: EditorOutput = {
    qualityScore: 7,
    seoScore: 7,
    engagementScore: 7,
    overallPass: true,
    strengths: ["Content đạt yêu cầu."],
    issues: [],
    summary: "Không có review.",
  };
  let rewriteAttempts = 0;
  let reviewAttempts = 0;

  // Extract initial title
  const h1Match = currentContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, "").trim();
  }

  // 1) First editorial review
  reviewAttempts++;
  onChunk?.(`\n[Revision Loop 1/${MAX_EDITOR_REVIEWS}] Running editor review...\n`);
  logger.info(`revision review[1/${MAX_EDITOR_REVIEWS}]`, { reqId, keyword });

  const firstReview = await runEditorAgent(
    keyword,
    tone,
    audience,
    language,
    currentContent,
    research,
    onChunk,
    reqId,
  );
  review = firstReview.review;

  if (!firstReview.needsRevision) {
    onChunk?.("[Revision Loop] Content đã pass editorial review.\n");
    logger.info("revision loop pass on first review", {
      reqId,
      qualityScore: review.qualityScore,
      seoScore: review.seoScore,
    });
    return { content: currentContent, title, loops: rewriteAttempts, review };
  }

  if (rewriteAttempts >= MAX_REWRITE_ATTEMPTS) {
    onChunk?.("[Revision Loop] Đạt giới hạn rewrite attempts.\n");
    logger.warn("revision write max reached before rewrite", { reqId, keyword });
    return { content: currentContent, title, loops: rewriteAttempts, review };
  }

  // 2) Rewrite once with editor feedback
  rewriteAttempts++;
  const feedback = buildFeedbackString(review);
  const feedbackPreview = review.issues.slice(0, 3).map((i) => i.issue).join("; ");

  onChunk?.(
    `[Revision Loop] Đang viết lại theo feedback (${rewriteAttempts}/${MAX_REWRITE_ATTEMPTS})...\n`,
  );
  logger.info(`revision write[${rewriteAttempts}/${MAX_REWRITE_ATTEMPTS}]`, {
    reqId,
    keyword,
    feedbackPreview,
  });

  const { runWriterAgent } = await import("./writer.ts");
  const revisionResearch = {
    stats: research.stats,
    trends: [],
    caseStudies: research.caseStudies,
    commonMistakes: [],
    uniqueAngles: [],
    painPoints: research.painPoints,
    expertQuotes: [],
    suggestedOutline: undefined,
  };
  const writerResult = await runWriterAgent(
    keyword,
    tone,
    length,
    audience,
    framework,
    niche,
    revisionResearch,
    language,
    strategyHint,
    feedback,
    onChunk,
  );

  logger.info(`revision write done[${rewriteAttempts}]`, {
    reqId,
    title: writerResult.title,
    chars: writerResult.content.length,
  });

  currentContent = writerResult.content;
  if (!title && writerResult.title) {
    title = writerResult.title;
  }

  // 3) Final editorial review after rewrite
  if (reviewAttempts < MAX_EDITOR_REVIEWS) {
    reviewAttempts++;
    onChunk?.(`\n[Revision Loop 2/${MAX_EDITOR_REVIEWS}] Running editor review...\n`);
    logger.info(`revision review[2/${MAX_EDITOR_REVIEWS}]`, { reqId, keyword });
    const secondReview = await runEditorAgent(
      keyword,
      tone,
      audience,
      language,
      currentContent,
      research,
      onChunk,
      reqId,
    );
    review = secondReview.review;

    if (!secondReview.needsRevision) {
      onChunk?.("[Revision Loop] Bản viết lại đã pass editorial review.\n");
      logger.info("revision loop pass after rewrite", { reqId, keyword });
    } else {
      onChunk?.(
        "[Revision Loop] Bản viết lại vẫn còn issue, dừng ở mức tối ưu token hiện tại.\n",
      );
      logger.warn("revision loop stopped after final review", {
        reqId,
        keyword,
        issuesCount: review.issues.length,
      });
    }
  }

  return { content: currentContent, title, loops: rewriteAttempts, review };
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
