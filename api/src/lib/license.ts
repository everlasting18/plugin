/**
 * License key system: middleware + usage tracking.
 * Uses PocketBase as data store. Falls back to JSON file if PB is unavailable (dev mode).
 */

import { config } from "../config.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LicenseTier = "free" | "pro";

export interface VerifyResult {
  valid: boolean;
  tier: LicenseTier;
  expires: number | null;
  message: string;
}

export interface AuthContext {
  tier: LicenseTier;
  siteUrl: string;
  isPro: boolean;
  usageCount: number;
  usageLimit: number;
  usageRemaining: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const FREE_LIMIT = parseInt(Deno.env.get("FREE_LIMIT") || "5", 10);
const USE_PB = !!Deno.env.get("PB_URL") && !!Deno.env.get("PB_ADMIN_TOKEN");

// ─── In-memory cache (5 min TTL) ────────────────────────────────────────────

const cache = new Map<string, { result: VerifyResult; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key: string): VerifyResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.result;
}

function setCached(key: string, result: VerifyResult) {
  cache.set(key, { result, expires: Date.now() + CACHE_TTL });
}

// ─── JSON file storage (dev mode) ───────────────────────────────────────────

const LICENSE_DB_PATH = new URL("../licenses.json", import.meta.url).pathname;
const USAGE_DB_PATH = new URL("../usage.json", import.meta.url).pathname;

interface JsonLicense {
  key: string;
  tier: LicenseTier;
  siteUrl: string;
  expires: number | null;
  activated: number;
}

interface JsonUsage {
  siteUrl: string;
  month: string;
  count: number;
  updatedAt: number;
}

async function readLicenses(): Promise<Record<string, JsonLicense>> {
  try {
    const raw = await Deno.readTextFile(LICENSE_DB_PATH);
    return JSON.parse(raw);
  } catch { return {}; }
}

async function writeLicenses(data: Record<string, JsonLicense>): Promise<void> {
  await Deno.writeTextFile(LICENSE_DB_PATH, JSON.stringify(data, null, 2));
}

async function readUsage(): Promise<JsonUsage[]> {
  try {
    const raw = await Deno.readTextFile(USAGE_DB_PATH);
    return JSON.parse(raw);
  } catch { return []; }
}

async function writeUsage(records: JsonUsage[]): Promise<void> {
  await Deno.writeTextFile(USAGE_DB_PATH, JSON.stringify(records, null, 2));
}

// ─── PocketBase helpers ──────────────────────────────────────────────────────

// PB record types (snake_case field names)
interface PBLicenseRecord {
  id: string;
  key: string;
  tier: LicenseTier;
  site_url: string;
  expires: number | null;
  activated_at: number;
}

interface PBUsageRecord {
  id: string;
  site_url: string;
  month: string;
  count: number;
}

