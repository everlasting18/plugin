// Load .env file (Deno 1.38+ hỗ trợ native)
import "https://deno.land/std@0.224.0/dotenv/load.ts";

export const config = {
  port: parseInt(Deno.env.get("PORT") || "3000", 10),
  openrouterKey: Deno.env.get("OPENROUTER_API_KEY") || "",
  openrouterBase: Deno.env.get("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1",
  openrouterModel: Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
  openrouterFallback: Deno.env.get("OPENROUTER_MODEL_FALLBACK") || "openai/gpt-4o",
  tavilyKey: Deno.env.get("TAVILY_API_KEY") || "",
  // PocketBase
  pbUrl: Deno.env.get("PB_URL") || "",
  pbAdminToken: Deno.env.get("PB_ADMIN_TOKEN") || "",
} as const;

if (!config.openrouterKey) {
  console.error("[config] Missing required env: OPENROUTER_API_KEY");
  Deno.exit(1);
}
