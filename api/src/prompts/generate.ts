// ============================================================
// WordPress Blog Content AI — Prompt Generator v3
// Chuyên biệt: Blog & Content cho WordPress
// Focus: Chất lượng viết chuyên nghiệp + SEO thực chiến
// ============================================================

// ── Tone ────────────────────────────────────────────────────
const toneMap: Record<string, string> = {
  professional: `chuyên nghiệp và có chiều sâu:
    - Dùng dữ liệu, dẫn chứng cụ thể thay vì nhận định chung
    - Câu văn chắc chắn, tránh rào đón không cần thiết
    - Thể hiện expertise qua cách phân tích, không qua tính từ hoa mỹ`,

  friendly: `thân thiện và gần gũi:
    - Viết như đang trò chuyện 1:1, dùng "bạn" và "mình/tôi"
    - Xen kẽ câu hỏi tu từ để tạo tương tác
    - Dùng ví dụ đời thường, so sánh dễ hình dung
    - Tránh giọng giảng dạy từ trên xuống`,

  persuasive: `thuyết phục và có sức hút:
    - Mỗi đoạn phải khiến người đọc muốn đọc đoạn tiếp
    - Dùng social proof, số liệu, contrast (trước/sau)
    - Tạo urgency tự nhiên qua chi phí cơ hội ("mỗi ngày chậm là...")
    - Kết mỗi section bằng micro-CTA hoặc câu chuyển tiếp gợi mở`,

  simple: `đơn giản và rõ ràng:
    - Giải thích mọi thuật ngữ ngay lần đầu xuất hiện
    - Câu tối đa 20 từ, đoạn tối đa 3 câu
    - Dùng ví dụ cụ thể cho mỗi khái niệm trừu tượng
    - Cấu trúc: nêu ý → giải thích → ví dụ`,

  storytelling: `kể chuyện cuốn hút:
    - Mở bằng tình huống/nhân vật cụ thể, không mở bằng định nghĩa
    - Xây dựng tension: vấn đề → thử sai → bước ngoặt → kết quả
    - Đan xen data/insight vào mạch truyện tự nhiên
    - Kết bài quay lại câu chuyện mở đầu (callback)`,
};

// ── Audience ────────────────────────────────────────────────
const audienceMap: Record<string, string> = {
  general: `độc giả phổ thông:
    - Giải thích vừa đủ, không quá đơn giản cũng không quá kỹ thuật
    - Ưu tiên tính ứng dụng: đọc xong làm được ngay`,

  professional: `chuyên gia trong ngành:
    - Dùng thuật ngữ chuyên môn chính xác (không cần giải thích thuật ngữ phổ biến)
    - Đi thẳng vào vấn đề, bỏ qua kiến thức nền
    - Trích dẫn nguồn cụ thể: nghiên cứu, case study, data thực tế
    - Phân tích đa chiều, thừa nhận giới hạn và edge case`,

  beginner: `người mới bắt đầu:
    - Giải thích từng khái niệm từ zero, giả định người đọc chưa biết gì
    - Dùng analogy đời thường: so sánh với nấu ăn, xây nhà, lái xe...
    - Mỗi bước đi kèm "tại sao" — không chỉ nói "làm gì" mà giải thích lý do
    - Thêm phần "Sai lầm thường gặp" để người mới tránh bẫy`,

  business: `chủ doanh nghiệp và nhà quản lý:
    - Mở bằng impact: ROI, tiết kiệm, tăng trưởng — số liệu trước
    - Framework ra quyết định: ưu/nhược, chi phí/lợi ích, timeline
    - Case study thực tế có tên công ty, ngành, kết quả đo lường
    - Kết bằng action items rõ ràng: làm gì, ai làm, khi nào`,
};

