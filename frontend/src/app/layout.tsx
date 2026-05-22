import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "Syntess Rapport",
  description: "Business intelligence dashboard voor Syntess Atrium",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
