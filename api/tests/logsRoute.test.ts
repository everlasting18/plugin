import logsApp from "../src/routes/logs.ts";
import { createTestApp } from "./testApp.ts";

Deno.test("logs route is disabled when admin token env is absent", async () => {
  const app = createTestApp();
  app.route("/", logsApp);

  const response = await app.request("http://localhost/", {
    method: "GET",
  });
  const body = await response.json();

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }

  if (body.code !== "disabled") {
    throw new Error(`Expected disabled code, got ${body.code}`);
  }
});
