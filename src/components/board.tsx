import { useEffect, useRef, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import {
  loadBoard,
} from "@/lib/crew";
import { Events } from "./board-events";
import { CrewList, Finance, Gear, Overview } from "./board-panels";

type Board = Awaited<ReturnType<typeof loadBoard>>;
type View = "overview" | "events" | "finance" | "equipment" | "crew";

const NAV: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "finance", label: "Finance" },
  { id: "equipment", label: "Equipment" },
  { id: "crew", label: "Crew" },
];

export function Board() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");
  const pull = useRef(0);

  async function refresh(quiet = false) {
    const ticket = ++pull.current;
    try {
      const next = await loadBoard();
      if (ticket !== pull.current) return;
      setBoard(next);
      setError("");
    } catch (err) {
      if (ticket !== pull.current || quiet) return;
      setError(err instanceof Error ? err.message : "Could not load the board");
    }
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save");
    }
  }

  if (!board) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg text-muted">
        {error || "Loading the board"}
      </main>
    );
  }

  const founder = board.me.founder;
  const nav = founder ? NAV : NAV.filter((item) => item.id === "events" || item.id === "crew");
  const shown = nav.some((item) => item.id === view) ? view : "events";
  const income = board.ledger.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
  const expense = board.ledger.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
  const gearValue = board.gear.reduce((s, g) => s + g.qty * g.unit_cost, 0);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="relative isolate flex min-h-24 flex-wrap items-center gap-4 overflow-hidden border-b border-line bg-white px-4 py-4">
        <img
          src="/sticker2white.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
        />
        <img src="/logo.jpg" alt="Devine Frequencies" className="relative h-14 w-14 object-contain" />
        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-medium text-black">
            {board.me.name} · {board.me.rank}
          </p>
        </div>
        <div className="relative">
          <UserButton />
        </div>
      </header>
      <nav className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={
              shown === item.id
                ? "min-h-11 shrink-0 rounded-full bg-fg px-4 text-sm font-medium text-ink"
                : "min-h-11 shrink-0 rounded-full border border-line px-4 text-sm text-fg"
            }
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5">
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        {shown === "overview" && founder ? (
          <Overview income={income} expense={expense} events={board.events.length} gear={board.gear.length} />
        ) : null}
        {shown === "events" ? <Events board={board} founder={founder} run={run} /> : null}
        {shown === "finance" && founder ? <Finance board={board} founder={founder} income={income} expense={expense} run={run} /> : null}
        {shown === "equipment" && founder ? <Gear board={board} founder={founder} total={gearValue} run={run} /> : null}
        {shown === "crew" ? <CrewList crew={board.crew} /> : null}
      </main>
    </div>
  );
}
