import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nyre · Finanzas",
  description: "Finanzas de la familia y del SaaS en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className={`${GeistSans.variable} min-h-full font-sans`}>{children}</body>
    </html>
  );
}
