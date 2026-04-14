import type { MiddlewareHandler } from "hono";
import { checkUsage, getFreeLimit, verifyLicense } from "./licenseService.ts";
import { normalizeSiteUrl, urlToDomainId } from "./licenseStorage.ts";
import type { AuthContext } from "./licenseTypes.ts";

type LicenseMiddlewareVars = {
  reqId: string;
  license: AuthContext;
};

function buildAuthContext(
  siteUrl: string,
  tier: "free" | "pro",
  usageCount: number,
  usageLimit: number,
  usageRemaining: number,
): AuthContext {
  return {
    tier,
    siteUrl,
    domainId: urlToDomainId(siteUrl),
    isPro: tier === "pro",
    usageCount,
    usageLimit,
    usageRemaining,
  };
}

export function createLicenseMiddleware(): MiddlewareHandler<{ Variables: LicenseMiddlewareVars }> {
  return async (c, next) => {
    const licenseKey = c.req.header("x-license-key") || "";
    const siteUrl = normalizeSiteUrl(c.req.header("x-site-url") || "");
    const freeLimit = getFreeLimit();

    if (licenseKey) {
      if (!siteUrl) {
        return c.json({
          success: false,
          code: "site_url_required",
          message: "Vui lòng gửi x-site-url cùng x-license-key.",
        }, 400);
      }

      const result = await verifyLicense(licenseKey, siteUrl);
      if (!result.valid) {
        c.set("license", buildAuthContext(siteUrl, "free", 0, freeLimit, 0));
        return c.json({ success: false, code: "license_invalid", message: result.message }, 403);
      }

      if (result.tier === "pro") {
        c.set("license", buildAuthContext(siteUrl, "pro", 0, -1, -1));
        await next();
        return;
      }

      const usage = await checkUsage(siteUrl);
      if (!usage.allowed) {
        return c.json({
          success: false,
          code: "usage_limit_reached",
          message: `Bạn đã dùng hết ${usage.limit} bài viết miễn phí/tháng. Vui lòng nâng cấp Pro.`,
        }, 429);
      }

      c.set(
        "license",
        buildAuthContext(siteUrl, "free", usage.count, usage.limit, usage.remaining),
      );
      await next();
      return;
    }

    if (siteUrl) {
      const usage = await checkUsage(siteUrl);
      if (!usage.allowed) {
        return c.json({
          success: false,
          code: "usage_limit_reached",
          message: `Bạn đã dùng hết ${usage.limit} bài viết miễn phí/tháng. Vui lòng nâng cấp Pro.`,
        }, 429);
      }

      c.set(
        "license",
        buildAuthContext(siteUrl, "free", usage.count, usage.limit, usage.remaining),
      );
      await next();
      return;
    }

    return c.json({
      success: false,
      code: "auth_required",
      message: "Vui lòng cung cấp license key hoặc site URL.",
    }, 401);
  };
}
