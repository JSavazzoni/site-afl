import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const membrosBanco = await prisma.membro.findMany();
    
    const stats = {
      totalVendas: membrosBanco.reduce((acc, m) => acc + (m.vendas || 0), 0),
      totalRecrutas: membrosBanco.reduce((acc, m) => acc + (m.recrutamentos || 0), 0),
      membrosBanco: membrosBanco // Enviamos a lista para sincronizar o ranking
    };

    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}