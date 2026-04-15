import {
  logGenerateRequest,
  parseGenerateInput,
  validateGenerateRequest,
} from "../src/usecases/generate.ts";
import type { AuthContext } from "../src/lib/licenseTypes.ts";
import { ApiError } from "../src/lib/http.ts";

function createAuth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    tier: "free",
    siteUrl: "https://example.com",
    domainId: "example01",
    isPro: false,
    usageCount: 0,
    usageLimit: 5,
    usageRemaining: 5,
    ...overrides,
  };
}

Deno.test("parseGenerateInput applies defaults and clamps count", () => {
  const input = parseGenerateInput({
    keyword: "seo wordpress",
    count: 99,
  });

  if (input.keyword !== "seo wordpress") {
    throw new Error(`Expected keyword, got ${input.keyword}`);
  }

  if (input.count !== 3) {
    throw new Error(`Expected count to clamp at 3, got ${input.count}`);
  }

  if (input.framework !== "auto") {
    throw new Error(`Expected default framework auto, got ${input.framework}`);
  }

  if (input.language !== "vi") {
    throw new Error(`Expected default language vi, got ${input.language}`);
  }
});

Deno.test("parseGenerateInput keeps optional niche trimmed", () => {
  const input = parseGenerateInput({
    keyword: "seo local",
    niche: "  nha khoa  ",
    count: 0,
    webSearch: false,
  });

  if (input.niche !== "nha khoa") {
    throw new Error(`Expected trimmed niche, got ${input.niche}`);
  }

  if (input.count !== 1) {
    throw new Error(`Expected count to clamp at 1, got ${input.count}`);
  }

  if (input.webSearch !== false) {
    throw new Error("Expected explicit webSearch=false");
  }
});

Deno.test("validateGenerateRequest rejects missing keyword", () => {
  let error: unknown;

  try {
    validateGenerateRequest(
      parseGenerateInput({ keyword: "   " }),
      createAuth(),
      "req-missing-keyword",
    );
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for missing keyword");
  }

  if (error.code !== "missing_keyword" || error.status !== 400) {
    throw new Error(`Expected missing_keyword 400, got ${error.code} ${error.status}`);
  }
});

Deno.test("validateGenerateRequest rejects count beyond remaining free quota", () => {
  let error: unknown;

  try {
    validateGenerateRequest(
      parseGenerateInput({ keyword: "seo wordpress", count: 3 }),
      createAuth({ usageRemaining: 1 }),
      "req-free-quota",
    );
  } catch (caught) {
    error = caught;
  }

  if (!(error instanceof ApiError)) {
    throw new Error("Expected ApiError for quota overflow");
  }

  if (error.code !== "usage_limit_reached" || error.status !== 429) {
    throw new Error(`Expected usage_limit_reached 429, got ${error.code} ${error.status}`);
  }
});

Deno.test("validateGenerateRequest allows pro user regardless of remaining free quota", () => {
  validateGenerateRequest(
    parseGenerateInput({ keyword: "seo wordpress", count: 3 }),
    createAuth({ tier: "pro", isPro: true, usageRemaining: 0 }),
    "req-pro-ok",
  );
});

Deno.test("logGenerateRequest accepts valid input without throwing", () => {
  const input = parseGenerateInput({
    keyword: "seo wordpress",
    count: 1,
    audience: "professional",
  });

  logGenerateRequest(input, createAuth(), "req-log-ok");
});
