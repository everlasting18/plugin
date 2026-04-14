import { config } from "../config.ts";
import type { LicenseTier, UsageSummary } from "./licenseTypes.ts";

export const FREE_LIMIT = parseInt(Deno.env.get("FREE_LIMIT") || "5", 10);
export const USE_PB = !!Deno.env.get("PB_URL") && !!Deno.env.get("PB_ADMIN_TOKEN");

const LICENSE_DB_PATH = new URL("../licenses.json", import.meta.url).pathname;
const USAGE_DB_PATH = new URL("../usage.json", import.meta.url).pathname;

interface JsonLicense {
  key: string;
  tier: LicenseTier;
  expires: number | null;
  status?: "active" | "revoked" | "expired";
  activated_at?: number;
  activated?: number;
  siteUrl?: string;
  site_url?: string;
  site_urls?: string[];
}

interface JsonUsage {
  domain_id: string;
  month: string;
  count: number;
  updatedAt: number;
}

interface PBLicenseRecord {
  id: string;
  key: string;
  tier: LicenseTier;
  status: string;
  expires: number | null;
  activated_at: number;
  site_url?: string;
}

interface PBUserDomainRecord {
  id: string;
  domain?: string;
  license_key?: string;
  is_active?: boolean;
}

interface PBUsageRecord {
  id: string;
  domain_id: string;
  month: string;
  count: number;
}

export interface StoredLicenseRecord {
  tier: LicenseTier;
  expires: number | null;
  status?: string;
  siteUrl?: string;
  siteUrls: string[];
}

