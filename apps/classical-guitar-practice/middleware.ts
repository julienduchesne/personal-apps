import { createAuthMiddleware } from "@repo/auth";

export const middleware = createAuthMiddleware();

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
