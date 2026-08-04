import { getCashbackPercentage } from "@/lib/roles";

export type FinanceRecord = {
  amount?: number | string | null;
  valor?: number | string | null;
  receivedAmount?: number | string | null;
  valorRecebido?: number | string | null;
  extraCashback?: number | string | null;
  cashbackExtra?: number | string | null;
  type?: string | null;
  tipo?: string | null;
  item?: string | null;
  status?: string | null;
  discordId?: string | null;
  client?: string | null;
  cliente?: string | null;
  createdAt?: Date | string | null;
  criado_em?: Date | string | null;
};

export function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getGrossValue(record: FinanceRecord) {
  return roundMoney(Number(record.amount ?? record.valor ?? 0));
}

/** Valor já recebido na venda. `0` é válido (entrada zerada); null/undefined → 0. */
export function getNetValue(record: FinanceRecord) {
  const raw = record.receivedAmount ?? record.valorRecebido;
  if (raw === null || raw === undefined || raw === "") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

export function getBonusValue(record: FinanceRecord) {
  return roundMoney(Number(record.extraCashback ?? record.cashbackExtra ?? 0));
}

export function getPaidValue(record: FinanceRecord) {
  return roundMoney(Number(record.amount ?? record.valor ?? 0));
}

export function getRecordType(record: FinanceRecord) {
  return String(record.type || record.tipo || "VENDA").toUpperCase();
}

export function isInstallmentPayment(itemName?: string | null) {
  return String(itemName || "").toUpperCase().includes("PAGAMENTO DE PARCELA");
}

export function isOldDebt(itemName?: string | null) {
  return String(itemName || "").toUpperCase().includes("DÍVIDA ANTIGA");
}

export function isSaleRecord(record: FinanceRecord) {
  const type = getRecordType(record);
  return type === "VENDA" || (!record.type && !record.tipo);
}

export function isBonusRecord(record: FinanceRecord) {
  return getRecordType(record) === "CORRIDINHA";
}

export function isWithdrawRecord(record: FinanceRecord) {
  return getRecordType(record) === "SAQUE";
}

export function getInstallmentParentItem(itemName?: string | null) {
  return String(itemName || "").replace(/^PAGAMENTO DE PARCELA:\s*/i, "").trim();
}

export function getRecordMonthKey(record: FinanceRecord) {
  const raw = record.createdAt || record.criado_em;
  if (!raw) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 7);
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().slice(0, 7);
  return String(raw).slice(0, 7);
}

export function getInstallmentAmount(record: FinanceRecord) {
  return roundMoney(getGrossValue(record) || getNetValue(record) || getBonusValue(record));
}

export function getRemainingDebt(record: FinanceRecord) {
  return roundMoney(Math.max(getGrossValue(record) - getNetValue(record), 0));
}

export function isCountableStatus(status?: string | null) {
  return status === "APROVADO" || status === "ARQUIVADO";
}

export function matchesInstallmentToSale(installment: FinanceRecord, sale: FinanceRecord) {
  const parentItem = getInstallmentParentItem(installment.item);
  const sameMember = String(installment.discordId) === String(sale.discordId);
  const sameClient =
    String(installment.client || installment.cliente || "") ===
    String(sale.client || sale.cliente || "");
  const sameItem =
    String(sale.item || "") === parentItem ||
    String(sale.item || "") === String(installment.item || "");
  return sameMember && sameClient && sameItem;
}

/**
 * Parcela NÃO deve somar no saldo se a venda original ainda está APROVADA,
 * porque o receivedAmount da venda já foi atualizado com esse pagamento.
 * Parcela de venda ARQUIVADA/antiga continua contando (pagamento tardio).
 */
export function shouldCountInstallmentInBalance(
  installment: FinanceRecord,
  approvedSales: FinanceRecord[],
) {
  return !approvedSales.some((sale) => matchesInstallmentToSale(installment, sale));
}

