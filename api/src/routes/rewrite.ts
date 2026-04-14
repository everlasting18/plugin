import { Hono } from "hono";
import { expectRecord, parseJsonBody } from "../lib/http.ts";
import { parseRewriteRequest, rewriteContent } from "../usecases/rewrite.ts";

const app = new Hono();

app.post("/", async (c) => {
  const body = expectRecord(await parseJsonBody(c));
  const input = parseRewriteRequest(body);
  const content = await rewriteContent(input);
  return c.json({ success: true, content, original: input.text });
});

export default app;
