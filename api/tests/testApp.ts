import { Hono, type Env } from "hono";
import { ApiError } from "../src/lib/http.ts";

export function createTestApp<T extends Env = Env>() {
  const app = new Hono<T>();

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.status as 400 | 401 | 403 | 404 | 429 | 500 },
      );
    }

    return c.json(
      {
        success: false,
        code: "internal_error",
        message: "Internal Server Error",
      },
      500,
    );
  });

  return app;
}
