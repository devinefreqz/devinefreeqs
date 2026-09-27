/** Permanent role colours. Use these everywhere a role is shown. */
export const ROLE_COLORS: Record<string, string> = {
  Security: "#5b8cff",
  Medical: "#ff5d7a",
  "Door sales": "#f0b429",
  Production: "#b388ff",
  Bar: "#3ddc97",
};

export function roleColor(role: string) {
  return ROLE_COLORS[role] ?? "#9a9a9a";
}
