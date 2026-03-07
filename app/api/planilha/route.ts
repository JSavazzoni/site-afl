export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getCashback = (cargo: string) => { 
    const r: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };
    return r[cargo] || 0.06;
};

export async function GET() {
  try {
    const equipe = await prisma.membro.findMany();
    const registros = await prisma.registro.findMany({
        where: { status: { in: ['APROVADO', 'ARQUIVADO'] } },
        orderBy: { criado_em: 'desc' }
    });

    const dataAtual = new Date();
    const mesAtualStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

    // Colocamos (m: any) e (r: any) para calar a boca do TypeScript
    const equipeProcessada = equipe.map((m: any) => {
        const cargoReal = m.cargoPainel || m.cargo || 'Membro AFL';
        const perc = getCashback(cargoReal);

        // Produção do Mês (Convertendo a data do banco para Texto antes de pesquisar)
        const regsMes = registros.filter((r: any) => {
            const dataTexto = r.criado_em instanceof Date ? r.criado_em.toISOString() : String(r.criado_em);
            return String(r.discordId) === String(m.discordId) && dataTexto.startsWith(mesAtualStr);
        });

        const bruto = regsMes.filter((r: any) => (r.tipo === 'VENDA' || !r.tipo) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA')).reduce((a: any, r: any) => a + Number(r.valor || 0), 0);
        const liq = regsMes.filter((r: any) => (r.tipo === 'VENDA' || !r.tipo)).reduce((a: any, r: any) => a + Number(r.valorRecebido || 0), 0);
        const corridinhas = regsMes.filter((r: any) => r.tipo === 'CORRIDINHA' && !(r.item || '').toUpperCase().includes('SALDO RETIDO')).reduce((a: any, r: any) => a + Number(r.cashbackExtra || 0), 0);
        
        // Saldo Inteligente (Calculado na hora)
        const regsAtivos = registros.filter((r: any) => String(r.discordId) === String(m.discordId) && r.status === 'APROVADO');
        const ativoLiq = regsAtivos.filter((r: any) => (r.tipo === 'VENDA' || !r.tipo)).reduce((a: any, r: any) => a + Number(r.valorRecebido || 0), 0);
        const ativoExtra = regsAtivos.filter((r: any) => r.tipo === 'CORRIDINHA').reduce((a: any, r: any) => a + Number(r.cashbackExtra || 0), 0);
        const ativoPago = regsAtivos.filter((r: any) => r.tipo === 'SAQUE').reduce((a: any, r: any) => a + Number(r.valor || 0), 0);
        const saldoReal = (ativoLiq * perc) + ativoExtra - ativoPago;

        return {
            nome: m.nome,
            cargo: cargoReal,
            bruto: bruto,
            liquido: liq,
            bonus: corridinhas,
            pago: ativoPago,
            saldo: saldoReal
        };
    }).sort((a: any, b: any) => b.bruto - a.bruto);

    const logRegistros = registros.map((r: any) => ({
        data: r.criado_em,
        nome: r.nome,
        tipo: r.tipo || 'VENDA',
        item: r.cliente || r.item || '-',
        valor: r.valor || r.cashbackExtra || 0,
        status: r.status
    }));

    return NextResponse.json({ equipe: equipeProcessada, registros: logRegistros });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}