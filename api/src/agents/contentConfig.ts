export const CONTENT_TONES = [
  "professional",
  "friendly",
  "persuasive",
  "simple",
  "storytelling",
] as const;

export const CONTENT_AUDIENCES = [
  "general",
  "beginner",
  "professional",
] as const;

export const CONTENT_LANGUAGES = [
  "vi",
  "en",
] as const;

export const CONTENT_LENGTHS = [
  "short",
  "medium",
  "long",
  "extra_long",
] as const;

export const CONTENT_FRAMEWORKS = [
  "auto",
  "adaptive_hybrid",
  "eeat_skyscraper",
  "howto",
  "pas",
  "aida",
] as const;

export type ContentTone = typeof CONTENT_TONES[number];
export type ContentAudience = typeof CONTENT_AUDIENCES[number];
export type ContentLength = typeof CONTENT_LENGTHS[number];
export type ContentFramework = typeof CONTENT_FRAMEWORKS[number];
export type ContentLanguage = typeof CONTENT_LANGUAGES[number];

export const DEFAULT_CONTENT_TONE: ContentTone = "professional";
export const DEFAULT_CONTENT_AUDIENCE: ContentAudience = "general";
export const DEFAULT_CONTENT_LENGTH: ContentLength = "medium";
export const DEFAULT_CONTENT_FRAMEWORK: ContentFramework = "auto";
export const DEFAULT_CONTENT_LANGUAGE: ContentLanguage = "vi";
export const DEFAULT_WEB_SEARCH = true;
export const MAX_REWRITE_ATTEMPTS = 1;
export const MAX_EDITOR_REVIEWS = 2;
export const RESEARCH_MAX_TOKENS = 1600;
export const RESEARCH_MIN_TOKENS = 1100;
export const RESEARCH_TOKENS_PER_RESULT = 60;
export const RESEARCH_TOKENS_PER_1K_CHARS = 120;
export const MAX_SEARCH_RESULTS_PER_QUERY = 4;
export const MAX_MERGED_SEARCH_RESULTS = 10;
export const MAX_SEARCH_RESULTS_PER_DOMAIN = 2;
export const MAX_SEARCH_SNIPPET_CHARS = 420;

export const WORD_TARGET_BY_LENGTH: Record<ContentLength, number> = {
  short: 600,
  medium: 1400,
  long: 2800,
  extra_long: 3500,
};

export const WRITER_MAX_TOKENS_BY_LENGTH: Record<ContentLength, number> = {
  short: 1500,
  medium: 3500,
  long: 7000,
  extra_long: 9000,
};

export const EDITOR_GATE_MIN_WORDS_BY_LENGTH: Record<ContentLength, number> = {
  short: 350,
  medium: 800,
  long: 1600,
  extra_long: 2200,
};

export const EDITOR_GATE_MIN_H2_BY_LENGTH: Record<ContentLength, number> = {
  short: 2,
  medium: 3,
  long: 4,
  extra_long: 5,
};

export function isLongFormLength(length: string): boolean {
  return length === "medium" || length === "long" || length === "extra_long";
}

export function normalizeAudience(raw: string): ContentAudience {
  const value = raw.trim().toLowerCase();
  if (value === "business") return "professional";
  if (value === "beginner") return "beginner";
  if (value === "professional") return "professional";
  return "general";
}

export function normalizeLanguage(raw: string): ContentLanguage {
  const value = raw.trim().toLowerCase();
  if (value === "english") return "en";
  if (value === "vietnamese") return "vi";
  if (value === "en") return "en";
  return "vi";
}
