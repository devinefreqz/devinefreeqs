import type { Sql } from "@/lib/db";

type HxEvent = { _id: string; name?: string; published?: boolean };
type HxOrder = {
  _id: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  completedAt?: string;
  createdAt?: string;
  totals?: { netSales?: number; refunds?: number };
};
type HxPage<T> = { total: number; events?: T[]; orders?: T[] };

function melbourneDay(iso?: string) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(date);
}

async function hx<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`https://api.humanitix.com${path}`, {
    headers: { "x-api-key": key, accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "rejected" : "down");
  return (await res.json()) as T;
}

async function allPages<T>(path: string, list: "events" | "orders", key: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 8; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const data = await hx<HxPage<T>>(`${path}${sep}page=${page}&pageSize=100`, key);
    const batch = (list === "events" ? data.events : data.orders) ?? [];
    rows.push(...batch);
    if (batch.length === 0 || page * 100 >= data.total) break;
  }
  return rows;
}

async function note(sql: Sql, text: string, retrySoon: boolean) {
  const when = retrySoon ? new Date(Date.now() - 10 * 60 * 1000).toISOString() : new Date().toISOString();
  await sql`insert into sync_state (key, synced_at, note) values ('humanitix', ${when}, ${text})
    on conflict (key) do update set synced_at = ${when}, note = ${text}`;
}

/** Pull Humanitix ticket sales into the ledger. Safe to call often; it skips if it ran recently. */
export async function syncHumanitix() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const key = process.env.HUMANITIX_API_KEY?.trim();
  if (!key) {
    await note(sql, "Humanitix is not connected.", false);
    return;
  }
  await sql`insert into sync_state (key, synced_at, note) values ('humanitix', '1970-01-01T00:00:00Z', '')
    on conflict (key) do nothing`;
  const claimed = await sql<{ key: string }>`update sync_state set synced_at = now()
    where key = 'humanitix' and synced_at < now() - interval '4 minutes'
    returning key`;
  if (!claimed.length) return;
  try {
    const events = await allPages<HxEvent>("/v1/events", "events", key);
    let count = 0;
    for (const event of events) {
      if (!event.published || !event._id) continue;
      const orders = await allPages<HxOrder>(`/v1/events/${encodeURIComponent(event._id)}/orders`, "orders", key);
      for (const order of orders) {
        if (order.status !== "complete" || !order._id) continue;
        const net = Number(order.totals?.netSales ?? 0);
        const refunds = Number(order.totals?.refunds ?? 0);
        const amount = Math.round((net - refunds) * 100) / 100;
        const externalId = `humanitix:${order._id}`;
        if (amount <= 0) {
          await sql`delete from ledger where external_id = ${externalId}`;
          continue;
        }
        const buyer = [order.firstName, order.lastName].filter(Boolean).join(" ").trim();
        const source = (event.name || "Humanitix").trim().slice(0, 140);
        const day = melbourneDay(order.completedAt || order.createdAt);
        await sql`insert into ledger (entry_date, kind, category, source, amount, notes, external_id)
          values (${day}, 'income', 'Tickets', ${source}, ${amount}, ${buyer.slice(0, 140)}, ${externalId})
          on conflict (external_id) do update
          set entry_date = excluded.entry_date, amount = excluded.amount, source = excluded.source, notes = excluded.notes`;
        count += 1;
      }
    }
    await note(sql, count ? `Humanitix ticket sales are in. ${count} orders.` : "Humanitix ticket sales are up to date.", false);
  } catch (error) {
    const rejected = error instanceof Error && error.message === "rejected";
    await note(sql, rejected ? "Humanitix rejected the key." : "Humanitix could not be reached. It will retry.", true);
  }
}
