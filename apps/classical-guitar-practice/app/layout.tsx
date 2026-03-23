import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { unstable_noStore as noStore } from "next/cache";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getActivePlaytimeSession } from "@/app/actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Classical Guitar Practice",
  description: "Classical guitar practice app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  noStore();
  const activeSession = await getActivePlaytimeSession();
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <AppShell activeSession={activeSession}>{children}</AppShell>
      </body>
    </html>
  );
}
