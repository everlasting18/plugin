type FrameworkKind =
  | "adaptive_hybrid"
  | "aida"
  | "pas"
  | "eeat_skyscraper"
  | "howto";

type IntentKind =
  | "how_to"
  | "listicle"
  | "comparison"
  | "transactional"
  | "story"
  | "informational";

type ContentMode =
  | "tutorial"
  | "decision"
  | "collection"
  | "conversion"
  | "narrative"
  | "authority";

export interface FrameworkPlanInput {
  keyword: string;
  requestedFramework?: string;
  audience?: string;
  length?: string;
  niche?: string;
}

export interface FrameworkPlan {
  framework: FrameworkKind;
  intent: IntentKind;
  mode: ContentMode;
  source: "user" | "auto";
  reason: string;
  strategyHint: string;
}

const AUTO_FRAMEWORK_VALUES = new Set(["", "none", "auto", "default"]);
const EXPLICIT_FRAMEWORKS = new Set<FrameworkKind>([
  "adaptive_hybrid",
  "aida",
  "pas",
  "eeat_skyscraper",
  "howto",
]);

function normalizeRequestedFramework(raw: string): FrameworkKind | "auto" {
  const value = raw.trim().toLowerCase();
  if (AUTO_FRAMEWORK_VALUES.has(value)) return "auto";

  if (value === "app_pas") return "pas";
  if (value === "hero" || value === "listicle") return "adaptive_hybrid";

  if (EXPLICIT_FRAMEWORKS.has(value as FrameworkKind)) {
    return value as FrameworkKind;
  }

  return "auto";
}

function detectIntent(keyword: string): IntentKind {
  const text = keyword.toLowerCase();
  if (/\b(cách|hướng dẫn|how to|tutorial|làm sao|step[- ]?by[- ]?step|từng bước|quy trình)\b/.test(text)) {
    return "how_to";
  }
  if (/\b(vs|so sánh|khác nhau|nên chọn|tốt hơn|review|đánh giá)\b/.test(text)) {
    return "comparison";
  }
  if (/\b(top|best|checklist|danh sách|list|mẹo|tips|ý tưởng)\b/.test(text)) {
    return "listicle";
  }
  if (/\b(giá|pricing|báo giá|chi phí|mua|thuê|dịch vụ|roi|chuyển đổi)\b/.test(text)) {
    return "transactional";
  }
  if (/\b(câu chuyện|hành trình|kinh nghiệm|thất bại|thành công|case study)\b/.test(text)) {
    return "story";
  }
  return "informational";
}

function buildIntentHint(intent: IntentKind): string {
  switch (intent) {
    case "how_to":
      return "Intent chính: hướng dẫn thao tác. Ưu tiên các bước tuần tự, checkpoint và lỗi thường gặp.";
    case "comparison":
      return "Intent chính: so sánh để ra quyết định. Bắt buộc nêu trade-off, use-case phù hợp và kết luận theo từng tình huống.";
    case "listicle":
      return "Intent chính: tổng hợp danh sách. Mỗi mục cần tiêu chí rõ, ví dụ cụ thể và khi nào nên/không nên áp dụng.";
    case "transactional":
      return "Intent chính: cân nhắc mua dịch vụ/sản phẩm. Nhấn pain point, chi phí cơ hội, và bước hành động tiếp theo.";
    case "story":
      return "Intent chính: kể chuyện để truyền tải bài học. Dẫn dắt theo bối cảnh -> xung đột -> giải pháp -> kết quả.";
    default:
      return "Intent chính: cung cấp kiến thức tin cậy. Ưu tiên tính chính xác, chiều sâu và khả năng áp dụng thực tế.";
  }
}

function mapIntentToMode(intent: IntentKind): ContentMode {
  switch (intent) {
    case "how_to":
      return "tutorial";
    case "comparison":
      return "decision";
    case "listicle":
      return "collection";
    case "transactional":
      return "conversion";
    case "story":
      return "narrative";
    default:
      return "authority";
  }
}

function buildModeHint(mode: ContentMode): string {
  switch (mode) {
    case "tutorial":
      return "Mode: Tutorial. Ưu tiên tính hướng dẫn, trình tự rõ và khả năng áp dụng ngay.";
    case "decision":
      return "Mode: Decision support. Ưu tiên ma trận so sánh, trade-off và khuyến nghị theo ngữ cảnh.";
    case "collection":
      return "Mode: Collection/List. Ưu tiên tiêu chí chọn lọc rõ, tránh liệt kê hời hợt.";
    case "conversion":
      return "Mode: Conversion-focused. Ưu tiên pain-point, giá trị kinh doanh và bước hành động cụ thể.";
    case "narrative":
      return "Mode: Narrative. Ưu tiên storytelling có bài học và tính ứng dụng, tránh drama rỗng.";
    default:
      return "Mode: Authority evergreen. Ưu tiên chiều sâu, độ tin cậy và góc nhìn chuyên gia.";
  }
}

function frameworkToHint(framework: FrameworkKind): string {
  switch (framework) {
    case "adaptive_hybrid":
      return "Khung viết: ADAPTIVE HYBRID. Kết hợp Hook + E-E-A-T + hướng dẫn thực hành + quyết định hành động. Dùng linh hoạt theo intent thay vì ép một công thức cứng.";
    case "howto":
      return "Khung viết: HOW-TO. Mỗi H2 tương ứng một giai đoạn rõ ràng; có checklist tổng kết cuối bài.";
    case "eeat_skyscraper":
      return "Khung viết: E-E-A-T + SKYSCRAPER. Ưu tiên lập luận sâu, nguồn đáng tin, giới hạn áp dụng và phản biện.";
    case "pas":
      return "Khung viết: PAS. Đào sâu vấn đề và hệ quả trước khi đưa giải pháp rõ what/how/why.";
    case "aida":
      return "Khung viết: AIDA. Hook mạnh, xây interest bằng insight, tăng desire bằng lợi ích cụ thể, rồi CTA rõ.";
  }
}

