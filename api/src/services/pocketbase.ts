/**
 * PocketBase client for license + usage management.
 * Replaces the JSON file storage.
 */

const PB_URL = Deno.env.get("PB_URL") || "http://localhost:8090";
const PB_TOKEN = Deno.env.get("PB_ADMIN_TOKEN") || "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PBLicense {
  id: string;
  key: string;
  tier: "free" | "pro";
  siteUrl: string;
  expires: number | null;
  status: "active" | "revoked" | "expired";
  activatedAt: number;
  created: number;
  updated: number;
}

export interface PBUsage {
  id: string;
  siteUrl: string;
  month: string;
  count: number;
}

export interface PBUsageLog {
  id: string;
  license: string;
  siteUrl: string;
  action: "generate" | "rewrite" | "meta";
  keyword: string;
  status: "success" | "error" | "rejected";
  tokens: number;
  durationMs: number;
  created: number;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────

async function pbRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${PB_URL}/api/collections/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(PB_TOKEN ? { Authorization: `Bearer ${PB_TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PB ${method} ${endpoint}: ${res.status} ${text}`);
  }

  if (method === "DELETE") return null;
  return res.json();
}

// ─── LICENSES ─────────────────────────────────────────────────────────────────

export async function pbGetLicense(key: string): Promise<PBLicense | null> {
  try {
    const result = await pbRequest("GET", `licenses/records?filter=key="${key}"&limit=1`) as {
      items: PBLicense[];
    };
    return result.items?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function pbSaveLicense(license: Omit<PBLicense, "id" | "created" | "updated">): Promise<PBLicense> {
  const existing = await pbGetLicense(license.key);
  const now = Date.now();

  if (existing) {
    const updated = await pbRequest("PATCH", `licenses/records/${existing.id}`, {
      ...license,
      updated: now,
    }) as PBLicense;
    return updated;
  }

  const created = await pbRequest("POST", "licenses/records", {
    ...license,
    created: now,
    updated: now,
  }) as PBLicense;
  return created;
}

export async function pbListLicenses(): Promise<PBLicense[]> {
  const result = await pbRequest("GET", "licenses/records?perPage=500") as {
    items: PBLicense[];
  };
  return result.items ?? [];
}

// ─── USAGE ────────────────────────────────────────────────────────────────────────

export async function pbGetUsage(siteUrl: string, month: string): Promise<PBUsage | null> {
  try {
    const result = await pbRequest("GET",
      `usage/records?filter=site_url="${siteUrl}" && month="${month}"&limit=1`
    ) as { items: PBUsage[] };
    return result.items?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function pbIncrementUsage(siteUrl: string, month: string): Promise<PBUsage> {
  const existing = await pbGetUsage(siteUrl, month);
  const now = Date.now();

  if (existing) {
    const updated = await pbRequest("PATCH", `usage/records/${existing.id}`, {
      count: existing.count + 1,
    }) as PBUsage;
    return updated;
  }

  const created = await pbRequest("POST", "usage/records", {
    siteUrl,
    month,
    count: 1,
  }) as PBUsage;
  return created;
}

export async function pbGetUsageForSite(siteUrl: string): Promise<PBUsage[]> {
  const result = await pbRequest("GET",
    `usage/records?filter=site_url="${siteUrl}"&perPage=24&sort=-month`
  ) as { items: PBUsage[] };
  return result.items ?? [];
}

// ─── USAGE LOGS ───────────────────────────────────────────────────────────────

export async function pbLogUsage(log: Omit<PBUsageLog, "id" | "created">): Promise<PBUsageLog> {
  const created = await pbRequest("POST", "usage_logs/records", {
    ...log,
    created: Date.now(),
  }) as PBUsageLog;
  return created;
}

// ─── Cleanup old logs (call via cron or on startup) ─────────────────────────

export async function pbCleanupOldLogs(daysToKeep = 90): Promise<number> {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  const result = await pbRequest("GET",
    `usage_logs/records?filter=created<${cutoff}&perPage=500`
  ) as { items: { id: string }[]; totalItems: number };

  let deleted = 0;
  for (const item of result.items) {
    try {
      await pbRequest("DELETE", `usage_logs/records/${item.id}`);
      deleted++;
    } catch {
      // ignore individual failures
    }
  }

  return deleted;
}
