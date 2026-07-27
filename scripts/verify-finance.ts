/**
 * Verificação determinística da matemática financeira (sem framework de testes).
 * Rode: npx --yes tsx scripts/verify-finance.ts
 */
import assert from "node:assert/strict";
import {
  computeGlobalMonthStats,
  computeMemberFinance,
  getNetValue,
  getRemainingDebt,
  getSaleNetAttributedToMonth,
  roundMoney,
  shouldCountInstallmentInBalance,
  sumMonthNet,
  type FinanceRecord,
} from "../lib/finance";

function sale(partial: Partial<FinanceRecord> & Record<string, unknown>): FinanceRecord {
  return {
    type: "VENDA",
    status: "APROVADO",
    discordId: "u1",
    client: "Cliente A",
    item: "Produto X",
    ...partial,
  };
}

function installment(partial: {
  amount?: number;
  createdAt?: string;
  parentItem?: string;
  status?: string;
  client?: string;
  discordId?: string;
}): FinanceRecord {
  return sale({
    item: `PAGAMENTO DE PARCELA: ${partial.parentItem || "Produto X"}`,
    amount: partial.amount,
    receivedAmount: partial.amount,
    createdAt: partial.createdAt,
    status: partial.status || "APROVADO",
    client: partial.client || "Cliente A",
    discordId: partial.discordId || "u1",
  });
}

// 1) receivedAmount = 0 não pode cair no valor total
assert.equal(getNetValue({ receivedAmount: 0, amount: 1000 }), 0);
assert.equal(getRemainingDebt({ amount: 1000, receivedAmount: 0 }), 1000);
assert.equal(getRemainingDebt({ amount: 1000, receivedAmount: 250 }), 750);

// 2) Parcela no mesmo mês NÃO duplica o líquido do mês
{
  const records = [
    sale({ amount: 1000, receivedAmount: 700, createdAt: "2026-07-10T12:00:00.000Z" }),
    installment({ amount: 200, createdAt: "2026-07-20T12:00:00.000Z", parentItem: "Produto X" }),
  ];
  // receivedAmount já inclui a parcela (700 = 500 inicial + 200). Atribuído ao mês = 700.
  assert.equal(sumMonthNet(records, records), 700);
  assert.equal(getSaleNetAttributedToMonth(records[0], records), 700);
}

// 3) Parcela em mês seguinte: mês da venda fica com o inicial; mês do pagamento recebe a parcela
{
  const records = [
    sale({ amount: 1000, receivedAmount: 800, createdAt: "2026-06-10T12:00:00.000Z" }), // 500 + 300 late
    installment({ amount: 300, createdAt: "2026-07-05T12:00:00.000Z", parentItem: "Produto X" }),
  ];
  const june = records.filter((r) => String(r.createdAt).startsWith("2026-06"));
  const july = records.filter((r) => String(r.createdAt).startsWith("2026-07"));
  assert.equal(sumMonthNet(june, records), 500);
  assert.equal(sumMonthNet(july, records), 300);
  assert.equal(computeGlobalMonthStats(records, "2026-06").net, 500);
  assert.equal(computeGlobalMonthStats(records, "2026-07").net, 300);
}

// 4) Saldo ativo: parcela de venda ainda APROVADA não entra de novo
{
  const approvedSale = sale({ amount: 1000, receivedAmount: 800, createdAt: "2026-06-10T12:00:00.000Z" });
  const latePay = installment({ amount: 300, createdAt: "2026-07-05T12:00:00.000Z" });
  assert.equal(shouldCountInstallmentInBalance(latePay, [approvedSale]), false);

  const finance = computeMemberFinance([approvedSale, latePay], "Membro AFL", "2026-07");
  // activeNet = apenas received da venda aprovada (800), sem somar a parcela
  assert.equal(finance.activeNet, 800);
  // cashback 6%
  assert.equal(finance.finalBalance, roundMoney(800 * 0.06));
  assert.equal(finance.totalNet, 300); // só a parcela no mês 07
}

// 5) Parcela de venda ARQUIVADA conta no saldo (dívida antiga / fechamento)
{
  const archived = sale({
    amount: 1000,
    receivedAmount: 1000,
    status: "ARQUIVADO",
    createdAt: "2026-05-01T12:00:00.000Z",
  });
  const latePay = installment({ amount: 200, createdAt: "2026-07-01T12:00:00.000Z" });
  assert.equal(shouldCountInstallmentInBalance(latePay, []), true);

  const finance = computeMemberFinance([archived, latePay], "Master AFL", "2026-07");
  assert.equal(finance.activeNet, 200);
  assert.equal(finance.finalBalance, roundMoney(200 * 0.12));
}

// 6) Taxas por cargo
{
  const records = [sale({ amount: 1000, receivedAmount: 1000, createdAt: "2026-07-01T12:00:00.000Z" })];
  assert.equal(computeMemberFinance(records, "Master AFL", "2026-07").finalBalance, 120);
  assert.equal(computeMemberFinance(records, "ADM AFL", "2026-07").finalBalance, 110);
  assert.equal(computeMemberFinance(records, "Resp.Vendas", "2026-07").finalBalance, 100);
  assert.equal(computeMemberFinance(records, "Resp.AFL", "2026-07").finalBalance, 100);
  assert.equal(computeMemberFinance(records, "Auxiliar AFL", "2026-07").finalBalance, 90);
  assert.equal(computeMemberFinance(records, "Lider AFL", "2026-07").finalBalance, 80);
  assert.equal(computeMemberFinance(records, "Sub-Lider AFL", "2026-07").finalBalance, 70);
  assert.equal(computeMemberFinance(records, "Membro AFL", "2026-07").finalBalance, 60);
}

// 7) Bônus e saque no saldo
{
  const records = [
    sale({ amount: 1000, receivedAmount: 1000, createdAt: "2026-07-01T12:00:00.000Z" }),
    {
      type: "CORRIDINHA",
      status: "APROVADO",
      discordId: "u1",
      item: "BÔNUS: CORRIDINHA MALUCA",
      amount: 0,
      receivedAmount: 0,
      extraCashback: 50,
      createdAt: "2026-07-02T12:00:00.000Z",
    },
    {
      type: "SAQUE",
      status: "APROVADO",
      discordId: "u1",
      item: "PAGAMENTO REALIZADO",
      amount: 30,
      receivedAmount: 30,
      createdAt: "2026-07-03T12:00:00.000Z",
    },
  ];
  const finance = computeMemberFinance(records, "Membro AFL", "2026-07");
  assert.equal(finance.finalBalance, roundMoney(1000 * 0.06 + 50 - 30));
  assert.equal(finance.bonusEarned, 50);
  assert.equal(finance.amountPaid, 30);
}

// 8) Pendente não entra nos totais do mês
{
  const records = [
    sale({ amount: 1000, receivedAmount: 1000, status: "PENDENTE", createdAt: "2026-07-01T12:00:00.000Z" }),
    sale({ amount: 500, receivedAmount: 500, status: "APROVADO", createdAt: "2026-07-02T12:00:00.000Z" }),
  ];
  const stats = computeGlobalMonthStats(records, "2026-07");
  assert.equal(stats.gross, 500);
  assert.equal(stats.net, 500);
}

console.log("OK: todos os cálculos financeiros passaram.");
