import { config } from "../config.ts";
import { logger } from "../lib/logger.ts";
import { MAX_SEARCH_SNIPPET_CHARS } from "../agents/contentConfig.ts";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
}

const SEARCH_CACHE_TTL = 6 * 60 * 60 * 1000;
const searchCache = new Map<string, { expires: number; response: SearchResponse }>();

function getCachedSearch(query: string, count: number): SearchResponse | null {
  const key = `${query}::${count}`;
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    searchCache.delete(key);
    return null;
  }
  return entry.response;
}

function setCachedSearch(query: string, count: number, response: SearchResponse) {
  searchCache.set(`${query}::${count}`, {
    expires: Date.now() + SEARCH_CACHE_TTL,
    response,
  });
}

function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];

  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    const fallbackKey = `${result.title.trim().toLowerCase()}::${result.snippet.trim().slice(0, 120).toLowerCase()}`;
    const key = normalizedUrl || fallbackKey;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function truncateSnippet(snippet: string): string {
  const normalized = snippet.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_SEARCH_SNIPPET_CHARS) return normalized;
  return `${normalized.slice(0, MAX_SEARCH_SNIPPET_CHARS)}...`;
}

/**
 * Web search via Tavily API.
 * Returns top search results for a given query.
 */
export async function webSearch(query: string, count = 8): Promise<SearchResponse> {
  const apiKey = config.tavilyKey;
  const cached = getCachedSearch(query, count);
  if (cached) {
    logger.debug("web search cache hit", { query, count, totalResults: cached.totalResults });
    return cached;
  }

  if (!apiKey) {
    console.warn("[search] TAVILY_API_KEY not set, returning empty results");
    return { results: [], query, totalResults: 0 };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: count,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("[search] Tavily API key invalid or expired (401). Skipping web search. Add a valid TAVILY_API_KEY to enable research.");
      } else {
        console.warn(`[search] Tavily error: ${res.status}. Skipping web search.`);
      }
      return { results: [], query, totalResults: 0 };
    }

    const data = await res.json();

    const topResults = (data.results || []).slice(0, 5);
    logger.debug("web search results", {
      query,
      totalResults: data.results?.length || 0,
      sources: topResults.map((r: { title?: string; url?: string }) => ({ title: r.title, url: r.url })),
    });

    const response = {
      query,
      totalResults: data.results?.length || 0,
      results: dedupeResults((data.results || []).map((r: {
        title?: string;
        url?: string;
        content?: string;
      }) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: truncateSnippet(r.content || ""),
      }))),
    };
    setCachedSearch(query, count, response);
    return response;
  } catch (err) {
    console.error("[search] Failed:", err);
    return { results: [], query, totalResults: 0 };
  }
}

/**
 * Format search results as a readable string for LLM context.
 */
export function formatSearchResults(search: SearchResponse): string {
  if (!search.results.length) {
    return "Không tìm thấy kết quả web search.";
  }

  const lines = [
    `## Kết quả web search cho: "${search.query}"`,
    `Tổng: ${search.totalResults} kết quả\n`,
  ];

  for (const r of search.results) {
    lines.push(`### ${r.title}`);
    lines.push(`URL: ${r.url}`);
    lines.push(`Nội dung: ${truncateSnippet(r.snippet)}`);
    lines.push("");
  }

  return lines.join("\n");
}
