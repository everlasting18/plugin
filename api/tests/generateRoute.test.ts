import generateApp from "../src/routes/generate.ts";
import type { AuthContext } from "../src/lib/licenseTypes.ts";
import { createTestApp } from "./testApp.ts";

function createAuth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    tier: "free",
    siteUrl: "https://example.com",
    domainId: "example01",
    isPro: false,
    usageCount: 0,
    usageLimit: 5,
    usageRemaining: 5,
    ...overrides,
  };
}

function createApp(auth: AuthContext) {
  const app = createTestApp<{
    Variables: {
      reqId: string;
      license: AuthContext;
    };
  }>();

  app.use("*", async (c, next) => {
    c.set("reqId", "test-req");
    c.set("license", auth);
    await next();
  });

  app.route("/", generateApp);
  return app;
}

Deno.test("generate route rejects missing keyword", async () => {
  const app = createApp(createAuth());
  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keyword: "   ",
      count: 1,
    }),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.code !== "missing_keyword") {
    throw new Error(`Expected missing_keyword, got ${body.code}`);
  }
});

Deno.test("generate route rejects when requested count exceeds free quota", async () => {
  const app = createApp(createAuth({ usageRemaining: 1 }));
  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keyword: "seo wordpress",
      count: 3,
    }),
  });
  const body = await response.json();

  if (response.status !== 429) {
    throw new Error(`Expected 429, got ${response.status}`);
  }

  if (body.code !== "usage_limit_reached") {
    throw new Error(`Expected usage_limit_reached, got ${body.code}`);
  }
});
