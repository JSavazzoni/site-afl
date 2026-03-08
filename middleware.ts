import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pega o token de sessão do login
  const token = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
  const pathname = request.nextUrl.pathname;

  // 1. PASSE VIP PRO LOGIN: Permite que o sistema do Discord funcione livremente
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 2. MURALHA DE DADOS: Se alguém tentar acessar o banco de dados sem estar logado
  if (!token && pathname.startsWith('/api/')) {
    // Em vez de mostrar um JSON feio, redireciona o invasor para a tela bonita
    return NextResponse.redirect(new URL('/acesso-negado', request.url));
  }

  return NextResponse.next();
}

// O middleware vai vigiar apenas a pasta da API
export const config = {
  matcher: ['/api/:path*'],
};