import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AFL PAINEL | Gestão de Equipe",
  description: "Sistema corporativo exclusivo para controle de vendas, aprovações e comissões da equipe AFL.",
  openGraph: {
    title: "AFL PAINEL | Central de Gestão",
    description: "Acesse o painel para conferir suas metas e acompanhar seus ganhos ao vivo.",
    siteName: "AFL PAINEL",
    images: [
      {
        url: "https://ui-avatars.com/api/?name=AFL&background=C89B0C&color=111111&bold=true&size=800",
        width: 800,
        height: 800,
        alt: "Logo AFL PAINEL",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  icons: {
    icon: "https://ui-avatars.com/api/?name=AFL&background=12151B&color=C89B0C&bold=true&rounded=true",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} font-sans antialiased text-[var(--ink)]`}>
        {children}
      </body>
    </html>
  );
}
