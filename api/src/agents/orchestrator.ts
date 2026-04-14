import { runResearchAgent } from "./research.ts";
import { runWriterAgent } from "./writer.ts";
import { runRevisionLoop } from "./editor.ts";
import { buildSkippedEditorReview, needsEditorialReview } from "./editorGate.ts";
import { resolveFrameworkPlan } from "./frameworkStrategy.ts";
import { logger } from "../lib/logger.ts";
import {
  DEFAULT_CONTENT_LANGUAGE,
  DEFAULT_CONTENT_LENGTH,
  DEFAULT_WEB_SEARCH,
  normalizeAudience,
  normalizeLanguage,
} from "./contentConfig.ts";
import type { OrchestratorInput, OrchestratorOutput, RevisionLoopResult } from "./types.ts";
import {
  buildContentPreview,
  buildDonePayload,
  buildPostResult,
  buildResearchSummary,
  clampPostCount,
} from "./orchestratorUtils.ts";

/**
 * Orchestrator — điều phối Research → Write → Editor × N posts.
 * Research chạy 1 lần, sau đó mỗi post chạy Writer + Editor revision loop.
 */
export async function runOrchestrator(
  input: OrchestratorInput,
  onChunk?: (text: string) => void,
  reqId?: string,
): Promise<OrchestratorOutput> {
  const {
    keyword,
    tone,
    count,
    audience: rawAudience,
    language: rawLanguage = DEFAULT_CONTENT_LANGUAGE,
    framework,
    niche,
    length = DEFAULT_CONTENT_LENGTH,
    webSearch = DEFAULT_WEB_SEARCH,
  } = input;
  const audience = normalizeAudience(String(rawAudience || ""));
  const language = normalizeLanguage(String(rawLanguage || ""));
  const numPosts = clampPostCount(count);
  const frameworkPlan = resolveFrameworkPlan({
    keyword,
    requestedFramework: framework,
    audience,
    length,
    niche,
  });
  const effectiveFramework = frameworkPlan.framework;

  logger.info("orchestrator started", {
    reqId,
    keyword,
    numPosts,
    length,
    webSearch,
    language,
    requestedFramework: framework,
    effectiveFramework,
    frameworkSource: frameworkPlan.source,
    frameworkIntent: frameworkPlan.intent,
    frameworkMode: frameworkPlan.mode,
  });
  onChunk?.(
    `[Planner] Framework ${effectiveFramework} (${frameworkPlan.source}) — ${frameworkPlan.reason}\n`,
  );

  // ── Phase 1: Research (1 lần, chia sẻ cho tất cả bài) ───────────
  onChunk?.(`[Research] Đang tìm kiếm thông tin cho ${numPosts} bài...\n`);
  const researchStart = Date.now();
  const research = await runResearchAgent(
    keyword,
    tone,
    audience,
    language,
    effectiveFramework,
    niche,
    webSearch,
    onChunk,
  );
  const researchMs = Date.now() - researchStart;
  onChunk?.(`[Research] Hoàn tất — ${research.stats.length} số liệu, ${research.caseStudies.length} case studies.\n\n`);
  logger.info("research phase completed", {
    reqId,
    durationMs: researchMs,
    statsCount: research.stats.length,
    caseStudiesCount: research.caseStudies.length,
  });

  const posts: OrchestratorOutput["posts"] = [];

  for (let i = 1; i <= numPosts; i++) {
    onChunk?.(`\n${"=".repeat(50)}\n`);
    onChunk?.(`[Post ${i}/${numPosts}] Bắt đầu viết...\n`);
    const postStart = Date.now();

    // Writer — viết bản draft đầu tiên
    onChunk?.(`[Post ${i}/${numPosts}] [Writer] Đang viết content...\n`);
    logger.info(`writer draft[${i}/${numPosts}]`, { reqId, keyword });
    const { content: initialDraft, title: initialTitle } = await runWriterAgent(
      keyword, tone, length, audience, effectiveFramework, niche, research,
      language,
      frameworkPlan.strategyHint,
      undefined,
      onChunk,
    );
    onChunk?.(`[Post ${i}/${numPosts}] [Writer] Hoàn tất.\n`);
    logger.info(`writer draft[${i}/${numPosts}] done`, { reqId, title: initialTitle, draftChars: initialDraft.length });

    const reviewGate = needsEditorialReview(initialDraft, length, effectiveFramework);
    let finalResult: RevisionLoopResult;

    if (reviewGate.shouldReview) {
      // Editor + Revision Loop chỉ chạy khi draft fail structural checks
      const researchSummary = buildResearchSummary(research);

      onChunk?.(`[Post ${i}/${numPosts}] [Editor Gate] Cần review AI: ${reviewGate.reasons.join(" ")}\n`);
      logger.info(`editor review[${i}/${numPosts}]`, { reqId, keyword, reasons: reviewGate.reasons });
      finalResult = await runRevisionLoop(
        initialDraft,
        keyword, tone, audience, effectiveFramework, length, niche,
        researchSummary,
        language,
        frameworkPlan.strategyHint,
        onChunk,
        reqId,
      );
      logger.info(`editor review[${i}/${numPosts}] done`, {
        reqId,
        title: finalResult.title,
        loops: finalResult.loops,
        qualityScore: finalResult.review.qualityScore,
        seoScore: finalResult.review.seoScore,
        engagementScore: finalResult.review.engagementScore,
        overallPass: finalResult.review.overallPass,
        issuesCount: finalResult.review.issues.length,
      });
    } else {
      onChunk?.(`[Post ${i}/${numPosts}] [Editor Gate] Bỏ qua review AI — draft đạt structural checks.\n`);
      finalResult = {
        content: initialDraft,
        title: initialTitle,
        loops: 0,
        review: buildSkippedEditorReview(),
      };
      logger.info(`editor review[${i}/${numPosts}] skipped`, {
        reqId,
        keyword,
      });
    }

    const postMs = Date.now() - postStart;
    posts.push(buildPostResult(finalResult, initialTitle));

    onChunk?.(`[Post ${i}/${numPosts}] Xong ✓\n`);
    logger.info("post completed", {
      reqId,
      postIndex: i,
      numPosts,
      durationMs: postMs,
      revisionLoops: finalResult.loops,
      qualityScore: finalResult.review.qualityScore,
      seoScore: finalResult.review.seoScore,
      engagementScore: finalResult.review.engagementScore,
      overallPass: finalResult.review.overallPass,
      contentLength: finalResult.content.length,
      content: buildContentPreview(finalResult.content),
    });
  }

  logger.info("orchestrator completed", {
    reqId,
    totalPosts: posts.length,
  });

  return { posts, research };
}

/**
 * Tạo stream response cho Hono.
 */
export function createAgentStream(
  input: OrchestratorInput,
  reqId?: string,
  onDone?: (result: OrchestratorOutput) => Promise<void> | void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Stream already closed — ignore
        }
      };

      try {
        const result = await runOrchestrator(input, send, reqId);
        await onDone?.(result);

        const final = JSON.stringify(buildDonePayload(result));
        send(`[DONE] ${final}\n`);
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        logger.error("orchestrator stream error", { reqId, error: errorMsg });
        send(`[ERROR] ${errorMsg}\n`);
        controller.close();
      }
    },
  });

  return stream;
}
