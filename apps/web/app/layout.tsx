import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";

import { SiteShell } from "../components/site-shell";

import "./globals.css";

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif"
});

const sans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "thelocalrecord",
  description: "Independent resident-run digest of local government updates."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
