import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import {
  addEquipment,
  addEvent,
  addLedger,
  clearShift,
  deleteEquipment,
  deleteEvent,
  deleteLedger,
  loadBoard,
  setShift,
  type Rank,
} from "@/lib/crew";

type Board = Awaited<ReturnType<typeof loadBoard>>;
type View = "overview" | "events" | "finance" | "equipment" | "crew";

const NAV: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "finance", label: "Finance" },
  { id: "equipment", label: "Equipment" },
  { id: "crew", label: "Crew" },
];

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

export function Board() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");

  async function refresh() {
    try {
      setBoard(await loadBoard());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the board");
    }
  }

  useEffect(() => {
    void refresh();
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
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={
              view === item.id
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
        {!founder ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            Crew can view the books and mark their own shifts. Founders edit everything.
          </p>
        ) : null}
        {view === "overview" ? (
          <Overview income={income} expense={expense} events={board.events.length} gear={board.gear.length} />
        ) : null}
        {view === "events" ? <Events board={board} founder={founder} run={run} /> : null}
        {view === "finance" ? <Finance board={board} founder={founder} income={income} expense={expense} run={run} /> : null}
        {view === "equipment" ? <Gear board={board} founder={founder} total={gearValue} run={run} /> : null}
        {view === "crew" ? <CrewList crew={board.crew} /> : null}
      </main>
    </div>
  );
}

function Overview({
  income,
  expense,
  events,
  gear,
}: {
  income: number;
  expense: number;
  events: number;
  gear: number;
}) {
  const net = income - expense;
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <Stat label="Balance" value={money.format(net)} tone={net >= 0 ? "good" : "bad"} />
      <Stat label="Income" value={money.format(income)} />
      <Stat label="Expenses" value={money.format(expense)} />
      <Stat label="Nights / kit lines" value={`${events} / ${gear}`} />
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-fg";
  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
      <p className={`mt-2 font-display text-2xl ${color}`}>{value}</p>
    </article>
  );
}

