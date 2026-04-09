// ============================================================
// Writer Agent — Viết content dựa trên research + parameters
// ============================================================

export interface WriterInput {
  keyword: string;
  tone: string;
  length: string;
  audience: string;
  framework: string;
  niche?: string;
  research: {
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
    };
  };
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

const frameworkMap: Record<string, string> = {
  app_pas: `## BỐ CỤC: APP (mở bài) + PAS (thân bài)
MỞ BÀI — APP (100–150 từ):
  AGREE: Mở bằng 1 sự thật/trải nghiệm mà người đọc gật đầu đồng ý.
  PROMISE: Hứa cụ thể bài này sẽ giúp được gì.
  PREVIEW: Tóm tắt nhanh 3–4 điểm chính sẽ cover.
THÂN BÀI — Mỗi H2 theo PAS:
  PROBLEM: Mở section bằng vấn đề cụ thể.
  AGITATE: 1–2 câu nêu hậu quả nếu bỏ qua.
  SOLUTION: Giải pháp chi tiết, actionable.
KẾT BÀI (80–120 từ): Tóm tắt takeaway + CTA mềm + [INTERNAL LINK].`,

  aida: `## BỐ CỤC: AIDA
ATTENTION (80–120 từ): Hook cực mạnh — số liệu gây sốc hoặc câu hỏi đảo ngược.
INTEREST (40% content): Đào sâu vấn đề với data, insight, góc nhìn mới.
DESIRE (40% content): Trình bày giải pháp với case study, before/after.
ACTION (60–100 từ): CTA duy nhất, cụ thể, có lý do hành động ngay.`,

  pas: `## BỐ CỤC: PAS
PROBLEM (20%): Mô tả vấn đề bằng đúng ngôn ngữ người đọc.
AGITATE (30%): Phóng đại hệ quả dây chuyền.
SOLUTION (50%): Giải pháp từng bước — what → how → why. Case study cho bước quan trọng nhất.`,

  eeat_skyscraper: `## BỐ CỤC: E-E-A-T + Skyscraper
MỤC TIÊU: Viết bài TOÀN DIỆN NHẤT cho keyword này.
E-E-A-T: EXPERIENCE (first-person), EXPERTISE (dẫn nguồn uy tín), AUTHORITATIVENESS (bao quát), TRUSTWORTHINESS (thừa nhận giới hạn).
SKYSCRAPER: Nhiều data hơn, cập nhật hơn, đầy đủ hơn, thực tế hơn bài đang rank.
CẤU TRÚC: H1 → Intro inverted pyramid → 6–10 H2 → FAQ → Nguồn tham khảo → Kết.`,

  hero: `## BỐ CỤC: Hero's Journey
THẾ GIỚI BÌNH THƯỜNG (15%): Mô tả thực trạng, pain point hàng ngày.
LỜI KÊU GỌI (15%): Catalyst khiến không thể ở yên.
THỬ THÁCH & MENTOR (50%): Từng thử thách + bài học cụ thể. Mentor = kiến thức/công cụ.
BIẾN ĐỔI (20%): Kết quả cụ thể, đo lường được. CTA.`,
};

const wordCount: Record<string, number> = {
  short: 600,
  medium: 1400,
  long: 2800,
  extra_long: 3500,
};

