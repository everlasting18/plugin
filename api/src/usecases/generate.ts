import { createAgentStream } from "../agents/orchestrator.ts";
import {
  DEFAULT_CONTENT_AUDIENCE,
  DEFAULT_CONTENT_FRAMEWORK,
  DEFAULT_CONTENT_LANGUAGE,
  DEFAULT_CONTENT_LENGTH,
  DEFAULT_CONTENT_TONE,
  DEFAULT_WEB_SEARCH,
} from "../agents/contentConfig.ts";
import type { OrchestratorInput, OrchestratorOutput } from "../agents/types.ts";
import { ApiError, readBoolean, readNumber, readOptionalTrimmedString, readString } from "../lib/http.ts";
import { incrementUsage } from "../lib/licenseService.ts";
import type { AuthContext } from "../lib/licenseTypes.ts";
import { logger } from "../lib/logStore.ts";

export function parseGenerateInput(body: Record<string, unknown>): OrchestratorInput {
  const keyword = readString(body.keyword);
  const tone = readString(body.tone, DEFAULT_CONTENT_TONE);
  const audience = readString(body.audience, DEFAULT_CONTENT_AUDIENCE);
  const language = readString(body.language, DEFAULT_CONTENT_LANGUAGE);
  const framework = readString(body.framework, DEFAULT_CONTENT_FRAMEWORK);
  const niche = readOptionalTrimmedString(body.niche);
  const length = readString(body.length, DEFAULT_CONTENT_LENGTH);
  const webSearch = readBoolean(body.webSearch, DEFAULT_WEB_SEARCH);
  const count = Math.min(Math.max(readNumber(body.count, 1), 1), 3);

  return {
    keyword,
    tone,
    count,
    audience,
    language,
    framework,
    niche,
    length,
    webSearch,
  };
}

export function validateGenerateRequest(
  input: OrchestratorInput,
  auth: AuthContext,
  reqId: string,
): void {
  if (!input.keyword.trim()) {
    logger.warn("generate request rejected — missing keyword", { reqId });
    throw new ApiError(400, "missing_keyword", "Vui lòng nhập keyword hoặc chủ đề bài viết.");
  }

  if (!auth.isPro && input.count > auth.usageRemaining) {
    const remaining = Math.max(auth.usageRemaining, 0);
    logger.warn("generate request rejected — insufficient free quota", {
      reqId,
      requestedCount: input.count,
      remaining,
      siteUrl: auth.siteUrl || null,
    });
    throw new ApiError(
      429,
      "usage_limit_reached",
      remaining > 0
        ? `Bạn chỉ còn ${remaining} bài miễn phí trong tháng này. Hãy giảm số lượng hoặc nâng cấp Pro.`
        : "Bạn đã dùng hết bài viết miễn phí trong tháng này. Vui lòng nâng cấp Pro.",
    );
  }
}

export function logGenerateRequest(input: OrchestratorInput, auth: AuthContext, reqId: string): void {
  logger.info("generate request started", {
    reqId,
    keyword: input.keyword,
    tone: input.tone,
    count: input.count,
    audience: input.audience,
    language: input.language,
    framework: input.framework,
    niche: input.niche || null,
    length: input.length,
    webSearch: !!input.webSearch,
    tier: auth.tier,
  });
}

export function createGenerateResultStream(
  input: OrchestratorInput,
  auth: AuthContext,
  reqId: string,
): ReadableStream<Uint8Array> {
  return createAgentStream(input, reqId, async (result: OrchestratorOutput) => {
    if (!auth.isPro && auth.siteUrl && result.posts.length > 0) {
      await incrementUsage(auth.siteUrl, result.posts.length);
      logger.info("generate usage incremented", {
        reqId,
        siteUrl: auth.siteUrl,
        amount: result.posts.length,
      });
    }
  });
}
