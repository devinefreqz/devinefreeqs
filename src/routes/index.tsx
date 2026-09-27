import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Board } from "@/components/board";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <main className="grid min-h-screen place-items-center bg-bg text-muted">Loading</main>;
  }
  if (!user) return <RedirectToSignIn />;
  return <Board />;
}
