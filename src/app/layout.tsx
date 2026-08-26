import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Breathe | Square breathing",
  description: "A calm square breathing exercise. Inhale, hold, exhale, rest.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className={`${outfit.className} min-h-full flex flex-col bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
