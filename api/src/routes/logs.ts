import { Hono } from "hono";
import { logStore, logger } from "../lib/logStore.ts";

const app = new Hono();

/** GET /api/logs — list all tracked requests */
app.get("/", (c) => {
  return c.json({
    requests: logStore.list(),
    totalRequests: logStore.list().length,
  });
});

/** GET /api/logs/:reqId — get all log entries for a specific request */
app.get("/:reqId", (c) => {
  const reqId = c.req.param("reqId");
  const entries = logStore.get(reqId);

  if (entries.length === 0) {
    // Fallback: search by reqId in the store keys
    const found = logStore.list().find(r => r.reqId === reqId);
    if (!found) {
      return c.json({ success: false, code: "not_found", message: `No logs found for reqId: ${reqId}` }, 404);
    }
  }

  return c.json({
    reqId,
    count: entries.length,
    entries,
  });
});

/** DELETE /api/logs — clear all logs */
app.delete("/", (c) => {
  logStore.clear();
  logger.info("log store cleared", {});
  return c.json({ success: true });
});

export default app;
