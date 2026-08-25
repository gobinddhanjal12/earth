import type { Metadata } from "next";
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
  title: "The Living Planet — An Interactive Earth Story",
  description:
    "Explore Earth’s surface, interior, and atmosphere through an interactive Three.js journey.",
  keywords: [
    "Earth",
    "Three.js",
    "interactive science",
    "atmosphere",
    "Earth layers",
  ],
  openGraph: {
    title: "The Living Planet",
    description:
      "An interactive journey through Earth’s surface, interior, and atmosphere.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
