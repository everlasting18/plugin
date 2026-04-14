// ============================================================
// Writer Agent — Viết content dựa trên research + parameters
// ============================================================

import type { ResearchData } from "../agents/types.ts";
import {
  DEFAULT_CONTENT_AUDIENCE,
  DEFAULT_CONTENT_TONE,
  WORD_TARGET_BY_LENGTH,
  WRITER_MAX_TOKENS_BY_LENGTH,
} from "../agents/contentConfig.ts";

export interface WriterInput {
  keyword: string;
  tone: string;
  length: string;
  audience: string;
  language: string;
  framework: string;
  niche?: string;
  strategyHint?: string;
  research: Pick<
    ResearchData,
    | "stats"
    | "trends"
    | "caseStudies"
    | "commonMistakes"
    | "uniqueAngles"
    | "painPoints"
    | "expertQuotes"
    | "suggestedOutline"
  >;
  editorFeedback?: string; // nếu đang viết lại theo feedback
}

const toneMap: Record<string, string> = {
  professional: `chuyên nghiệp và có chiều sâu:
    - Dùng dữ liệu, dẫn chứng cụ thể thay vì nhận định chung
    - Câu văn chắc chắn, tránh rào đón không cần thiết
    - Thể hiện expertise qua cách phân tích, không qua tính từ hoa mỹ`,

  friendly: `thân thiện và gần gũi:
    - Viết như đang trò chuyện 1:1, dùng "bạn" và "mình/tôi"
    - Xen kẽ câu hỏi tu từ để tạo tương tác
    - Dùng ví dụ đời thường, so sánh dễ hình dung`,

  persuasive: `thuyết phục và có sức hút:
    - Mỗi đoạn phải khiến người đọc muốn đọc đoạn tiếp
    - Dùng social proof, số liệu, contrast (trước/sau)
    - Tạo urgency tự nhiên qua chi phí cơ hội`,

  simple: `đơn giản và rõ ràng:
    - Giải thích mọi thuật ngữ ngay lần đầu xuất hiện
    - Câu tối đa 20 từ, đoạn tối đa 3 câu
    - Dùng ví dụ cụ thể cho mỗi khái niệm trừu tượng`,

  storytelling: `kể chuyện cuốn hút:
    - Mở bằng tình huống/nhân vật cụ thể, không mở bằng định nghĩa
    - Xây dựng tension: vấn đề → thử sai → bước ngoặt → kết quả
    - Kết bài quay lại câu chuyện mở đầu (callback)`,
};

const audienceMap: Record<string, string> = {
  general: `độc giả phổ thông:
    - Giải thích rõ nhưng không dạy đời
    - Ưu tiên ví dụ gần gũi và tính ứng dụng ngay`,

  professional: `người làm nghề / chuyên gia:
    - Đi thẳng vào vấn đề, tránh kiến thức nhập môn dài dòng
    - Ưu tiên phân tích, edge case, trade-off, ví dụ thực chiến`,

  beginner: `người mới bắt đầu:
    - Giải thích khái niệm ngay lần đầu xuất hiện
    - Mỗi phần nên trả lời cả "làm gì" và "vì sao"`,
};

const frameworkMap: Record<string, string> = {
  adaptive_hybrid: `## FRAMEWORK: ADAPTIVE HYBRID (UNIVERSAL)
- Mở bài: hook cụ thể + bối cảnh + promise rõ + preview nội dung chính
- Thân bài theo tầng: insight cốt lõi -> ví dụ/case -> cách áp dụng -> lỗi cần tránh
- Với intent quyết định: thêm so sánh/trade-off và khuyến nghị theo tình huống
- Với intent hướng dẫn: thêm checklist/bước làm + checkpoint
- Kết bài: tóm tắt quyết định hoặc next step rõ ràng`,

  aida: `## FRAMEWORK: AIDA
- Attention: hook mạnh ngay 2 câu đầu
- Interest: giải thích bối cảnh và insight người đọc cần biết
- Desire: cho thấy lợi ích, ví dụ, before/after, case ngắn
- Action: chốt bằng hành động tiếp theo rõ ràng`,

  pas: `## FRAMEWORK: PAS
- Mở bằng vấn đề cụ thể, dùng ngôn ngữ người đọc
- Đào sâu hậu quả thực tế nếu xử lý sai hoặc chậm
- Phần giải pháp phải là what -> how -> why, không nói chung chung`,

  eeat_skyscraper: `## FRAMEWORK: E-E-A-T + SKYSCRAPER
- Viết bài như tài liệu tham khảo đáng tin cậy nhất cho keyword
- Ưu tiên kinh nghiệm thực tế, ví dụ, giới hạn áp dụng, sai lầm thường gặp
- Bao quát đầy đủ nhưng vẫn mạch lạc; tránh dài mà loãng`,

  howto: `## FRAMEWORK: HOW-TO
- Mở bài nêu rõ ai nên đọc, kết quả đạt được và điều kiện cần
- Thân bài chia bước rõ ràng: mục tiêu -> cách làm -> lưu ý -> checkpoint
- Cuối bài có checklist tóm tắt và lỗi thường gặp`,
};