export function writerPrompt(input: WriterInput): string {
  const {
    keyword, tone, length, audience, framework,
    niche, research, editorFeedback,
  } = input;

  const toneVi = toneMap[tone] || toneMap.professional;
  const words = wordCount[length] || 1400;

  // Safe research access — defensive fallbacks
  const safeStats = Array.isArray(research?.stats) ? research.stats : [];
  const safeTrends = Array.isArray(research?.trends) ? research.trends : [];
  const safeCases = Array.isArray(research?.caseStudies) ? research.caseStudies : [];
  const safeMistakes = Array.isArray(research?.commonMistakes) ? research.commonMistakes : [];
  const safeAngles = Array.isArray(research?.uniqueAngles) ? research.uniqueAngles : [];
  const safePain = Array.isArray(research?.painPoints) ? research.painPoints : [];
  const safeQuotes = Array.isArray(research?.expertQuotes) ? research.expertQuotes : [];
  const safeH2 = Array.isArray(research?.suggestedOutline?.h2sections) ? research.suggestedOutline.h2sections : [];

  const fw = framework && framework !== "none" && frameworkMap[framework]
    ? frameworkMap[framework]
    : `## BỐ CỤC MẶC ĐỊNH
- Mở bài (100–150 từ): Hook → Pain point → Promise → Preview
- Thân bài: ${safeH2.map(s => `"${s}"`).join(", ") || "5-7 H2 sections"}
- FAQ: 3–5 câu hỏi thường gặp
- Kết bài (80–120 từ): Tóm tắt + CTA`;

  const isRevision = !!editorFeedback;

  const roleBlock = isRevision
    ? `# ROLE
Bạn là Senior Content Editor — viết lại bài dựa trên editorial feedback cụ thể.
Bạn PHẢI áp dụng TẤT CẢ feedback bên dưới. Không được bỏ qua bất kỳ điểm nào.

# EDITORIAL FEEDBACK CẦN ÁP DỤNG:
${editorFeedback}

# YÊU CẦU BẮT BUỘC:
- Giữ nguyên H1 và cấu trúc H2 chính
- Chỉ sửa những phần editor yêu cầu
- Nếu feedback yêu cầu thêm data → dùng thông tin từ phần research
- Output phải là bài viết hoàn chỉnh (không chỉ trả lời feedback)`
    : `# ROLE
Bạn là blog content writer chuyên nghiệp cho WordPress.
Bạn viết bài chuẩn SEO, giàu giá trị thực tế, giữ chân người đọc từ đầu đến cuối.
Bạn KHÔNG viết bài generic — mỗi bài phải có insight, data, hoặc góc nhìn mà bài khác chưa cover đủ sâu.`;

  const researchBlock = `
# RESEARCH DATA — DÙNG TRONG BÀI VIẾT:
Số liệu: ${safeStats.map(s => `- ${s}`).join("\n")}
Xu hướng: ${safeTrends.map(t => `- ${t}`).join("\n")}
Case Studies: ${safeCases.map(c => `- ${c}`).join("\n")}
Sai lầm phổ biến: ${safeMistakes.map(m => `- ${m}`).join("\n")}
Góc nhìn khác biệt: ${safeAngles.map(a => `- ${a}`).join("\n")}
Pain Points: ${safePain.map(p => `- ${p}`).join("\n")}
${safeQuotes.length ? `Trích dẫn chuyên gia: ${safeQuotes.map(q => `- ${q}`).join("\n")}` : ""}
`;

  const taskBlock = isRevision
    ? `# NHIỆM VỤ
Viết lại bài blog hoàn chỉnh bằng tiếng Việt cho: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audience}
- Độ dài mục tiêu: ~${words} từ`
    : `# NHIỆM VỤ
Viết bài blog hoàn chỉnh bằng tiếng Việt cho: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audience}
- Độ dài mục tiêu: ~${words} từ
${niche ? `- NICHE: ${niche}` : ""}`;

  return `
${roleBlock}

${researchBlock}

${taskBlock}

${fw}

# SEO ON-PAGE
- Từ khóa chính: "${keyword}"
  → Xuất hiện trong: H1, H2 đầu tiên, 100 từ đầu, kết luận
  → Density: 1–1.5%, tự nhiên tuyệt đối
- Internal link: Chèn [LINK: chủ đề liên quan] tối thiểu 3 vị trí
- Featured snippet: Ít nhất 1 đoạn trả lời trực tiếp câu hỏi chính

# QUY TẮC CHẤT LƯỢNG
- Mỗi H2 phải có VALUE riêng — đọc xong section đó, người đọc ĐÃ học/làm được 1 điều cụ thể
- Xen kẽ format: paragraph → list → quote → table → paragraph
- Câu trung bình 15–20 từ
- Mỗi H2 có thẻ <strong> cho số liệu hoặc khái niệm chính
- Tránh: "Trong thời đại ngày nay", "Như chúng ta đã biết", "Hãy cùng tìm hiểu"

# WORDPRESS GUTENBERG OUTPUT
Trả về HTML Gutenberg blocks. KHÔNG Markdown. KHÔNG preamble.
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Tiêu đề</h1>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Đoạn văn...</p>
<!-- /wp:paragraph -->
<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Section</h2>
<!-- /wp:heading -->
<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>Trích dẫn</p></blockquote>
<!-- /wp:quote -->
`.trim();
}

export function writerMaxTokens(length: string): number {
  const tokens: Record<string, number> = {
    short: 1500,
    medium: 3500,
    long: 7000,
    extra_long: 9000,
  };
  return tokens[length] || 3500;
}
