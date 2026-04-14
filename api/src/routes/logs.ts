import { Hono, type Context } from "hono";
import { logStore, logger } from "../lib/logStore.ts";

const app = new Hono();
const LOGS_ADMIN_TOKEN = Deno.env.get("LOGS_ADMIN_TOKEN") || "";

function requireLogsAdmin(c: Context) {
  if (!LOGS_ADMIN_TOKEN) {
    return c.json({ success: false, code: "disabled", message: "Logs endpoint is disabled." }, 404);
  }

  const provided = c.req.header("x-admin-token") || "";
  if (provided !== LOGS_ADMIN_TOKEN) {
    return c.json({ success: false, code: "forbidden", message: "Forbidden." }, 403);
  }

  return null;
}

/** GET /api/logs — list all tracked requests */
app.get("/", (c) => {
  const denied = requireLogsAdmin(c);
  if (denied) return denied;

  return c.json({
    requests: logStore.list(),
    totalRequests: logStore.list().length,
  });
});

/** GET /api/logs/:reqId — get all log entries for a specific request */
app.get("/:reqId", (c) => {
  const denied = requireLogsAdmin(c);
  if (denied) return denied;

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
  const denied = requireLogsAdmin(c);
  if (denied) return denied;

  logStore.clear();
  logger.info("log store cleared", {});
  return c.json({ success: true });
});

export default app;