export function writerPrompt(input: WriterInput): string {
  const {
    keyword, tone, length, audience, language, framework,
    niche, research, strategyHint, editorFeedback,
  } = input;

  const toneVi = toneMap[tone] || toneMap[DEFAULT_CONTENT_TONE];
  const audienceVi = audienceMap[audience] || audienceMap[DEFAULT_CONTENT_AUDIENCE];
  const outputLanguage = language === "en" ? "English" : "Tiếng Việt";
  const words = WORD_TARGET_BY_LENGTH[length as keyof typeof WORD_TARGET_BY_LENGTH] || WORD_TARGET_BY_LENGTH.medium;

  // Safe research access — defensive fallbacks
  const safeStats = Array.isArray(research?.stats) ? research.stats : [];
  const safeTrends = Array.isArray(research?.trends) ? research.trends : [];
  const safeCases = Array.isArray(research?.caseStudies) ? research.caseStudies : [];
  const safeMistakes = Array.isArray(research?.commonMistakes) ? research.commonMistakes : [];
  const safeAngles = Array.isArray(research?.uniqueAngles) ? research.uniqueAngles : [];
  const safePain = Array.isArray(research?.painPoints) ? research.painPoints : [];
  const safeQuotes = Array.isArray(research?.expertQuotes) ? research.expertQuotes : [];
  const safeH2 = Array.isArray(research?.suggestedOutline?.h2sections) ? research.suggestedOutline.h2sections : [];
  const safeFaq = Array.isArray(research?.suggestedOutline?.faqQuestions) ? research.suggestedOutline.faqQuestions : [];

  const fw = framework && framework !== "none" && frameworkMap[framework]
    ? frameworkMap[framework]
    : `## FRAMEWORK: BLOG CHUYÊN NGHIỆP MẶC ĐỊNH
- Mở bài: hook cụ thể -> bối cảnh -> promise -> preview
- Thân bài: ${safeH2.map(s => `"${s}"`).join(", ") || "4-6 H2 sections có logic rõ ràng"}
- Ưu tiên checklist, bảng, ví dụ hoặc FAQ khi thực sự hữu ích
- Kết bài: tổng hợp takeaway + hành động tiếp theo`;

  const isRevision = !!editorFeedback;

  const roleBlock = isRevision
    ? `# ROLE
Bạn là Senior Blog Editor. Nhiệm vụ của bạn là viết lại bài để bài trông sắc hơn, chuyên nghiệp hơn và đúng feedback hơn.
Bạn PHẢI áp dụng toàn bộ feedback bên dưới nhưng vẫn giữ bài tự nhiên, không để lộ dấu vết "đang sửa theo checklist".

# EDITORIAL FEEDBACK CẦN ÁP DỤNG:
${editorFeedback}

# YÊU CẦU BẮT BUỘC:
- Giữ nguyên H1 và các H2 chính nếu feedback không yêu cầu đổi
- Không trả lời dạng note hay giải thích
- Output phải là bài hoàn chỉnh, sẵn sàng publish`
    : `# ROLE
Bạn là Senior Blog Writer cho WordPress.
Bạn viết bài blog chuyên nghiệp, đọc tự nhiên, có chiều sâu, có góc nhìn biên tập, và tránh hoàn toàn giọng văn AI sáo rỗng.
Mục tiêu là tạo ra bài có thể publish ngay sau khi biên tập nhẹ.`;

  const researchBlock = `
# RESEARCH INPUT
Pain points:
${safePain.map(p => `- ${p}`).join("\n") || "- Tự suy ra pain point thực tế từ keyword"}

Số liệu / facts:
${safeStats.map(s => `- ${s}`).join("\n") || "- Không có số liệu chắc chắn; không được bịa số liệu"}

Case studies / ví dụ:
${safeCases.map(c => `- ${c}`).join("\n") || "- Nếu không có case cụ thể, hãy dùng ví dụ thực tế nhưng không bịa thương hiệu/số liệu"}

Sai lầm phổ biến:
${safeMistakes.map(m => `- ${m}`).join("\n") || "- Tự nêu 2-4 sai lầm phổ biến nhất"}

Góc nhìn khác biệt:
${safeAngles.map(a => `- ${a}`).join("\n") || "- Tự chọn một angle hữu ích, cụ thể, ít sáo rỗng"}

Xu hướng:
${safeTrends.map(t => `- ${t}`).join("\n") || "- Chỉ đề cập xu hướng nếu thực sự liên quan"}

${safeQuotes.length ? `Trích dẫn chuyên gia:\n${safeQuotes.map(q => `- ${q}`).join("\n")}` : ""}

Outline gợi ý:
${safeH2.map(h2 => `- ${h2}`).join("\n") || "- Tự lập outline 4-6 H2 trước khi viết"}

FAQ gợi ý:
${safeFaq.map(faq => `- ${faq}`).join("\n") || "- Tự thêm FAQ nếu phù hợp với intent"}
`;

  const taskBlock = isRevision
    ? `# NHIỆM VỤ
Viết lại bài blog hoàn chỉnh bằng ${outputLanguage} cho: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Độ dài mục tiêu: ~${words} từ`
    : `# NHIỆM VỤ
Viết bài blog hoàn chỉnh bằng ${outputLanguage} cho: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Độ dài mục tiêu: ~${words} từ
${niche ? `- NICHE: ${niche}` : ""}`;

  const planningBlock = `
# TRƯỚC KHI VIẾT, HÃY TỰ LÀM THẦM 4 VIỆC NÀY
1. Xác định search intent chính của keyword.
2. Chọn một angle rõ ràng cho bài thay vì cover lan man.
3. Lập outline 4-6 H2 theo logic đọc mượt.
4. Chỉ sau đó mới viết bài hoàn chỉnh.

KHÔNG in ra phần suy nghĩ, brief, outline nháp hay reasoning.
Chỉ in ra bài hoàn chỉnh.
`;
  const strategyBlock = strategyHint?.trim()
    ? `
# CHIẾN LƯỢC ƯU TIÊN CHO KEYWORD NÀY
${strategyHint}
`
    : "";

  return `
${roleBlock}

${strategyBlock}

${researchBlock}

${taskBlock}

${planningBlock}

${fw}

# QUY TẮC BẮT BUỘC
- Toàn bộ output phải dùng ${outputLanguage}.
- H1 đúng 1 lần. Thân bài chỉ dùng H2/H3.
- Mỗi H2 phải trả lời một câu hỏi hoặc một ý lớn riêng, không lặp ý bằng cách diễn đạt khác.
- Mở bài không được bắt đầu bằng định nghĩa kiểu từ điển hoặc câu sáo rỗng.
- Ưu tiên câu cụ thể, ví dụ cụ thể, checklist cụ thể hơn là lời khuyên chung.
- Nếu không chắc fact hoặc số liệu, đừng bịa. Hãy viết theo nguyên tắc thực hành thay vì bơm data giả.
- Không chèn placeholder kiểu [LINK:], [INTERNAL LINK], [REF] vào output cuối.
- Nếu phù hợp với intent, thêm FAQ ngắn 3-5 câu ở cuối bài.
- Kết bài phải có next step hoặc CTA mềm, không kết cụt.

# DANH SÁCH CẤM
- "Trong thời đại ngày nay"
- "Như chúng ta đã biết"
- "Không thể phủ nhận rằng"
- "Hãy cùng tìm hiểu"
- Mở bài bằng "${keyword} là..."
- Lặp nguyên keyword quá gượng trong các câu liên tiếp

# SEO THỰC DỤNG
- Từ khóa chính "${keyword}" cần xuất hiện tự nhiên trong H1, đoạn đầu, ít nhất một H2 và phần kết.
- Không nhồi keyword. Ưu tiên semantic variety và ngôn ngữ tự nhiên.
- Nếu bài cần featured snippet, chèn một đoạn trả lời trực tiếp 40-60 từ hoặc một list ngắn rõ ràng.

# WORDPRESS GUTENBERG OUTPUT
Trả về HTML Gutenberg blocks. KHÔNG Markdown. KHÔNG preamble.
Mỗi block comment mở phải có block comment đóng đúng loại.
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Tiêu đề</h1>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Đoạn văn...</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Section</h2>
<!-- /wp:heading -->
<!-- wp:list -->
<ul class="wp-block-list"><li>Ý quan trọng</li></ul>
<!-- /wp:list -->
<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>Trích dẫn</p></blockquote>
<!-- /wp:quote -->
<!-- wp:table -->
<figure class="wp-block-table"><table><thead><tr><th>Tiêu chí</th><th>Chi tiết</th></tr></thead><tbody><tr><td>Mục</td><td>Nội dung</td></tr></tbody></table></figure>
<!-- /wp:table -->
`.trim();
}

export function writerMaxTokens(length: string): number {
  return WRITER_MAX_TOKENS_BY_LENGTH[length as keyof typeof WRITER_MAX_TOKENS_BY_LENGTH] || WRITER_MAX_TOKENS_BY_LENGTH.medium;
}