// ── Frameworks ──────────────────────────────────────────────
const frameworkMap: Record<string, string> = {
  app_pas: `## BỐ CỤC: APP (mở bài) + PAS (thân bài)

MỞ BÀI — Mô hình APP (100–150 từ):
  AGREE: Mở bằng 1 sự thật/trải nghiệm mà người đọc gật đầu đồng ý ngay. Thể hiện: "Tôi hiểu bạn."
  PROMISE: Hứa cụ thể bài này sẽ giúp được gì. Không hứa chung chung — "Bạn sẽ biết cách..." / "Sau bài này, bạn có thể..."
  PREVIEW: Tóm tắt nhanh 3–4 điểm chính sẽ cover. Cho người đọc biết trước roadmap.

THÂN BÀI — Mỗi section H2 theo mô hình PAS:
  PROBLEM: Mở section bằng vấn đề cụ thể — dùng ngôn ngữ người đọc, không dùng ngôn ngữ sách giáo khoa.
  AGITATE: 1–2 câu nêu hậu quả nếu bỏ qua — con số, tình huống thực tế.
  SOLUTION: Giải pháp chi tiết, actionable. Có ví dụ hoặc step cụ thể.

KẾT BÀI (80–120 từ):
  Tóm tắt 3 takeaway chính (không lặp nguyên văn)
  CTA mềm phù hợp ngữ cảnh
  Gợi ý bài liên quan: [INTERNAL LINK: chủ đề]`,

  aida: `## BỐ CỤC: AIDA

ATTENTION (mở bài — 80–120 từ):
  Câu đầu tiên: hook cực mạnh — số liệu gây sốc, câu hỏi đảo ngược, hoặc tuyên bố trái mainstream.
  2–3 câu tiếp: bối cảnh nhanh, tại sao chủ đề này quan trọng NGAY BÂY GIỜ.

INTEREST (thân bài phần 1 — 40% content):
  Đào sâu vấn đề với data, insight, góc nhìn mới.
  Dùng subheading dạng câu hỏi để giữ curiosity.
  Mỗi section kết bằng hook sang section tiếp.

DESIRE (thân bài phần 2 — 40% content):
  Trình bày giải pháp/phương pháp với case study, before/after, social proof.
  Dùng "Hãy hình dung..." hoặc "Kết quả thực tế cho thấy..." để kích hoạt cảm xúc.

ACTION (kết bài — 60–100 từ):
  CTA duy nhất, cụ thể, có lý do hành động ngay.
  Risk reversal nếu có.`,

  pas: `## BỐ CỤC: PAS

PROBLEM (mở bài + section 1 — 20% content):
  Mô tả vấn đề bằng đúng ngôn ngữ của người đọc mục tiêu.
  Dùng tình huống cụ thể: "Bạn mở Google Analytics và thấy traffic giảm 40%..."
  Không nói chung chung — càng cụ thể càng đồng cảm.

AGITATE (section 2–3 — 30% content):
  Phóng đại hệ quả dây chuyền: vấn đề → ảnh hưởng 1 → ảnh hưởng 2 → worst case.
  Dùng câu hỏi tu từ: "Bạn có chắc mình afford được...?"
  Thêm số liệu thiệt hại thực tế.

SOLUTION (section 4–7 — 50% content):
  Giải pháp từng bước, đánh số rõ ràng.
  Mỗi bước: what to do → how to do → why it works.
  Case study/ví dụ cho bước quan trọng nhất.
  Kết bằng summary checklist + CTA.`,

  eeat_skyscraper: `## BỐ CỤC: E-E-A-T + Skyscraper

MỤC TIÊU: Viết bài TOÀN DIỆN NHẤT trên Google cho keyword này.

E-E-A-T — Thể hiện xuyên suốt bài:
  EXPERIENCE: Đan xen trải nghiệm thực tế ("Khi tôi áp dụng phương pháp này cho dự án X..."). Dùng first-person khi chia sẻ kinh nghiệm.
  EXPERTISE: Dẫn nguồn uy tín cụ thể — [REF: nguồn]. Phân tích kỹ thuật có chiều sâu, không dừng ở bề mặt.
  AUTHORITATIVENESS: Bao quát toàn bộ subtopic. Không để lỗ hổng kiến thức. Trích dẫn chuyên gia: [EXPERT QUOTE: tên + chức danh].
  TRUSTWORTHINESS: Ngôn ngữ chính xác, thừa nhận giới hạn ("Phương pháp này hiệu quả trong bối cảnh X, nhưng..."). KHÔNG dùng tuyệt đối.

SKYSCRAPER — So sánh ngầm với bài đang rank:
  Nhiều data point hơn: thêm số liệu, case study, ví dụ.
  Cập nhật hơn: dùng data/trend mới nhất.
  Đầy đủ hơn: cover cả edge case, FAQ, misconception phổ biến.
  Thực tế hơn: actionable steps thay vì lý thuyết suông.

CẤU TRÚC:
  H1: Keyword + power word + [năm nếu phù hợp]
  Intro: Inverted Pyramid — kết luận quan trọng nhất ở đầu
  TOC: Tự động từ các H2
  6–10 H2: Mỗi H2 bao quát 1 subtopic chính
  FAQ: 4–6 câu từ People Also Ask
  Nguồn tham khảo: [REF: nguồn] — tối thiểu 3 nguồn uy tín
  Kết: Tóm tắt + next step + CTA`,

  hero: `## BỐ CỤC: Hero's Journey (Storytelling)

THẾ GIỚI BÌNH THƯỜNG (mở bài — 15%):
  Mô tả thực trạng mà người đọc đang sống: thói quen, pain point hàng ngày.
  Dùng ngôn ngữ cảm giác: "Mỗi sáng bạn mở laptop và..."
  Người đọc phải nghĩ: "Đúng là mình!"

LỜI KÊU GỌI PHIÊU LƯU (section 1 — 15%):
  Catalyst: sự kiện/insight/data khiến không thể ở yên được nữa.
  "Cho đến khi tôi phát hiện rằng..." / "Nhưng có 1 điều thay đổi tất cả..."

THỬ THÁCH & MENTOR (thân bài — 50%):
  Trình bày từng thử thách + cách vượt qua.
  "Mentor" = kiến thức/công cụ/phương pháp bạn đang dạy.
  Mỗi section = 1 thử thách + 1 bài học cụ thể.
  Có thất bại thực tế: "Lần đầu tôi thử, kết quả là thảm họa..."

BIẾN ĐỔI (kết bài — 20%):
  Kết quả sau khi áp dụng — cụ thể, đo lường được.
  Viễn cảnh tương lai nếu hành động.
  CTA: "Hành trình của bạn bắt đầu từ bước đầu tiên..."`,

  listicle: `## BỐ CỤC: Listicle Chuyên Sâu

MỞ BÀI (80–120 từ):
  Hook: Tại sao danh sách này khác biệt — "Không phải top 10 generic bạn đã đọc 100 lần..."
  Promise: Mỗi mục có gì đặc biệt (actionable / data-backed / first-hand tested).
  Preview: Tổng số mục + tiêu chí chọn lọc.

THÂN BÀI — Mỗi mục listicle:
  H2: Số thứ tự + Tên mục + Hook ngắn
    Ví dụ: "3. Email Segmentation — Tăng 74% Open Rate Bằng 1 Thay Đổi Nhỏ"
  Paragraph 1: Giải thích tại sao mục này quan trọng (1–2 câu)
  Paragraph 2: Hướng dẫn cụ thể / phân tích / case study
  Kết mục: 1 câu takeaway hoặc pro tip

Quy tắc listicle:
  - Mỗi mục phải self-contained — đọc riêng vẫn hiểu
  - Sắp xếp logic: quan trọng nhất đầu HOẶC cuối (anchor effect)
  - Xen kẽ format: text → list → blockquote → text — tránh đều đều
  - Không pad thêm mục chỉ để tăng số lượng — quality > quantity

KẾT BÀI: Tóm tắt top 3 + CTA + "Bạn sẽ bắt đầu với mục nào?"`,

  howto: `## BỐ CỤC: How-To / Tutorial Step-by-Step

MỞ BÀI (80–120 từ):
  Hook: Kết quả đạt được sau khi hoàn thành tutorial này.
  Ai nên đọc + Cần chuẩn bị gì (prerequisites).
  Tổng thời gian thực hiện + độ khó.

THÂN BÀI — Step-by-step:
  Mỗi H2 = 1 bước lớn. Đánh số rõ: "Bước 1:", "Bước 2:"...
  Mỗi bước gồm:
    - Mục tiêu: "Sau bước này bạn sẽ có..."
    - Hướng dẫn chi tiết: from → to, có ảnh/screenshot placeholder nếu cần
    - Lưu ý / sai lầm thường gặp (nếu có)
    - Checkpoint: cách kiểm tra đã làm đúng
  Dùng H3 cho sub-steps trong bước phức tạp.

TROUBLESHOOTING (tùy chọn):
  3–5 vấn đề thường gặp + cách sửa nhanh.

KẾT BÀI:
  Summary checklist: tất cả các bước dạng danh sách ngắn.
  "Bạn vừa hoàn thành..." + next level suggestion.
  CTA: bài nâng cao tiếp theo [INTERNAL LINK].`,
};

