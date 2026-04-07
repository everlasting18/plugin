interface MetaInput {
  title: string;
  excerpt: string;
}

export function metaPrompt({ title, excerpt }: MetaInput): string {
  return `
Bạn là một SEO specialist chuyên nghiệp.

## NHIỆM VỤ
Tạo meta SEO tối ưu bằng tiếng Việt cho bài viết WordPress.

## DỮ LIỆU BÀI VIẾT
- Tiêu đề: ${title}
- Nội dung tóm tắt: ${excerpt}

## YÊU CẦU
- **meta_title**: tối đa 60 ký tự, chứa từ khóa chính ở đầu, hấp dẫn và kích thích click
- **meta_description**: tối đa 160 ký tự, mô tả giá trị bài viết, chứa từ khóa tự nhiên, có CTA nhẹ

## ĐỊNH DẠNG OUTPUT
Trả về JSON thuần (không markdown, không giải thích, không bao ngoài):
{"meta_title": "...", "meta_description": "..."}
`.trim();
}
