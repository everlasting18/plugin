const toneMap: Record<string, string> = {
  professional: "chuyên nghiệp, đáng tin cậy, rõ ràng và có chiều sâu",
  friendly: "thân thiện, gần gũi, trò chuyện tự nhiên",
  persuasive: "thuyết phục, có sức hút, tạo động lực hành động",
  simple: "đơn giản, dễ hiểu, giải thích từng bước",
};

const audienceMap: Record<string, string> = {
  general: "độc giả phổ thông, đa dạng trình độ",
  professional: "chuyên gia và người có kinh nghiệm trong ngành — dùng thuật ngữ chuyên môn phù hợp, đi sâu vào chi tiết kỹ thuật",
  beginner: "người mới bắt đầu — giải thích khái niệm cơ bản, tránh thuật ngữ phức tạp, dùng ví dụ đời thường",
  business: "doanh nghiệp và nhà quản lý — tập trung vào ROI, số liệu, case study và giải pháp thực tiễn",
};

const frameworkMap: Record<string, string> = {
  aida: `Bố cục theo AIDA:
1. ATTENTION — Mở đầu bằng số liệu gây sốc, câu hỏi khiêu khích, hoặc tuyên bố táo bạo để nắm bắt sự chú ý ngay lập tức
2. INTEREST — Đào sâu vấn đề, chia sẻ insight độc đáo, dữ liệu thú vị để duy trì sự quan tâm
3. DESIRE — Vẽ ra bức tranh lợi ích cụ thể, dùng social proof và ví dụ thực tế để khơi gợi mong muốn
4. ACTION — Kết thúc bằng CTA rõ ràng, cụ thể, tạo cảm giác cấp bách`,

  pas: `Bố cục theo PAS:
1. PROBLEM — Mở đầu bằng việc mô tả chính xác vấn đề/nỗi đau mà người đọc đang gặp, thể hiện sự thấu hiểu
2. AGITATE — Phân tích hậu quả nếu không giải quyết, dùng câu hỏi tu từ và tình huống cụ thể để khơi sâu cảm xúc
3. SOLUTION — Trình bày giải pháp chi tiết, từng bước, với bằng chứng và kết quả cụ thể`,

  hero: `Bố cục theo Hero's Journey:
1. THẾ GIỚI BÌNH THƯỜNG — Mô tả thực trạng, thách thức phổ biến mà người đọc đang đối mặt
2. LỜI KÊU GỌI PHIÊU LƯU — Giới thiệu cơ hội thay đổi, tại sao cần hành động ngay
3. THỬ THÁCH & MENTOR — Phân tích khó khăn và giới thiệu kiến thức/công cụ/phương pháp để vượt qua
4. BIẾN ĐỔI — Trình bày kết quả sau khi áp dụng, câu chuyện thành công, viễn cảnh mới`,
};

const wordCount: Record<string, number> = { short: 500, medium: 1200, long: 2500 };

export interface GenerateInput {
  action: string;
  keyword: string;
  tone: string;
  length: string;
  audience: string;
  framework: string;
}