function Events({
  board,
  founder,
  run,
}: {
  board: Board;
  founder: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  return (
    <section className="flex flex-col gap-4">
      {founder ? (
        <form
          className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(() =>
              addEvent({
                data: {
                  name: String(form.get("name") ?? ""),
                  date: String(form.get("date") ?? ""),
                  time: String(form.get("time") ?? ""),
                  venue: String(form.get("venue") ?? ""),
                  notes: String(form.get("notes") ?? ""),
                },
              }),
            );
            e.currentTarget.reset();
          }}
        >
          <Field name="name" label="Event" />
          <Field name="venue" label="Venue" />
          <Field name="date" label="Date" type="date" />
          <Field name="time" label="Time" type="time" />
          <Field name="notes" label="Notes" />
          <div className="flex items-end">
            <button type="submit" className="min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink">
              Add event
            </button>
          </div>
        </form>
      ) : null}
      {board.events.map((ev) => {
        const roster = board.shifts.filter((s) => s.event_id === ev.id);
        const mine = roster.find((s) => s.user_id === board.me.userId);
        return (
          <article key={ev.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">{ev.name}</h2>
                <p className="text-sm text-muted">
                  {ev.event_date} · {ev.event_time} · {ev.venue}
                </p>
                {ev.notes ? <p className="mt-1 text-sm text-muted">{ev.notes}</p> : null}
              </div>
              {founder ? (
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-line px-3 text-sm text-bad"
                  onClick={() => void run(() => deleteEvent({ data: ev.id }))}
                >
                  Delete
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {roster.length ? (
                roster.map((s) => (
                  <span key={s.user_id} className="rounded-full border border-line px-3 py-1 text-xs">
                    {s.name} — {s.role}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">Nobody signed yet</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {board.roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={mine?.role === role}
                  className={
                    mine?.role === role
                      ? "min-h-11 rounded-full bg-fg px-3 text-sm text-ink"
                      : "min-h-11 rounded-full border border-line px-3 text-sm"
                  }
                  onClick={() => void run(() => setShift({ data: { eventId: ev.id, role } }))}
                >
                  {role}
                </button>
              ))}
              {mine ? (
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-3 text-sm text-bad"
                  onClick={() => void run(() => clearShift({ data: ev.id }))}
                >
                  Not working
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Finance({
  board,
  founder,
  income,
  expense,
  run,
}: {
  board: Board;
  founder: boolean;
  income: number;
  expense: number;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Net" value={money.format(income - expense)} tone={income - expense >= 0 ? "good" : "bad"} />
        <Stat label="In" value={money.format(income)} tone="good" />
        <Stat label="Out" value={money.format(expense)} tone="bad" />
      </div>
      {founder ? (
        <form
          className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(() =>
              addLedger({
                data: {
                  source: String(form.get("source") ?? ""),
                  amount: Number(form.get("amount")),
                  date: String(form.get("date") ?? ""),
                  kind: String(form.get("kind") ?? "expense"),
                  category: String(form.get("category") ?? "Other"),
                  notes: String(form.get("notes") ?? ""),
                },
              }),
            );
            e.currentTarget.reset();
          }}
        >
          <Field name="source" label="Source" />
          <Field name="amount" label="Amount AUD" type="number" />
          <Field name="date" label="Date" type="date" />
          <label className="flex flex-col gap-1 text-xs tracking-widest text-muted uppercase">
            Type
            <select name="kind" className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs tracking-widest text-muted uppercase">
            Category
            <select name="category" className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case">
              {["Tickets", "Merch", "Venue", "Equipment", "Payroll", "Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field name="notes" label="Notes" />
          <div className="flex items-end">
            <button type="submit" className="min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink">
              Add to ledger
            </button>
          </div>
        </form>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs tracking-widest text-muted uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">What</th>
              <th className="px-3 py-3 font-medium">Amount</th>
              {founder ? <th className="px-3 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {board.ledger.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-3">{row.entry_date}</td>
                <td className="px-3 py-3">
                  {row.source}
                  <span className="block text-xs text-muted">
                    {row.kind} · {row.category}
                  </span>
                </td>
                <td className={row.kind === "income" ? "px-3 py-3 text-good" : "px-3 py-3 text-bad"}>
                  {row.kind === "income" ? "+" : "−"}
                  {money.format(row.amount)}
                </td>
                {founder ? (
                  <td className="px-3 py-3">
                    <button type="button" className="text-bad" onClick={() => void run(() => deleteLedger({ data: row.id }))}>
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Gear({
  board,
  founder,
  total,
  run,
}: {
  board: Board;
  founder: boolean;
  total: number;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Stat label="Kit value" value={money.format(total)} />
        {founder ? (
          <button
            type="button"
            className="min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink"
            onClick={() => setOpen((v) => !v)}
          >
            Add equipment
          </button>
        ) : null}
      </div>
      {open && founder ? (
        <form
          className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(() =>
              addEquipment({
                data: {
                  qty: Number(form.get("qty")),
                  name: String(form.get("name") ?? ""),
                  unitCost: Number(form.get("unitCost")),
                },
              }),
            );
            e.currentTarget.reset();
            setOpen(false);
          }}
        >
          <Field name="qty" label="Qty" type="number" />
          <Field name="name" label="Item" placeholder="15 inch PA speaker" />
          <Field name="unitCost" label="Each AUD" type="number" placeholder="300" />
          <div className="sm:col-span-3">
            <button type="submit" className="min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink">
              Save item
            </button>
          </div>
        </form>
      ) : null}
      <ul className="flex flex-col gap-2">
        {board.gear.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <div>
              <p className="font-medium">
                {item.qty} × {item.name}
              </p>
              <p className="text-sm text-muted">
                {money.format(item.unit_cost)} each · {money.format(item.qty * item.unit_cost)} total
              </p>
            </div>
            {founder ? (
              <button type="button" className="min-h-11 text-sm text-bad" onClick={() => void run(() => deleteEquipment({ data: item.id }))}>
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CrewList({ crew }: { crew: { user_id: string; name: string; rank: string }[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <p className="border-b border-line px-4 py-3 text-sm text-muted">
        Anyone can join with a username, email, and password. Darcy and Sage are Founders. Everyone else is a Crew Member and can view the board.
      </p>
      <ul>
        {crew.map((person) => (
          <li key={person.user_id} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-0">
            <span>{person.name}</span>
            <RankPill rank={person.rank as Rank} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RankPill({ rank }: { rank: Rank }) {
  return <span className="rounded-full border border-line px-3 py-1 text-xs tracking-widest uppercase">{rank}</span>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs tracking-widest text-muted uppercase">
      {label}
      <input
        name={name}
        type={type}
        required={type !== "text" || name !== "notes"}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        placeholder={placeholder}
        className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case placeholder:text-muted"
      />
    </label>
  );
}
