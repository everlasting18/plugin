import { Hono } from "hono";
import { expectRecord, parseJsonBody } from "../lib/http.ts";
import {
  activateAndVerifyLicense,
  buildMissingLicenseKeyResponse,
  buildMissingSiteUrlResponse,
  getLicenseStatus,
  getUsageSummary,
  parseLicenseStatusRequest,
  parseLicenseUsageRequest,
  parseLicenseVerifyRequest,
  validateLicense,
} from "../usecases/license.ts";

const app = new Hono();

/**
 * POST /api/license/verify
 * Verify and optionally activate a license key.
 */
app.post("/verify", async (c) => {
  const body = expectRecord(await parseJsonBody(c));
  const { key, siteUrl } = parseLicenseVerifyRequest(body);

  if (!key) return c.json(buildMissingLicenseKeyResponse(), 400);
  if (!siteUrl) return c.json(buildMissingSiteUrlResponse(), 400);

  const result = await activateAndVerifyLicense(key, siteUrl);
  return c.json(result);
});

/**
 * POST /api/license/check
 * Quick check without activation (just verify).
 */

/**
 * POST /api/license/usage
 * Check usage by domain (for dashboard).
 */
app.post("/usage", async (c) => {
  const body = expectRecord(await parseJsonBody(c));
  const domain = parseLicenseUsageRequest(body);

  if (!domain) {
    return c.json(
      {
        error: "Domain is required.",
      },
      400,
    );
  }

  return c.json(await getUsageSummary(domain));
});
app.post("/status", async (c) => {
  const body = expectRecord(await parseJsonBody(c));
  const { domain, key } = parseLicenseStatusRequest(body);

  if (!domain) {
    return c.json(
      {
        error: "Domain is required.",
      },
      400,
    );
  }

  return c.json(await getLicenseStatus(domain, key));
});
app.post("/check", async (c) => {
  const body = expectRecord(await parseJsonBody(c));
  const { key, siteUrl } = parseLicenseVerifyRequest(body);

  if (!key) return c.json(buildMissingLicenseKeyResponse(), 400);

  const result = await validateLicense(key, siteUrl);
  return c.json(result);
});

export default app;
