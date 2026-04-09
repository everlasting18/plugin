import { Hono } from "hono";
import generateApp from "./generate.ts";
import rewriteApp from "./rewrite.ts";
import metaApp from "./meta.ts";
import logsApp from "./logs.ts";
import licenseApp from "./license.ts";
import { createLicenseMiddleware } from "../lib/license.ts";

const routes = new Hono();

// License endpoint — no middleware (needs to be callable without a key)
routes.route("/license", licenseApp);

// Content routes — require license/auth
routes.use(createLicenseMiddleware());
routes.route("/generate", generateApp);
routes.route("/rewrite", rewriteApp);
routes.route("/meta", metaApp);
routes.route("/logs", logsApp);

export default routes;
