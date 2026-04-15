import {
  getFreeLimit,
  inferDemoLicenseTier,
  isDemoLicenseKey,
} from "../src/lib/licenseService.ts";

Deno.test("isDemoLicenseKey detects demo keys case-insensitively", () => {
  if (!isDemoLicenseKey("demo-pro-123")) {
    throw new Error("Expected demo key to be detected");
  }

  if (isDemoLicenseKey("live-pro-123")) {
    throw new Error("Did not expect non-demo key to be detected");
  }
});

Deno.test("inferDemoLicenseTier returns pro when demo key contains PRO", () => {
  const tier = inferDemoLicenseTier("demo-pro-123");

  if (tier !== "pro") {
    throw new Error(`Expected pro tier, got ${tier}`);
  }
});

Deno.test("inferDemoLicenseTier falls back to free for non-pro demo key", () => {
  const tier = inferDemoLicenseTier("demo-free-123");

  if (tier !== "free") {
    throw new Error(`Expected free tier, got ${tier}`);
  }
});

Deno.test("getFreeLimit returns a positive integer", () => {
  const limit = getFreeLimit();

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`Expected positive integer free limit, got ${limit}`);
  }
});
