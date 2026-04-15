import {
  buildContentPreview,
  buildDonePayload,
  buildPostResult,
  buildResearchSummary,
  clampPostCount,
} from "../src/agents/orchestratorUtils.ts";

Deno.test("clampPostCount keeps values in range 1..3", () => {
  if (clampPostCount(0) !== 1) {
    throw new Error("Expected 0 to clamp to 1");
  }

  if (clampPostCount(2) !== 2) {
    throw new Error("Expected 2 to remain 2");
  }

  if (clampPostCount(8) !== 3) {
    throw new Error("Expected 8 to clamp to 3");
  }
});

Deno.test("buildResearchSummary only keeps public research slices", () => {
  const summary = buildResearchSummary({
    stats: ["10% tăng trưởng"],
    trends: ["AI content"],
    caseStudies: ["Case A"],
    commonMistakes: ["Mistake A"],
    uniqueAngles: ["Angle A"],
    painPoints: ["Pain A"],
    expertQuotes: ["Quote A"],
    webSearchResults: "raw",
    suggestedOutline: {
      h2sections: ["H2 A"],
      faqQuestions: ["Q1"],
      recommendedLength: "medium",
      recommendedTone: "professional",
    },
  });

  if (summary.stats.length !== 1 || summary.caseStudies.length !== 1 || summary.painPoints.length !== 1) {
    throw new Error(`Expected selected research slices, got ${JSON.stringify(summary)}`);
  }
});

Deno.test("buildPostResult falls back to provided title", () => {
  const post = buildPostResult({
    content: "<h1>Test</h1>",
    title: "",
    loops: 1,
    review: {
      qualityScore: 8,
      seoScore: 7,
      engagementScore: 7,
      overallPass: true,
      issues: [],
      summary: "OK",
    },
  }, "Fallback title");

  if (post.title !== "Fallback title") {
    throw new Error(`Expected fallback title, got ${post.title}`);
  }

  if (post.revisionLoops !== 1) {
    throw new Error(`Expected revision loop count, got ${post.revisionLoops}`);
  }
});

Deno.test("buildDonePayload returns compact done shape", () => {
  const payload = buildDonePayload({
    posts: [{
      title: "Bai 1",
      content: "<h1>Bai 1</h1>",
      revisionLoops: 1,
      editorReview: {
        qualityScore: 8,
        seoScore: 7,
        engagementScore: 7,
        overallPass: true,
        issues: [],
        summary: "OK",
      },
    }],
    research: {
      stats: ["S1", "S2"],
      trends: [],
      caseStudies: ["C1"],
      commonMistakes: [],
      uniqueAngles: [],
      painPoints: ["P1"],
      expertQuotes: [],
      webSearchResults: "",
    },
  });

  if (payload.type !== "done") {
    throw new Error(`Expected done payload type, got ${payload.type}`);
  }

  if (payload.researchSummary.statsCount !== 2 || payload.researchSummary.caseStudiesCount !== 1) {
    throw new Error(`Unexpected research summary counts: ${JSON.stringify(payload.researchSummary)}`);
  }
});

Deno.test("buildContentPreview strips html and truncates to first ten words", () => {
  const preview = buildContentPreview(
    "<h1>Tieu de</h1><p>mot hai ba bon nam sau bay tam chin muoi muoi-mot muoi-hai</p>",
  );

  if (preview !== "Tieu de mot hai ba bon nam sau bay tam...") {
    throw new Error(`Unexpected preview: ${preview}`);
  }
});
