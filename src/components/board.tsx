import { useEffect, useRef, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { roleColor } from "@/lib/role-colors";
import {
  addEquipment,
  addEvent,
  addLedger,
  clearShift,
  deleteEquipment,
  deleteEvent,
  deleteLedger,
  dropRole,
  loadBoard,
  setShift,
  syncTickets,
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

function show(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value);
}

export function Board() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");
  const pull = useRef(0);
  const seen = useRef<Board | null>(null);

  async function refresh(quiet = false) {
    const ticket = ++pull.current;
    try {
      const next = await loadBoard();
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

function RolePie({ slices }: { slices: { name: string; value: number; color: string }[] }) {
  const ordered = [...slices].sort((a, b) => b.value - a.value);
  const drawn = ordered.filter((slice) => slice.value > 0);
  const total = drawn.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) return <p className="text-sm text-muted">Nobody assigned yet</p>;
  const r = 70;
  const cx = 90;
  const cy = 90;
  let angle = -Math.PI / 2;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label="Roles by crew count">
        {drawn.length === 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={drawn[0].color} />
        ) : (
          drawn.map((slice) => {
            const sweep = (slice.value / total) * Math.PI * 2;
            const start = angle;
            angle += sweep;
            const large = sweep > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.cos(start);
            const y1 = cy + r * Math.sin(start);
            const x2 = cx + r * Math.cos(angle);
            const y2 = cy + r * Math.sin(angle);
            return (
              <path
                key={slice.name}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                fill={slice.color}
              >
                <title>{`${slice.name}: ${slice.value}`}</title>
              </path>
            );
          })
        )}
      </svg>
      <ul className="flex flex-col gap-1 text-sm">
        {ordered.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: slice.color }} />
            <span>
              {slice.name} · {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
  const [open, setOpen] = useState<{ eventId: number; role: string } | null>(null);
  const [rosterId, setRosterId] = useState<number | null>(null);
  const openEvent = open ? board.events.find((ev) => ev.id === open.eventId) : null;
  const openCrew = open ? board.shifts.filter((s) => s.event_id === open.eventId && s.role === open.role) : [];
  const mineOnOpen = openCrew.some((s) => s.user_id === board.me.userId);

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
        const people = roster.filter((s, i) => roster.findIndex((other) => other.user_id === s.user_id) === i);
        const myRoles = new Set(roster.filter((s) => s.user_id === board.me.userId).map((s) => s.role));
        return (
          <article key={ev.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">{ev.name}</h2>
                <p className="text-sm text-muted">
                  {show(ev.event_date)} · {show(ev.event_time)} · {ev.venue}
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
            <p className="mt-4 text-xs tracking-widest text-muted uppercase">Working this night</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {board.roles.map((role) => {
                const count = roster.filter((s) => s.role === role).length;
                return (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={myRoles.has(role)}
                    className="min-h-11 rounded-full border px-3 text-sm font-medium"
                    style={{
                      background: myRoles.has(role) ? roleColor(role) : "transparent",
                      borderColor: roleColor(role),
                      color: myRoles.has(role) ? "#111111" : roleColor(role),
                    }}
                    onClick={() => setOpen({ eventId: ev.id, role })}
                  >
                    {role}
                    {count ? ` ${count}` : ""}
                  </button>
                );
              })}
              {myRoles.size ? (
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-3 text-sm text-bad"
                  onClick={() => void run(() => clearShift({ data: ev.id }))}
                >
                  Not working
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3">
              {people.length ? (
                people.map((s) => (
                  <div key={s.user_id} className="group relative" title={s.name}>
                    {s.image ? (
                      <img src={s.image} alt={s.name} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/10 text-sm font-medium">
                        {(s.name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs text-ink opacity-0 group-hover:opacity-100">
                      {s.name}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted">Nobody signed yet</span>
              )}
            </div>
            <button
              type="button"
              className="mt-4 min-h-11 rounded-xl border border-line px-3 text-sm"
              aria-expanded={rosterId === ev.id}
              onClick={() => setRosterId(rosterId === ev.id ? null : ev.id)}
            >
              {rosterId === ev.id ? "Hide roster" : "Roster"}
            </button>
            {rosterId === ev.id ? (
              <div className="mt-3 rounded-2xl border border-line bg-bg p-4">
                <RolePie
                  slices={board.roles.map((role) => ({
                    name: role,
                    value: roster.filter((s) => s.role === role).length,
                    color: roleColor(role),
                  }))}
                />
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs tracking-widest text-muted uppercase">
                      <th className="py-2 font-medium">Crew</th>
                      <th className="py-2 font-medium">Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.length ? (
                      people.map((person) => {
                        const roles = roster.filter((s) => s.user_id === person.user_id).map((s) => s.role);
                        return (
                          <tr key={person.user_id} className="border-t border-line">
                            <td className="py-2 pr-3">
                              <span className="flex items-center gap-2">
                                {person.image ? (
                                  <img src={person.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                  <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-xs font-medium">
                                    {(person.name || "?").charAt(0).toUpperCase()}
                                  </span>
                                )}
                                {person.name}
                                {roles.length > 1 ? <span className="text-xs text-muted">Doubling up</span> : null}
                              </span>
                            </td>
                            <td className="py-2">
                              <span className="flex flex-wrap gap-1">
                                {roles.map((role) => (
                                  <span
                                    key={role}
                                    className="rounded-full px-2 py-1 text-xs font-medium"
                                    style={{ background: roleColor(role), color: "#111111" }}
                                  >
                                    {role}
                                  </span>
                                ))}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-2 text-muted" colSpan={2}>
                          Nobody signed yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        );
      })}
      {open && openEvent ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={open.role}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg" style={{ color: roleColor(open.role) }}>
                  {open.role}
                </h3>
                <p className="text-sm text-muted">{openEvent.name}</p>
              </div>
              <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {openCrew.length ? (
                openCrew.map((s) => (
                  <li key={s.user_id} className="flex items-center gap-3">
                    {s.image ? (
                      <img src={s.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-black/10 text-sm font-medium">
                        {(s.name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm">{s.name}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">Nobody on this role yet</li>
              )}
            </ul>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-xl bg-fg text-sm font-semibold text-ink"
              onClick={() => {
                if (mineOnOpen) void run(() => dropRole({ data: { eventId: open.eventId, role: open.role } }));
                else void run(() => setShift({ data: { eventId: open.eventId, role: open.role } }));
              }}
            >
              {mineOnOpen ? "Take me off this role" : "Put me on this"}
            </button>
          </div>
        </div>
      ) : null}
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
  const tickets = board.ledger.filter((row) => (row.external_id ?? "").startsWith("humanitix:"));
  const books = board.ledger.filter((row) => !(row.external_id ?? "").startsWith("humanitix:"));
  const ticketTotal = tickets.reduce((sum, row) => sum + row.amount, 0);
  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Net" value={money.format(income - expense)} tone={income - expense >= 0 ? "good" : "bad"} />
        <Stat label="In" value={money.format(income)} tone="good" />
        <Stat label="Out" value={money.format(expense)} tone="bad" />
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl">Humanitix sales</h2>
          <p className="text-sm text-good">{money.format(ticketTotal)}</p>
        </div>
        <p className="mt-1 text-sm text-muted">{board.humanitix || "Ticket sales from Humanitix update on their own."}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs tracking-widest text-muted uppercase">
              <tr>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Event</th>
                <th className="py-2 font-medium">Buyer</th>
                <th className="py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length ? (
                tickets.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2 pr-3">{show(row.entry_date)}</td>
                    <td className="py-2 pr-3">{row.source}</td>
                    <td className="py-2 pr-3 text-muted">{row.notes || "—"}</td>
                    <td className="py-2 text-good">+{money.format(row.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 text-muted" colSpan={4}>
                    No ticket sales yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
      <h2 className="font-display text-xl">Other money</h2>
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
            {books.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-3">{show(row.entry_date)}</td>
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
        Usernames Darcy and Sage are reserved. A new account cannot use them, and choosing a name does not make someone a Founder.
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
