import type { Metadata } from "next";
import { Jost, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopNav } from "@/components/TopNav";

// Display: Jost — geometric sans, free Google Fonts equivalent of Swiggy's
// modified Futura. Used on headlines, hero, big numbers.
const jost = Jost({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Body: Inter — neutral grotesque, close to Swiggy's Basis Grotesque body type.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Mono: Geist Mono — for prices and tabular numerics.
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "End of Month — week meal optimizer",
  description:
    "Tell it your budget. It plans cook days, order days, and one cheap night out across Swiggy Food, Instamart, and Dineout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TopNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