function hasSameMonthParentSale(installment: FinanceRecord, allMemberRecords: FinanceRecord[]) {
  const installmentMonth = getRecordMonthKey(installment);

  return allMemberRecords.some((sale) => {
    if (!isSaleRecord(sale) || isInstallmentPayment(sale.item)) return false;
    if (sale.status && !isCountableStatus(sale.status)) return false;
    if (!matchesInstallmentToSale(installment, sale)) return false;
    return getRecordMonthKey(sale) === installmentMonth;
  });
}

function sumOtherMonthInstallments(
  sale: FinanceRecord,
  saleMonth: string,
  allMemberRecords: FinanceRecord[],
) {
  return roundMoney(
    allMemberRecords
      .filter((record) => isInstallmentPayment(record.item))
      .filter((record) => !record.status || isCountableStatus(record.status))
      .filter((record) => matchesInstallmentToSale(record, sale))
      .filter((record) => getRecordMonthKey(record) !== saleMonth)
      .reduce((acc, record) => acc + getInstallmentAmount(record), 0),
  );
}

/**
 * Líquido atribuído ao mês da venda = receivedAmount atual − parcelas de outros meses.
 * Assim o mês original não “ganha” pagamentos futuros quando o receivedAmount é atualizado.
 */
export function getSaleNetAttributedToMonth(
  sale: FinanceRecord,
  allMemberRecords: FinanceRecord[] = [sale],
) {
  const saleMonth = getRecordMonthKey(sale);
  return roundMoney(
    Math.max(getNetValue(sale) - sumOtherMonthInstallments(sale, saleMonth, allMemberRecords), 0),
  );
}

export function sumMonthGross(records: FinanceRecord[]) {
  return roundMoney(
    records
      .filter(
        (record) =>
          isSaleRecord(record) &&
          !isInstallmentPayment(record.item) &&
          !isOldDebt(record.item),
      )
      .reduce((acc, record) => acc + getGrossValue(record), 0),
  );
}

export function sumMonthNet(records: FinanceRecord[], allMemberRecords: FinanceRecord[] = records) {
  const netSales = records
    .filter((record) => isSaleRecord(record) && !isInstallmentPayment(record.item))
    .reduce((acc, record) => acc + getSaleNetAttributedToMonth(record, allMemberRecords), 0);

  const netInstallments = records
    .filter((record) => isInstallmentPayment(record.item))
    .filter((record) => !hasSameMonthParentSale(record, allMemberRecords))
    .reduce((acc, record) => acc + getInstallmentAmount(record), 0);

  return roundMoney(netSales + netInstallments);
}

export function computeMemberFinance(
  memberRecords: FinanceRecord[],
  role: string,
  currentMonthString: string,
) {
  const commissionRate = getCashbackPercentage(role);

  const currentMonthRecords = memberRecords.filter((record) => {
    return isCountableStatus(record.status) && getRecordMonthKey(record).startsWith(currentMonthString);
  });

  const grossSales = sumMonthGross(currentMonthRecords);
  const totalNet = sumMonthNet(currentMonthRecords, memberRecords);

  const bonusEarned = roundMoney(
    currentMonthRecords
      .filter(
        (record) =>
          isBonusRecord(record) &&
          !String(record.item || "").toUpperCase().includes("SALDO RETIDO"),
      )
      .reduce((acc, record) => acc + getBonusValue(record), 0),
  );

  const amountPaid = roundMoney(
    currentMonthRecords
      .filter(
        (record) =>
          isWithdrawRecord(record) &&
          !String(record.item || "").toUpperCase().includes("DÍVIDA RETIDA"),
      )
      .reduce((acc, record) => acc + getPaidValue(record), 0),
  );

  const activeRecords = memberRecords.filter((record) => record.status === "APROVADO");
  const approvedSales = activeRecords.filter(
    (record) => isSaleRecord(record) && !isInstallmentPayment(record.item),
  );

  const activeNetSales = roundMoney(
    approvedSales.reduce((acc, record) => acc + getNetValue(record), 0),
  );

  const activeNetInstallments = roundMoney(
    activeRecords
      .filter((record) => isInstallmentPayment(record.item))
      .filter((record) => shouldCountInstallmentInBalance(record, approvedSales))
      .reduce((acc, record) => acc + getInstallmentAmount(record), 0),
  );

  const activeNet = roundMoney(activeNetSales + activeNetInstallments);

  const activeBonus = roundMoney(
    activeRecords
      .filter((record) => isBonusRecord(record))
      .reduce((acc, record) => acc + getBonusValue(record), 0),
  );

  const activePaid = roundMoney(
    activeRecords
      .filter((record) => isWithdrawRecord(record))
      .reduce((acc, record) => acc + getPaidValue(record), 0),
  );

  const finalBalance = roundMoney(activeNet * commissionRate + activeBonus - activePaid);

  return {
    commissionRate,
    grossSales,
    totalNet,
    bonusEarned,
    amountPaid,
    activeNet,
    activeBonus,
    activePaid,
    finalBalance,
  };
}

