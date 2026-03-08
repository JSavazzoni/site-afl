import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pega o token de sessão criptografado do NextAuth
  const token = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');

  // Se um invasor tentar acessar a API do banco de dados direto pela URL sem estar logado
  if (!token && request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Acesso Negado: Segurança do Servidor Ativada' }, 
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// Protege todas as rotas da pasta /api
export const config = {
  matcher: ['/api/:path*'],
};