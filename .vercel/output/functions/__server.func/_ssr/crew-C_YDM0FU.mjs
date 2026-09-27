import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-7I3fSF-n.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/crew-C_YDM0FU.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var FOUNDER_NAMES = /* @__PURE__ */ new Set([
	"darcy",
	"darcy gray",
	"sage"
]);
var WORK_ROLES = [
	"Security",
	"Medical",
	"Door sales",
	"Production",
	"Bar"
];
function isFounderName(name) {
	return FOUNDER_NAMES.has(name.trim().toLowerCase());
}
async function actor(userId) {
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	const sql = await getSql();
	const name = (await sql`select name from "user" where id = ${userId}`)[0]?.name?.trim() || "Crew";
	const promoted = isFounderName(name);
	const existing = await sql`select rank from profiles where user_id = ${userId}`;
	let rank = promoted ? "Founder" : "Crew Member";
	if (existing[0]) {
		rank = existing[0].rank === "Founder" || promoted ? "Founder" : "Crew Member";
		await sql`update profiles set name = ${name}, rank = ${rank} where user_id = ${userId}`;
	} else await sql`insert into profiles (user_id, name, rank) values (${userId}, ${name}, ${rank})`;
	return {
		userId,
		name,
		rank,
		founder: rank === "Founder"
	};
}
function num(value) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}
var loadBoard_createServerFn_handler = createServerRpc({
	id: "2f35d98429e6bacdd59521f68a5bb51b254f830ef2357a158b2d2822167d3e3f",
	name: "loadBoard",
	filename: "src/lib/crew.ts"
}, (opts) => loadBoard.__executeServer(opts));
var loadBoard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(loadBoard_createServerFn_handler, async ({ context }) => {
	const me = await actor(context.userId);
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	const sql = await getSql();
	const ledger = await sql`select id, entry_date, kind, category, source, amount, notes from ledger order by entry_date desc, id desc`;
	const events = await sql`select id, name, event_date, event_time, venue, notes from events order by event_date, event_time`;
	const shifts = await sql`select event_id, user_id, name, role from shifts order by name`;
	const gear = await sql`select id, name, qty, unit_cost, notes from equipment order by id desc`;
	const crew = await sql`
      select user_id, name, rank from profiles order by rank, name
    `;
	return {
		me,
		roles: WORK_ROLES,
		ledger: ledger.map((r) => ({
			...r,
			amount: num(r.amount)
		})),
		events,
		shifts,
		gear: gear.map((r) => ({
			...r,
			unit_cost: num(r.unit_cost)
		})),
		crew
	};
});
var addLedger_createServerFn_handler = createServerRpc({
	id: "d7a18593d31547493daebd613805fca412221f892a327496e09df91a7827362a",
	name: "addLedger",
	filename: "src/lib/crew.ts"
}, (opts) => addLedger.__executeServer(opts));
var addLedger = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(addLedger_createServerFn_handler, async ({ context, data }) => {
	if (!(await actor(context.userId)).founder) throw new Error("Founders only");
	const amount = num(data.amount);
	if (!data.source.trim() || amount <= 0) throw new Error("Need a source and an amount");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`insert into ledger (entry_date, kind, category, source, amount, notes)
      values (${data.date}, ${data.kind === "income" ? "income" : "expense"}, ${data.category}, ${data.source.trim()}, ${amount}, ${data.notes.trim()})`;
	return { ok: true };
});
var deleteLedger_createServerFn_handler = createServerRpc({
	id: "b37aa7cc870e2f887c089f394b03c25108f5edcd6139334755aea0d58987927f",
	name: "deleteLedger",
	filename: "src/lib/crew.ts"
}, (opts) => deleteLedger.__executeServer(opts));
var deleteLedger = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(deleteLedger_createServerFn_handler, async ({ context, data: id }) => {
	if (!(await actor(context.userId)).founder) throw new Error("Founders only");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`delete from ledger where id = ${id}`;
	return { ok: true };
});
var addEvent_createServerFn_handler = createServerRpc({
	id: "bd6b7e0fb5ac321cf2efb867912bfa7511f8de534af53fa88f14b4c7b042eaf0",
	name: "addEvent",
	filename: "src/lib/crew.ts"
}, (opts) => addEvent.__executeServer(opts));
var addEvent = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(addEvent_createServerFn_handler, async ({ context, data }) => {
	if (!(await actor(context.userId)).founder) throw new Error("Founders only");
	if (!data.name.trim() || !data.venue.trim()) throw new Error("Need a name and venue");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`insert into events (name, event_date, event_time, venue, notes)
      values (${data.name.trim()}, ${data.date}, ${data.time}, ${data.venue.trim()}, ${data.notes.trim()})`;
	return { ok: true };
});
var deleteEvent_createServerFn_handler = createServerRpc({
	id: "d70ec24d503cf98ea84575c44d39372f53ed5457dcea83d169835de1787429c9",
	name: "deleteEvent",
	filename: "src/lib/crew.ts"
}, (opts) => deleteEvent.__executeServer(opts));
var deleteEvent = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(deleteEvent_createServerFn_handler, async ({ context, data: id }) => {
	if (!(await actor(context.userId)).founder) throw new Error("Founders only");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`delete from events where id = ${id}`;
	return { ok: true };
});
var setShift_createServerFn_handler = createServerRpc({
	id: "cc7bb71fe358ffd776687d010b082e795f945a890bdf9a559088d191555b7bd9",
	name: "setShift",
	filename: "src/lib/crew.ts"
}, (opts) => setShift.__executeServer(opts));
var setShift = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(setShift_createServerFn_handler, async ({ context, data }) => {
	const me = await actor(context.userId);
	if (!WORK_ROLES.includes(data.role)) throw new Error("Unknown role");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`insert into shifts (event_id, user_id, name, role)
      values (${data.eventId}, ${me.userId}, ${me.name}, ${data.role})
      on conflict (event_id, user_id) do update set role = ${data.role}, name = ${me.name}`;
	return { ok: true };
});
var clearShift_createServerFn_handler = createServerRpc({
	id: "26354c8df9ca4614d356f544d00b3ce7d5e2890ed0b0cf9c57c2512d854a8e73",
	name: "clearShift",
	filename: "src/lib/crew.ts"
}, (opts) => clearShift.__executeServer(opts));
var clearShift = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((eventId) => eventId).handler(clearShift_createServerFn_handler, async ({ context, data: eventId }) => {
	const me = await actor(context.userId);
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`delete from shifts where event_id = ${eventId} and user_id = ${me.userId}`;
	return { ok: true };
});
var addEquipment_createServerFn_handler = createServerRpc({
	id: "2248a6e7b73ed0ed6eddfae4429bd08226bcf15df18a700a498ca886d3dfeb5e",
	name: "addEquipment",
	filename: "src/lib/crew.ts"
}, (opts) => addEquipment.__executeServer(opts));
var addEquipment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(addEquipment_createServerFn_handler, async ({ context, data }) => {
	if (!(await actor(context.userId)).founder) throw new Error("Founders only");
	const qty = Math.round(num(data.qty));
	const unitCost = num(data.unitCost);
	if (!data.name.trim() || qty < 1 || unitCost < 0) throw new Error("Need an item, a quantity, and a price");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`insert into equipment (name, qty, unit_cost) values (${data.name.trim()}, ${qty}, ${unitCost})`;
	return { ok: true };
});
var deleteEquipment_createServerFn_handler = createServerRpc({
	id: "7f65c84652f49571b1ade3a62b81aa5ca3982df10a08aada16c1878d79d0c9b0",
	name: "deleteEquipment",
	filename: "src/lib/crew.ts"
}, (opts) => deleteEquipment.__executeServer(opts));
var deleteEquipment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(deleteEquipment_createServerFn_handler, async ({ context, data: id }) => {
	if (!(await actor(context.userId)).founder) throw new Error("Founders only");
	const { getSql } = await import("./db-CaMkdTIY.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`delete from equipment where id = ${id}`;
	return { ok: true };
});
//#endregion
export { addEquipment_createServerFn_handler, addEvent_createServerFn_handler, addLedger_createServerFn_handler, clearShift_createServerFn_handler, deleteEquipment_createServerFn_handler, deleteEvent_createServerFn_handler, deleteLedger_createServerFn_handler, loadBoard_createServerFn_handler, setShift_createServerFn_handler };
