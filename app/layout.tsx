import type { Metadata } from 'next';
import './globals.css';

// 👇 AS CONFIGURAÇÕES DE VITRINE DO SITE (Links, Ícone e Textos) 👇
export const metadata: Metadata = {
  title: 'AFL PAINEL | Gestão de Equipe',
  description: 'Sistema corporativo exclusivo para controle de vendas, aprovações e comissões da equipe AFL.',
  openGraph: {
    title: 'AFL PAINEL | Central de Gestão',
    description: 'Acesse o painel para registrar vendas, conferir suas metas e acompanhar seus ganhos ao vivo.',
    siteName: 'AFL PAINEL',
    images: [
      {
        // Gera um "Card" amarelo bonitão com o nome AFL para o WhatsApp/Discord
        url: 'https://ui-avatars.com/api/?name=AFL&background=EAB308&color=000&bold=true&size=800',
        width: 800,
        height: 800,
        alt: 'Logo AFL PAINEL',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  icons: {
    // Ícone redondo (Favicon) da aba do navegador
    icon: 'https://ui-avatars.com/api/?name=AFL&background=000&color=EAB308&bold=true&rounded=true',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#050505] text-white antialiased">
        {children}
      </body>
    </html>
  );
}