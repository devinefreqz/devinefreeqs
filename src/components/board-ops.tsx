import { saveOps, type Ops } from "@/lib/ops";
import { loadBoard } from "@/lib/crew";

type Board = Awaited<ReturnType<typeof loadBoard>>;
type Save = (action: () => Promise<unknown>, patch?: (board: Board) => Board) => Promise<void>;

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const WORK = ["Security", "Medical", "Door sales", "Production", "Bar"];
const field = "min-h-11 rounded-xl border border-line bg-bg px-3 text-sm";
const card = "rounded-2xl border border-line bg-surface p-4";
const btn = "min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink";

function uid(prefix: string) {
  return prefix + Date.now().toString(36);
}
function eventName(board: Board, id: number | null | undefined) {
  return board.events.find((e) => e.id === id)?.name ?? "Unassigned";
}
function patchOps(board: Board, next: Ops): Board {
  return { ...board, ops: next };
}
function persist(board: Board, ops: Ops, run: Save) {
  void run(() => saveOps({ data: ops }), (cur) => patchOps(cur, ops));
}

export function NextShift({ board }: { board: Board }) {
  const mine = board.shifts.filter((s) => s.user_id === board.me.userId);
  const ev = board.events.find((e) => mine.some((s) => s.event_id === e.id));
  if (!ev) return <p className={`${card} text-sm text-muted`}>You are not signed onto an upcoming night.</p>;
  const roles = mine.filter((s) => s.event_id === ev.id).map((s) => s.role).join(", ");
  const meta = board.ops.eventMeta[String(ev.id)] || {};
  return (
    <p className={`${card} text-sm`}>
      <strong>Your next shift</strong> — {ev.name} · {String(ev.event_date).slice(0, 10)} · call {meta.callTime || ev.event_time} · doors {ev.event_time} · {roles}
    </p>
  );
}

export function CoverageGaps({ board }: { board: Board }) {
  const gaps = board.events.flatMap((ev) => {
    const caps = board.ops.eventMeta[String(ev.id)]?.caps || {};
    const short = WORK.filter((role) => Number(caps[role] || 0) > board.shifts.filter((s) => s.event_id === ev.id && s.role === role).length && Number(caps[role] || 0) > 0);
    return short.length ? [{ ev, short }] : [];
  });
  return (
    <>
      {gaps.map((g) => (
        <p key={g.ev.id} className={`${card} text-sm text-muted`}>
          <strong>{g.ev.name}</strong> short {g.short.join(", ")}
        </p>
      ))}
    </>
  );
}

