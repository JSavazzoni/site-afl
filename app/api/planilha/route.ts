export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getCashback = (cargo: string) => { 
    const c = (cargo || '').toUpperCase();
    if (c.includes('RESP.VENDAS')) return 0.15;
    if (c.includes('MASTER AFL')) return 0.12;
    if (c.includes('RESP.AFL')) return 0.10;
    if (c.includes('AUXILIAR AFL')) return 0.09;
    if (c.includes('LIDER AFL') || c.includes('LÍDER AFL')) return 0.08;
    if (c.includes('SUB-LIDER AFL') || c.includes('SUB.AFL') || c.includes('SUB LIDER')) return 0.07;
    return 0.06; // Membro AFL
};

export async function GET(request: Request) {
  try {
    let equipe = [];
    try {
        // Tenta puxar a informação viva igual o Painel faz
        const baseUrl = new URL(request.url).origin;
        const resEquipe = await fetch(`${baseUrl}/api/equipe`, { cache: 'no-store' });
        if (!resEquipe.ok) throw new Error('API Restrita');
        equipe = await resEquipe.json();
    } catch (e) {
        // Se a rota for protegida, ele busca do banco de dados
        equipe = await prisma.membro.findMany();
    }

    const registros = await prisma.registro.findMany({
        where: { status: { in: ['APROVADO', 'ARQUIVADO'] } },
        orderBy: { criado_em: 'desc' }
    });

    const dataAtual = new Date();
    const mesAtualStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

    const isParcela = (item: string) => (item || '').toUpperCase().includes('PAGAMENTO DE PARCELA');
    const extractVal = (r: any) => Number(r.valor) || Number(r.valorRecebido) || Number(r.cashbackExtra) || 0;

    const equipeProcessada = equipe.map((m: any) => {
        let cargoReal = m.cargoPainel || m.cargo || 'Membro AFL';

        // INTELIGÊNCIA: Extrai o cargo lendo o prefixo do nome no Discord (Garante 100% de sincronia com o site)
        if (!m.cargoPainel && m.nome) {
            const n = m.nome.toUpperCase();
            if (n.includes('RESP.VENDAS')) cargoReal = 'Resp.Vendas';
            else if (n.includes('MASTER AFL')) cargoReal = 'Master AFL';
            else if (n.includes('RESP.AFL')) cargoReal = 'Resp.AFL';
            else if (n.includes('AUXILIAR AFL')) cargoReal = 'Auxiliar AFL';
            else if (n.includes('SUB.AFL') || n.includes('SUB-LIDER')) cargoReal = 'Sub-Lider AFL';
            else if (n.includes('LIDER AFL') || n.includes('LIDER.AFL')) cargoReal = 'Lider AFL';
        }

        const perc = getCashback(cargoReal);

        const regsMes = registros.filter((r: any) => {
            const dataTexto = r.criado_em instanceof Date ? r.criado_em.toISOString() : String(r.criado_em);
            return String(r.discordId) === String(m.discordId) && dataTexto.startsWith(mesAtualStr);
        });

        const bruto = regsMes.filter((r: any) => (r.tipo === 'VENDA' || !r.tipo) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA') && !isParcela(r.item)).reduce((a: any, r: any) => a + Number(r.valor || 0), 0);
        
        const liqVendas = regsMes.filter((r: any) => (r.tipo === 'VENDA' || !r.tipo) && !isParcela(r.item)).reduce((a: any, r: any) => a + Number(r.valorRecebido || 0), 0);
        const liqParcelas = regsMes.filter((r: any) => isParcela(r.item)).reduce((a: any, r: any) => a + extractVal(r), 0);
        const liq = liqVendas + liqParcelas;

        const corridinhas = regsMes.filter((r: any) => r.tipo === 'CORRIDINHA' && !(r.item || '').toUpperCase().includes('SALDO RETIDO')).reduce((a: any, r: any) => a + Number(r.cashbackExtra || 0), 0);
        const pago = regsMes.filter((r: any) => r.tipo === 'SAQUE' && !(r.item || '').toUpperCase().includes('DÍVIDA RETIDA')).reduce((a: any, r: any) => a + Number(r.valor || 0), 0);
        
        const regsAtivos = registros.filter((r: any) => String(r.discordId) === String(m.discordId) && r.status === 'APROVADO');
        const ativoLiq = regsAtivos.filter((r: any) => (r.tipo === 'VENDA' || !r.tipo) && !isParcela(r.item)).reduce((a: any, r: any) => a + Number(r.valorRecebido || 0), 0);
        const ativoExtra = regsAtivos.filter((r: any) => r.tipo === 'CORRIDINHA').reduce((a: any, r: any) => a + Number(r.cashbackExtra || 0), 0);
        const ativoPago = regsAtivos.filter((r: any) => r.tipo === 'SAQUE').reduce((a: any, r: any) => a + Number(r.valor || 0), 0);
        
        const saldoReal = (ativoLiq * perc) + ativoExtra - ativoPago;

        return {
            nome: m.nome,
            cargo: cargoReal,
            bruto: bruto,
            liquido: liq,
            bonus: corridinhas,
            pago: pago,
            saldo: saldoReal
        };
    }).sort((a: any, b: any) => b.bruto - a.bruto);

    const formatItemName = (r: any) => {
        if (r.tipo === 'CORRIDINHA' && (!r.item || r.item === 'N/A')) return 'BÔNUS: CORRIDINHA MALUCA';
        if (r.tipo === 'SAQUE' && (!r.item || r.item === 'N/A')) return 'PAGAMENTO REALIZADO';
        return r.item !== 'N/A' ? r.item : r.tipo;
    };

    const formatClientName = (r: any) => {
        if (r.tipo === 'CORRIDINHA' && (!r.cliente || r.cliente === 'N/A')) return 'EQUIPE AFL';
        if (r.tipo === 'SAQUE' && (!r.cliente || r.cliente === 'N/A')) return 'FINANCEIRO AFL';
        return r.cliente !== 'N/A' ? r.cliente : 'SISTEMA';
    };

    const logRegistros = registros.map((r: any) => ({
        data: r.criado_em,
        nome: r.nome,
        tipo: r.tipo || 'VENDA',
        item: `${formatClientName(r)} | ${formatItemName(r)}`, // Agora o extrato da planilha fica limpo igual o site
        valor: r.valor || r.cashbackExtra || 0,
        status: r.status
    }));

    return NextResponse.json({ equipe: equipeProcessada, registros: logRegistros });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}