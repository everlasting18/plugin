import { Hono } from "hono";
import { createLicenseMiddleware } from "../src/lib/licenseMiddleware.ts";
import type { AuthContext } from "../src/lib/licenseTypes.ts";

function createApp() {
  const app = new Hono<{
    Variables: {
      license: AuthContext;
    };
  }>();
  app.use("*", createLicenseMiddleware());
  app.post("/", (c) => {
    const license = c.get("license");
    return c.json({
      ok: true,
      license,
    });
  });
  return app;
}

Deno.test("license middleware requires auth context when no headers are provided", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/", {
    method: "POST",
  });
  const body = await response.json();

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }

  if (body.code !== "auth_required") {
    throw new Error(`Expected auth_required, got ${body.code}`);
  }
});

Deno.test("license middleware requires site url when license key is present", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "x-license-key": "DEMO-PRO-123",
    },
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.code !== "site_url_required") {
    throw new Error(`Expected site_url_required, got ${body.code}`);
  }
});

Deno.test("license middleware allows free flow with x-site-url only", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "x-site-url": "https://unit-middleware.example.invalid/blog/",
    },
  });
  const body = await response.json();

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  if (!body.ok) {
    throw new Error("Expected route handler to run");
  }

  if (body.license.tier !== "free") {
    throw new Error(`Expected free tier, got ${body.license.tier}`);
  }

  if (body.license.siteUrl !== "https://unit-middleware.example.invalid/blog") {
    throw new Error(`Expected normalized site url, got ${body.license.siteUrl}`);
  }

  if (body.license.isPro) {
    throw new Error("Expected non-pro flow");
  }
});

Deno.test("license middleware rejects invalid license key for site", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "x-license-key": "UNIT-INVALID-KEY",
      "x-site-url": "https://unit-license.example.invalid",
    },
  });
  const body = await response.json();

  if (response.status !== 403) {
    throw new Error(`Expected 403, got ${response.status}`);
  }

  if (body.code !== "license_invalid") {
    throw new Error(`Expected license_invalid, got ${body.code}`);
  }
});
