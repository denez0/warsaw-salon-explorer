import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppHeader } from "@/components/AppHeader";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Warsaw Beauty Salon Explorer",
  description:
    "Browse beauty salons in Warsaw — search, district filters, and salon details.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">{children}</main>
        </div>
        <ToasterProvider />
      </body>
    </html>
  );
}