function buildUniversalLayerHint(
  keyword: string,
  audience = "general",
  length = "medium",
  niche?: string,
): string {
  const depthHint = length === "short"
    ? "Độ sâu: ưu tiên cô đọng, 3-4 ý lớn, tránh lan man."
    : length === "medium"
    ? "Độ sâu: cân bằng giữa insight và tính thực thi."
    : "Độ sâu: triển khai sâu theo từng tầng (nguyên tắc -> ví dụ -> checklist -> lỗi thường gặp).";

  return [
    "Lớp framework bắt buộc áp dụng cho mọi nội dung:",
    "- Lớp 1 (Intent Fit): bám sát câu hỏi thực sự phía sau keyword, không lệch chủ đề.",
    "- Lớp 2 (Credibility): ưu tiên số liệu, case, ví dụ cụ thể; thiếu data thì nêu nguyên tắc thực chiến.",
    "- Lớp 3 (Readability): đoạn ngắn, tiêu đề rõ, xen kẽ list/bảng khi hữu ích.",
    "- Lớp 4 (Actionability): mỗi section đều có takeaway hoặc bước làm tiếp theo.",
    "- Lớp 5 (SEO Natural): dùng semantic variety, không nhồi keyword.",
    `Audience fit: ${audience}.`,
    niche ? `Niche fit: ${niche}.` : "Niche fit: suy luận từ keyword.",
    depthHint,
    `Keyword trọng tâm: ${keyword}.`,
  ].join("\n");
}

function scoreAutoFramework(
  keyword: string,
  intent: IntentKind,
  audience = "general",
  length = "medium",
): { framework: FrameworkKind; reason: string } {
  const text = keyword.toLowerCase();
  const scores: Record<FrameworkKind, number> = {
    adaptive_hybrid: 3,
    aida: 1,
    pas: 1,
    eeat_skyscraper: 2,
    howto: 0,
  };

  switch (intent) {
    case "how_to":
      scores.howto += 8;
      scores.adaptive_hybrid += 3;
      scores.eeat_skyscraper += 2;
      break;
    case "comparison":
      scores.eeat_skyscraper += 8;
      scores.adaptive_hybrid += 3;
      break;
    case "listicle":
      scores.adaptive_hybrid += 5;
      scores.howto += 2;
      break;
    case "transactional":
      scores.pas += 7;
      scores.aida += 3;
      scores.adaptive_hybrid += 3;
      break;
    case "story":
      scores.adaptive_hybrid += 6;
      scores.aida += 2;
      break;
    default:
      scores.eeat_skyscraper += 3;
      scores.adaptive_hybrid += 4;
      scores.pas += 2;
      break;
  }

  if (audience === "beginner") {
    scores.howto += 2;
  } else if (audience === "professional") {
    scores.eeat_skyscraper += 2;
    scores.pas += 1;
  }

  if (length === "long" || length === "extra_long") {
    scores.eeat_skyscraper += 2;
    scores.howto += 1;
    scores.adaptive_hybrid += 1;
  } else if (length === "short") {
    scores.aida += 2;
    scores.pas += 1;
  }

  if (/\b(mẫu|template|ví dụ|example)\b/.test(text)) {
    scores.adaptive_hybrid += 2;
    scores.howto += 1;
  }

  if (/\b(chiến lược|strategy|framework|seo|b2b)\b/.test(text)) {
    scores.eeat_skyscraper += 2;
    scores.adaptive_hybrid += 2;
  }

  if (/\b(full guide|ultimate|toàn tập|from zero|cơ bản đến nâng cao)\b/.test(text)) {
    scores.adaptive_hybrid += 2;
    scores.eeat_skyscraper += 1;
  }

  const tieBreaker: FrameworkKind[] = [
    "adaptive_hybrid",
    "eeat_skyscraper",
    "howto",
    "pas",
    "aida",
  ];

  const framework = tieBreaker.reduce((best, current) => {
    if (scores[current] > scores[best]) return current;
    return best;
  }, tieBreaker[0]);

  return {
    framework,
    reason: `auto chọn theo intent=${intent}, audience=${audience}, length=${length}`,
  };
}

export function resolveFrameworkPlan(input: FrameworkPlanInput): FrameworkPlan {
  const normalizedRequested = normalizeRequestedFramework(input.requestedFramework || "");
  const intent = detectIntent(input.keyword);
  const mode = mapIntentToMode(intent);
  const universalLayer = buildUniversalLayerHint(
    input.keyword,
    input.audience,
    input.length,
    input.niche,
  );

  if (normalizedRequested !== "auto") {
    return {
      framework: normalizedRequested,
      intent,
      mode,
      source: "user",
      reason: `user chọn framework=${normalizedRequested}`,
      strategyHint: [
        buildIntentHint(intent),
        buildModeHint(mode),
        frameworkToHint(normalizedRequested),
        universalLayer,
      ].join("\n"),
    };
  }

  const { framework, reason } = scoreAutoFramework(
    input.keyword,
    intent,
    input.audience,
    input.length,
  );

  return {
    framework,
    intent,
    mode,
    source: "auto",
    reason: `${reason}, mode=${mode}`,
    strategyHint: [
      buildIntentHint(intent),
      buildModeHint(mode),
      frameworkToHint(framework),
      universalLayer,
    ].join("\n"),
  };
}
