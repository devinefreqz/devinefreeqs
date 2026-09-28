import { useEffect, useRef, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { loadBoard, syncTickets } from "@/lib/crew";
import { Events } from "@/components/board-events";
import { CrewList, Finance, Gear, Overview } from "@/components/board-panels";
import {
  Artists,
  BrandPack,
  Comms,
  CoverageGaps,
  NextShift,
  PayrollPanel,
  RunSheet,
  Safety,
  TicketsPanel,
} from "@/components/board-ops";

type Board = Awaited<ReturnType<typeof loadBoard>>;
type View =
  | "overview"
  | "events"
  | "runsheet"
  | "safety"
  | "comms"
  | "finance"
  | "tickets"
  | "payroll"
  | "equipment"
  | "artists"
  | "brand"
  | "crew";

const NAV: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "runsheet", label: "Run Sheet" },
  { id: "safety", label: "Safety" },
  { id: "comms", label: "Comms" },
  { id: "finance", label: "Finance" },
  { id: "tickets", label: "Tickets" },
  { id: "payroll", label: "Payroll" },
  { id: "equipment", label: "Equipment" },
  { id: "artists", label: "Artists" },
  { id: "brand", label: "Brand" },
  { id: "crew", label: "Crew" },
];
const CREW_VIEWS = new Set<View>(["events", "runsheet", "safety", "comms", "artists", "brand", "crew"]);

export function Board() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");
  const pull = useRef(0);
  const seen = useRef<Board | null>(null);
  const busy = useRef(0);

  async function refresh(quiet = false) {
    const ticket = ++pull.current;
    try {
      const next = await loadBoard();
      if (quiet && busy.current) return;
      if (ticket !== pull.current && seen.current) return;
      seen.current = next;
      setBoard(next);
      setError("");
    } catch (err) {
      if ((ticket !== pull.current || quiet) && seen.current) return;
      setError(err instanceof Error ? err.message : "Could not load the board");
    }
  }

  useEffect(() => {
    let stop = false;
    let timer = 0;
    let tickets = 0;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const pullTickets = () => {
      if (document.visibilityState !== "visible") return;
      void syncTickets()
        .then(() => refresh(true))
        .catch(() => undefined);
    };
    void refresh().finally(() => {
      if (stop) return;
      timer = window.setInterval(tick, 3000);
      tickets = window.setInterval(pullTickets, 60000);
      pullTickets();
    });
    document.addEventListener("visibilitychange", tick);
    return () => {
      stop = true;
      window.clearInterval(timer);
      window.clearInterval(tickets);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  async function run(action: () => Promise<unknown>, patch?: (board: Board) => Board) {
    busy.current += 1;
    const snapshot = seen.current;
    if (patch && snapshot) {
      const next = patch(snapshot);
      seen.current = next;
      setBoard(next);
    }
    try {
      await action();
      await refresh();
    } catch (err) {
      if (snapshot) {
        seen.current = snapshot;
        setBoard(snapshot);
      }
      setError(err instanceof Error ? err.message : "That did not save");
    } finally {
      busy.current -= 1;
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
  const nav = founder ? NAV : NAV.filter((item) => CREW_VIEWS.has(item.id));
  const shown = nav.some((item) => item.id === view) ? view : "events";
  const income = board.ledger.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
  const expense = board.ledger.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
  const gearValue = board.gear.reduce((s, g) => s + g.qty * g.unit_cost, 0);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-4">
        <img src="/logo.jpg" alt="" className="h-12 w-12 object-contain invert" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm tracking-widest">DEVINE FREQUENCIES</p>
          <p className="text-sm text-muted">
            {board.me.name} · {board.me.rank}
          </p>
        </div>
        <UserButton />
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
        {shown === "overview" ? (
          <>
            <NextShift board={board} />
            <CoverageGaps board={board} />
            {founder ? <Overview income={income} expense={expense} events={board.events.length} gear={board.gear.length} /> : null}
          </>
        ) : null}
        {shown === "events" ? <Events board={board} founder={founder} run={run} /> : null}
        {shown === "runsheet" ? <RunSheet board={board} founder={founder} run={run} /> : null}
        {shown === "safety" ? <Safety board={board} founder={founder} run={run} /> : null}
        {shown === "comms" ? <Comms board={board} founder={founder} run={run} /> : null}
        {shown === "finance" && founder ? <Finance board={board} founder={founder} income={income} expense={expense} run={run} /> : null}
        {shown === "tickets" && founder ? <TicketsPanel board={board} founder={founder} run={run} /> : null}
        {shown === "payroll" && founder ? <PayrollPanel board={board} founder={founder} run={run} /> : null}
        {shown === "equipment" && founder ? <Gear board={board} founder={founder} total={gearValue} run={run} /> : null}
        {shown === "artists" ? <Artists board={board} founder={founder} run={run} /> : null}
        {shown === "brand" ? <BrandPack board={board} founder={founder} run={run} /> : null}
        {shown === "crew" ? <CrewList crew={board.crew} /> : null}
      </main>
    </div>
  );
}
