import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nyre · Finanzas",
  description: "Finanzas de la familia y del SaaS en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
