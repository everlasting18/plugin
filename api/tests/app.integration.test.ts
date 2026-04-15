import { createApp } from "../src/main.ts";

Deno.test("app health endpoint returns ok with timestamp", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/health");
  const body = await response.json();

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  if (body.ok !== true || typeof body.ts !== "number") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(body)}`);
  }
});

Deno.test("app echoes provided x-request-id header", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/health", {
    headers: {
      "x-request-id": "req-integration-123",
    },
  });

  if (response.headers.get("x-request-id") !== "req-integration-123") {
    throw new Error(`Expected x-request-id echo, got ${response.headers.get("x-request-id")}`);
  }
});

Deno.test("app generates x-request-id when header is absent", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/health");
  const reqId = response.headers.get("x-request-id");

  if (!reqId || reqId.length < 8) {
    throw new Error(`Expected generated request id, got ${reqId}`);
  }
});

Deno.test("app returns json not_found for unknown route", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/unknown");
  const body = await response.json();

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }

  if (body.code !== "not_found") {
    throw new Error(`Expected not_found code, got ${body.code}`);
  }
});

Deno.test("app allows license status route without auth middleware", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/api/license/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "https://integration.example.invalid",
    }),
  });
  const body = await response.json();

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  if (body.tier !== "free" || body.isPro !== false) {
    throw new Error(`Expected free status payload, got ${JSON.stringify(body)}`);
  }
});

Deno.test("app enforces auth middleware on protected route", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/api/rewrite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Đoạn văn cần rewrite",
      instruction: "improve",
    }),
  });
  const body = await response.json();

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }

  if (body.code !== "auth_required") {
    throw new Error(`Expected auth_required, got ${body.code}`);
  }
});

Deno.test("app serializes ApiError from generate route via global onError", async () => {
  const app = createApp();
  const response = await app.request("http://localhost/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-site-url": "https://integration.example.invalid",
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
