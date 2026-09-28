import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

export type Ops = {
  run: { id: string; eventId: number; time: string; title: string; lead: string; channel: string; notes: string }[];
  incidents: { id: string; eventId: number | null; date: string; reporter: string; severity: string; notes: string; status: string }[];
  kits: { id: string; name: string; location: string; lastChecked: string; ok: boolean }[];
  comms: { id: string; title: string; body: string; link: string; eventId: number | null; mustAck: boolean; created: string }[];
  acks: { postId: string; userId: string }[];
  artists: { id: string; name: string; eventId: number; setLength: string; fee: number; split: string; rider: string; pub: boolean }[];
  brand: { id: string; name: string; kind: string; path: string; current: boolean; notes: string }[];
  rates: { id: string; basis: string; key: string; amount: number }[];
  pay: { id: string; eventId: number; userId: string; name: string; role: string; hours: number; amount: number; status: string }[];
  tickets: Record<string, { presale: number; door: number; comps: number; guests: number }>;
  eventMeta: Record<string, { callTime?: string; capacity?: number; caps?: Record<string, number>; onSite?: Record<string, boolean> }>;
  medbag: string;
};

export const emptyOps = (): Ops => ({
  run: [],
  incidents: [],
  kits: [
    { id: "k1", name: "Floor med bag", location: "Production case", lastChecked: "2026-09-12", ok: true },
    { id: "k2", name: "Door first-aid", location: "Cash tin crate", lastChecked: "2026-08-30", ok: false },
  ],
  comms: [],
  acks: [],
  artists: [],
  brand: [
    { id: "b1", name: "Mark", kind: "Logo", path: "/logo.jpg", current: true, notes: "Invert on dark grounds" },
  ],
  rates: [
    { id: "r1", basis: "role", key: "Security", amount: 200 },
    { id: "r2", basis: "role", key: "Medical", amount: 220 },
    { id: "r3", basis: "role", key: "Door sales", amount: 160 },
    { id: "r4", basis: "role", key: "Production", amount: 250 },
    { id: "r5", basis: "role", key: "Bar", amount: 160 },
  ],
  pay: [],
  tickets: {},
  eventMeta: {},
  medbag: "",
});

export function parseOps(raw: string | null | undefined): Ops {
  const base = emptyOps();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<Ops>;
    return { ...base, ...parsed, kits: parsed.kits?.length ? parsed.kits : base.kits, brand: parsed.brand?.length ? parsed.brand : base.brand, rates: parsed.rates?.length ? parsed.rates : base.rates };
  } catch {
    return base;
  }
}

export const saveOps = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((ops: Ops) => ops)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const note = JSON.stringify(data);
    await sql`insert into sync_state (key, synced_at, note) values ('ops', now(), ${note})
      on conflict (key) do update set synced_at = now(), note = ${note}`;
    return { ok: true };
  });
