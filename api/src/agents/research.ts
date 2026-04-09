import { aiComplete, parseJSON } from "../services/openrouter.ts";
import { webSearch, formatSearchResults } from "../tools/search.ts";
import { researchPrompt } from "../prompts/research.ts";
import { logger } from "../lib/logger.ts";

export interface ResearchData {
  stats: string[];
  trends: string[];
  caseStudies: string[];
  commonMistakes: string[];
  uniqueAngles: string[];
  painPoints: string[];
  expertQuotes: string[];
  suggestedOutline?: {
    h2sections: string[];
    faqQuestions: string[];
    recommendedLength: string;
    recommendedTone: string;
  };
  webSearchResults: string;
}

/**
 * Research Agent:
 * 1. Gọi Tavily web search với query phù hợp
 * 2. Gọi AI để phân tích và tổng hợp research findings
 */
export async function runResearchAgent(
  keyword: string,
  tone: string,
  audience: string,
  niche?: string,
  onChunk?: (text: string) => void,
): Promise<ResearchData> {
  onChunk?.("[Research] Đang tìm kiếm thông tin...\n");

  // ── Bước 1: Web search nhiều góc độ ─────────────────────────
  const searchQueries = [
    keyword,
    `${keyword} statistics 2024 2025`,
    `${keyword} best practices`,
    `${keyword} common mistakes`,
    `${keyword} trends`,
  ];

  const searchStart = Date.now();
  const searchResults = await Promise.all(
    searchQueries.map((q, idx) => {
      const queryLabel = `search[${idx + 1}/${searchQueries.length}]`;
      logger.info(queryLabel, { q });
      return webSearch(q, 5);
    }),
  );
  const searchMs = Date.now() - searchStart;

  const combinedSearch = {
    query: keyword,
    results: searchResults.flatMap((r) => r.results).slice(0, 20),
    totalResults: searchResults.reduce((acc, r) => acc + r.totalResults, 0),
  };

  const formattedSearch = formatSearchResults(combinedSearch);
  onChunk?.(`[Research] Tìm được ${combinedSearch.totalResults} kết quả.\n`);
  logger.debug("web search completed", {
    durationMs: searchMs,
    totalResults: combinedSearch.totalResults,
  });

  // ── Bước 2: AI phân tích research ────────────────────────────
  onChunk?.("[Research] Đang phân tích và tổng hợp...\n");

  const aiStart = Date.now();
  const prompt = researchPrompt({ keyword, tone, audience, niche }) +
    `\n\n# WEB SEARCH RESULTS:\n${formattedSearch}`;

  const rawResponse = await aiComplete(prompt, { maxTokens: 2000 });
  const aiMs = Date.now() - aiStart;
  logger.debug("research AI analysis completed", { durationMs: aiMs, model: "research" });

  const defaultParsed = {
    stats: [] as string[],
    trends: [] as string[],
    caseStudies: [] as string[],
    commonMistakes: [] as string[],
    uniqueAngles: [] as string[],
    painPoints: [] as string[],
    expertQuotes: [] as string[],
    suggestedOutline: {
      h2sections: [] as string[],
      faqQuestions: [] as string[],
      recommendedLength: "medium",
      recommendedTone: tone,
    },
    webSearchResults: formattedSearch,
  };

  let parsed = { ...defaultParsed };

  try {
    const jsonResult = parseJSON<Record<string, unknown>>(rawResponse);
    parsed = {
      stats: Array.isArray(jsonResult.stats) ? (jsonResult.stats as string[]) : [],
      trends: Array.isArray(jsonResult.trends) ? (jsonResult.trends as string[]) : [],
      caseStudies: Array.isArray(jsonResult.caseStudies) ? (jsonResult.caseStudies as string[]) : [],
      commonMistakes: Array.isArray(jsonResult.commonMistakes) ? (jsonResult.commonMistakes as string[]) : [],
      uniqueAngles: Array.isArray(jsonResult.uniqueAngles) ? (jsonResult.uniqueAngles as string[]) : [],
      painPoints: Array.isArray(jsonResult.painPoints) ? (jsonResult.painPoints as string[]) : [],
      expertQuotes: Array.isArray(jsonResult.expertQuotes) ? (jsonResult.expertQuotes as string[]) : [],
      suggestedOutline: jsonResult.suggestedOutline as typeof defaultParsed.suggestedOutline,
      webSearchResults: formattedSearch,
    };
  } catch (e) {
    console.warn("[research] Failed to parse JSON:", e instanceof Error ? e.message : String(e));
  }

  onChunk?.(`[Research] Hoàn tất — ${parsed.stats.length} số liệu, ${parsed.caseStudies.length} case studies.\n`);

  logger.info("research data gathered", {
    stats: parsed.stats.slice(0, 5),
    trends: parsed.trends.slice(0, 5),
    caseStudies: parsed.caseStudies.slice(0, 3),
    painPoints: parsed.painPoints.slice(0, 5),
    expertQuotes: parsed.expertQuotes.slice(0, 3),
    suggestedOutline: parsed.suggestedOutline?.h2sections?.slice(0, 5),
  });

  return parsed;
}