// ── Word counts ─────────────────────────────────────────────
const wordCount: Record<string, number> = {
  short: 600,
  medium: 1400,
  long: 2800,
  extra_long: 3500,
};

// ── Interface ───────────────────────────────────────────────
export interface GenerateInput {
  action: string;       // full_article | intro | conclusion | cta | outline | faq | meta | rewrite
  keyword: string;
  tone: string;         // professional | friendly | persuasive | simple | storytelling
  length: string;       // short | medium | long | extra_long
  audience: string;     // general | professional | beginner | business
  framework: string;    // app_pas | aida | pas | eeat_skyscraper | hero | listicle | howto | none
  niche?: string;
  lsiKeywords?: string[];
  existingContent?: string;  // cho action "rewrite"
}

// ════════════════════════════════════════════════════════════
// SHARED BUILDING BLOCKS
// ════════════════════════════════════════════════════════════

const WORDPRESS_OUTPUT_FORMAT = `
## ĐỊNH DẠNG OUTPUT — WordPress Gutenberg Blocks

Trả về HTML Gutenberg blocks. Mỗi element PHẢI wrap trong block comments.

<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Tiêu đề bài (H1 duy nhất)</h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Đoạn văn. Tối đa 3–4 câu.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Section chính</h2>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Sub-section</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list"><li>Item</li></ul>
<!-- /wp:list -->

<!-- wp:list {"ordered":true} -->
<ol class="wp-block-list"><li>Step</li></ol>
<!-- /wp:list -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>Insight / trích dẫn chuyên gia</p></blockquote>
<!-- /wp:quote -->

<!-- wp:table -->
<figure class="wp-block-table"><table><thead><tr><th>Cột 1</th><th>Cột 2</th></tr></thead><tbody><tr><td>Data</td><td>Data</td></tr></tbody></table></figure>
<!-- /wp:table -->

<!-- wp:separator -->
<hr class="wp-block-separator"/>
<!-- /wp:separator -->

<!-- wp:image -->
<figure class="wp-block-image"><img src="" alt="[MÔ TẢ ẢNH + KEYWORD]"/><figcaption>[Caption gợi ý]</figcaption></figure>
<!-- /wp:image -->

Quy tắc bắt buộc:
1. KHÔNG Markdown. KHÔNG DOCTYPE/html/head/body.
2. Chỉ trả nội dung bài. KHÔNG preamble, KHÔNG giải thích, KHÔNG "Dưới đây là bài viết...".
3. H1 xuất hiện đúng 1 lần = tiêu đề bài. Thân bài chỉ dùng H2/H3.
4. Xen kẽ block types tạo nhịp đọc: paragraph → list → quote → table → paragraph.
5. Image block: để src trống, chỉ điền alt text mô tả ảnh nên chèn + keyword.
`.trim();

