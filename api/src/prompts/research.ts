// ============================================================
// Research Agent — Thu thập thông tin, số liệu, xu hướng
// ============================================================

export interface ResearchInput {
  keyword: string;
  tone: string;
  audience: string;
  niche?: string;
}

export function researchPrompt(input: ResearchInput): string {
  const { keyword, tone, audience, niche } = input;

  return `
# ROLE
Bạn là Research Analyst chuyên thu thập và tổng hợp thông tin cho bài viết blog.

# NHIỆM VỤ
Phân tích chủ đề "${keyword}" và xác định những gì cần research TRƯỚC KHI VIẾT.

# CÁC BƯỚC THU THẬP

## 1. Tìm số liệu & thống kê
- Tỷ lệ, %, growth rate liên quan đến "${keyword}"
- Báo cáo ngành, nghiên cứu gần đây
- Case study cụ thể (tên công ty, kết quả đo lường được)

## 2. Xác định xu hướng hiện tại
- Thay đổi mới nhất trong ngành (nếu có)
- Sai lầm phổ biến người mới hay mắc
- Công cụ/phương pháp đang hot

## 3. Tìm góc nhìn khác biệt
- Điều gì mà hầu hết bài viết khác CHƯA cover đủ?
- Insight bất ngờ nào có thể làm bài viết nổi bật?

## 4. Xác định pain points
- Người đọc ${audience} đang gặp vấn đề gì cụ thể?
- Câu hỏi thường gặp nhất (để đưa vào FAQ)

# OUTPUT
Trả về JSON:
\`\`\`json
{
  "stats": ["số liệu 1", "số liệu 2"],
  "trends": ["xu hướng 1", "xu hướng 2"],
  "caseStudies": ["case 1: mô tả ngắn", "case 2"],
  "commonMistakes": ["sai lầm 1", "sai lầm 2"],
  "uniqueAngles": ["góc nhìn độc đáo 1", "góc nhìn 2"],
  "painPoints": ["pain point 1", "pain point 2"],
  "expertQuotes": ["trích dẫn có thể dùng: nguồn"],
  "suggestedOutline": {
    "h2sections": ["H2 1", "H2 2", "H2 3", "H2 4", "H2 5"],
    "faqQuestions": ["câu hỏi 1", "câu hỏi 2", "câu hỏi 3"],
    "recommendedLength": "medium",
    "recommendedTone": "${tone}"
  }
}
\`\`\`

QUAN TRỌNG:
- Chỉ đưa vào stats/trends mà bạn TIN CHẮC (hoặc gắn [REF: cần kiểm chứng])
- suggestedOutline nên có 5-7 H2 sections
- recommendedLength: short (<800từ) / medium (800-2000từ) / long (>2000từ)
- Trả về JSON thuần, không có markdown code fences
`.trim();
}
