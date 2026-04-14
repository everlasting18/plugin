import type { SearchResult } from "../tools/search.ts";
import { MAX_SEARCH_RESULTS_PER_DOMAIN } from "./contentConfig.ts";

export function keywordNeedsFreshStats(keyword: string): boolean {
  const lower = keyword.toLowerCase();
  return /\b(20\d{2}|mới nhất|latest|today|today's|2024|2025|2026|xu hướng|trend|chi phí|giá|price|pricing|so sánh|compare|review)\b/.test(
    lower,
  );
}

export function buildSearchQueries(
  keyword: string,
  audience: string,
  framework?: string,
  niche?: string,
): string[] {
  const base = keyword.trim();
  const normalizedFramework = framework?.trim().toLowerCase();
  const frameworkQuery = normalizedFramework && normalizedFramework !== "none"
    ? buildFrameworkAwareQuery(base, normalizedFramework)
    : null;
  const queries = [
    base,
    frameworkQuery || `${base} best practices`,
  ];

  if (keywordNeedsFreshStats(base)) {
    queries.push(`${base} statistics 2025 2026`);
  } else if (audience === "beginner") {
    queries.push(`${base} common mistakes beginner guide`);
  } else {
    queries.push(`${base} common mistakes`);
  }

  if (niche?.trim()) {
    queries.push(`${base} ${niche.trim()} examples`);
  }

  return Array.from(new Set(queries)).slice(0, 4);
}

function buildFrameworkAwareQuery(keyword: string, framework: string): string {
  switch (framework) {
    case "aida":
      return `${keyword} attention interest desire action examples`;
    case "pas":
    case "app_pas":
      return `${keyword} problem agitate solution examples`;
    case "eeat_skyscraper":
      return `${keyword} E-E-A-T expert source examples`;
    case "howto":
      return `${keyword} step by step tutorial examples`;
    case "adaptive_hybrid":
      return `${keyword} best practices examples mistakes checklist`;
    default:
      return `${keyword} best practices`;
  }
}

export function dedupeCombinedResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];

  for (const result of results) {
    const normalizedUrl = result.url.trim().toLowerCase().replace(/\/+$/, "");
    const key = normalizedUrl || `${result.title}::${result.snippet.slice(0, 80)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function prioritizeDomainDiversity(
  results: SearchResult[],
  maxPerDomain = MAX_SEARCH_RESULTS_PER_DOMAIN,
): SearchResult[] {
  if (maxPerDomain <= 0) return results;

  const seenByDomain = new Map<string, number>();
  const prioritized: SearchResult[] = [];
  const overflow: SearchResult[] = [];

  for (const result of results) {
    const domain = extractDomain(result.url);
    if (!domain) {
      prioritized.push(result);
      continue;
    }

    const current = seenByDomain.get(domain) || 0;
    if (current < maxPerDomain) {
      seenByDomain.set(domain, current + 1);
      prioritized.push(result);
    } else {
      overflow.push(result);
    }
  }

  return [...prioritized, ...overflow];
}