export function RunSheet({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  const eventId = board.events[0]?.id ?? 0;
  const rows = board.ops.run.filter((r) => r.eventId === eventId);
  return (
    <section className="flex flex-col gap-4">
      <div className={card}>
        {rows.map((r) => (
          <p key={r.id} className="border-b border-line py-3 text-sm last:border-0">{r.time} · {r.title} · {r.lead}</p>
        ))}
        {!rows.length ? <p className="text-sm text-muted">No cues yet. Founders add them below.</p> : null}
        {founder ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            persist(board, { ...board.ops, run: [...board.ops.run, { id: uid("rs"), eventId, time: String(f.get("time")), title: String(f.get("title")), lead: String(f.get("lead") || ""), channel: String(f.get("channel") || ""), notes: "" }] }, run);
            e.currentTarget.reset();
          }}>
            <input name="time" type="time" required className={field} />
            <input name="title" placeholder="Cue" required className={field} />
            <input name="lead" placeholder="Lead" className={field} />
            <button type="submit" className={btn}>Add cue</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

export function Safety({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  return (
    <section className="flex flex-col gap-4">
      <p className={`${card} text-sm`}>Open incidents {board.ops.incidents.filter((i) => i.status === "open").length} · med bag {board.ops.medbag || "on the shelf"}</p>
      <div className={card}>
        {board.ops.incidents.map((i) => (
          <div key={i.id} className="border-b border-line py-3 last:border-0">
            <p>{i.date} · {eventName(board, i.eventId)} · {i.status}</p>
            <p className="text-sm text-muted">{i.reporter}: {i.notes}</p>
            {founder && i.status === "open" ? <button type="button" className="mt-2 text-sm" onClick={() => persist(board, { ...board.ops, incidents: board.ops.incidents.map((x) => x.id === i.id ? { ...x, status: "closed" } : x) }, run)}>Close</button> : null}
          </div>
        ))}
        <form className="mt-4 grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          persist(board, { ...board.ops, incidents: [...board.ops.incidents, { id: uid("i"), eventId: Number(f.get("eventId") || 0) || null, date: String(f.get("date")), reporter: board.me.name, severity: String(f.get("severity")), notes: String(f.get("notes")), status: "open" }] }, run);
          e.currentTarget.reset();
        }}>
          <select name="eventId" className={field}><option value="">Unassigned</option>{board.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select>
          <select name="severity" className={field}><option>watch</option><option>minor</option><option>serious</option></select>
          <input name="date" type="date" required className={field} />
          <textarea name="notes" required placeholder="What happened" className="min-h-20 rounded-xl border border-line bg-bg px-3 py-2 text-sm" />
          <button type="submit" className={btn}>File report</button>
        </form>
      </div>
    </section>
  );
}

export function Comms({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  return (
    <section className="flex flex-col gap-4">
      {founder ? (
        <form className={`${card} grid gap-3`} onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          persist(board, { ...board.ops, comms: [...board.ops.comms, { id: uid("m"), title: String(f.get("title")), body: String(f.get("body")), link: "", eventId: null, mustAck: true, created: new Date().toISOString().slice(0, 10) }] }, run);
          e.currentTarget.reset();
        }}>
          <input name="title" required placeholder="Title" className={field} />
          <textarea name="body" required placeholder="Brief" className="min-h-20 rounded-xl border border-line bg-bg px-3 py-2 text-sm" />
          <button type="submit" className={btn}>Post</button>
        </form>
      ) : null}
      {board.ops.comms.slice().reverse().map((m) => {
        const mine = board.ops.acks.some((a) => a.postId === m.id && a.userId === board.me.userId);
        return (
          <article key={m.id} className={card}>
            <h3 className="font-display text-lg">{m.title}</h3>
            <p className="mt-2 text-sm">{m.body}</p>
            {m.mustAck && !mine ? <button type="button" className={`${btn} mt-3`} onClick={() => persist(board, { ...board.ops, acks: [...board.ops.acks, { postId: m.id, userId: board.me.userId }] }, run)}>Acknowledge</button> : null}
          </article>
        );
      })}
    </section>
  );
}

export function Artists({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  return (
    <section className="flex flex-col gap-4">
      {founder ? (
        <form className={`${card} grid gap-3 sm:grid-cols-2`} onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          persist(board, { ...board.ops, artists: [...board.ops.artists, { id: uid("a"), name: String(f.get("name")), eventId: Number(f.get("eventId")), setLength: String(f.get("setLength") || ""), fee: Number(f.get("fee") || 0), split: String(f.get("split") || ""), rider: String(f.get("rider") || ""), pub: true }] }, run);
          e.currentTarget.reset();
        }}>
          <input name="name" required placeholder="Artist" className={field} />
          <select name="eventId" className={field}>{board.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select>
          <input name="setLength" placeholder="Set length" className={field} />
          <input name="fee" type="number" min="0" step="0.01" placeholder="Fee AUD" className={field} />
          <button type="submit" className={btn}>Add booking</button>
        </form>
      ) : null}
      {board.ops.artists.filter((a) => a.pub || founder).map((a) => (
        <article key={a.id} className={card}>
          <h3 className="font-display text-lg">{a.name}</h3>
          <p className="text-sm text-muted">{eventName(board, a.eventId)} · {a.setLength}{founder ? ` · ${money.format(a.fee)}` : ""}</p>
        </article>
      ))}
    </section>
  );
}

export function BrandPack({ board }: { board: Board; founder: boolean; run: Save }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {board.ops.brand.map((b) => (
        <article key={b.id} className={card}>
          {b.path ? <img src={b.path} alt="" className="h-28 w-full rounded-xl object-cover" /> : null}
          <p className="mt-2 font-medium">{b.name}</p>
          <p className="text-sm text-muted">{b.kind} · {b.current ? "current" : "archive"}</p>
        </article>
      ))}
    </section>
  );
}

