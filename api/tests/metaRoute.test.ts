import metaApp from "../src/routes/meta.ts";
import { createTestApp } from "./testApp.ts";

Deno.test("meta route rejects missing title before calling AI", async () => {
  const app = createTestApp();
  app.route("/", metaApp);

  const response = await app.request("http://localhost/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "   ",
      content: "Nội dung bài viết",
    }),
  });
  const body = await response.json();

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }

  if (body.code !== "missing_title") {
    throw new Error(`Expected missing_title, got ${body.code}`);
  }
});
