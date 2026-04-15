import {
  buildSkippedEditorReview,
  needsEditorialReview,
} from "../src/agents/editorGate.ts";

function makeWords(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index + 1}`).join(" ");
}

Deno.test("needsEditorialReview flags short content with missing structure", () => {
  const result = needsEditorialReview(
    "<h1>Tiêu đề</h1><p>Nội dung ngắn.</p>",
    "medium",
    "adaptive_hybrid",
  );

  if (!result.shouldReview) {
    throw new Error("Expected review to be required");
  }

  if (!result.reasons.includes("Bài quá ngắn so với độ dài mục tiêu.")) {
    throw new Error(`Expected short-content reason, got ${result.reasons.join(", ")}`);
  }

  if (!result.reasons.includes("Cấu trúc H2 còn mỏng.")) {
    throw new Error(`Expected H2 reason, got ${result.reasons.join(", ")}`);
  }

  if (!result.reasons.includes("Thiếu section FAQ cho bài dài/chuyên sâu.")) {
    throw new Error(`Expected FAQ reason, got ${result.reasons.join(", ")}`);
  }
});

Deno.test("needsEditorialReview passes well-structured medium draft", () => {
  const sections = [
    "<h1>Bài viết hoàn chỉnh</h1>",
    `<p>${makeWords(220)}</p>`,
    "<h2>Tổng quan</h2><p>" + makeWords(220) + "</p>",
    "<h2>Triển khai</h2><p>" + makeWords(220) + "</p><ul><li>Buoc 1</li><li>Buoc 2</li></ul>",
    "<h2>Đo lường</h2><p>" + makeWords(220) + "</p>",
    "<h2>FAQ</h2><p>" + makeWords(220) + "</p>",
  ];

  const result = needsEditorialReview(
    sections.join(""),
    "medium",
    "adaptive_hybrid",
  );

  if (result.shouldReview) {
    throw new Error(`Expected draft to pass gate, got ${result.reasons.join(", ")}`);
  }
});

Deno.test("needsEditorialReview enforces list structure for how-to framework", () => {
  const content = [
    "<h1>Hướng dẫn cấu hình</h1>",
    `<p>${makeWords(250)}</p>`,
    "<h2>Bước 1</h2>",
    `<p>${makeWords(250)}</p>`,
    "<h2>Bước 2</h2>",
    `<p>${makeWords(250)}</p>`,
    "<h2>FAQ</h2>",
    `<p>${makeWords(250)}</p>`,
  ].join("");

  const result = needsEditorialReview(content, "medium", "howto");

  if (!result.shouldReview) {
    throw new Error("Expected review to be required for how-to content without list");
  }

  if (!result.reasons.includes("Framework yêu cầu danh sách nhưng draft chưa có list.")) {
    throw new Error(`Expected how-to list reason, got ${result.reasons.join(", ")}`);
  }
});

Deno.test("buildSkippedEditorReview supports custom summary", () => {
  const result = buildSkippedEditorReview("Skip custom");

  if (!result.overallPass) {
    throw new Error("Expected skipped review to pass");
  }

  if (result.summary !== "Skip custom") {
    throw new Error(`Expected custom summary, got ${result.summary}`);
  }

  if (result.issues.length !== 0) {
    throw new Error("Expected skipped review to have no issues");
  }
});
