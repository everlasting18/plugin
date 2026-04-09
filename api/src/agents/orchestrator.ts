import { runResearchAgent, type ResearchData } from "./research.ts";
import { runWriterAgent } from "./writer.ts";
import { runRevisionLoop } from "./editor.ts";
import { logger } from "../lib/logger.ts";

export interface OrchestratorInput {
  keyword: string;
  tone: string;
  count: number;
  audience: string;
  framework: string;
  niche?: string;
}

export interface OrchestratorOutput {
  posts: PostResult[];
  research: ResearchData;
}

interface PostResult {
  content: string;
  title: string;
  revisionLoops: number;
  editorReview: {
    qualityScore: number;
    seoScore: number;
    engagementScore: number;
    overallPass: boolean;
    issues: { severity: string; location: string; issue: string; fix: string }[];
    summary: string;
  };
}

/**
 * Orchestrator — điều phối Research → Write → Editor × N posts.
 * Research chạy 1 lần, sau đó mỗi post chạy Writer + Editor revision loop.
 */
export async function runOrchestrator(
  input: OrchestratorInput,
  onChunk?: (text: string) => void,
  reqId?: string,
): Promise<OrchestratorOutput> {
  const { keyword, tone, count, audience, framework, niche } = input;
  const numPosts = Math.min(Math.max(count || 1, 1), 3);

  logger.info("orchestrator started", { reqId, keyword, numPosts });

  // ── Phase 1: Research (1 lần, chia sẻ cho tất cả bài) ───────────
  onChunk?.(`[Research] Đang tìm kiếm thông tin cho ${numPosts} bài...\n`);
  const researchStart = Date.now();
  const research = await runResearchAgent(keyword, tone, audience, niche, onChunk);
  const researchMs = Date.now() - researchStart;
  onChunk?.(`[Research] Hoàn tất — ${research.stats.length} số liệu, ${research.caseStudies.length} case studies.\n\n`);
  logger.info("research phase completed", {
    reqId,
    durationMs: researchMs,
    statsCount: research.stats.length,
    caseStudiesCount: research.caseStudies.length,
  });

  const posts: PostResult[] = [];

  for (let i = 1; i <= numPosts; i++) {
    onChunk?.(`\n${"=".repeat(50)}\n`);
    onChunk?.(`[Post ${i}/${numPosts}] Bắt đầu viết...\n`);
    const postStart = Date.now();

    // Writer — viết bản draft đầu tiên
    onChunk?.(`[Post ${i}/${numPosts}] [Writer] Đang viết content...\n`);
    logger.info(`writer draft[${i}/${numPosts}]`, { reqId, keyword });
    const { content: initialDraft, title: initialTitle } = await runWriterAgent(
      keyword, tone, "medium", audience, framework, niche, research,
      undefined,
      onChunk,
    );
    onChunk?.(`[Post ${i}/${numPosts}] [Writer] Hoàn tất.\n`);
    logger.info(`writer draft[${i}/${numPosts}] done`, { reqId, title: initialTitle, draftChars: initialDraft.length });

    // Editor + Revision Loop
    const researchSummary = {
      stats: research.stats,
      caseStudies: research.caseStudies,
      painPoints: research.painPoints,
    };

    logger.info(`editor review[${i}/${numPosts}]`, { reqId, keyword });
    const finalResult = await runRevisionLoop(
      initialDraft,
      keyword, tone, audience, framework, "medium", niche,
      researchSummary,
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

    const postMs = Date.now() - postStart;
    posts.push({
      content: finalResult.content,
      title: finalResult.title || initialTitle,
      revisionLoops: finalResult.loops,
      editorReview: {
        qualityScore: finalResult.review.qualityScore,
        seoScore: finalResult.review.seoScore,
        engagementScore: finalResult.review.engagementScore,
        overallPass: finalResult.review.overallPass,
        issues: finalResult.review.issues,
        summary: finalResult.review.summary,
      },
    });

    onChunk?.(`[Post ${i}/${numPosts}] Xong ✓\n`);
    const contentPreview = finalResult.content.replace(/<[^>]+>/g, "").trim().split(/\s+/).slice(0, 10).join(" ") + "...";
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
      content: contentPreview,
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

        const final = JSON.stringify({
          type: "done",
          posts: result.posts.map(p => ({
            content: p.content,
            title: p.title,
            revisionLoops: p.revisionLoops,
            editorReview: p.editorReview,
          })),
          researchSummary: {
            statsCount: result.research.stats.length,
            caseStudiesCount: result.research.caseStudies.length,
          },
        });
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
