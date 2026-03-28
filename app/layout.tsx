import PopupProvider from "@/app/components/Popup/PopupProvider";
import type { Metadata } from "next";
import { PublicEnvScript } from "next-runtime-env";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LCUP Event Space Reservation",
  description:
    "Reserve campus event spaces at La Consolacion University Philippines. Real-time availability, easy scheduling, and seamless booking management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PublicEnvScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PopupProvider>{children}</PopupProvider>
      </body>
    </html>
  );
}
