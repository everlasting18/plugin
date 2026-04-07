const instrMap: Record<string, string> = {
  improve: "cải thiện văn phong, viết hay hơn, tự nhiên hơn, giữ nguyên cấu trúc",
  shorter: "viết ngắn gọn, súc tích hơn — loại bỏ câu thừa, giữ ý chính và số liệu quan trọng",
  longer: "mở rộng nội dung — thêm chi tiết, ví dụ cụ thể, giải thích sâu hơn",
  simpler: "viết đơn giản hơn — dùng từ phổ thông, câu ngắn, tránh thuật ngữ chuyên môn",
  rewrite: "viết lại hoàn toàn theo cách diễn đạt mới, giữ nguyên thông điệp và dữ liệu",
};

interface RewriteInput {
  text: string;
  instruction: string;
}

export function rewritePrompt({ text, instruction }: RewriteInput): string {
  const instr = instrMap[instruction] || instrMap.improve;

  return `
Bạn là một editor chuyên nghiệp, chuyên chỉnh sửa nội dung WordPress.

## NHIỆM VỤ
${instr} đoạn nội dung sau (tiếng Việt):

"${text}"

## QUY TẮC
- Giữ nguyên ý nghĩa và thông điệp gốc
- Viết tự nhiên, đúng ngữ pháp tiếng Việt
- Giữ nguyên các thẻ HTML và block comments WordPress nếu có trong đoạn gốc
- Nếu đoạn gốc không có WordPress blocks, trả về nội dung trong WordPress blocks

## ĐỊNH DẠNG OUTPUT — WordPress Gutenberg Blocks
Trả về HTML tương thích WordPress blocks:

<!-- wp:paragraph -->
<p>Nội dung đoạn văn...</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul class="wp-block-list">
<li>Mục 1</li>
</ul>
<!-- /wp:list -->

Quy tắc:
- Mỗi element phải được wrap trong block comments <!-- wp:type --> và <!-- /wp:type -->
- KHÔNG dùng markdown, KHÔNG có DOCTYPE/html/body
- Chỉ trả về nội dung đã chỉnh sửa, không giải thích, không dấu ngoặc kép bao ngoài
`.trim();
}