async function pbRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${config.pbUrl}/api/collections/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.pbAdminToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PB ${method} ${endpoint}: ${res.status}\n${text}`);
  }
  if (method === "DELETE") return null;
  return res.json();
}

async function pbGetLicense(key: string): Promise<PBLicenseRecord | null> {
  const result = await pbRequest(
    "GET",
    `licenses/records?filter=key="${encodeURIComponent(key.toUpperCase())}"&limit=1`,
  ) as { items: PBLicenseRecord[] };
  return result.items?.[0] ?? null;
}

async function pbSaveLicense(
  key: string,
  tier: LicenseTier,
  siteUrl: string,
  _expires: number | null,
): Promise<void> {
  const existing = await pbGetLicense(key);
  if (existing) {
    // Only update site_url (activated_at/expires have PB constraints)
    await pbRequest("PATCH", `licenses/records/${existing.id}`, {
      site_url: siteUrl,
    });
  } else {
    await pbRequest("POST", "licenses/records", {
      key: key.toUpperCase(),
      tier,
      site_url: siteUrl,
      status: "active",
    });
  }
}

async function pbGetUsage(siteUrl: string, month: string): Promise<PBUsageRecord | null> {
  const result = await pbRequest(
    "GET",
    `usage/records?filter=site_url="${encodeURIComponent(siteUrl)}" && month="${encodeURIComponent(month)}"&limit=1`,
  ) as { items: PBUsageRecord[] };
  return result.items?.[0] ?? null;
}

async function pbIncrementUsage(siteUrl: string, month: string): Promise<void> {
  const existing = await pbGetUsage(siteUrl, month);
  if (existing) {
    await pbRequest("PATCH", `usage/records/${existing.id}`, {
      count: existing.count + 1,
    });
  } else {
    await pbRequest("POST", "usage/records", {
      site_url: siteUrl,
      month,
      count: 1,
    });
  }
}

// ─── JSON fallback helpers ────────────────────────────────────────────────────

async function jsonVerifyLicense(key: string, siteUrl?: string): Promise<VerifyResult> {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return { valid: false, tier: "free", expires: null, message: "License key is required." };
  }
  const cacheKey = `${key}:${siteUrl || ""}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const licenses = await readLicenses();
  const normalizedKey = key.trim().toUpperCase();
  const record = licenses[normalizedKey];
  if (!record) {
    const result: VerifyResult = { valid: false, tier: "free", expires: null, message: "License key không hợp lệ." };
    setCached(cacheKey, result); return result;
  }
  if (record.expires && Date.now() > record.expires) {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã hết hạn." };
    setCached(cacheKey, result); return result;
  }
  if (siteUrl && record.siteUrl && record.siteUrl !== siteUrl) {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key không được đăng ký cho site này." };
    setCached(cacheKey, result); return result;
  }
  const result: VerifyResult = { valid: true, tier: record.tier, expires: record.expires, message: "OK" };
  setCached(cacheKey, result); return result;
}

async function jsonActivateLicense(key: string, siteUrl: string): Promise<VerifyResult> {
  const licenses = await readLicenses();
  const normalizedKey = key.trim().toUpperCase();
  if (licenses[normalizedKey]) {
    licenses[normalizedKey].siteUrl = siteUrl;
    licenses[normalizedKey].activated = Date.now();
    await writeLicenses(licenses);
    return { valid: true, tier: licenses[normalizedKey].tier, expires: licenses[normalizedKey].expires, message: "OK" };
  }
  if (normalizedKey.startsWith("DEMO-")) {
    const tier: LicenseTier = normalizedKey.includes("-PRO-") ? "pro" : "free";
    licenses[normalizedKey] = {
      key: normalizedKey,
      tier,
      siteUrl,
      expires: tier === "pro" ? Date.now() + 365 * 24 * 60 * 60 * 1000 : null,
      activated: Date.now(),
    };
    await writeLicenses(licenses);
    return { valid: true, tier, expires: licenses[normalizedKey].expires, message: "Demo activated!" };
  }
  return { valid: false, tier: "free", expires: null, message: "License key không tìm thấy." };
}

async function jsonCheckUsage(siteUrl: string): Promise<{ allowed: boolean; count: number; limit: number; remaining: number }> {
  const month = getCurrentMonth();
  const records = await readUsage();
  const idx = records.findIndex(r => r.siteUrl === siteUrl && r.month === month);
  const current = idx >= 0 ? records[idx].count : 0;
  return { allowed: current < FREE_LIMIT, count: current, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - current) };
}

async function jsonIncrementUsage(siteUrl: string): Promise<void> {
  const month = getCurrentMonth();
  const records = await readUsage();
  const idx = records.findIndex(r => r.siteUrl === siteUrl && r.month === month);
  if (idx >= 0) { records[idx].count++; records[idx].updatedAt = Date.now(); }
  else { records.push({ siteUrl, month, count: 1, updatedAt: Date.now() }); }
  await writeUsage(records);
}

// ─── PB verify/activate ──────────────────────────────────────────────────────

