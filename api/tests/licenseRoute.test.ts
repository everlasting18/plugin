import licenseApp from "../src/routes/license.ts";
import { createTestApp } from "./testApp.ts";

function createApp() {
  const app = createTestApp();
  app.route("/", licenseApp);
  return app;
}

Deno.test("license route verify requires key", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      site_url: "https://example.com",
    }),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.message !== "License key is required.") {
    throw new Error(`Expected missing key message, got ${body.message}`);
  }
});

Deno.test("license route verify requires site url", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: "DEMO-PRO-123",
    }),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.message !== "Site URL is required.") {
    throw new Error(`Expected missing site message, got ${body.message}`);
  }
});

Deno.test("license route usage requires domain", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/usage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.error !== "Domain is required.") {
    throw new Error(`Expected usage domain error, got ${body.error}`);
  }
});

Deno.test("license route usage returns summary for domain", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/usage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "https://unit-route.example.invalid",
    }),
  });
  const body = await response.json();

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  if (body.domain !== "https://unit-route.example.invalid") {
    throw new Error(`Expected echoed domain, got ${body.domain}`);
  }
});

Deno.test("license route status returns free tier without key", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "https://unit-status-route.example.invalid",
    }),
  });
  const body = await response.json();

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  if (body.tier !== "free" || body.isPro !== false) {
    throw new Error(`Expected free status, got ${JSON.stringify(body)}`);
  }
});

Deno.test("license route check requires key", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.message !== "License key is required.") {
    throw new Error(`Expected missing key message, got ${body.message}`);
  }
});
