import { useMemo, useState } from "react";
import {
  addEquipment,
  addLedger,
  deleteEquipment,
  deleteLedger,
  loadBoard,
  type Rank,
} from "@/lib/crew";
import { Field, RankPill, Stat } from "./board-ui";

type Board = Awaited<ReturnType<typeof loadBoard>>;
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
function show(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value);
}

export function Overview({
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

export function Finance({
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
                <td className="px-3 py-3">{show(row.entry_date)}</td>
                <td className="px-3 py-3">
                  {row.source}
                  <span className="block text-xs text-muted">
                    {row.kind} · {row.category}
                  </span>
                </td>
                <td className={row.kind === "income" ? "px-3 py-3 text-good" : "px-3 py-3 text-bad"}>
                  {row.kind === "income" ? "+" : "\u2212"}
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

export function Gear({
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
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(false);
  const known = useMemo(() => {
    const seen = new Map<string, number>();
    board.gear.forEach((item) => {
      const key = item.name.trim();
      if (!key) return;
      if (!seen.has(key.toLowerCase())) seen.set(key.toLowerCase(), item.unit_cost);
    });
    return [...seen.entries()]
      .map(([key, cost]) => {
        const label = board.gear.find((item) => item.name.trim().toLowerCase() === key)?.name || key;
        return { label, cost };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [board.gear]);
  const matches = known.filter((item) => item.label.toLowerCase().includes(name.trim().toLowerCase()));
  const list = board.gear.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Stat label="Kit value" value={money.format(total)} />
        {founder ? (
          <button type="button" className="min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink" onClick={() => setOpen((v) => !v)}>
            Add equipment
          </button>
        ) : null}
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search kit" className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm" />
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
                  name: name.trim() || String(form.get("name") ?? ""),
                  unitCost: Number(form.get("unitCost")),
                },
              }),
            );
            e.currentTarget.reset();
            setName("");
            setPicked(false);
            setOpen(false);
          }}
        >
          <Field name="qty" label="Qty" type="number" />
          <label className="relative flex flex-col gap-1 text-xs tracking-widest text-muted uppercase">
            Item
            <input
              name="name"
              value={name}
              autoComplete="off"
              placeholder="15 inch PA speaker"
              required
              className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case placeholder:text-muted"
              onChange={(e) => {
                setName(e.target.value);
                setPicked(false);
              }}
            />
            {name.trim() && !picked && matches.length ? (
              <ul className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-line bg-surface text-sm normal-case shadow-lg">
                {matches.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-black/20"
                      onClick={() => {
                        setName(item.label);
                        setPicked(true);
                        const cost = document.querySelector<HTMLInputElement>('input[name="unitCost"]');
                        if (cost && item.cost) cost.value = String(item.cost);
                      }}
                    >
                      <span>{item.label}</span>
                      <span className="text-muted">{money.format(item.cost)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </label>
          <Field name="unitCost" label="Each AUD" type="number" placeholder="300" />
          <div className="sm:col-span-3">
            <button type="submit" className="min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink">
              Save item
            </button>
          </div>
        </form>
      ) : null}
      <ul className="flex flex-col gap-2">
        {list.map((item) => (
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
        {!list.length ? <li className="text-sm text-muted">No kit matches that search.</li> : null}
      </ul>
    </section>
  );
}

export function CrewList({ crew }: { crew: { user_id: string; name: string; rank: string }[] }) {
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
