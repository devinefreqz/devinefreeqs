import { useState } from "react";
import { saveOps, type Ops } from "@/lib/ops";
import { loadBoard } from "@/lib/crew";
import { useCurrentUser } from "@/lib/auth/use-current-user";

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
function stamp(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}
function Face({ name, image }: { name: string; image?: string | null }) {
  if (image) return <img src={image} alt={name} title={name} className="h-10 w-10 rounded-full object-cover" />;
  return (
    <span title={name} className="grid h-10 w-10 place-items-center rounded-full bg-black/20 text-sm font-medium">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
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

function sheetText(board: Board, eventId: number) {
  const saved = board.ops.sheets?.[String(eventId)];
  if (typeof saved === "string") return saved;
  return board.ops.run
    .filter((r) => r.eventId === eventId)
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((r) => [r.time, r.title, r.lead, r.channel].filter(Boolean).join(" · "))
    .join("\n");
}

export function RunSheet({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  const [open, setOpen] = useState<number | null>(board.events[0]?.id ?? null);
  if (!board.events.length) return <p className={`${card} text-sm text-muted`}>Add an event first, then drop its run sheet from the listing.</p>;
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted">{founder ? "Open a night to edit its run sheet. Each event keeps its own." : "Open a night to read its run sheet."}</p>
      {board.events.map((ev) => {
        const text = sheetText(board, ev.id);
        const shown = open === ev.id;
        return (
          <article key={ev.id} className={card}>
            <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(shown ? null : ev.id)} aria-expanded={shown}>
              <div>
                <h3 className="font-display text-lg">{ev.name}</h3>
                <p className="text-sm text-muted">{String(ev.event_date).slice(0, 10)} · {ev.event_time} · {ev.venue}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-line text-lg" aria-hidden>
                {shown ? "▾" : "▸"}
              </span>
            </button>
            {shown ? (
              <div className="mt-4 border-t border-line pt-3">
                {founder ? (
                  <form className="grid gap-3" onSubmit={(e) => {
                    e.preventDefault();
                    const body = String(new FormData(e.currentTarget).get("body") ?? "");
                    persist(board, { ...board.ops, sheets: { ...(board.ops.sheets || {}), [String(ev.id)]: body } }, run);
                  }}>
                    <textarea key={text} name="body" defaultValue={text} placeholder="Load-in, doors, sets, lock-up" className="min-h-48 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm" />
                    <button type="submit" className={btn}>Save run sheet</button>
                  </form>
                ) : text.trim() ? (
                  <p className="whitespace-pre-wrap text-sm">{text}</p>
                ) : (
                  <p className="text-sm text-muted">No run sheet for this night yet.</p>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
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
  const me = useCurrentUser();
  function person(userId: string) {
    const fromCrew = board.crew.find((c) => c.user_id === userId) as { user_id: string; name: string; image?: string | null } | undefined;
    const fromShift = board.shifts.find((s) => s.user_id === userId);
    const self = userId === board.me.userId;
    return {
      name: fromCrew?.name || fromShift?.name || (self ? board.me.name : "Crew"),
      image: fromCrew?.image || fromShift?.image || (self ? me?.profileImageUrl : null) || null,
    };
  }
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
        const acks = board.ops.acks.filter((a) => a.postId === m.id);
        return (
          <article key={m.id} className={card}>
            <h3 className="font-display text-lg">{m.title}</h3>
            <p className="mt-2 text-sm">{m.body}</p>
            {m.mustAck && !mine ? (
              <button type="button" className={`${btn} mt-3`} onClick={() => {
                const who = person(board.me.userId);
                persist(board, { ...board.ops, acks: [...board.ops.acks, { postId: m.id, userId: board.me.userId, name: who.name, image: who.image, at: new Date().toISOString() }] }, run);
              }}>Acknowledge</button>
            ) : null}
            {acks.length ? (
              <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3">
                {acks.map((a) => {
                  const who = person(a.userId);
                  return (
                    <div key={a.userId} className="flex w-12 flex-col items-center gap-1">
                      <Face name={a.name || who.name} image={a.image || who.image} />
                      <span className="text-[10px] leading-tight text-muted">{stamp(a.at) || "seen"}</span>
                    </div>
                  );
                })}
              </div>
            ) : m.mustAck ? <p className="mt-3 text-sm text-muted">No acknowledgements yet.</p> : null}
          </article>
        );
      })}
    </section>
  );
}

export function Artists({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  const saveArtist = (id: string, f: FormData) => {
    persist(
      board,
      {
        ...board.ops,
        artists: board.ops.artists.map((a) =>
          a.id === id
            ? {
                ...a,
                name: String(f.get("name") || a.name).trim() || a.name,
                eventId: Number(f.get("eventId") || a.eventId),
                setLength: String(f.get("setLength") || ""),
                fee: Number(f.get("fee") || 0),
                split: String(f.get("split") || ""),
                rider: String(f.get("rider") || ""),
                pub: f.get("pub") === "on",
              }
            : a,
        ),
      },
      run,
    );
  };

  return (
    <section className="flex flex-col gap-4">
      {founder ? (
        <form
          className={`${card} grid gap-3 sm:grid-cols-2`}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            persist(
              board,
              {
                ...board.ops,
                artists: [
                  ...board.ops.artists,
                  {
                    id: uid("a"),
                    name: String(f.get("name")),
                    eventId: Number(f.get("eventId")),
                    setLength: String(f.get("setLength") || ""),
                    fee: Number(f.get("fee") || 0),
                    split: String(f.get("split") || ""),
                    rider: String(f.get("rider") || ""),
                    pub: true,
                  },
                ],
              },
              run,
            );
            e.currentTarget.reset();
          }}
        >
          <input name="name" required placeholder="Artist" className={field} />
          <select name="eventId" className={field}>
            {board.events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
          <input name="setLength" placeholder="Set length" className={field} />
          <input name="fee" type="number" min="0" step="0.01" placeholder="Fee AUD" className={field} />
          <input name="split" placeholder="Split / deal notes" className={field} />
          <input name="rider" placeholder="Rider notes" className={field} />
          <button type="submit" className={btn}>
            Add booking
          </button>
        </form>
      ) : null}
      {board.ops.artists
        .filter((a) => a.pub || founder)
        .map((a) =>
          founder ? (
            <form
              key={a.id}
              className={`${card} grid gap-3 sm:grid-cols-2`}
              onSubmit={(e) => {
                e.preventDefault();
                saveArtist(a.id, new FormData(e.currentTarget));
              }}
            >
              <input name="name" required defaultValue={a.name} placeholder="Artist" className={field} />
              <select name="eventId" defaultValue={a.eventId} className={field}>
                {board.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <input name="setLength" defaultValue={a.setLength} placeholder="Set length" className={field} />
              <input name="fee" type="number" min="0" step="0.01" defaultValue={a.fee} placeholder="Fee AUD" className={field} />
              <input name="split" defaultValue={a.split} placeholder="Split / deal notes" className={field} />
              <input name="rider" defaultValue={a.rider} placeholder="Rider notes" className={field} />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input name="pub" type="checkbox" defaultChecked={a.pub} className="h-4 w-4" />
                Show to crew
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="submit" className={btn}>
                  Save
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-line px-4 text-sm text-bad"
                  onClick={() =>
                    persist(board, { ...board.ops, artists: board.ops.artists.filter((x) => x.id !== a.id) }, run)
                  }
                >
                  Remove
                </button>
              </div>
            </form>
          ) : (
            <article key={a.id} className={card}>
              <h3 className="font-display text-lg">{a.name}</h3>
              <p className="text-sm text-muted">
                {eventName(board, a.eventId)} · {a.setLength}
              </p>
              {a.split || a.rider ? (
                <p className="mt-2 text-sm text-muted">
                  {[a.split, a.rider].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </article>
          ),
        )}
    </section>
  );
}

function fileName(path: string, fallback: string) {
  if (path.startsWith("data:")) return fallback.replace(/\s+/g, "-").toLowerCase();
  const part = path.split("/").pop() || fallback;
  return part.split("?")[0] || fallback;
}

export function BrandPack({ board, founder, run }: { board: Board; founder: boolean; run: Save }) {
  return (
    <section className="flex flex-col gap-4">
      {founder ? (
        <label className={`${card} flex cursor-pointer flex-col gap-2 text-sm`}>
          <span className="font-medium">Upload media</span>
          <span className="text-muted">PNG, JPG or SVG. Saved to the brand pack for the crew.</span>
          <input type="file" accept="image/*" className="text-sm" onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 2500000) {
              window.alert("Keep uploads under 2.5 MB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              persist(board, { ...board.ops, brand: [...board.ops.brand, { id: uid("b"), name: file.name.replace(/\.[^.]+$/, ""), kind: "Upload", path: String(reader.result || ""), current: true, notes: file.name }] }, run);
            };
            reader.readAsDataURL(file);
          }} />
        </label>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {board.ops.brand.map((b) => (
          <article key={b.id} className={card}>
            {b.path ? <img src={b.path} alt="" className="h-28 w-full rounded-xl object-cover" /> : null}
            <p className="mt-2 font-medium">{b.name}</p>
            <p className="text-sm text-muted">{b.kind} · {b.current ? "current" : "archive"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {b.path ? <a href={b.path} download={fileName(b.path, b.name)} className="min-h-11 rounded-xl border border-line px-3 text-sm leading-[2.75rem]">Download</a> : null}
              {founder ? <button type="button" className="min-h-11 text-sm text-bad" onClick={() => persist(board, { ...board.ops, brand: board.ops.brand.filter((x) => x.id !== b.id) }, run)}>Remove</button> : null}
            </div>
          </article>
        ))}
      </div>
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
