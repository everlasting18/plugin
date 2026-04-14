import type { EditorOutput } from "../prompts/editor.ts";
import {
  EDITOR_GATE_MIN_H2_BY_LENGTH,
  EDITOR_GATE_MIN_WORDS_BY_LENGTH,
  isLongFormLength,
} from "./contentConfig.ts";

function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(content: string, pattern: RegExp): number {
  return content.match(pattern)?.length ?? 0;
}

export function needsEditorialReview(
  content: string,
  length: string,
  framework: string,
): { shouldReview: boolean; reasons: string[] } {
  const plainText = stripHtml(content);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const h1Count = countMatches(content, /<h1\b/gi);
  const h2Count = countMatches(content, /<h2\b/gi);
  const listCount = countMatches(content, /<(ul|ol)\b/gi);
  const faqHeadingCount = countMatches(
    content,
    /<h[23][^>]*>.*?(faq|câu hỏi thường gặp|giải đáp thắc mắc).*?<\/h[23]>/gis,
  );

  const reasons: string[] = [];

  if (h1Count !== 1) {
    reasons.push("Thiếu hoặc dư H1.");
  }

  if (wordCount < (EDITOR_GATE_MIN_WORDS_BY_LENGTH[length as keyof typeof EDITOR_GATE_MIN_WORDS_BY_LENGTH] || EDITOR_GATE_MIN_WORDS_BY_LENGTH.medium)) {
    reasons.push("Bài quá ngắn so với độ dài mục tiêu.");
  }

  if (h2Count < (EDITOR_GATE_MIN_H2_BY_LENGTH[length as keyof typeof EDITOR_GATE_MIN_H2_BY_LENGTH] || EDITOR_GATE_MIN_H2_BY_LENGTH.medium)) {
    reasons.push("Cấu trúc H2 còn mỏng.");
  }

  if (framework === "howto" && listCount === 0) {
    reasons.push("Framework yêu cầu danh sách nhưng draft chưa có list.");
  }

  if ((isLongFormLength(length) || framework === "eeat_skyscraper") && faqHeadingCount === 0) {
    reasons.push("Thiếu section FAQ cho bài dài/chuyên sâu.");
  }

  return {
    shouldReview: reasons.length > 0,
    reasons,
  };
}

export function buildSkippedEditorReview(summary?: string): EditorOutput {
  return {
    qualityScore: 8,
    seoScore: 8,
    engagementScore: 8,
    overallPass: true,
    strengths: [
      "Draft đã vượt qua kiểm tra cấu trúc cơ bản nên không cần editorial AI review.",
    ],
    issues: [],
    summary:
      summary ||
      "Bỏ qua editorial AI review vì draft đã đạt các rule kiểm tra cơ bản.",
  };
}
