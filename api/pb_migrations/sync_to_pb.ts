/**
 * PocketBase Sync — Insert DEMO license + verify collections.
 * Chạy: deno run --allow-net pb_migrations/sync_to_pb.ts
 *
 * Trước khi chạy:
 * 1. Import collections từ dashboard: Settings → Import collections
 *    (1_licenses.json → 2_usage.json → 3_user_domains.json)
 * 2. Lấy API Token: Settings → API preview → copy token (eyJ...)
 * 3. Chạy với env:
 *    PB_ADMIN_TOKEN=eyJ... deno run --allow-net pb_migrations/sync_to_pb.ts
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";

const PB_URL = Deno.env.get("PB_URL") || "https://8qj9xau0f6ama5b.591p.pocketbasecloud.com";
const PB_ADMIN_TOKEN = Deno.env.get("PB_ADMIN_TOKEN") || Deno.env.get("PB_TOKEN") || "";

if (!PB_ADMIN_TOKEN) {
  console.warn("⚠️  PB_ADMIN_TOKEN not set via env. Set it with:");
  console.warn("    PB_ADMIN_TOKEN=eyJ... deno run --allow-net pb_migrations/sync_to_pb.ts\n");
}

const TOKEN = PB_ADMIN_TOKEN || Deno.args[0] || "";

// ─── PB API helpers ───────────────────────────────────────────────────────────

async function pbReq(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${PB_URL}/api/collections/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${endpoint}: ${res.status}\n${text}`);
  if (method === "DELETE" || method === "PATCH") return null;
  return JSON.parse(text);
}

// ─── Insert DEMO license ──────────────────────────────────────────────────────

async function createDemoLicense(): Promise<void> {
  try {
    const existing = await pbReq(
      "GET",
      `licenses/records?filter=key="DEMO-PRO-XXXX"&limit=1`,
    ) as { items: { id: string }[] };

    if (existing.items.length > 0) {
      console.log("  skip: DEMO-PRO-XXXX (exists)");
      return;
    }

    await pbReq("POST", "licenses/records", {
      key: "DEMO-PRO-XXXX",
      tier: "pro",
      site_url: "http://localhost",
      status: "active",
    });
    console.log("  create: DEMO-PRO-XXXX test license ✅");
  } catch (e) {
    console.error("  create DEMO license failed:", String(e));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("PocketBase Sync — Insert DEMO License\n");

  if (!TOKEN) {
    console.error("❌ Missing PB_ADMIN_TOKEN. Get it from: Settings → API preview");
    console.error("   Then run: PB_ADMIN_TOKEN=eyJ... deno run --allow-net pb_migrations/sync_to_pb.ts");
    Deno.exit(1);
  }

  // Test auth + collection existence
  try {
    await pbReq("GET", "licenses/records?limit=0");
    await pbReq("GET", "usage/records?limit=0");
    await pbReq("GET", "user_domains/records?limit=0");
    console.log("✅ Auth OK (PB token valid)\n");
  } catch (e) {
    const msg = String(e);
    if (msg.includes("401") || msg.includes("403")) {
      console.error("❌ Invalid API token. Make sure the token has admin access.");
    } else if (msg.includes("404")) {
      console.error("❌ Required collection not found. Import these first via dashboard:");
      console.error("   Settings → Import collections → paste:");
      console.error("   1_licenses.json");
      console.error("   2_usage.json");
      console.error("   3_user_domains.json");
    } else {
      console.error("❌ Auth failed:", msg);
    }
    Deno.exit(1);
  }

  // Create DEMO license
  console.log("Creating DEMO-PRO-XXXX license...");
  await createDemoLicense();

  console.log("\n✅ Done! The API can now verify DEMO-PRO-XXXX license.");
  console.log("\nTiếp theo:");
  console.log("  1. Update api/.env với PB credentials:");
  console.log(`     PB_URL=${PB_URL}`);
  console.log("     PB_ADMIN_TOKEN=<your API token>");
  console.log("  2. Restart API server");
  console.log("  3. Test: POST /api/license/verify với DEMO-PRO-XXXX");
}

main().catch((e) => {
  console.error("Error:", e.message);
  Deno.exit(1);
});
