import { MemberRepository } from '@/repositories/member.repository';
import { RecordRepository } from '@/repositories/record.repository';
import { computeMemberFinance, getBonusValue, getGrossValue, getPaidValue } from '@/lib/finance';

export class SpreadsheetService {
  private memberRepository: MemberRepository;
  private recordRepository: RecordRepository;

  constructor() {
    this.memberRepository = new MemberRepository();
    this.recordRepository = new RecordRepository();
  }

  async generateExportPayload() {
    const members = await this.memberRepository.findAll();
    const records = await this.recordRepository.findAllActive();

    const currentDate = new Date();
    const currentMonthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const team = members.map(member => {
      const actualRole = member.panelRole || member.role || 'Membro AFL';
      const memberRecords = records.filter(r => String(r.discordId) === String(member.discordId));
      const finance = computeMemberFinance(memberRecords, actualRole, currentMonthString);

      return {
        name: member.name,
        role: actualRole,
        grossSales: finance.grossSales,
        netSales: finance.totalNet,
        bonus: finance.activeBonus,
        paid: finance.activePaid,
        balance: finance.finalBalance
      };
    }).sort((a, b) => b.grossSales - a.grossSales);

    const formattedRecords = records.map(record => ({
      date: record.createdAt ? record.createdAt.toISOString() : null,
      name: record.name,
      type: record.type || 'VENDA',
      item: record.item && record.item !== 'N/A'
        ? record.item
        : (record.type === 'CORRIDINHA'
          ? 'BÔNUS: CORRIDINHA MALUCA'
          : (record.type === 'SAQUE' ? 'PAGAMENTO REALIZADO' : record.type)),
      amount: getGrossValue(record) || getBonusValue(record) || getPaidValue(record),
      status: record.status
    }));

    return { team, records: formattedRecords };
  }
}
