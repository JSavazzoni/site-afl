import { MemberRepository } from '@/repositories/member.repository';

export class TeamService {
  private memberRepository: MemberRepository;

  constructor() {
    this.memberRepository = new MemberRepository();
  }

  async getTeamMembers() {
    return this.memberRepository.findAll();
  }
}