import {
  getCurrentMonth,
  normalizeSiteUrl,
  urlToDomainId,
} from "../src/lib/licenseStorage.ts";

Deno.test("normalizeSiteUrl lowercases host and trims trailing slashes", () => {
  const normalized = normalizeSiteUrl("HTTPS://Example.COM/blog///");

  if (normalized !== "https://example.com/blog") {
    throw new Error(`Expected normalized URL, got ${normalized}`);
  }
});

Deno.test("normalizeSiteUrl preserves subdirectory installs", () => {
  const normalized = normalizeSiteUrl("https://example.com/wordpress/site/");

  if (normalized !== "https://example.com/wordpress/site") {
    throw new Error(`Expected subdirectory path to be preserved, got ${normalized}`);
  }
});

Deno.test("urlToDomainId stays stable across path variants on same host", () => {
  const rootId = urlToDomainId("https://example.com");
  const subdirId = urlToDomainId("https://example.com/blog");

  if (rootId !== subdirId) {
    throw new Error(`Expected same domain id for same host, got ${rootId} and ${subdirId}`);
  }
});

Deno.test("urlToDomainId normalizes casing and strips non-domain characters", () => {
  const first = urlToDomainId("HTTPS://Sub.Example.com/path");
  const second = urlToDomainId("https://sub.example.com/another-path");

  if (first !== second) {
    throw new Error(`Expected stable domain id, got ${first} and ${second}`);
  }
});

Deno.test("getCurrentMonth returns YYYY_MM format", () => {
  const month = getCurrentMonth();

  if (!/^\d{4}_\d{2}$/.test(month)) {
    throw new Error(`Expected YYYY_MM format, got ${month}`);
  }
});
