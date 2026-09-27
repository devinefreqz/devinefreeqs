import { o as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn, t as authClient } from "./client-IWHfIGH2.mjs";
import { t as GROK_PROVIDERS } from "./server-BmOKw9P9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CEwtGSzP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const [mode, setMode] = (0, import_react.useState)("up");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function onSubmit(event) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const email = String(form.get("email") ?? "").trim();
		const password = String(form.get("password") ?? "");
		const name = String(form.get("name") ?? "").trim();
		setBusy(true);
		setError("");
		const result = mode === "up" ? await authClient.signUp.email({
			email,
			password,
			name,
			callbackURL: "/"
		}) : await authClient.signIn.email({
			email,
			password,
			callbackURL: "/"
		});
		setBusy(false);
		if (result.error) {
			setError(result.error.message ?? "Sign-in failed");
			return;
		}
		const token = result.data && "token" in result.data ? result.data.token : null;
		if (token) try {
			window.sessionStorage.setItem("grok-auth.bearer-token", token);
		} catch {}
		window.location.href = "/";
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-screen place-items-center bg-bg px-4 py-10 text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm rounded-3xl border border-line bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/logo.jpg",
					alt: "",
					className: "mx-auto mb-4 h-20 w-20 object-contain invert"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-center font-display text-xl tracking-widest",
					children: "DEVINE FREQUENCIES"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-center text-sm text-muted",
					children: "Create one account for Darcy and one for Sage. Use those names and both get Founder access."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-6 flex flex-col gap-3",
						onSubmit,
						children: [
							mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "name",
									required: true,
									placeholder: "Darcy or Sage",
									className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case"
								})]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: ["Email", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "email",
									type: "email",
									required: true,
									autoComplete: "email",
									className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: ["Password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "password",
									type: "password",
									required: true,
									minLength: 8,
									autoComplete: mode === "up" ? "new-password" : "current-password",
									className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case"
								})]
							}),
							error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-bad",
								children: error
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: busy,
								className: "min-h-11 rounded-xl bg-fg text-sm font-semibold text-ink",
								children: busy ? "Working…" : mode === "up" ? "Create account" : "Sign in"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-3 w-full text-sm text-muted underline-offset-4 hover:underline",
						onClick: () => {
							setMode(mode === "up" ? "in" : "up");
							setError("");
						},
						children: mode === "up" ? "Already have an account? Sign in" : "Need an account? Create one"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 flex flex-col gap-2",
						children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "min-h-11 rounded-xl border border-line text-sm",
							onClick: () => void signIn(p.providerId, { callbackURL: "/" }),
							children: ["Continue with ", p.label]
						}, p.providerId))
					})
				] })
			]
		})
	});
}
//#endregion
export { Login as component };
