import { ApiError } from "../src/lib/http.ts";
import { parseMetaRequest } from "../src/usecases/meta.ts";

Deno.test("parseMetaRequest accepts title and content", () => {
  const result = parseMetaRequest({
    title: "Bài viết SEO",
    content: "<p>Nội dung</p>",
  });

  if (result.title !== "Bài viết SEO") {
    throw new Error(`Expected title, got ${result.title}`);
  }

  if (result.content !== "<p>Nội dung</p>") {
    throw new Error(`Expected content, got ${result.content}`);
  }
});

Deno.test("parseMetaRequest rejects missing title", () => {
  let error: unknown;

  try {
    parseMetaRequest({
      title: "   ",
      content: "Nội dung",
    });
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for missing title");
  }

  if (error.code !== "missing_title" || error.status !== 400) {
    throw new Error(`Expected missing_title 400, got ${error.code} ${error.status}`);
  }
});