function buildSeoRules(keyword: string, lsiKeywords?: string[]): string {
  const lsi = lsiKeywords?.length
    ? `- LSI / từ khóa phụ (rải tự nhiên): ${lsiKeywords.map(k => `"${k}"`).join(", ")}`
    : `- Tự xác định 3–5 LSI keywords (từ đồng nghĩa, biến thể ngữ nghĩa) và rải tự nhiên trong bài`;

  return `
## SEO ON-PAGE
- Từ khóa chính: "${keyword}"
  → Xuất hiện trong: H1, H2 đầu tiên, 100 từ đầu, kết luận
  → Density: 1–1.5% — tự nhiên tuyệt đối, không gượng ép
${lsi}
- Internal link: Chèn [LINK: chủ đề liên quan] tối thiểu 3 vị trí — anchor text chứa keyword của bài đích
- Image ALT: Mỗi <!-- wp:image --> có alt text mô tả + keyword phù hợp
- Featured snippet: Ít nhất 1 đoạn trả lời trực tiếp câu hỏi chính (40–60 từ) hoặc 1 list tóm tắt
`.trim();
}

function buildNicheContext(niche?: string): string {
  if (!niche) return "";

  const ymylNiches = [
    "health", "sức khỏe", "finance", "tài chính", "legal", "pháp luật",
    "medical", "y tế", "insurance", "bảo hiểm", "investment", "đầu tư",
  ];
  const isYmyl = ymylNiches.some(n => niche.toLowerCase().includes(n));

  let ctx = `\n## NICHE: ${niche}\nSử dụng thuật ngữ, ví dụ, data và case study đặc thù ngành ${niche}.`;
  if (isYmyl) {
    ctx += `\n\n⚠️ ĐÂY LÀ YMYL NICHE — Áp dụng quy tắc bổ sung:
- Bắt buộc có placeholder [AUTHOR BIO: tên + credentials]
- Mỗi claim y tế/tài chính/pháp lý phải có [REF: nguồn uy tín]
- KHÔNG dùng ngôn ngữ tuyệt đối: "chữa khỏi", "đảm bảo 100%", "tốt nhất"
- Thêm disclaimer cuối bài: [DISCLAIMER: nội dung phù hợp ngành]
- Ghi rõ [LAST REVIEWED: ngày] để thể hiện tính cập nhật`;
  }
  return ctx + "\n";
}

