import { RecordRepository } from '@/repositories/record.repository';
import { MemberRepository } from '@/repositories/member.repository';

export class AdminService {
  private recordRepository: RecordRepository;
  private memberRepository: MemberRepository;

  constructor() {
    this.recordRepository = new RecordRepository();
    this.memberRepository = new MemberRepository();
  }

  async deleteLog(id: string) {
    if (!id) throw new Error('InvalidId');
    return this.recordRepository.delete(id);
  }

  async executeMonthRollover() {
    const currentDate = new Date();
    const currentMonthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    await this.recordRepository.archiveCurrentMonth(currentMonthPrefix);
    await this.memberRepository.resetAllCounters();
  }

  async runSystemAudit() {
    return this.recordRepository.restoreArchived();
  }
}