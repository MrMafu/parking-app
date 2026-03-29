import type { AuthUser } from "./auth";

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
  }
}

export {};