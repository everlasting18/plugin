import type { AuthContext } from "../lib/licenseTypes.ts";

export type AppRouteVars = {
  reqId: string;
  license: AuthContext;
};
