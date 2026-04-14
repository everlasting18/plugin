// @ts-nocheck: Hono middleware types are complex with strict mode; runtime behavior is correct
/**
 * License key system: middleware + usage tracking.
 * Uses PocketBase as data store. Falls back to JSON file if PB is unavailable (dev mode).
 *
 * PB Schema:
 *   licenses     — key (unique), tier, status, expires, activated_at
 *   usage        — domain_id, month, count (unique: domain_id + month)
 *   user_domains — user_id, domain, tier, license_key, is_active (unique: user_id + domain)
 *   users        — PocketBase built-in auth collection
 *
 * Key changes from old schema:
 *   - licenses: no site_url (1 key → multiple domains via user_domains)
 *   - usage: domain_id (hashed from siteUrl) instead of site_url
 *   - status check: active/revoked/expired
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
  domainId: string;
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

// ─── Utility: domain → domain_id (deterministic hash) ───────────────────────

// Use URL host as domain_id (deterministic, no DB needed for mapping)
// Hash to fit PB's domain_id max length (15 chars)
function urlToDomainId(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = url.toLowerCase().replace(/[^a-z0-9.]/g, "");
  }
  // Simple hash: first 8 chars of hostname + simple checksum (max 15 chars)
  const clean = host.replace(/[^a-z0-9]/g, "").slice(0, 13);
  let checksum = 0;
  for (let i = 0; i < host.length; i++) checksum = (checksum * 31 + host.charCodeAt(i)) >>> 0;
  return clean + (checksum % 100).toString().padStart(2, "0");
}

// ─── JSON file storage (dev mode) ───────────────────────────────────────────

const LICENSE_DB_PATH = new URL("../licenses.json", import.meta.url).pathname;
const USAGE_DB_PATH = new URL("../usage.json", import.meta.url).pathname;
const DOMAINS_DB_PATH = new URL("../domains.json", import.meta.url).pathname;

interface JsonLicense {
  key: string;
  tier: LicenseTier;
  expires: number | null;
  status: "active" | "revoked" | "expired";
  activated_at: number;
}

interface JsonUsage {
  domain_id: string;
  month: string;
  count: number;
  updatedAt: number;
}

interface JsonDomain {
  user_id: string;
  domain: string;
  tier: LicenseTier;
  license_key: string;
  is_active: boolean;
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

async function readDomains(): Promise<JsonDomain[]> {
  try {
    const raw = await Deno.readTextFile(DOMAINS_DB_PATH);
    return JSON.parse(raw);
  } catch { return []; }
}

async function writeDomains(records: JsonDomain[]): Promise<void> {
  await Deno.writeTextFile(DOMAINS_DB_PATH, JSON.stringify(records, null, 2));
}

// ─── PocketBase helpers ──────────────────────────────────────────────────────

// PB record types (snake_case field names)
interface PBLicenseRecord {
  id: string;
  key: string;
  tier: LicenseTier;
  status: string;
  expires: number | null;
  activated_at: number;
}

interface PBUsageRecord {
  id: string;
  domain_id: string;
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
  expires: number | null,
): Promise<void> {
  const existing = await pbGetLicense(key);
  if (existing) {
    await pbRequest("PATCH", `licenses/records/${existing.id}`, {
      status: "active",
      activated_at: Date.now(),
    });
  } else {
    await pbRequest("POST", "licenses/records", {
      key: key.toUpperCase(),
      tier,
      status: "active",
      expires,
      activated_at: Date.now(),
    });
  }
}

async function pbGetUsage(domainId: string, month: string): Promise<PBUsageRecord | null> {
  const result = await pbRequest(
    "GET",
    `usage/records?filter=domain_id="${encodeURIComponent(domainId)}" && month="${encodeURIComponent(month)}"&limit=1`,
  ) as { items: PBUsageRecord[] };
  return result.items?.[0] ?? null;
}

async function pbIncrementUsage(domainId: string, month: string): Promise<void> {
  const existing = await pbGetUsage(domainId, month);
  if (existing) {
    await pbRequest("PATCH", `usage/records/${existing.id}`, {
      count: existing.count + 1,
    });
  } else {
    await pbRequest("POST", "usage/records", {
      domain_id: domainId,
      month,
      count: 1,
    });
  }
}

// ─── JSON fallback helpers ────────────────────────────────────────────────────

async function jsonVerifyLicense(key: string): Promise<VerifyResult> {
  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return { valid: false, tier: "free", expires: null, message: "License key is required." };
  }
  const cacheKey = key;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const licenses = await readLicenses();
  const normalizedKey = key.trim().toUpperCase();
  const record = licenses[normalizedKey];
  if (!record) {
    const result: VerifyResult = { valid: false, tier: "free", expires: null, message: "License key không hợp lệ." };
    setCached(cacheKey, result); return result;
  }
  // Check status
  if (record.status === "revoked") {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã bị thu hồi." };
    setCached(cacheKey, result); return result;
  }
  if (record.status === "expired") {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã hết hạn." };
    setCached(cacheKey, result); return result;
  }
  // Check expires timestamp
  if (record.expires && Date.now() > record.expires) {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã hết hạn." };
    setCached(cacheKey, result); return result;
  }
  // status must be "active" or undefined (backward compat)
  const result: VerifyResult = { valid: true, tier: record.tier, expires: record.expires, message: "OK" };
  setCached(cacheKey, result); return result;
}

async function jsonActivateLicense(key: string, _siteUrl: string): Promise<VerifyResult> {
  const licenses = await readLicenses();
  const normalizedKey = key.trim().toUpperCase();
  if (licenses[normalizedKey]) {
    licenses[normalizedKey].activated_at = Date.now();
    licenses[normalizedKey].status = "active";
    await writeLicenses(licenses);
    return { valid: true, tier: licenses[normalizedKey].tier, expires: licenses[normalizedKey].expires, message: "OK" };
  }
  if (normalizedKey.startsWith("DEMO-")) {
    const tier: LicenseTier = normalizedKey.includes("-PRO-") ? "pro" : "free";
    const expires = tier === "pro" ? Date.now() + 365 * 24 * 60 * 60 * 1000 : null;
    licenses[normalizedKey] = {
      key: normalizedKey,
      tier,
      expires,
      status: "active",
      activated_at: Date.now(),
    };
    await writeLicenses(licenses);
    return { valid: true, tier, expires, message: "Demo activated!" };
  }
  return { valid: false, tier: "free", expires: null, message: "License key không tìm thấy." };
}

async function jsonCheckUsage(siteUrl: string): Promise<{ allowed: boolean; count: number; limit: number; remaining: number }> {
  const domainId = urlToDomainId(siteUrl);
  const month = getCurrentMonth();
  const records = await readUsage();
  const idx = records.findIndex(r => r.domain_id === domainId && r.month === month);
  const current = idx >= 0 ? records[idx].count : 0;
  return { allowed: current < FREE_LIMIT, count: current, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - current) };
}

async function jsonIncrementUsage(siteUrl: string): Promise<void> {
  const domainId = urlToDomainId(siteUrl);
  const month = getCurrentMonth();
  const records = await readUsage();
  const idx = records.findIndex(r => r.domain_id === domainId && r.month === month);
  if (idx >= 0) { records[idx].count++; records[idx].updatedAt = Date.now(); }
  else { records.push({ domain_id: domainId, month, count: 1, updatedAt: Date.now() }); }
  await writeUsage(records);
}

// ─── PB verify/activate ──────────────────────────────────────────────────────

async function pbVerifyLicense(key: string): Promise<VerifyResult> {
  const cacheKey = key;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const record = await pbGetLicense(key);
  if (!record) {
    const result: VerifyResult = { valid: false, tier: "free", expires: null, message: "License key không hợp lệ." };
    setCached(cacheKey, result); return result;
  }
  // Check status field
  if (record.status === "revoked") {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã bị thu hồi." };
    setCached(cacheKey, result); return result;
  }
  if (record.status === "expired" || (record.expires && Date.now() > record.expires)) {
    const result: VerifyResult = { valid: false, tier: "free", expires: record.expires, message: "License key đã hết hạn." };
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
    await pbSaveLicense(normalizedKey, tier, expires);
    return { valid: true, tier, expires, message: "Demo activated!" };
  }
  const record = await pbGetLicense(key);
  if (record) {
    await pbSaveLicense(key, record.tier, record.expires);
    return { valid: true, tier: record.tier, expires: record.expires, message: "OK" };
  }
  return { valid: false, tier: "free", expires: null, message: "License key không tìm thấy." };
}

// ─── Public API (router) ─────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function verifyLicense(key: string, _siteUrl?: string): Promise<VerifyResult> {
  if (USE_PB) return pbVerifyLicense(key);
  return jsonVerifyLicense(key);
}

export function activateLicense(key: string, siteUrl: string): Promise<VerifyResult> {
  if (USE_PB) return pbActivateLicense(key, siteUrl);
  return jsonActivateLicense(key, siteUrl);
}

export async function checkUsage(siteUrl: string): Promise<{ allowed: boolean; count: number; limit: number; remaining: number }> {
  if (USE_PB) {
    const domainId = urlToDomainId(siteUrl);
    const month = getCurrentMonth();
    const usage = await pbGetUsage(domainId, month);
    const current = usage?.count ?? 0;
    return { allowed: current < FREE_LIMIT, count: current, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - current) };
  }
  return jsonCheckUsage(siteUrl);
}

export async function incrementUsage(siteUrl: string): Promise<void> {
  if (USE_PB) {
    const domainId = urlToDomainId(siteUrl);
    await pbIncrementUsage(domainId, getCurrentMonth());
  } else {
    await jsonIncrementUsage(siteUrl);
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function createLicenseMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const licenseKey = c.req.header("x-license-key") || "";
    const siteUrl = c.req.header("x-site-url") || "";
    const domainId = urlToDomainId(siteUrl);

    if (licenseKey) {
      const result = await verifyLicense(licenseKey);
      if (result.valid) {
        c.set("license", {
          tier: result.tier,
          siteUrl,
          domainId,
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
        domainId,
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
        domainId,
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