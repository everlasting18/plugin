export type RuntimeConfig = {
  pbUrl: string;
  apiUrl: string;
};

function resolveApiUrl(): string {
  const configured = import.meta.env.PUBLIC_API_URL?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000/api";
  }

  return "/api";
}

export const runtimeConfig: RuntimeConfig = {
  pbUrl: import.meta.env.PUBLIC_PB_URL || "https://8qj9xau0f6ama5b.591p.pocketbasecloud.com",
  apiUrl: resolveApiUrl(),
};
