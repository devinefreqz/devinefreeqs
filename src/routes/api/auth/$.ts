import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

const RESERVED_USERNAMES = new Set(["darcy", "darcy gray", "sage"]);

function reservedUsername(name: unknown) {
  return RESERVED_USERNAMES.has(String(name ?? "").trim().toLowerCase());
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname.endsWith("/sign-up/email")) {
          let body: { name?: unknown } = {};
          try {
            body = await request.clone().json();
          } catch {
            body = {};
          }
          if (reservedUsername(body.name)) {
            return Response.json(
              { message: "That username is reserved.", code: "USERNAME_RESERVED" },
              { status: 403 },
            );
          }
        }
        return auth.handler(request);
      },
    },
  },
});
