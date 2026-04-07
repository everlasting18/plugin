import { Hono } from "hono";
import generateApp from "./generate.ts";
import rewriteApp from "./rewrite.ts";
import metaApp from "./meta.ts";

const routes = new Hono();
routes.route("/generate", generateApp);
routes.route("/rewrite", rewriteApp);
routes.route("/meta", metaApp);

export default routes;
