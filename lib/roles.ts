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

/** Ordem do maior cargo para o menor (resolução Discord + filtros da UI). */
export const ROLE_HIERARCHY = [
  { envKey: "ROLE_RESP_VENDAS", id: process.env.ROLE_RESP_VENDAS, name: ROLE_NAMES.RESP_VENDAS },
  { envKey: "ROLE_MASTER", id: process.env.ROLE_MASTER, name: ROLE_NAMES.MASTER },
  { envKey: "ROLE_ADM_AFL", id: process.env.ROLE_ADM_AFL, name: ROLE_NAMES.ADM },
  { envKey: "ROLE_RESP_AFL", id: process.env.ROLE_RESP_AFL, name: ROLE_NAMES.RESP_AFL },
  { envKey: "ROLE_AUXILIAR", id: process.env.ROLE_AUXILIAR, name: ROLE_NAMES.AUXILIAR },
  { envKey: "ROLE_LIDER", id: process.env.ROLE_LIDER, name: ROLE_NAMES.LIDER },
  { envKey: "ROLE_SUB_LIDER", id: process.env.ROLE_SUB_LIDER, name: ROLE_NAMES.SUB_LIDER },
  { envKey: "ROLE_MEMBRO", id: process.env.ROLE_MEMBRO, name: ROLE_NAMES.MEMBRO },
] as const;

export const ROLES_HIERARCHY = ROLE_HIERARCHY.map((role) => role.name);

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

export function resolveHighestRole(discordRoles: string[] = []) {
  for (const role of ROLE_HIERARCHY) {
    if (role.id && discordRoles.includes(role.id)) {
      return role.name;
    }
  }

  return null;
}

export function getAllowedRoleIds() {
  return ROLE_HIERARCHY.map((role) => role.id).filter(Boolean) as string[];
}

export function getCashbackPercentage(role: string) {
  return CASHBACK_RATES[role || ROLE_NAMES.MEMBRO] || CASHBACK_RATES[ROLE_NAMES.MEMBRO];
}