export function TicketsPanel({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  return (
    <section className="flex flex-col gap-4">
      {board.events.map((ev) => {
        const b = board.ops.tickets[String(ev.id)] || { presale: 0, door: 0, comps: 0, guests: 0 };
        const cap = board.ops.eventMeta[String(ev.id)]?.capacity || 200;
        const used = b.presale + b.door + b.comps + b.guests;
        return (
          <article key={ev.id} className={card}>
            <h3 className="font-display text-lg">{ev.name}</h3>
            <p className="text-sm text-muted">Capacity {cap} · {used} accounted · {cap - used} remaining</p>
            {founder ? (
              <form className="mt-3 grid gap-3 sm:grid-cols-4" onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                persist(board, { ...board.ops, tickets: { ...board.ops.tickets, [String(ev.id)]: { presale: Number(f.get("presale") || 0), door: Number(f.get("door") || 0), comps: Number(f.get("comps") || 0), guests: Number(f.get("guests") || 0) } } }, run);
              }}>
                <input name="presale" type="number" min="0" defaultValue={b.presale} className={field} />
                <input name="door" type="number" min="0" defaultValue={b.door} className={field} />
                <input name="comps" type="number" min="0" defaultValue={b.comps} className={field} />
                <input name="guests" type="number" min="0" defaultValue={b.guests} className={field} />
                <button type="submit" className={btn}>Save counts</button>
              </form>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

export function PayrollPanel({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  if (!founder) return null;
  return (
    <section className={card}>
      {board.ops.pay.map((p) => (
        <p key={p.id} className="border-b border-line py-2 text-sm">{eventName(board, p.eventId)} · {p.name} · {p.role} · {money.format(p.amount)} · {p.status}</p>
      ))}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const role = String(f.get("role"));
        const person = board.crew.find((c) => c.user_id === String(f.get("userId")));
        persist(board, { ...board.ops, pay: [...board.ops.pay, { id: uid("p"), eventId: Number(f.get("eventId")), userId: String(f.get("userId")), name: person?.name || "Crew", role, hours: Number(f.get("hours") || 0), amount: board.ops.rates.find((r) => r.key === role)?.amount || 0, status: "logged" }] }, run);
        e.currentTarget.reset();
      }}>
        <select name="eventId" className={field}>{board.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select>
        <select name="userId" className={field}>{board.crew.map((c) => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}</select>
        <select name="role" className={field}>{WORK.map((r) => <option key={r}>{r}</option>)}</select>
        <input name="hours" type="number" min="0" step="0.5" required placeholder="Hours" className={field} />
        <button type="submit" className={btn}>Log shift</button>
      </form>
    </section>
  );
}

export function EventMetaForm({ board, eventId, founder, run }: { board: Board; eventId: number; founder: boolean; run: Save }) {
  const meta = board.ops.eventMeta[String(eventId)] || {};
  if (!founder) return null;
  return (
    <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const caps: Record<string, number> = {};
      WORK.forEach((role) => { caps[role] = Number(f.get("cap-" + role) || 0); });
      persist(board, { ...board.ops, eventMeta: { ...board.ops.eventMeta, [String(eventId)]: { callTime: String(f.get("callTime") || ""), capacity: Number(f.get("capacity") || 200), caps, onSite: meta.onSite || {} } } }, run);
    }}>
      <input name="callTime" type="time" defaultValue={meta.callTime || ""} className={field} />
      <input name="capacity" type="number" min="1" defaultValue={meta.capacity || 200} className={field} />
      {WORK.map((role) => <input key={role} name={"cap-" + role} type="number" min="0" defaultValue={meta.caps?.[role] || 0} placeholder={role + " cap"} className={field} />)}
      <button type="submit" className="min-h-11 rounded-xl border border-line px-3 text-sm">Save caps / call</button>
    </form>
  );
}
