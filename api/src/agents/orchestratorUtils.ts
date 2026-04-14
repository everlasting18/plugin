import type {
  OrchestratorOutput,
  PostResult,
  ResearchData,
  ResearchSummary,
  RevisionLoopResult,
} from "./types.ts";

export function clampPostCount(count: number): number {
  return Math.min(Math.max(count || 1, 1), 3);
}

export function buildResearchSummary(research: ResearchData): ResearchSummary {
  return {
    stats: research.stats,
    caseStudies: research.caseStudies,
    painPoints: research.painPoints,
  };
}

export function buildPostResult(
  result: RevisionLoopResult,
  fallbackTitle: string,
): PostResult {
  return {
    content: result.content,
    title: result.title || fallbackTitle,
    revisionLoops: result.loops,
    editorReview: {
      qualityScore: result.review.qualityScore,
      seoScore: result.review.seoScore,
      engagementScore: result.review.engagementScore,
      overallPass: result.review.overallPass,
      issues: result.review.issues,
      summary: result.review.summary,
    },
  };
}

export function buildDonePayload(result: OrchestratorOutput) {
  return {
    type: "done",
    posts: result.posts.map((post) => ({
      content: post.content,
      title: post.title,
      revisionLoops: post.revisionLoops,
      editorReview: post.editorReview,
    })),
    researchSummary: {
      statsCount: result.research.stats.length,
      caseStudiesCount: result.research.caseStudies.length,
    },
  };
}

export function buildContentPreview(content: string): string {
  return content.replace(/<[^>]+>/g, "").trim().split(/\s+/).slice(0, 10).join(" ") + "...";
}
