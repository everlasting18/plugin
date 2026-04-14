import { activateLicense, checkUsage, verifyLicense } from "../lib/licenseService.ts";
import { readOptionalTrimmedString, readString } from "../lib/http.ts";

type LicenseResponse = {
  valid: boolean;
  tier: "free" | "pro";
  expires: number | null;
  message: string;
};

export function parseLicenseVerifyRequest(body: Record<string, unknown>): {
  key?: string;
  siteUrl?: string;
} {
  return {
    key: readOptionalTrimmedString(body.key),
    siteUrl: readOptionalTrimmedString(body.site_url),
  };
}

export function parseLicenseUsageRequest(body: Record<string, unknown>): string {
  return readString(body.domain).trim();
}

export function parseLicenseStatusRequest(body: Record<string, unknown>): {
  domain: string;
  key?: string;
} {
  return {
    domain: readString(body.domain).trim(),
    key: readOptionalTrimmedString(body.key),
  };
}

export function buildMissingLicenseKeyResponse(): LicenseResponse {
  return {
    valid: false,
    tier: "free",
    expires: null,
    message: "License key is required.",
  };
}

export function buildMissingSiteUrlResponse(): LicenseResponse {
  return {
    valid: false,
    tier: "free",
    expires: null,
    message: "Site URL is required.",
  };
}

export function activateAndVerifyLicense(key: string, siteUrl: string): Promise<LicenseResponse> {
  return activateLicense(key, siteUrl);
}

export function validateLicense(key: string, siteUrl?: string): Promise<LicenseResponse> {
  return verifyLicense(key, siteUrl);
}

export async function getUsageSummary(domain: string): Promise<{
  domain: string;
  count: number;
  limit: number;
  remaining: number;
  allowed: boolean;
}> {
  const usage = await checkUsage(domain);
  return {
    domain,
    count: usage.count,
    limit: usage.limit,
    remaining: usage.remaining,
    allowed: usage.allowed,
  };
}

export async function getLicenseStatus(domain: string, key?: string): Promise<{
  domain: string;
  tier: "free" | "pro";
  isPro: boolean;
  licenseValid: boolean;
  expires: number | null;
  message: string;
  usage: {
    count: number;
    limit: number;
    remaining: number;
    allowed: boolean;
  } | null;
}> {
  if (!key) {
    const usage = await checkUsage(domain);
    return {
      domain,
      tier: "free",
      isPro: false,
      licenseValid: false,
      expires: null,
      message: "Free tier",
      usage: {
        count: usage.count,
        limit: usage.limit,
        remaining: usage.remaining,
        allowed: usage.allowed,
      },
    };
  }

  const license = await verifyLicense(key, domain);
  const isPro = license.valid && license.tier === "pro";

  if (isPro) {
    return {
      domain,
      tier: "pro",
      isPro: true,
      licenseValid: true,
      expires: license.expires,
      message: "Pro active",
      usage: null,
    };
  }

  const usage = await checkUsage(domain);
  return {
    domain,
    tier: "free",
    isPro: false,
    licenseValid: license.valid,
    expires: license.expires,
    message: license.valid ? "Free tier" : license.message,
    usage: {
      count: usage.count,
      limit: usage.limit,
      remaining: usage.remaining,
      allowed: usage.allowed,
    },
  };
}
