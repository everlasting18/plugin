import { aiComplete, parseJSON } from "../services/openrouter.ts";
import { webSearch, formatSearchResults } from "../tools/search.ts";
import { researchPrompt } from "../prompts/research.ts";
import { RESEARCH_SYSTEM_PROMPT } from "../prompts/system.ts";
import { logger } from "../lib/logger.ts";
import {
  buildSearchQueries,
  dedupeCombinedResults,
  prioritizeDomainDiversity,
} from "./researchQueries.ts";
import {
  MAX_MERGED_SEARCH_RESULTS,
  MAX_SEARCH_RESULTS_PER_QUERY,
  RESEARCH_MIN_TOKENS,
  RESEARCH_MAX_TOKENS,
  RESEARCH_TOKENS_PER_1K_CHARS,
  RESEARCH_TOKENS_PER_RESULT,
} from "./contentConfig.ts";
import type { ResearchData } from "./types.ts";

function buildDefaultResearchData(
  tone: string,
  webSearchResults: string,
): ResearchData {
  return {
    stats: [],
    trends: [],
    caseStudies: [],
    commonMistakes: [],
    uniqueAngles: [],
    painPoints: [],
    expertQuotes: [],
    suggestedOutline: {
      h2sections: [],
      faqQuestions: [],
      recommendedLength: "medium",
      recommendedTone: tone,
    },
    webSearchResults,
  };
}

function computeResearchMaxTokens(searchResultCount: number, formattedSearch: string): number {
  const densityBoost = Math.min(searchResultCount, MAX_MERGED_SEARCH_RESULTS) *
    RESEARCH_TOKENS_PER_RESULT;
  const contextBoost = Math.floor(formattedSearch.length / 1000) *
    RESEARCH_TOKENS_PER_1K_CHARS;
  const dynamicBudget = RESEARCH_MIN_TOKENS + densityBoost + contextBoost;
  return Math.min(RESEARCH_MAX_TOKENS, Math.max(RESEARCH_MIN_TOKENS, dynamicBudget));
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
  language: string,
  framework?: string,
  niche?: string,
  useWebSearch = true,
  onChunk?: (text: string) => void,
): Promise<ResearchData> {
  let formattedSearch = "Web search disabled by caller.";
  let hasSearchResults = false;
  let searchResultCount = 0;

  if (useWebSearch) {
    onChunk?.("[Research] Đang tìm kiếm thông tin...\n");

    // ── Bước 1: Web search vừa đủ góc độ cần thiết ──────────────
    const searchQueries = buildSearchQueries(keyword, audience, framework, niche);

    const searchStart = Date.now();
    const searchResults = await Promise.all(
      searchQueries.map((q, idx) => {
        const queryLabel = `search[${idx + 1}/${searchQueries.length}]`;
        logger.info(queryLabel, { q });
        return webSearch(q, MAX_SEARCH_RESULTS_PER_QUERY);
      }),
    );
    const searchMs = Date.now() - searchStart;

    const mergedResults = prioritizeDomainDiversity(dedupeCombinedResults(
      searchResults.flatMap((r) => r.results),
    )).slice(0, MAX_MERGED_SEARCH_RESULTS);

    const combinedSearch = {
      query: keyword,
      results: mergedResults,
      totalResults: searchResults.reduce((acc, r) => acc + r.totalResults, 0),
    };
    hasSearchResults = combinedSearch.results.length > 0;
    searchResultCount = combinedSearch.results.length;

    formattedSearch = formatSearchResults(combinedSearch);
    onChunk?.(`[Research] Tìm được ${combinedSearch.totalResults} kết quả.\n`);
    logger.debug("web search completed", {
      durationMs: searchMs,
      totalResults: combinedSearch.totalResults,
    });
  } else {
    onChunk?.("[Research] Bỏ qua web search theo tuỳ chọn.\n");
    logger.info("web search skipped", { keyword, audience, niche: niche || null });
  }

  // ── Bước 2: AI phân tích research ────────────────────────────
  if (useWebSearch && !hasSearchResults) {
    onChunk?.("[Research] Không có kết quả đủ tốt từ web search, bỏ qua AI research để tiết kiệm token.\n");
    logger.info("research AI skipped — no usable web search results", {
      keyword,
      audience,
      niche: niche || null,
    });
    return buildDefaultResearchData(tone, formattedSearch);
  }

  onChunk?.("[Research] Đang phân tích và tổng hợp...\n");

  const aiStart = Date.now();
  const prompt = researchPrompt({ keyword, tone, audience, language, framework, niche }) +
    `\n\n# WEB SEARCH RESULTS:\n${formattedSearch}`;
  const researchMaxTokens = computeResearchMaxTokens(searchResultCount, formattedSearch);
  logger.debug("research AI token budget", {
    maxTokens: researchMaxTokens,
    hasSearchResults,
  });

  const rawResponse = await aiComplete(prompt, {
    maxTokens: researchMaxTokens,
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    temperature: 0.35,
  });
  const aiMs = Date.now() - aiStart;
  logger.debug("research AI analysis completed", { durationMs: aiMs, model: "research" });

  const defaultParsed = buildDefaultResearchData(tone, formattedSearch);

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