/**
 * Quanto do saldo disponível seria perdido ao arquivar registros anteriores ao mês.
 * Esse valor deve virar SALDO RETIDO (positivo) ou DÍVIDA RETIDA (negativo).
 */
export function computeCashbackCarryAmount(
  memberRecords: FinanceRecord[],
  role: string,
  monthStartUtc: Date,
  currentMonthString: string,
) {
  const approved = memberRecords.filter((record) => record.status === "APROVADO");
  if (approved.length === 0) return 0;

  const totalBalance = computeMemberFinance(approved, role, currentMonthString).finalBalance;

  const keeping = approved.filter((record) => {
    const raw = record.createdAt || record.criado_em;
    if (!raw) return false;
    const created = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(created.getTime())) return false;
    return created >= monthStartUtc;
  });

  const keepingBalance = computeMemberFinance(keeping, role, currentMonthString).finalBalance;
  return roundMoney(totalBalance - keepingBalance);
}

export function isCarryForwardItem(itemName?: string | null) {
  const name = String(itemName || "").toUpperCase();
  return name.includes("SALDO RETIDO") || name.includes("DÍVIDA RETIDA");
}

/**
 * Saldo econômico real (vendas/bônus/saques), ignorando lançamentos de virada.
 * Inclui ARQUIVADO para recuperar o que a virada antiga zerou sem SALDO RETIDO.
 */
export function computeLifetimeCashbackBalance(
  memberRecords: FinanceRecord[],
  role: string,
  currentMonthString: string,
) {
  const historical = memberRecords
    .filter((record) => record.status === "APROVADO" || record.status === "ARQUIVADO")
    .filter((record) => !isCarryForwardItem(record.item))
    .map((record) => ({ ...record, status: "APROVADO" }));

  return computeMemberFinance(historical, role, currentMonthString).finalBalance;
}

/**
 * Diferença entre o saldo que deveria existir e o saldo ativo atual.
 * Positivo = falta criar SALDO RETIDO; negativo = DÍVIDA RETIDA.
 */
export function computeMissingCashbackBalance(
  memberRecords: FinanceRecord[],
  role: string,
  currentMonthString: string,
) {
  const lifetime = computeLifetimeCashbackBalance(memberRecords, role, currentMonthString);
  const current = computeMemberFinance(
    memberRecords.filter((record) => record.status === "APROVADO"),
    role,
    currentMonthString,
  ).finalBalance;
  return roundMoney(lifetime - current);
}

export function computeGlobalMonthStats(records: FinanceRecord[], currentMonthString: string) {
  const monthRecords = records.filter((record) => {
    return isCountableStatus(record.status) && getRecordMonthKey(record).startsWith(currentMonthString);
  });

  return {
    gross: sumMonthGross(monthRecords),
    net: sumMonthNet(monthRecords, records),
  };
}
