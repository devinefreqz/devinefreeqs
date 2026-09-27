import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

const FOUNDER_EMAILS = new Set(["divinefrequencies42@gmail.com", "darcygray10@hotmail.com"]);

export type Rank = "Founder" | "Crew Member";

type Actor = { userId: string; name: string; rank: Rank; founder: boolean };

const WORK_ROLES = ["Security", "Medical", "Door sales", "Production", "Bar"] as const;

async function actor(userId: string): Promise<Actor> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const users = await sql<{ name: string; email: string }>`select name, email from "user" where id = ${userId}`;
  const name = users[0]?.name?.trim() || "Crew";
  const founderEmail = FOUNDER_EMAILS.has((users[0]?.email ?? "").trim().toLowerCase());
  const existing = await sql<{ rank: string }>`select rank from profiles where user_id = ${userId}`;
  const rank: Rank = founderEmail || existing[0]?.rank === "Founder" ? "Founder" : "Crew Member";
  if (existing[0]) {
    await sql`update profiles set name = ${name}, rank = ${rank} where user_id = ${userId}`;
  } else {
    await sql`insert into profiles (user_id, name, rank) values (${userId}, ${name}, ${rank})`;
  }
  return { userId, name, rank, founder: rank === "Founder" };
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const loadBoard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await actor(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const ledger = me.founder
      ? await sql<{
          id: number;
          entry_date: string;
          kind: string;
          category: string;
          source: string;
          amount: string;
          notes: string;
        }>`select id, entry_date, kind, category, source, amount, notes from ledger order by entry_date desc, id desc`
      : [];
    const events = await sql<{
      id: number;
      name: string;
      event_date: string;
      event_time: string;
      venue: string;
      notes: string;
    }>`select id, name, event_date, event_time, venue, notes from events order by event_date, event_time`;
    const shifts = await sql<{
      event_id: number;
      user_id: string;
      name: string;
      role: string;
      image: string | null;
    }>`select s.event_id, s.user_id, s.name, s.role, u.image
      from shifts s
      left join "user" u on u.id = s.user_id
      order by s.name`;
    const gear = me.founder
      ? await sql<{
          id: number;
          name: string;
          qty: number;
          unit_cost: string;
          notes: string;
        }>`select id, name, qty, unit_cost, notes from equipment order by id desc`
      : [];
    const humanitix = me.founder
      ? ((await sql<{ note: string }>`select note from sync_state where key = 'humanitix'`)[0]?.note ??
        "Waiting for the first Humanitix check.")
      : "";
    const crew = await sql<{ user_id: string; name: string; rank: string }>`
      select user_id, name, rank from profiles order by rank, name
    `;
    return {
      me,
      roles: WORK_ROLES,
      ledger: ledger.map((r) => ({ ...r, amount: num(r.amount) })),
      events,
      shifts,
      gear: gear.map((r) => ({ ...r, unit_cost: num(r.unit_cost) })),
      crew,
      humanitix,
    };
  });

export const syncTickets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { syncHumanitix } = await import("@/lib/humanitix");
    await syncHumanitix();
    return { ok: true };
  });

export const addLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { date: string; kind: string; category: string; source: string; amount: number; notes: string }) => input)
  .handler(async ({ context, data }) => {
    const me = await actor(context.userId);
    if (!me.founder) throw new Error("Founders only");
    const amount = num(data.amount);
    if (!data.source.trim() || amount <= 0) throw new Error("Need a source and an amount");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into ledger (entry_date, kind, category, source, amount, notes)
      values (${data.date}, ${data.kind === "income" ? "income" : "expense"}, ${data.category}, ${data.source.trim()}, ${amount}, ${data.notes.trim()})`;
    return { ok: true };
  });

export const deleteLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const me = await actor(context.userId);
    if (!me.founder) throw new Error("Founders only");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from ledger where id = ${id}`;
    return { ok: true };
  });

export const addEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; date: string; time: string; venue: string; notes: string }) => input)
  .handler(async ({ context, data }) => {
    const me = await actor(context.userId);
    if (!me.founder) throw new Error("Founders only");
    if (!data.name.trim() || !data.venue.trim()) throw new Error("Need a name and venue");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into events (name, event_date, event_time, venue, notes)
      values (${data.name.trim()}, ${data.date}, ${data.time}, ${data.venue.trim()}, ${data.notes.trim()})`;
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const me = await actor(context.userId);
    if (!me.founder) throw new Error("Founders only");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from events where id = ${id}`;
    return { ok: true };
  });

export const setShift = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { eventId: number; role: string }) => input)
  .handler(async ({ context, data }) => {
    const me = await actor(context.userId);
    if (!WORK_ROLES.includes(data.role as (typeof WORK_ROLES)[number])) throw new Error("Unknown role");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into shifts (event_id, user_id, name, role)
      values (${data.eventId}, ${me.userId}, ${me.name}, ${data.role})
      on conflict (event_id, user_id, role) do update set name = ${me.name}`;
    return { ok: true };
  });

export const clearShift = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((eventId: number) => eventId)
  .handler(async ({ context, data: eventId }) => {
    const me = await actor(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from shifts where event_id = ${eventId} and user_id = ${me.userId}`;
    return { ok: true };
  });

export const dropRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { eventId: number; role: string }) => input)
  .handler(async ({ context, data }) => {
    const me = await actor(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from shifts where event_id = ${data.eventId} and user_id = ${me.userId} and role = ${data.role}`;
    return { ok: true };
  });

export const addEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; qty: number; unitCost: number }) => input)
  .handler(async ({ context, data }) => {
    const me = await actor(context.userId);
    if (!me.founder) throw new Error("Founders only");
    const qty = Math.round(num(data.qty));
    const unitCost = num(data.unitCost);
    if (!data.name.trim() || qty < 1 || unitCost < 0) throw new Error("Need an item, a quantity, and a price");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into equipment (name, qty, unit_cost) values (${data.name.trim()}, ${qty}, ${unitCost})`;
    return { ok: true };
  });

export const deleteEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const me = await actor(context.userId);
    if (!me.founder) throw new Error("Founders only");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from equipment where id = ${id}`;
    return { ok: true };
  });
