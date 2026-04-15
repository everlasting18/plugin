import { ApiError } from "../src/lib/http.ts";
import { parseRewriteRequest } from "../src/usecases/rewrite.ts";

Deno.test("parseRewriteRequest defaults instruction to improve", () => {
  const result = parseRewriteRequest({
    text: "Đoạn văn cần chỉnh sửa.",
  });

  if (result.instruction !== "improve") {
    throw new Error(`Expected default instruction improve, got ${result.instruction}`);
  }
});

Deno.test("parseRewriteRequest rejects missing text", () => {
  let error: unknown;

  try {
    parseRewriteRequest({ text: "   " });
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for missing text");
  }

  if (error.code !== "missing_text" || error.status !== 400) {
    throw new Error(`Expected missing_text 400, got ${error.code} ${error.status}`);
  }
});

Deno.test("parseRewriteRequest rejects invalid instruction", () => {
  let error: unknown;

  try {
    parseRewriteRequest({
      text: "Đoạn văn",
      instruction: "translate",
    });
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for invalid instruction");
  }

  if (error.code !== "invalid_instruction" || error.status !== 400) {
    throw new Error(`Expected invalid_instruction 400, got ${error.code} ${error.status}`);
  }
});

Deno.test("parseRewriteRequest rejects text longer than 5000 characters", () => {
  let error: unknown;

  try {
    parseRewriteRequest({
      text: "a".repeat(5001),
      instruction: "improve",
    });
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for too long text");
  }

  if (error.code !== "text_too_long" || error.status !== 400) {
    throw new Error(`Expected text_too_long 400, got ${error.code} ${error.status}`);
  }
});
