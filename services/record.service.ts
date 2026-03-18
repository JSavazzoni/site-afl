import { RecordRepository } from '@/repositories/record.repository';
import { MemberRepository } from '@/repositories/member.repository';

export interface CreateRecordDTO {
  tipo?: string;
  vendedorId?: string;
  recrutadoId?: string;
  membroSaqueId?: string;
  vendedorNome?: string;
  cliente?: string;
  item?: string;
  valorNumerico?: number;
  recebidoNumerico?: number;
  cashbackExtra?: number;
  dataVencimento?: string;
  criadoPor?: string;
}

export class RecordService {
  private recordRepository: RecordRepository;
  private memberRepository: MemberRepository;

  constructor() {
    this.recordRepository = new RecordRepository();
    this.memberRepository = new MemberRepository();
  }

  async getActiveRecords() {
    return this.recordRepository.findAllActive();
  }

  async createRecord(payload: CreateRecordDTO) {
    const data = {
      type: payload.tipo || 'VENDA',
      discordId: payload.vendedorId || payload.recrutadoId || payload.membroSaqueId || '',
      name: payload.vendedorNome || payload.cliente || 'Sistema',
      client: payload.cliente || 'N/A',
      item: payload.item || 'N/A',
      amount: Number(payload.valorNumerico) || 0,
      receivedAmount: Number(payload.recebidoNumerico) || 0,
      extraCashback: Number(payload.cashbackExtra) || 0,
      status: 'PENDENTE',
      dueDate: payload.dataVencimento || null,
      createdBy: payload.criadoPor || 'Sistema',
    };

    return this.recordRepository.create(data as any);
  }

  async evaluateRecord(recordId: string, action: string, evaluatedBy: string) {
    const record = await this.recordRepository.findById(recordId);
    
    if (!record) {
      throw new Error('RecordNotFound');
    }

    if (action === 'REPROVAR') {
      await this.recordRepository.updateStatus(recordId, 'REPROVADO', evaluatedBy);
      return;
    }

    if (action === 'APROVAR') {
      await this.recordRepository.updateStatus(recordId, 'APROVADO', evaluatedBy);

      const value = Number(record.amount) || 0;
      const received = Number(record.receivedAmount) || value;
      const extra = Number(record.extraCashback) || 0;

      if (record.discordId) {
        if (record.type === 'VENDA' || !record.type) {
          await this.memberRepository.upsertSalesData(record.discordId, record.name, value, received, extra);
        } else if (record.type === 'RECRUTAMENTO') {
          const quantity = Number(record.quantity) || 1;
          await this.memberRepository.upsertRecruitmentData(record.discordId, record.name, quantity, extra);
        }
      }

      this.triggerWebhook(record, value, received, extra).catch(() => {});
      return;
    }

    throw new Error('InvalidAction');
  }

  async payInstallment(recordId: string, paidAmount: number, nextDueDate: string) {
    const record = await this.recordRepository.findById(recordId);
    
    if (!record) {
      throw new Error('RecordNotFound');
    }

    const currentReceived = record.receivedAmount || 0;
    const newReceived = currentReceived + paidAmount;

    return this.recordRepository.updatePayment(recordId, newReceived, nextDueDate);
  }

  private async triggerWebhook(record: any, value: number, received: number, extra: number) {
    if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL) return;
    
    await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataAprovacao: new Date().toLocaleString('pt-BR'),
        vendedor: record.name || record.discordId || "-",
        tipo: record.type || "VENDA",
        cliente: record.client || "-",
        documento: record.document || "-",
        item: record.item || "-",
        valorTotal: value,
        valorRecebido: received,
        metodoPagamento: record.paymentMethod || "-",
        status: 'APROVADO',
        corridinha: extra 
      })
    });
  }
}