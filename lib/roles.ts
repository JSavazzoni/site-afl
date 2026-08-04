export const ROLE_NAMES = {
  RESP_VENDAS: "Resp.Vendas",
  MASTER: "Master AFL",
  ADM: "ADM AFL",
  RESP_AFL: "Resp.AFL",
  AUXILIAR: "Auxiliar AFL",
  LIDER: "Lider AFL",
  SUB_LIDER: "Sub-Lider AFL",
  MEMBRO: "Membro AFL",
} as const;

/** Ordem de exibição / prioridade (maior → menor). */
export const ROLES_HIERARCHY = [
  ROLE_NAMES.RESP_VENDAS,
  ROLE_NAMES.MASTER,
  ROLE_NAMES.ADM,
  ROLE_NAMES.RESP_AFL,
  ROLE_NAMES.AUXILIAR,
  ROLE_NAMES.LIDER,
  ROLE_NAMES.SUB_LIDER,
  ROLE_NAMES.MEMBRO,
] as const;

/** Cashback por cargo (fração). Master 12, ADM 11, Resp 10, Aux 9, Lider 8, Sub 7, Membro 6. */
export const CASHBACK_RATES: Record<string, number> = {
  [ROLE_NAMES.RESP_VENDAS]: 0.10,
  [ROLE_NAMES.MASTER]: 0.12,
  [ROLE_NAMES.ADM]: 0.11,
  [ROLE_NAMES.RESP_AFL]: 0.10,
  [ROLE_NAMES.AUXILIAR]: 0.09,
  [ROLE_NAMES.LIDER]: 0.08,
  [ROLE_NAMES.SUB_LIDER]: 0.07,
  [ROLE_NAMES.MEMBRO]: 0.06,
};

type RoleDefinition = {
  envKey: string;
  name: string;
};

const ROLE_DEFINITIONS: RoleDefinition[] = [
  { envKey: "ROLE_RESP_VENDAS", name: ROLE_NAMES.RESP_VENDAS },
  { envKey: "ROLE_MASTER", name: ROLE_NAMES.MASTER },
  { envKey: "ROLE_ADM_AFL", name: ROLE_NAMES.ADM },
  { envKey: "ROLE_RESP_AFL", name: ROLE_NAMES.RESP_AFL },
  { envKey: "ROLE_AUXILIAR", name: ROLE_NAMES.AUXILIAR },
  { envKey: "ROLE_LIDER", name: ROLE_NAMES.LIDER },
  { envKey: "ROLE_SUB_LIDER", name: ROLE_NAMES.SUB_LIDER },
  { envKey: "ROLE_MEMBRO", name: ROLE_NAMES.MEMBRO },
];

/** Lê IDs em runtime (evita env undefined no build). */
export function getRoleHierarchy() {
  return ROLE_DEFINITIONS.map((role) => ({
    ...role,
    id: process.env[role.envKey] || "",
  })).filter((role) => Boolean(role.id));
}

export function getAllowedRoleIds() {
  const ids = getRoleHierarchy().map((role) => role.id);
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  if (adminRoleId) ids.push(adminRoleId);
  return Array.from(new Set(ids));
}

export function resolveHighestRole(discordRoles: string[] = []) {
  const roles = Array.isArray(discordRoles) ? discordRoles.map(String) : [];

  for (const role of getRoleHierarchy()) {
    if (roles.includes(String(role.id))) {
      return role.name;
    }
  }

  return null;
}

export function hasPanelAccess(discordRoles: string[] = []) {
  const roles = Array.isArray(discordRoles) ? discordRoles.map(String) : [];
  if (resolveHighestRole(roles)) return true;

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  return Boolean(adminRoleId && roles.includes(String(adminRoleId)));
}

export function getCashbackPercentage(role: string) {
  return CASHBACK_RATES[role || ROLE_NAMES.MEMBRO] || CASHBACK_RATES[ROLE_NAMES.MEMBRO];
}

export function isActivePanelRole(role?: string | null) {
  if (!role) return false;
  return (ROLES_HIERARCHY as readonly string[]).includes(role);
}