export function normalizeSiteUrl(siteUrl: string): string {
  const raw = siteUrl.trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${pathname}`;
  } catch {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

export function urlToDomainId(url: string): string {
  let host: string;
  try {
    host = new URL(normalizeSiteUrl(url)).hostname.toLowerCase();
  } catch {
    host = normalizeSiteUrl(url).replace(/[^a-z0-9.]/g, "");
  }

  const clean = host.replace(/[^a-z0-9]/g, "").slice(0, 13);
  let checksum = 0;
  for (let i = 0; i < host.length; i++) checksum = (checksum * 31 + host.charCodeAt(i)) >>> 0;
  return clean + (checksum % 100).toString().padStart(2, "0");
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function readLicenses(): Promise<Record<string, JsonLicense>> {
  try {
    const raw = await Deno.readTextFile(LICENSE_DB_PATH);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeLicenses(data: Record<string, JsonLicense>): Promise<void> {
  await Deno.writeTextFile(LICENSE_DB_PATH, JSON.stringify(data, null, 2));
}

async function readUsage(): Promise<JsonUsage[]> {
  try {
    const raw = await Deno.readTextFile(USAGE_DB_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsage(records: JsonUsage[]): Promise<void> {
  await Deno.writeTextFile(USAGE_DB_PATH, JSON.stringify(records, null, 2));
}

function getJsonBoundSites(record: JsonLicense): string[] {
  const candidates = [
    ...(Array.isArray(record.site_urls) ? record.site_urls : []),
    record.siteUrl,
    record.site_url,
  ];

  return Array.from(
    new Set(
      candidates
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map(normalizeSiteUrl),
    ),
  );
}

function bindJsonLicenseToSite(record: JsonLicense, siteUrl: string): JsonLicense {
  const normalizedSite = normalizeSiteUrl(siteUrl);
  const boundSites = getJsonBoundSites(record);
  if (!boundSites.includes(normalizedSite)) {
    boundSites.push(normalizedSite);
  }

  return {
    ...record,
    siteUrl: boundSites[0],
    site_urls: boundSites,
  };
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
  siteUrl?: string,
): Promise<void> {
  const existing = await pbGetLicense(key);
  const normalizedSite = siteUrl ? normalizeSiteUrl(siteUrl) : undefined;

  if (existing) {
    await pbRequest("PATCH", `licenses/records/${existing.id}`, {
      status: "active",
      activated_at: Date.now(),
      ...(normalizedSite ? { site_url: normalizedSite } : {}),
    });
    return;
  }

  await pbRequest("POST", "licenses/records", {
    key: key.toUpperCase(),
    tier,
    status: "active",
    expires,
    activated_at: Date.now(),
    ...(normalizedSite ? { site_url: normalizedSite } : {}),
  });
}

async function pbGetUsage(domainId: string, month: string): Promise<PBUsageRecord | null> {
  const result = await pbRequest(
    "GET",
    `usage/records?filter=domain_id="${encodeURIComponent(domainId)}" && month="${encodeURIComponent(month)}"&limit=1`,
  ) as { items: PBUsageRecord[] };
  return result.items?.[0] ?? null;
}

async function pbGetUserDomainBinding(
  siteUrl: string,
  key: string,
): Promise<PBUserDomainRecord | null> {
  const normalizedSite = normalizeSiteUrl(siteUrl);
  const normalizedKey = key.trim().toUpperCase();
  try {
    const result = await pbRequest(
      "GET",
      `user_domains/records?filter=domain="${encodeURIComponent(normalizedSite)}" && license_key="${encodeURIComponent(normalizedKey)}" && is_active=true&limit=1`,
    ) as { items: PBUserDomainRecord[] };
    return result.items?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function findStoredLicense(key: string): Promise<StoredLicenseRecord | null> {
  const normalizedKey = key.trim().toUpperCase();

  if (USE_PB) {
    const record = await pbGetLicense(normalizedKey);
    if (!record) return null;
    const siteUrl = record.site_url ? normalizeSiteUrl(record.site_url) : undefined;
    return {
      tier: record.tier,
      expires: record.expires,
      status: record.status,
      siteUrl,
      siteUrls: siteUrl ? [siteUrl] : [],
    };
  }

  const licenses = await readLicenses();
  const record = licenses[normalizedKey];
  if (!record) return null;
  return {
    tier: record.tier,
    expires: record.expires,
    status: record.status,
    siteUrl: record.siteUrl ? normalizeSiteUrl(record.siteUrl) : undefined,
    siteUrls: getJsonBoundSites(record),
  };
}

export async function hasLicenseSiteBinding(siteUrl: string, key: string): Promise<boolean> {
  if (!USE_PB) {
    const record = await findStoredLicense(key);
    if (!record) return false;
    return record.siteUrls.includes(normalizeSiteUrl(siteUrl));
  }

  return !!await pbGetUserDomainBinding(siteUrl, key);
}

export async function saveActivatedLicense(
  key: string,
  tier: LicenseTier,
  expires: number | null,
  siteUrl: string,
): Promise<void> {
  const normalizedKey = key.trim().toUpperCase();
  const normalizedSite = normalizeSiteUrl(siteUrl);

  if (USE_PB) {
    await pbSaveLicense(normalizedKey, tier, expires, normalizedSite);
    return;
  }

  const licenses = await readLicenses();
  const current = licenses[normalizedKey];
  const baseRecord: JsonLicense = current ?? {
    key: normalizedKey,
    tier,
    expires,
    status: "active",
    activated_at: Date.now(),
  };

  licenses[normalizedKey] = bindJsonLicenseToSite(
    {
      ...baseRecord,
      key: normalizedKey,
      tier,
      expires,
      status: "active",
      activated_at: Date.now(),
    },
    normalizedSite,
  );
  await writeLicenses(licenses);
}

export async function readUsageSummary(siteUrl: string): Promise<UsageSummary> {
  const normalizedSite = normalizeSiteUrl(siteUrl);
  const domainId = urlToDomainId(normalizedSite);
  const month = getCurrentMonth();

  if (USE_PB) {
    const usage = await pbGetUsage(domainId, month);
    const current = usage?.count ?? 0;
    return {
      allowed: current < FREE_LIMIT,
      count: current,
      limit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - current),
    };
  }

  const records = await readUsage();
  const current = records.find((record) => record.domain_id === domainId && record.month === month)?.count ?? 0;
  return {
    allowed: current < FREE_LIMIT,
    count: current,
    limit: FREE_LIMIT,
    remaining: Math.max(0, FREE_LIMIT - current),
  };
}

export async function increaseUsage(siteUrl: string, amount = 1): Promise<void> {
  if (amount <= 0) return;

  const normalizedSite = normalizeSiteUrl(siteUrl);
  const domainId = urlToDomainId(normalizedSite);
  const month = getCurrentMonth();

  if (USE_PB) {
    const existing = await pbGetUsage(domainId, month);
    if (existing) {
      await pbRequest("PATCH", `usage/records/${existing.id}`, {
        count: existing.count + amount,
      });
      return;
    }

    await pbRequest("POST", "usage/records", {
      domain_id: domainId,
      month,
      count: amount,
    });
    return;
  }

  const records = await readUsage();
  const idx = records.findIndex((record) => record.domain_id === domainId && record.month === month);
  if (idx >= 0) {
    records[idx].count += amount;
    records[idx].updatedAt = Date.now();
  } else {
    records.push({ domain_id: domainId, month, count: amount, updatedAt: Date.now() });
  }
  await writeUsage(records);
}
