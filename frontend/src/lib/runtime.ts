export type RuntimeConfig = {
  pbUrl: string;
  apiUrl: string;
};

export const runtimeConfig: RuntimeConfig = {
  pbUrl: import.meta.env.PUBLIC_PB_URL || "https://8qj9xau0f6ama5b.591p.pocketbasecloud.com",
  apiUrl: import.meta.env.PUBLIC_API_URL || "http://localhost:3000/api",
};
