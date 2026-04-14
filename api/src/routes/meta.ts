import { Hono } from "hono";
import { expectRecord, parseJsonBody } from "../lib/http.ts";
import { generateMeta, parseMetaRequest } from "../usecases/meta.ts";

const app = new Hono();

app.post("/", async (c) => {
  const body = expectRecord(await parseJsonBody(c));
  const input = parseMetaRequest(body);
  const result = await generateMeta(input);
  return c.json({ success: true, ...result });
});

export default app;
