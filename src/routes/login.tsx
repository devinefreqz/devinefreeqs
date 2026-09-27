import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"in" | "up">("up");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("username") ?? "").trim();
    if (mode === "up" && /^(darcy|darcy gray|sage)$/i.test(name)) {
      setError("That username is reserved.");
      return;
    }
    if (mode === "up" && !/^[a-zA-Z0-9][a-zA-Z0-9 .'-]{1,31}$/.test(name)) {
      setError("Username needs 2–32 letters or numbers.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await Promise.race([
      mode === "up"
        ? authClient.signUp.email({ email, password, name, callbackURL: "/" })
        : authClient.signIn.email({ email, password, callbackURL: "/" }),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Could not reach the crew database. Try again in a minute.")), 12000);
      }),
    ]).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      return { data: null, error: { message } };
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Sign-in failed");
      return;
    }
    const token = result.data && "token" in result.data ? result.data.token : null;
    if (token) {
      try {
        window.sessionStorage.setItem("grok-auth.bearer-token", token);
      } catch {
        /* ignore */
      }
    }
    window.location.href = "/";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6">
        <img src="/logo.jpg" alt="" className="mx-auto mb-4 h-20 w-20 object-contain invert" />
        <h1 className="text-center font-display text-xl tracking-widest">DEVINE FREQUENCIES</h1>
        {authEnabled ? (
          <>
            <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
              {mode === "up" ? (
                <label className="text-xs tracking-widest text-muted uppercase">
                  Username
                  <input
                    name="username"
                    required
                    minLength={2}
                    maxLength={32}
                    autoComplete="username"
                    className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case"
                  />
                </label>
              ) : null}
              <label className="text-xs tracking-widest text-muted uppercase">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case"
                />
              </label>
              <label className="text-xs tracking-widest text-muted uppercase">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  className="mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case"
                />
              </label>
              {error ? <p className="text-sm text-bad">{error}</p> : null}
              <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-fg text-sm font-semibold text-ink">
                {busy ? "Working…" : mode === "up" ? "Create crew account" : "Sign in"}
              </button>
            </form>
            <button
              type="button"
              className="mt-3 w-full text-sm text-muted underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "up" ? "in" : "up");
                setError("");
              }}
            >
              {mode === "up" ? "Already have an account? Sign in" : "Need an account? Create one"}
            </button>
            <div className="mt-5 flex flex-col gap-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  className="min-h-11 rounded-xl border border-line text-sm"
                  onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
