import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Therapreneur: run your practice, not your paperwork",
  description:
    "Software, support and business coaching for OTs, physios and speech therapists in private practice in South Africa.",
  appleWebApp: { capable: true, title: "Therapreneur", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
