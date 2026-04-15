import {
  ApiError,
  expectRecord,
  readBoolean,
  readNumber,
  readOptionalTrimmedString,
  readString,
} from "../src/lib/http.ts";

Deno.test("expectRecord accepts plain object", () => {
  const result = expectRecord({ ok: true });

  if (result.ok !== true) {
    throw new Error("Expected plain object to pass");
  }
});

Deno.test("expectRecord rejects arrays and non-objects", () => {
  for (const value of [null, [], "text", 123]) {
    let error: unknown;

    try {
      expectRecord(value);
    } catch (caught) {
      error = caught;
    }

    if (!(error instanceof ApiError)) {
      throw new Error(`Expected ApiError for value ${String(value)}`);
    }

    if (error.code !== "invalid_body" || error.status !== 400) {
      throw new Error(`Expected invalid_body 400, got ${error.code} ${error.status}`);
    }
  }
});

Deno.test("read helpers normalize primitive values safely", () => {
  if (readString(123, "fallback") !== "fallback") {
    throw new Error("Expected readString fallback");
  }

  if (readOptionalTrimmedString("  seo  ") !== "seo") {
    throw new Error("Expected trimmed optional string");
  }

  if (readOptionalTrimmedString("   ") !== undefined) {
    throw new Error("Expected empty trimmed string to become undefined");
  }

  if (readBoolean(true) !== true || readBoolean("yes", false) !== false) {
    throw new Error("Expected readBoolean coercion behavior");
  }

  if (readNumber("42") !== 42 || readNumber("nope", 7) !== 7) {
    throw new Error("Expected readNumber parsing behavior");
  }
});