export function generatePrompt({ action, keyword, tone, length, audience, framework }: GenerateInput): string {
  const toneVi = toneMap[tone] || toneMap.professional;
  const words = wordCount[length] || 1200;
  const audienceVi = audienceMap[audience] || audienceMap.general;
  const hasFramework = framework && framework !== "none" && frameworkMap[framework];

  const prompts: Record<string, string> = {
    full_article: `
Bạn là một content writer chuyên nghiệp, chuyên viết bài blog chuẩn SEO cho WordPress.

## NHIỆM VỤ
Viết bài blog hoàn chỉnh bằng tiếng Việt về: "${keyword}"

## THÔNG SỐ
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Độ dài: khoảng ${words} từ
${hasFramework ? `\n## CẤU TRÚC BÀI VIẾT\n${frameworkMap[framework]}` : `
## CẤU TRÚC BÀI VIẾT
- Mở đầu: hook hấp dẫn (số liệu, câu hỏi, hoặc tuyên bố gây tò mò)
- Thân bài: chia thành 4–6 mục H2 rõ ràng, mỗi mục giải quyết 1 khía cạnh
- Kết bài: tóm tắt giá trị cốt lõi + lời kêu gọi hành động`}

## QUY TẮC SEO
- Từ khóa "${keyword}" xuất hiện trong: tiêu đề H1, H2 đầu tiên, đoạn mở đầu, và rải tự nhiên 3–5 lần trong bài
- Mỗi đoạn văn tối đa 3–4 câu để dễ đọc trên mobile
- Sử dụng danh sách (<ul>/<ol>) khi liệt kê từ 3 mục trở lên
- In đậm (<strong>) các khái niệm quan trọng, số liệu nổi bật

## ĐỊNH DẠNG OUTPUT — WordPress Gutenberg Blocks
Trả về HTML tương thích WordPress blocks:

<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Tiêu đề bài viết</h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Nội dung đoạn văn...</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Tiêu đề mục</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
<li>Mục 1</li>
<li>Mục 2</li>
</ul>
<!-- /wp:list -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><p>Trích dẫn nổi bật hoặc insight quan trọng</p></blockquote>
<!-- /wp:quote -->

<!-- wp:separator -->
<hr class="wp-block-separator"/>
<!-- /wp:separator -->

Quy tắc:
- Mỗi element phải được wrap trong block comments <!-- wp:type --> và <!-- /wp:type -->
- Dùng đa dạng blocks: heading, paragraph, list, quote, separator
- KHÔNG dùng markdown, KHÔNG có DOCTYPE/html/body
- Chỉ trả về nội dung bài, không giải thích
`.trim(),

    intro: `
Bạn là content writer chuyên nghiệp.

Viết đoạn mở đầu (120–180 từ) bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Câu đầu tiên phải là hook mạnh: số liệu bất ngờ, câu hỏi kích thích tư duy, hoặc tuyên bố gây tranh luận
- Nêu rõ vấn đề người đọc đang gặp
- Gợi mở giải pháp sẽ được trình bày trong bài
- Kết đoạn bằng câu chuyển tiếp hấp dẫn

Trả về WordPress blocks:
<!-- wp:paragraph -->
<p>Nội dung...</p>
<!-- /wp:paragraph -->

Chỉ trả về nội dung, không giải thích.
`.trim(),

    conclusion: `
Bạn là content writer chuyên nghiệp.

Viết đoạn kết luận (100–150 từ) bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Tóm tắt 2–3 điểm chính đã nêu trong bài
- Nhấn mạnh giá trị cốt lõi người đọc nhận được
- Kết thúc bằng câu để lại ấn tượng sâu hoặc câu hỏi mở

Trả về WordPress blocks:
<!-- wp:heading -->
<h2 class="wp-block-heading">Kết luận</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Nội dung...</p>
<!-- /wp:paragraph -->

Chỉ trả về nội dung, không giải thích.
`.trim(),

    cta: `
Bạn là conversion copywriter chuyên nghiệp.

Viết đoạn CTA (60–100 từ) bằng tiếng Việt cho bài về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
- Nhấn mạnh lợi ích cụ thể khi hành động
- Tạo cảm giác cấp bách nhưng không gượng ép
- Có hành động rõ ràng (đăng ký, tải về, liên hệ, bắt đầu...)

Trả về WordPress blocks:
<!-- wp:separator -->
<hr class="wp-block-separator"/>
<!-- /wp:separator -->
<!-- wp:paragraph -->
<p><strong>Nội dung CTA...</strong></p>
<!-- /wp:paragraph -->

Chỉ trả về nội dung, không giải thích.
`.trim(),

    outline: `
Bạn là content strategist chuyên nghiệp.

Tạo dàn ý chi tiết bằng tiếng Việt cho bài viết về: "${keyword}"
- Giọng văn: ${toneVi}
- Đối tượng: ${audienceVi}
${hasFramework ? `- ${frameworkMap[framework]}` : "- Gồm 6–8 mục logic, mỗi mục giải quyết 1 khía cạnh cụ thể"}
- Mỗi mục có tiêu đề H2 + mô tả ngắn 2–3 câu về nội dung sẽ triển khai

Trả về WordPress blocks:
<!-- wp:heading -->
<h2 class="wp-block-heading">Tiêu đề mục</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Mô tả ngắn nội dung mục này...</p>
<!-- /wp:paragraph -->

Chỉ trả về nội dung, không giải thích.
`.trim(),
  };

  return prompts[action] || prompts.full_article;
}

export function generateMaxTokens(action: string, length: string): number {
  if (action === "full_article") {
    return ({ short: 1200, medium: 3000, long: 6000 } as Record<string, number>)[length] || 3000;
  }
  return ({ intro: 500, conclusion: 450, cta: 300, outline: 1000 } as Record<string, number>)[action] || 600;
}
