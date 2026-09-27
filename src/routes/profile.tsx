import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function message(error: { message?: string } | null | undefined, fallback: string) {
  return error?.message || fallback;
}

function fitImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  if (isPending) {
    return <main className="grid min-h-screen place-items-center bg-bg text-muted">Loading</main>;
  }
  if (!user) return <RedirectToSignIn />;

  const photo = preview ?? user.profileImageUrl;
  const label = user.displayName ?? user.primaryEmail ?? "Account";

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("That image is too large.");
      return;
    }
    setBusy("photo");
    setError("");
    setNotice("");
    try {
      const image = await fitImage(file);
      const result = await authClient.updateUser({ image });
      if (result.error) {
        setError(message(result.error, "Could not save the photo"));
        return;
      }
      setPreview(image);
      setNotice("Photo saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the photo");
    } finally {
      setBusy("");
    }
  }

  async function onEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    setBusy("email");
    setError("");
    setNotice("");
    const result = await authClient.changeEmail({ newEmail: email, callbackURL: "/profile" });
    if (result.error) {
      setBusy("");
      setError(message(result.error, "Could not change the email"));
      return;
    }
    const session = await authClient.getSession();
    setBusy("");
    if (session.data?.user.email?.toLowerCase() !== email) {
      setError("That email is already used.");
      return;
    }
    setNotice("Email updated. Sign in with the new address next time.");
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("next") ?? "");
    setBusy("password");
    setError("");
    setNotice("");
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setBusy("");
    if (result.error) {
      setError(message(result.error, "Could not change the password"));
      return;
    }
    event.currentTarget.reset();
    setNotice("Password updated.");
  }

  async function onDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!window.confirm("Delete this account? This cannot be undone.")) return;
    setBusy("delete");
    setError("");
    setNotice("");
    const result = await authClient.deleteUser({ password });
    if (result.error) {
      setBusy("");
      setError(message(result.error, "Could not delete the account"));
      return;
    }
    try {
      await signOut("/login");
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 text-fg">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Link to="/" className="text-sm text-muted underline-offset-4 hover:underline">
          Back to the board
        </Link>
        <h1 className="font-display text-xl tracking-widest">PROFILE</h1>
        <p className="text-sm text-muted">{label}</p>
        {notice ? <p className="text-sm text-fg">{notice}</p> : null}
        {error ? <p className="text-sm text-bad">{error}</p> : null}

        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-4">
            {photo ? (
              <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/10 text-lg font-medium">
                {label.charAt(0).toUpperCase()}
              </span>
            )}
            <label className="min-h-11 cursor-pointer rounded-xl border border-line px-4 py-2 text-sm">
              {busy === "photo" ? "Saving…" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy !== ""}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void onPhoto(file);
                }}
              />
            </label>
          </div>
        </section>

        <form className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" onSubmit={onEmail}>
          <h2 className="text-sm tracking-widest text-muted uppercase">Email</h2>
          <input
            name="email"
            type="email"
            required
            defaultValue={user.primaryEmail ?? ""}
            autoComplete="email"
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm"
          />
          <button type="submit" disabled={busy !== ""} className="min-h-11 rounded-xl bg-fg text-sm font-semibold text-ink">
            {busy === "email" ? "Saving…" : "Change email"}
          </button>
        </form>

        <form className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" onSubmit={onPassword}>
          <h2 className="text-sm tracking-widest text-muted uppercase">Password</h2>
          <input
            name="current"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Current password"
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm"
          />
          <input
            name="next"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="New password"
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm"
          />
          <button type="submit" disabled={busy !== ""} className="min-h-11 rounded-xl bg-fg text-sm font-semibold text-ink">
            {busy === "password" ? "Saving…" : "Change password"}
          </button>
        </form>

        <form className="flex flex-col gap-3 rounded-2xl border border-bad/40 bg-surface p-4" onSubmit={onDelete}>
          <h2 className="text-sm tracking-widest text-bad uppercase">Delete account</h2>
          <p className="text-sm text-muted">This removes the login and the name from the crew list.</p>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Current password"
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm"
          />
          <button type="submit" disabled={busy !== ""} className="min-h-11 rounded-xl bg-bad text-sm font-semibold text-ink">
            {busy === "delete" ? "Deleting…" : "Delete account"}
          </button>
        </form>
      </div>
    </main>
  );
}