const WRITING_QUALITY_RULES = `
## QUY TẮC CHẤT LƯỢNG VIẾT

### Tạo giá trị thực
- Mỗi H2 phải có VALUE riêng — đọc xong section đó, người đọc ĐÃ học/làm được 1 điều cụ thể.
- Ưu tiên: con số > tính từ, ví dụ > lý thuyết, step cụ thể > lời khuyên chung.
- Nếu nêu 1 phương pháp → kèm ví dụ áp dụng thực tế.
- Nếu nêu 1 số liệu → nêu rõ nguồn hoặc đánh dấu [REF: cần dẫn nguồn].

### Giữ chân người đọc
- Mở đầu KHÔNG được generic — câu đầu phải khiến người đọc dừng lại.
- Mỗi section kết bằng câu chuyển tiếp tự nhiên sang section sau.
- Xen kẽ format: text → list → blockquote → table → text — KHÔNG để 5 paragraph liên tiếp.
- Câu văn: trung bình 15–20 từ, xen kẽ ngắn (8–10 từ) và dài (25–30 từ) tạo nhịp.

### Mobile-friendly
- Đoạn văn: tối đa 3–4 câu (80–100 từ).
- Subheading (H2/H3): cứ 200–300 từ phải có 1 subheading.
- In đậm: <strong> cho số liệu, khái niệm chính, kết luận — KHÔNG quá 2 cụm/đoạn.

### DANH SÁCH CẤM — Tuyệt đối KHÔNG dùng:
- "Trong thời đại ngày nay" / "Trong thế giới hiện đại"
- "Không thể phủ nhận rằng" / "Như chúng ta đã biết"
- "Có thể nói rằng" / "Nói cách khác"
- "Điều quan trọng cần lưu ý là"
- "Hãy cùng tìm hiểu" / "Hãy cùng khám phá" (ở đầu bài)
- "Vậy thì" / "Tóm lại là" / "Nhìn chung mà nói"
- Lặp keyword nguyên văn trong 2 câu liên tiếp
- Mở bài bằng định nghĩa Wikipedia-style: "[Keyword] là..."
- Paragraph chỉ có 1 câu ngắn đứng một mình (trừ hook mở bài)
- 3+ emoji trong 1 paragraph

### PATTERNS NÊN DÙNG:
- Mở bằng số liệu bất ngờ: "78% doanh nghiệp SME thất bại trong 5 năm đầu — phần lớn vì 1 sai lầm đơn giản."
- Mở bằng câu hỏi đảo ngược: "Phương pháp 'hiệu quả nhất' lại đang lãng phí 30% ngân sách của bạn?"
- Transition bằng micro-hook: "Nhưng có 1 yếu tố mà hầu hết mọi người bỏ qua."
- Đóng section bằng takeaway 1 dòng in đậm.
- Blockquote cho insight quan trọng hoặc trích dẫn chuyên gia [EXPERT: tên].
`.trim();

// ════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ════════════════════════════════════════════════════════════

