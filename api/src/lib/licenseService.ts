import {
  findStoredLicense,
  FREE_LIMIT,
  hasLicenseSiteBinding,
  increaseUsage,
  normalizeSiteUrl,
  readUsageSummary,
  saveActivatedLicense,
} from "./licenseStorage.ts";
import type { LicenseTier, UsageSummary, VerifyResult } from "./licenseTypes.ts";

const cache = new Map<string, { result: VerifyResult; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(key: string, siteUrl?: string): string {
  const normalizedKey = key.trim().toUpperCase();
  const normalizedSite = siteUrl ? normalizeSiteUrl(siteUrl) : "";
  return normalizedSite ? `${normalizedKey}::${normalizedSite}` : normalizedKey;
}

function getCached(key: string): VerifyResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCached(key: string, result: VerifyResult): void {
  cache.set(key, { result, expires: Date.now() + CACHE_TTL });
}

function clearCachedLicense(key: string, siteUrl?: string): void {
  const normalizedKey = key.trim().toUpperCase();
  const normalizedSite = siteUrl ? normalizeSiteUrl(siteUrl) : "";

  if (normalizedSite) {
    cache.delete(getCacheKey(normalizedKey, normalizedSite));
  }

  cache.delete(getCacheKey(normalizedKey));

  for (const cacheKey of cache.keys()) {
    if (cacheKey === normalizedKey || cacheKey.startsWith(`${normalizedKey}::`)) {
      cache.delete(cacheKey);
    }
  }
}

function buildInvalidResult(message: string, expires: number | null = null): VerifyResult {
  return { valid: false, tier: "free", expires, message };
}

export function isDemoLicenseKey(key: string): boolean {
  return key.trim().toUpperCase().startsWith("DEMO-");
}

export function inferDemoLicenseTier(key: string): LicenseTier {
  return key.trim().toUpperCase().includes("-PRO-") ? "pro" : "free";
}

export function getFreeLimit(): number {
  return FREE_LIMIT;
}

export async function verifyLicense(key: string, siteUrl?: string): Promise<VerifyResult> {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return buildInvalidResult("License key is required.");
  }

  const normalizedSite = siteUrl ? normalizeSiteUrl(siteUrl) : "";
  const cacheKey = getCacheKey(key, normalizedSite);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const record = await findStoredLicense(key);
  if (!record) {
    const result = buildInvalidResult("License key không hợp lệ.");
    setCached(cacheKey, result);
    return result;
  }

  if (record.status === "revoked") {
    const result = buildInvalidResult("License key đã bị thu hồi.", record.expires);
    setCached(cacheKey, result);
    return result;
  }

  if (record.status === "expired" || (record.expires && Date.now() > record.expires)) {
    const result = buildInvalidResult("License key đã hết hạn.", record.expires);
    setCached(cacheKey, result);
    return result;
  }

  if (normalizedSite) {
    const directMatch = record.siteUrl ? normalizeSiteUrl(record.siteUrl) === normalizedSite : false;
    const fallbackMatch = directMatch ? true : record.siteUrls.includes(normalizedSite);
    const hasBinding = fallbackMatch ? true : await hasLicenseSiteBinding(normalizedSite, key);

    if (!hasBinding) {
      const result = buildInvalidResult("License key không hợp lệ cho website này.", record.expires);
      setCached(cacheKey, result);
      return result;
    }
  }

  const result: VerifyResult = {
    valid: true,
    tier: record.tier,
    expires: record.expires,
    message: "OK",
  };
  setCached(cacheKey, result);
  return result;
}

export async function activateLicense(key: string, siteUrl: string): Promise<VerifyResult> {
  const normalizedKey = key.trim().toUpperCase();
  const normalizedSite = normalizeSiteUrl(siteUrl);
  const existing = await findStoredLicense(normalizedKey);

  if (existing) {
    if (existing.status === "revoked") {
      const result = buildInvalidResult("License key đã bị thu hồi.", existing.expires);
      clearCachedLicense(normalizedKey, normalizedSite);
      setCached(getCacheKey(normalizedKey, normalizedSite), result);
      return result;
    }

    if (existing.status === "expired" || (existing.expires && Date.now() > existing.expires)) {
      const result = buildInvalidResult("License key đã hết hạn.", existing.expires);
      clearCachedLicense(normalizedKey, normalizedSite);
      setCached(getCacheKey(normalizedKey, normalizedSite), result);
      return result;
    }

    await saveActivatedLicense(normalizedKey, existing.tier, existing.expires, normalizedSite);
    const result = {
      valid: true,
      tier: existing.tier,
      expires: existing.expires,
      message: "OK",
    };
    clearCachedLicense(normalizedKey, normalizedSite);
    setCached(getCacheKey(normalizedKey, normalizedSite), result);
    return result;
  }

  if (isDemoLicenseKey(normalizedKey)) {
    const tier = inferDemoLicenseTier(normalizedKey);
    const expires = tier === "pro" ? Date.now() + 365 * 24 * 60 * 60 * 1000 : null;
    await saveActivatedLicense(normalizedKey, tier, expires, normalizedSite);
    const result = { valid: true, tier, expires, message: "Demo activated!" };
    clearCachedLicense(normalizedKey, normalizedSite);
    setCached(getCacheKey(normalizedKey, normalizedSite), result);
    return result;
  }

  const result = buildInvalidResult("License key không tìm thấy.");
  clearCachedLicense(normalizedKey, normalizedSite);
  setCached(getCacheKey(normalizedKey, normalizedSite), result);
  return result;
}

export function checkUsage(siteUrl: string): Promise<UsageSummary> {
  return readUsageSummary(normalizeSiteUrl(siteUrl));
}

export function incrementUsage(siteUrl: string, amount = 1): Promise<void> {
  return increaseUsage(normalizeSiteUrl(siteUrl), amount);
}
