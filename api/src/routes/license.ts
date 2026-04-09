import { Hono } from "hono";
import { activateLicense, verifyLicense } from "../lib/license.ts";

const app = new Hono();

/**
 * POST /api/license/verify
 * Verify and optionally activate a license key.
 */
app.post("/verify", async (c) => {
  const body = await c.req.json();
  const { key, site_url } = body;

  if (!key || typeof key !== "string" || !key.trim()) {
    return c.json(
      {
        valid: false,
        tier: "free",
        expires: null,
        message: "License key is required.",
      },
      400,
    );
  }

  if (!site_url || typeof site_url !== "string" || !site_url.trim()) {
    return c.json(
      {
        valid: false,
        tier: "free",
        expires: null,
        message: "Site URL is required.",
      },
      400,
    );
  }

  // Activate first (saves site_url binding), then verify
  const result = await activateLicense(key.trim(), site_url.trim());
  return c.json(result);
});

/**
 * POST /api/license/check
 * Quick check without activation (just verify).
 */
app.post("/check", async (c) => {
  const body = await c.req.json();
  const { key, site_url } = body;

  if (!key || typeof key !== "string" || !key.trim()) {
    return c.json(
      {
        valid: false,
        tier: "free",
        expires: null,
        message: "License key is required.",
      },
      400,
    );
  }

  const result = await verifyLicense(key.trim(), site_url?.trim());
  return c.json(result);
});

export default app;
