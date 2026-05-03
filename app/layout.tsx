import PopupProvider from "@/app/components/Popup/PopupProvider";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { PublicEnvScript } from "next-runtime-env";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const ebGaramond = EB_Garamond({subsets:['latin'],variable:'--font-serif'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zerve",
  description:
    "Officer-only venue reservation and approval workflow for La Consolacion University Philippines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-serif", ebGaramond.variable)}>
      <head>
        <PublicEnvScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PopupProvider>{children}</PopupProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
