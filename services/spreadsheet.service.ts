import { MemberRepository } from '@/repositories/member.repository';
import { RecordRepository } from '@/repositories/record.repository';

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

    const commissionRates: Record<string, number> = { 
      'Resp.Vendas': 0.15, 
      'Master AFL': 0.12, 
      'Resp.AFL': 0.10, 
      'Auxiliar AFL': 0.09, 
      'Lider AFL': 0.08, 
      'Sub-Lider AFL': 0.07, 
      'Membro AFL': 0.06 
    };

    const team = members.map(member => {
      const actualRole = member.role || 'Membro AFL';
      const currentRate = commissionRates[actualRole] || 0.06;

      const currentMonthRecords = records.filter(r => 
        String(r.discordId) === String(member.discordId) && 
        (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && 
        r.createdAt && r.createdAt.toISOString().startsWith(currentMonthString)
      );

      let grossSales = 0;
      let netSales = 0;
      let bonus = 0;
      let paid = 0;
      let activeNet = 0;
      let activeBonus = 0;
      let activePaid = 0;

      for (const record of currentMonthRecords) {
        const isInstallment = (record.item || '').toUpperCase().includes('PAGAMENTO DE PARCELA');
        const value = Number(record.amount) || 0;
        const received = Number(record.receivedAmount) || 0;
        const extra = Number(record.extraCashback) || 0;

        if ((record.type === 'VENDA' || !record.type) && !(record.item || '').toUpperCase().includes('DÍVIDA ANTIGA') && !isInstallment) {
            grossSales += value;
        }

        if (record.type === 'VENDA' || !record.type) {
            if (!isInstallment) {
                netSales += received;
            } else {
                netSales += value || received || extra;
            }
        }

        if (record.type === 'CORRIDINHA' && !(record.item || '').toUpperCase().includes('SALDO RETIDO')) {
            bonus += extra;
        }

        if (record.type === 'SAQUE' && !(record.item || '').toUpperCase().includes('DÍVIDA RETIDA')) {
            paid += value;
        }
      }

      const activeRecords = records.filter(r => String(r.discordId) === String(member.discordId) && r.status === 'APROVADO');
      
      for (const record of activeRecords) {
         const isInstallment = (record.item || '').toUpperCase().includes('PAGAMENTO DE PARCELA');
         if ((record.type === 'VENDA' || !record.type) && !isInstallment) {
             activeNet += (Number(record.receivedAmount) || 0);
         }
         if (record.type === 'CORRIDINHA') {
             activeBonus += (Number(record.extraCashback) || 0);
         }
         if (record.type === 'SAQUE') {
             activePaid += (Number(record.amount) || 0);
         }
      }

      const balance = (activeNet * currentRate) + activeBonus - activePaid;

      return {
        name: member.name,
        role: actualRole,
        grossSales,
        netSales,
        bonus,
        paid,
        balance
      };
    }).sort((a, b) => b.grossSales - a.grossSales);

    const formattedRecords = records.map(record => ({
      date: record.createdAt ? record.createdAt.toISOString() : null,
      name: record.name,
      type: record.type || 'VENDA',
      item: record.item && record.item !== 'N/A' ? record.item : (record.type === 'CORRIDINHA' ? 'BÔNUS: CORRIDINHA MALUCA' : (record.type === 'SAQUE' ? 'PAGAMENTO REALIZADO' : record.type)),
      amount: Number(record.amount) || Number(record.extraCashback) || 0,
      status: record.status
    }));

    return { team, records: formattedRecords };
  }
}