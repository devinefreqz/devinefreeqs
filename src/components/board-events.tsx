import { useState } from "react";
import { roleColor } from "@/lib/role-colors";
import {
  addEvent,
  clearShift,
  deleteEvent,
  dropRole,
  setShift,
  loadBoard,
} from "@/lib/crew";
import { Field, RolePie } from "./board-ui";

type Board = Awaited<ReturnType<typeof loadBoard>>;
function show(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? "" : String(value);
}

export function Events({
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
