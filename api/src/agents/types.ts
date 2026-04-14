import type {
  ContentAudience,
  ContentFramework,
  ContentLanguage,
  ContentLength,
  ContentTone,
} from "./contentConfig.ts";

export interface EditorIssue {
  severity: string;
  location: string;
  issue: string;
  fix: string;
}

export interface EditorReviewSummary {
  qualityScore: number;
  seoScore: number;
  engagementScore: number;
  overallPass: boolean;
  issues: EditorIssue[];
  summary: string;
}

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

export interface ResearchSummary {
  stats: string[];
  caseStudies: string[];
  painPoints: string[];
}

export interface PostResult {
  content: string;
  title: string;
  revisionLoops: number;
  editorReview: EditorReviewSummary;
}

export interface OrchestratorInput {
  keyword: string;
  tone: ContentTone | string;
  count: number;
  audience: ContentAudience | string;
  language?: ContentLanguage | string;
  framework: ContentFramework | string;
  niche?: string;
  length?: ContentLength | string;
  webSearch?: boolean;
}

export interface OrchestratorOutput {
  posts: PostResult[];
  research: ResearchData;
}

export interface RevisionLoopResult {
  content: string;
  title: string;
  loops: number;
  review: EditorReviewSummary;
}