export function generatePrompt(input: GenerateInput): string {
  const {
    action, keyword, tone, length, audience,
    framework, niche, lsiKeywords, existingContent,
  } = input;

  const toneVi = toneMap[tone] || toneMap.professional;
  const words = wordCount[length] || 1400;
  const audienceVi = audienceMap[audience] || audienceMap.general;
  const fw = framework && framework !== "none" ? frameworkMap[framework] : null;
  const seo = buildSeoRules(keyword, lsiKeywords);
  const nicheCtx = buildNicheContext(niche);

  const prompts: Record<string, string> = {

    // ═══════════════════════════════════════════
    // FULL ARTICLE
    // ═══════════════════════════════════════════
    full_article: `
# ROLE
Bạn là blog content writer chuyên nghiệp cho WordPress.
Bạn viết bài chuẩn SEO, giàu giá trị thực tế, và giữ chân người đọc từ đầu đến cuối.
Bạn KHÔNG viết bài generic — mỗi bài phải có insight, data, hoặc góc nhìn mà bài khác trên Google chưa cover đủ sâu.

# NHIỆM VỤ
Viết bài blog hoàn chỉnh bằng tiếng Việt.
- Chủ đề: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Độ dài mục tiêu: ~${words} từ
${nicheCtx}
${fw || `## BỐ CỤC MẶC ĐỊNH
- Mở bài (100–150 từ): Hook mạnh → Bối cảnh nhanh → Promise giá trị → Preview nội dung
- Thân bài: 4–7 H2, mỗi section 150–350 từ. Dùng H3 khi cần chia nhỏ.
- FAQ: 3–5 câu hỏi thường gặp (People Also Ask style)
- Kết bài (80–120 từ): Tóm tắt takeaway + CTA phù hợp`}

${seo}

${WRITING_QUALITY_RULES}

${WORDPRESS_OUTPUT_FORMAT}
`.trim(),

    // ═══════════════════════════════════════════
    // INTRO
    // ═══════════════════════════════════════════
    intro: `
# ROLE
Bạn là content writer chuyên viết opening hook cho blog WordPress — câu mở đầu quyết định 80% người đọc ở lại hay rời đi.

# NHIỆM VỤ
Viết đoạn mở đầu (120–180 từ) bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
${nicheCtx}
# CẤU TRÚC MỞ BÀI
1. HOOK (câu 1–2): Một trong các pattern sau:
   a) Số liệu bất ngờ: "Theo [nguồn], 73% người dùng..."
   b) Câu hỏi đảo ngược niềm tin: "Bạn có biết phương pháp 'phổ biến nhất' lại..."
   c) Tuyên bố bold: "Hầu hết lời khuyên về [keyword] trên mạng đều sai."
   d) Micro-story: "3 tháng trước, [nhân vật] gặp chính xác vấn đề này..."
2. ĐỒNG CẢM (câu 3–4): Mô tả pain point/tình huống người đọc đang gặp — dùng ngôi "bạn".
3. PROMISE (câu 5–6): Bài này sẽ giúp gì cụ thể — "Trong bài này, bạn sẽ biết cách..."
4. PREVIEW (câu cuối): Gợi mở 2–3 điểm chính — tạo curiosity để đọc tiếp.

# QUY TẮC
- Từ khóa "${keyword}" xuất hiện tự nhiên trong 2 câu đầu.
- KHÔNG bắt đầu bằng: "Trong thời đại...", "Ngày nay...", "${keyword} là..."
- KHÔNG dùng "Hãy cùng tìm hiểu/khám phá" ở cuối intro.

${WORDPRESS_OUTPUT_FORMAT}
`.trim(),

    // ═══════════════════════════════════════════
    // CONCLUSION
    // ═══════════════════════════════════════════
    conclusion: `
# ROLE
Bạn là content writer viết kết luận blog — đoạn cuối phải để lại ấn tượng và thúc đẩy hành động.

# NHIỆM VỤ
Viết đoạn kết luận (100–160 từ) bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}

# CẤU TRÚC
1. TÓM TẮT (2–3 câu): Nhắc lại 2–3 takeaway quan trọng nhất — diễn đạt lại, KHÔNG copy từ thân bài.
2. GIÁ TRỊ (1–2 câu): Nhấn mạnh benefit cốt lõi người đọc nhận được.
3. KẾT (1–2 câu): Chọn 1:
   a) Câu hỏi mở kích thích suy nghĩ/thảo luận
   b) Lời khuyến khích hành động cụ thể: "Hãy bắt đầu bằng [bước nhỏ nhất]..."
   c) Vision tương lai: vẽ bức tranh kết quả nếu áp dụng
4. CTA + LINK: CTA mềm + [INTERNAL LINK: bài liên quan]

- Từ khóa "${keyword}" xuất hiện tự nhiên 1 lần.

${WORDPRESS_OUTPUT_FORMAT}
`.trim(),

    // ═══════════════════════════════════════════
    // CTA
    // ═══════════════════════════════════════════
    cta: `
# ROLE
Bạn là conversion copywriter chuyên viết CTA cho blog WordPress.

# NHIỆM VỤ
Viết đoạn CTA (60–100 từ) bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}

# CẤU TRÚC
1. BENEFIT (1–2 câu): Nhấn mạnh 1 lợi ích cụ thể, đo lường được.
2. URGENCY (1 câu): Chi phí cơ hội hoặc giới hạn thật — KHÔNG spam.
3. ACTION (1 câu): Hành động rõ ràng: đăng ký / tải / liên hệ / bắt đầu.
4. RISK REVERSAL (1 câu): Miễn phí / không cam kết / hoàn tiền.

# ĐỊNH DẠNG
<!-- wp:separator -->
<hr class="wp-block-separator"/>
<!-- /wp:separator -->

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center"><strong>Nội dung CTA</strong></p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<div class="wp-block-button"><a class="wp-block-button__link">[TEXT NÚT]</a></div>
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->

Chỉ trả nội dung, không giải thích.
`.trim(),

    // ═══════════════════════════════════════════
    // OUTLINE
    // ═══════════════════════════════════════════
    outline: `
# ROLE
Bạn là content strategist chuyên xây dựng outline bài blog WordPress — dàn ý tốt = 60% bài viết tốt.

# NHIỆM VỤ
Tạo dàn ý chi tiết bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Độ dài dự kiến: ~${words} từ
${nicheCtx}
${fw || ""}

# YÊU CẦU OUTLINE
Cho mỗi section:

H2: [Tiêu đề section — chứa keyword hoặc LSI tự nhiên]
  - Nội dung chính: 2–3 câu mô tả sẽ viết gì
  - Giá trị cho reader: người đọc được gì sau section này
  - Gợi ý format: paragraph / list / table / step-by-step
  - [INTERNAL LINK: chủ đề liên quan nên link]
  - Sub-sections (H3) nếu cần

# QUY TẮC
- 6–10 H2, mỗi mục giải quyết 1 khía cạnh KHÔNG trùng lặp.
- Thứ tự logic: cơ bản → nâng cao, hoặc problem → solution → advanced.
- Đánh dấu [FAQ SECTION] vị trí chèn FAQ.
- Đánh dấu [CTA] vị trí chèn call-to-action.
- H2 đầu tiên nên chứa keyword chính.

${WORDPRESS_OUTPUT_FORMAT}
`.trim(),

    // ═══════════════════════════════════════════
    // FAQ
    // ═══════════════════════════════════════════
    faq: `
# ROLE
Bạn là SEO content writer chuyên viết FAQ section tối ưu cho featured snippet Google.

# NHIỆM VỤ
Viết FAQ section (5–7 câu hỏi) bằng tiếng Việt cho bài về: "${keyword}"
- Đối tượng: ${audienceVi}
${nicheCtx}
# YÊU CẦU
- Câu hỏi: lấy từ People Also Ask / search intent thực tế — viết tự nhiên như người thật hỏi.
- Câu trả lời: 40–80 từ mỗi câu.
  → Câu đầu: trả lời trực tiếp (featured snippet target).
  → 1–2 câu tiếp: bổ sung chi tiết, ví dụ, hoặc nuance.
- Từ khóa "${keyword}" xuất hiện tự nhiên trong 2–3 câu trả lời.
- Sắp xếp: câu hỏi phổ biến nhất lên đầu.

# ĐỊNH DẠNG OUTPUT

<!-- wp:heading -->
<h2 class="wp-block-heading">Câu Hỏi Thường Gặp</h2>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">[Câu hỏi]?</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>[Trả lời trực tiếp. Bổ sung chi tiết.]</p>
<!-- /wp:paragraph -->

Lặp lại cho mỗi câu hỏi. Chỉ trả nội dung, không giải thích.
`.trim(),

    // ═══════════════════════════════════════════
    // META SEO
    // ═══════════════════════════════════════════
    meta: `
# ROLE
Bạn là SEO specialist tối ưu meta tags cho CTR trên Google SERP và social sharing.

# NHIỆM VỤ
Viết meta tags bằng tiếng Việt cho bài về: "${keyword}"
- Đối tượng: ${audienceVi}

# OUTPUT — Xuất 2 phiên bản A/B cho mỗi mục:

SEO TITLE (55–60 ký tự):
  - Chứa "${keyword}" ở đầu hoặc gần đầu
  - Có power word (Hướng dẫn / Bí quyết / Cách / X Mẹo)
  - Tạo curiosity hoặc promise cụ thể

META DESCRIPTION (150–160 ký tự):
  - Chứa keyword tự nhiên
  - Promise cụ thể: người đọc được gì
  - Kết bằng CTA ngầm

URL SLUG:
  - 3–5 từ, lowercase, chứa keyword chính
  - Không dùng stop words

OG TITLE (cho social — có thể khác SEO title):
  - Hook mạnh hơn, emotional hơn

OG DESCRIPTION (100–120 ký tự):
  - Ngắn, punchy, tạo FOMO hoặc curiosity

Xuất plain text, không HTML, không giải thích.
`.trim(),

    // ═══════════════════════════════════════════
    // REWRITE — Cải thiện nội dung có sẵn
    // ═══════════════════════════════════════════
    rewrite: `
# ROLE
Bạn là blog editor chuyên nâng cấp content WordPress — biến bài viết trung bình thành bài viết xuất sắc.

# NHIỆM VỤ
Viết lại / cải thiện nội dung bằng tiếng Việt.
- Chủ đề: "${keyword}"
- Giọng văn mục tiêu: ${toneVi}
- Đối tượng: ${audienceVi}
${nicheCtx}

# NỘI DUNG GỐC CẦN CẢI THIỆN:
${existingContent || "[Người dùng sẽ cung cấp nội dung gốc trong message tiếp theo]"}

# CHECKLIST CẢI THIỆN — Áp dụng tất cả:

### Cấu trúc
- Thêm/sửa H2, H3 cho rõ ràng nếu thiếu
- Tách đoạn quá dài (>4 câu) thành đoạn nhỏ
- Thêm list/table nếu có thông tin nên so sánh hoặc liệt kê
- Đảm bảo transition mượt giữa sections

### Nội dung
- Thay nhận định chung chung bằng ví dụ/số liệu cụ thể
- Xóa cụm sáo rỗng (xem danh sách cấm bên dưới)
- Thêm insight/góc nhìn mà bản gốc thiếu
- Bổ sung FAQ nếu chưa có

### SEO
- Keyword "${keyword}" trong H1, H2 đầu, 100 từ đầu, kết luận
- Thêm [INTERNAL LINK: chủ đề] tối thiểu 3 vị trí
- Thêm image placeholder với alt text phù hợp
- Tối ưu đoạn cho featured snippet nếu có cơ hội

### Đọc được
- Câu trung bình 15–20 từ, xen kẽ ngắn–dài
- In đậm số liệu và khái niệm chính
- Mỗi section có value riêng — đọc riêng vẫn có ích

${WRITING_QUALITY_RULES}

${WORDPRESS_OUTPUT_FORMAT}
`.trim(),
  };

  return prompts[action] || prompts.full_article;
}

// ════════════════════════════════════════════════════════════
// MAX TOKENS CALCULATOR
// ════════════════════════════════════════════════════════════
export function generateMaxTokens(action: string, length: string): number {
  const articleTokens: Record<string, number> = {
    short: 1500,
    medium: 3500,
    long: 7000,
    extra_long: 9000,
  };

  const fixedTokens: Record<string, number> = {
    intro: 600,
    conclusion: 550,
    cta: 400,
    outline: 1500,
    faq: 1400,
    meta: 700,
    rewrite: 8000,
  };

  if (action === "full_article") {
    return articleTokens[length] || 3500;
  }

  return fixedTokens[action] || 3500;
}
