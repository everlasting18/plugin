import rewriteApp from "../src/routes/rewrite.ts";
import { createTestApp } from "./testApp.ts";

Deno.test("rewrite route rejects missing text before calling AI", async () => {
  const app = createTestApp();
  app.route("/", rewriteApp);

  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "   ",
      instruction: "improve",
    }),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.code !== "missing_text") {
    throw new Error(`Expected missing_text, got ${body.code}`);
  }
});

Deno.test("rewrite route rejects invalid instruction before calling AI", async () => {
  const app = createTestApp();
  app.route("/", rewriteApp);

  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Đoạn văn hợp lệ",
      instruction: "translate",
    }),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.code !== "invalid_instruction") {
    throw new Error(`Expected invalid_instruction, got ${body.code}`);
  }
});
