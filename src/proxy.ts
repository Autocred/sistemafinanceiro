import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // 1. Bloquear acesso ao Painel Master a partir de domínios de clientes
  // O Master só pode ser acessado pelo domínio oficial administrativo
  const isMasterRoute = url.pathname.startsWith('/master');
  
  if (isMasterRoute) {
    // Para fins de teste/desenvolvimento ou domínio principal configurado
    // Verifica se estamos no domínio base da aplicação e não num custom domain de um cliente
    if (!hostname.includes('localhost') && !hostname.includes('sistemafinanceiropessoal.vercel.app')) {
      // Se um cliente tentar acessar /master no seu domínio customizado, mandamos pro inicio dele
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 2. Lógica de Subdomínios (Injeção de Tenant via Cabeçalho)
  // Opcional: Se a arquitetura fosse Next.js App Router com subdomínios dinâmicos, faríamos um rewrite aqui.
  // Como estamos usando o `TenantProvider` via hostname no Client-Side e Firestore, 
  // o middleware foca mais em proteger as rotas administrativas isoladas.

  // 3. Segurança Base (Proteção de rotas da aplicação contra não-logados - a ser aprimorada na Auth)
  const isAuthRoute = url.pathname === '/login' || url.pathname === '/register';
  
  // Em um cenário real, checaríamos o cookie do Firebase Auth JWT aqui
  const sessionCookie = request.cookies.get('session'); 

  // Se o usuário não tiver sessão e tentar acessar o app, redireciona para login (exceto master que terá seu próprio login)
  /* 
  if (!sessionCookie && !isAuthRoute && !isMasterRoute && url.pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  */

  const response = NextResponse.next();

  // Adicionando headers de segurança recomendados para SaaS
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Repassa o hostname real para os Server Components lerem se necessário
  response.headers.set('x-tenant-hostname', hostname);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
