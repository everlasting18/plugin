import {
  buildMissingLicenseKeyResponse,
  buildMissingSiteUrlResponse,
  getLicenseStatus,
  getUsageSummary,
  parseLicenseStatusRequest,
  parseLicenseUsageRequest,
  parseLicenseVerifyRequest,
  validateLicense,
} from "../src/usecases/license.ts";

Deno.test("parseLicenseVerifyRequest trims key and site_url", () => {
  const parsed = parseLicenseVerifyRequest({
    key: "  DEMO-PRO-123  ",
    site_url: "  https://example.com/blog/  ",
  });

  if (parsed.key !== "DEMO-PRO-123") {
    throw new Error(`Expected trimmed key, got ${parsed.key}`);
  }

  if (parsed.siteUrl !== "https://example.com/blog/") {
    throw new Error(`Expected trimmed site url, got ${parsed.siteUrl}`);
  }
});

Deno.test("parseLicenseUsageRequest trims domain", () => {
  const domain = parseLicenseUsageRequest({
    domain: "  https://example.com  ",
  });

  if (domain !== "https://example.com") {
    throw new Error(`Expected trimmed domain, got ${domain}`);
  }
});

Deno.test("parseLicenseStatusRequest returns domain and optional key", () => {
  const parsed = parseLicenseStatusRequest({
    domain: "  https://example.com/sub  ",
    key: "  KEY-123  ",
  });

  if (parsed.domain !== "https://example.com/sub") {
    throw new Error(`Expected trimmed domain, got ${parsed.domain}`);
  }

  if (parsed.key !== "KEY-123") {
    throw new Error(`Expected trimmed key, got ${parsed.key}`);
  }
});

Deno.test("missing license responses return stable defaults", () => {
  const missingKey = buildMissingLicenseKeyResponse();
  const missingSite = buildMissingSiteUrlResponse();

  if (missingKey.valid || missingKey.tier !== "free") {
    throw new Error("Expected missing key response to be invalid free tier");
  }

  if (missingSite.valid || missingSite.tier !== "free") {
    throw new Error("Expected missing site response to be invalid free tier");
  }
});

Deno.test("validateLicense returns invalid result for unknown key", async () => {
  const result = await validateLicense(
    "UNIT-UNKNOWN-KEY",
    "https://unit-unknown.example.invalid",
  );

  if (result.valid) {
    throw new Error("Expected unknown key to be invalid");
  }

  if (result.message !== "License key không hợp lệ.") {
    throw new Error(`Expected invalid message, got ${result.message}`);
  }
});

Deno.test("getUsageSummary returns free usage shape", async () => {
  const result = await getUsageSummary("https://unit-usage.example.invalid");

  if (result.domain !== "https://unit-usage.example.invalid") {
    throw new Error(`Expected domain echo, got ${result.domain}`);
  }

  if (result.limit <= 0) {
    throw new Error(`Expected positive limit, got ${result.limit}`);
  }

  if (result.count < 0 || result.remaining < 0) {
    throw new Error("Expected non-negative usage numbers");
  }
});

Deno.test("getLicenseStatus without key returns free tier with usage summary", async () => {
  const result = await getLicenseStatus("https://unit-status.example.invalid");

  if (result.tier !== "free" || result.isPro || result.licenseValid) {
    throw new Error(`Expected free status, got ${JSON.stringify(result)}`);
  }

  if (result.message !== "Free tier") {
    throw new Error(`Expected Free tier message, got ${result.message}`);
  }

  if (!result.usage) {
    throw new Error("Expected usage summary for free status");
  }
});
