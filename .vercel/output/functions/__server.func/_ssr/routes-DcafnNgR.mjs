import { o as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime, y as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as signOut, t as authClient } from "./client-IWHfIGH2.mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-7I3fSF-n.mjs";
import { a as hasGateSessionMarker } from "./server-BmOKw9P9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DcafnNgR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* With auth on, visitors are signed out until they authenticate — in the sandbox
* live preview too, which does real sign-in. The shared dev user appears only
* when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var loadBoard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("2f35d98429e6bacdd59521f68a5bb51b254f830ef2357a158b2d2822167d3e3f"));
var addLedger = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("d7a18593d31547493daebd613805fca412221f892a327496e09df91a7827362a"));
var deleteLedger = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("b37aa7cc870e2f887c089f394b03c25108f5edcd6139334755aea0d58987927f"));
var addEvent = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("bd6b7e0fb5ac321cf2efb867912bfa7511f8de534af53fa88f14b4c7b042eaf0"));
var deleteEvent = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("d70ec24d503cf98ea84575c44d39372f53ed5457dcea83d169835de1787429c9"));
var setShift = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("cc7bb71fe358ffd776687d010b082e795f945a890bdf9a559088d191555b7bd9"));
var clearShift = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((eventId) => eventId).handler(createSsrRpc("26354c8df9ca4614d356f544d00b3ce7d5e2890ed0b0cf9c57c2512d854a8e73"));
var addEquipment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("2248a6e7b73ed0ed6eddfae4429bd08226bcf15df18a700a498ca886d3dfeb5e"));
var deleteEquipment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => id).handler(createSsrRpc("7f65c84652f49571b1ade3a62b81aa5ca3982df10a08aada16c1878d79d0c9b0"));
var NAV = [
	{
		id: "overview",
		label: "Overview"
	},
	{
		id: "events",
		label: "Events"
	},
	{
		id: "finance",
		label: "Finance"
	},
	{
		id: "equipment",
		label: "Equipment"
	},
	{
		id: "crew",
		label: "Crew"
	}
];
var money = new Intl.NumberFormat("en-AU", {
	style: "currency",
	currency: "AUD"
});
function Board() {
	const [board, setBoard] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [view, setView] = (0, import_react.useState)("overview");
	async function refresh() {
		try {
			setBoard(await loadBoard());
			setError("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not load the board");
		}
	}
	(0, import_react.useEffect)(() => {
		refresh();
	}, []);
	async function run(action) {
		try {
			await action();
			await refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "That did not save");
		}
	}
	if (!board) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-screen place-items-center bg-bg text-muted",
		children: error || "Loading the board"
	});
	const founder = board.me.founder;
	const income = board.ledger.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
	const expense = board.ledger.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
	const gearValue = board.gear.reduce((s, g) => s + g.qty * g.unit_cost, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center gap-4 border-b border-line px-4 py-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/logo.jpg",
						alt: "",
						className: "h-12 w-12 object-contain invert"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-sm tracking-widest",
							children: "DEVINE FREQUENCIES"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								board.me.name,
								" · ",
								board.me.rank
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex gap-2 overflow-x-auto border-b border-line px-4 py-3",
				children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setView(item.id),
					className: view === item.id ? "min-h-11 shrink-0 rounded-full bg-fg px-4 text-sm font-medium text-ink" : "min-h-11 shrink-0 rounded-full border border-line px-4 text-sm text-fg",
					children: item.label
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5",
				children: [
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-bad",
						children: error
					}) : null,
					!founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted",
						children: "Crew can view the books and mark their own shifts. Founders edit everything."
					}) : null,
					view === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overview, {
						income,
						expense,
						events: board.events.length,
						gear: board.gear.length
					}) : null,
					view === "events" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Events, {
						board,
						founder,
						run
					}) : null,
					view === "finance" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Finance, {
						board,
						founder,
						income,
						expense,
						run
					}) : null,
					view === "equipment" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gear, {
						board,
						founder,
						total: gearValue,
						run
					}) : null,
					view === "crew" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewList, { crew: board.crew }) : null
				]
			})
		]
	});
}
function Overview({ income, expense, events, gear }) {
	const net = income - expense;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "grid gap-3 sm:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Balance",
				value: money.format(net),
				tone: net >= 0 ? "good" : "bad"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Income",
				value: money.format(income)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Expenses",
				value: money.format(expense)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Nights / kit lines",
				value: `${events} / ${gear}`
			})
		]
	});
}
function Stat({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-2xl border border-line bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs tracking-widest text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: `mt-2 font-display text-2xl ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-fg"}`,
			children: value
		})]
	});
}
function Events({ board, founder, run }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4",
		children: [founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2",
			onSubmit: (e) => {
				e.preventDefault();
				const form = new FormData(e.currentTarget);
				run(() => addEvent({ data: {
					name: String(form.get("name") ?? ""),
					date: String(form.get("date") ?? ""),
					time: String(form.get("time") ?? ""),
					venue: String(form.get("venue") ?? ""),
					notes: String(form.get("notes") ?? "")
				} }));
				e.currentTarget.reset();
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					name: "name",
					label: "Event"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					name: "venue",
					label: "Venue"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					name: "date",
					label: "Date",
					type: "date"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					name: "time",
					label: "Time",
					type: "time"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					name: "notes",
					label: "Notes"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink",
						children: "Add event"
					})
				})
			]
		}) : null, board.events.map((ev) => {
			const roster = board.shifts.filter((s) => s.event_id === ev.id);
			const mine = roster.find((s) => s.user_id === board.me.userId);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "rounded-2xl border border-line bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-xl",
								children: ev.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									ev.event_date,
									" · ",
									ev.event_time,
									" · ",
									ev.venue
								]
							}),
							ev.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: ev.notes
							}) : null
						] }), founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-xl border border-line px-3 text-sm text-bad",
							onClick: () => void run(() => deleteEvent({ data: ev.id })),
							children: "Delete"
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: roster.length ? roster.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "rounded-full border border-line px-3 py-1 text-xs",
							children: [
								s.name,
								" — ",
								s.role
							]
						}, s.user_id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted",
							children: "Nobody signed yet"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [board.roles.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": mine?.role === role,
							className: mine?.role === role ? "min-h-11 rounded-full bg-fg px-3 text-sm text-ink" : "min-h-11 rounded-full border border-line px-3 text-sm",
							onClick: () => void run(() => setShift({ data: {
								eventId: ev.id,
								role
							} })),
							children: role
						}, role)), mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-full border border-line px-3 text-sm text-bad",
							onClick: () => void run(() => clearShift({ data: ev.id })),
							children: "Not working"
						}) : null]
					})
				]
			}, ev.id);
		})]
	});
}
function Finance({ board, founder, income, expense, run }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Net",
						value: money.format(income - expense),
						tone: income - expense >= 0 ? "good" : "bad"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "In",
						value: money.format(income),
						tone: "good"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Out",
						value: money.format(expense),
						tone: "bad"
					})
				]
			}),
			founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2",
				onSubmit: (e) => {
					e.preventDefault();
					const form = new FormData(e.currentTarget);
					run(() => addLedger({ data: {
						source: String(form.get("source") ?? ""),
						amount: Number(form.get("amount")),
						date: String(form.get("date") ?? ""),
						kind: String(form.get("kind") ?? "expense"),
						category: String(form.get("category") ?? "Other"),
						notes: String(form.get("notes") ?? "")
					} }));
					e.currentTarget.reset();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "source",
						label: "Source"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "amount",
						label: "Amount AUD",
						type: "number"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "date",
						label: "Date",
						type: "date"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1 text-xs tracking-widest text-muted uppercase",
						children: ["Type", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							name: "kind",
							className: "min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "income",
								children: "Income"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "expense",
								children: "Expense"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1 text-xs tracking-widest text-muted uppercase",
						children: ["Category", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							name: "category",
							className: "min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case",
							children: [
								"Tickets",
								"Merch",
								"Venue",
								"Equipment",
								"Payroll",
								"Other"
							].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: c }, c))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "notes",
						label: "Notes"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink",
							children: "Add to ledger"
						})
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-2xl border border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[36rem] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Date"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "What"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-medium",
								children: "Amount"
							}),
							founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-3 py-3" }) : null
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: board.ledger.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3",
								children: row.entry_date
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-3 py-3",
								children: [row.source, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "block text-xs text-muted",
									children: [
										row.kind,
										" · ",
										row.category
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: row.kind === "income" ? "px-3 py-3 text-good" : "px-3 py-3 text-bad",
								children: [row.kind === "income" ? "+" : "−", money.format(row.amount)]
							}),
							founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-bad",
									onClick: () => void run(() => deleteLedger({ data: row.id })),
									children: "Delete"
								})
							}) : null
						]
					}, row.id)) })]
				})
			})
		]
	});
}
function Gear({ board, founder, total, run }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Kit value",
					value: money.format(total)
				}), founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink",
					onClick: () => setOpen((v) => !v),
					children: "Add equipment"
				}) : null]
			}),
			open && founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3",
				onSubmit: (e) => {
					e.preventDefault();
					const form = new FormData(e.currentTarget);
					run(() => addEquipment({ data: {
						qty: Number(form.get("qty")),
						name: String(form.get("name") ?? ""),
						unitCost: Number(form.get("unitCost"))
					} }));
					e.currentTarget.reset();
					setOpen(false);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "qty",
						label: "Qty",
						type: "number"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "name",
						label: "Item",
						placeholder: "15 inch PA speaker"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						name: "unitCost",
						label: "Each AUD",
						type: "number",
						placeholder: "300"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sm:col-span-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "min-h-11 rounded-xl bg-fg px-4 text-sm font-semibold text-ink",
							children: "Save item"
						})
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-2",
				children: board.gear.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [
							item.qty,
							" × ",
							item.name
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							money.format(item.unit_cost),
							" each · ",
							money.format(item.qty * item.unit_cost),
							" total"
						]
					})] }), founder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 text-sm text-bad",
						onClick: () => void run(() => deleteEquipment({ data: item.id })),
						children: "Remove"
					}) : null]
				}, item.id))
			})
		]
	});
}
function CrewList({ crew }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-2xl border border-line bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "border-b border-line px-4 py-3 text-sm text-muted",
			children: "Darcy and Sage are Founders when they sign up with that name. Anyone else joins as Crew Member."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: crew.map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-center justify-between border-b border-line px-4 py-3 last:border-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: person.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankPill, { rank: person.rank })]
		}, person.user_id)) })]
	});
}
function RankPill({ rank }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "rounded-full border border-line px-3 py-1 text-xs tracking-widest uppercase",
		children: rank
	});
}
function Field({ name, label, type = "text", placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex flex-col gap-1 text-xs tracking-widest text-muted uppercase",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			name,
			type,
			required: type !== "text" || name !== "notes",
			step: type === "number" ? "0.01" : void 0,
			min: type === "number" ? "0" : void 0,
			placeholder,
			className: "min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case placeholder:text-muted"
		})]
	});
}
function Home() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-screen place-items-center bg-bg text-muted",
		children: "Loading"
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, {});
}
//#endregion
export { Home as component };