async function pbVerifyLicense(key: string, siteUrl?: string): Promise<VerifyResult> {
  const cacheKey = `${key}:${siteUrl || ""}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const record = await pbGetLicense(key);
  if (!record) {
    const result: VerifyResult = { valid: false, tier: "free", expires: null, message: "License key không hợp lệ." };
    setCached(cacheKey, result); return result;
  }
  if (record.expires && Date.now() > record.expires) {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã hết hạn." };
    setCached(cacheKey, result); return result;
  }
  if (siteUrl && record.site_url && record.site_url !== siteUrl) {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key không được đăng ký cho site này." };
    setCached(cacheKey, result); return result;
  }
  const result: VerifyResult = { valid: true, tier: record.tier, expires: record.expires, message: "OK" };
  setCached(cacheKey, result); return result;
}

async function pbActivateLicense(key: string, siteUrl: string): Promise<VerifyResult> {
  const normalizedKey = key.trim().toUpperCase();
  if (normalizedKey.startsWith("DEMO-")) {
    const tier: LicenseTier = normalizedKey.includes("-PRO-") ? "pro" : "free";
    const expires = tier === "pro" ? Date.now() + 365 * 24 * 60 * 60 * 1000 : null;
    await pbSaveLicense(normalizedKey, tier, siteUrl, expires);
    return { valid: true, tier, expires, message: "Demo activated!" };
  }
  const record = await pbGetLicense(key);
  if (record) {
    await pbSaveLicense(key, record.tier, siteUrl, record.expires);
    return { valid: true, tier: record.tier, expires: record.expires, message: "OK" };
  }
  return { valid: false, tier: "free", expires: null, message: "License key không tìm thấy." };
}

// ─── Public API (router) ─────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function verifyLicense(key: string, siteUrl?: string): Promise<VerifyResult> {
  if (USE_PB) return pbVerifyLicense(key, siteUrl);
  return jsonVerifyLicense(key, siteUrl);
}

export function activateLicense(key: string, siteUrl: string): Promise<VerifyResult> {
  if (USE_PB) return pbActivateLicense(key, siteUrl);
  return jsonActivateLicense(key, siteUrl);
}

export async function checkUsage(siteUrl: string): Promise<{ allowed: boolean; count: number; limit: number; remaining: number }> {
  if (USE_PB) {
    const month = getCurrentMonth();
    const usage = await pbGetUsage(siteUrl, month);
    const current = usage?.count ?? 0;
    return { allowed: current < FREE_LIMIT, count: current, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - current) };
  }
  return jsonCheckUsage(siteUrl);
}

export async function incrementUsage(siteUrl: string): Promise<void> {
  if (USE_PB) {
    await pbIncrementUsage(siteUrl, getCurrentMonth());
  } else {
    await jsonIncrementUsage(siteUrl);
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function createLicenseMiddleware() {
  return async function licenseMiddleware(
    c: {
      req: { header: (name: string) => string | null };
      set: (key: string, val: AuthContext) => void;
      json: (body: unknown, status?: number) => Response;
    },
    next: () => Promise<void>,
  ) {
    const licenseKey = c.req.header("x-license-key") || "";
    const siteUrl = c.req.header("x-site-url") || "";

    if (licenseKey) {
      const result = await verifyLicense(licenseKey, siteUrl || undefined);
      if (result.valid) {
        c.set("license", {
          tier: result.tier,
          siteUrl,
          isPro: result.tier === "pro",
          usageCount: 0,
          usageLimit: result.tier === "pro" ? -1 : FREE_LIMIT,
          usageRemaining: result.tier === "pro" ? -1 : FREE_LIMIT,
        } satisfies AuthContext);
        await next(); return;
      }
      c.set("license", {
        tier: "free",
        siteUrl,
        isPro: false,
        usageCount: 0,
        usageLimit: FREE_LIMIT,
        usageRemaining: 0,
      } satisfies AuthContext);
      return c.json({ success: false, code: "license_invalid", message: result.message }, 403);
    }

    if (siteUrl) {
      const { allowed, count, limit, remaining } = await checkUsage(siteUrl);
      if (!allowed) {
        return c.json({
          success: false,
          code: "usage_limit_reached",
          message: `Bạn đã dùng hết ${limit} bài viết miễn phí/tháng. Vui lòng nâng cấp Pro.`,
        }, 429);
      }
      c.set("license", {
        tier: "free",
        siteUrl,
        isPro: false,
        usageCount: count,
        usageLimit: limit,
        usageRemaining: remaining - 1,
      } satisfies AuthContext);
      await next();
      await incrementUsage(siteUrl);
      return;
    }

    return c.json({
      success: false,
      code: "auth_required",
      message: "Vui lòng cung cấp license key hoặc site URL.",
    }, 401);
  };
}
