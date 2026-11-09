import type { Metadata } from "next";
import localFont from "next/font/local";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { FeedThemeProvider } from "@/context/feed/FeedThemeContext";
import "./globals.css";

const plusJakarta = localFont({
  src: "../fonts/plus-jakarta-sans-latin.woff2",
  weight: "400 800",
  display: "swap",
  variable: "--font-family-sans",
});

export const metadata: Metadata = {
  title: "InrCliq",
  description: "Discover premium content from top creators",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={plusJakarta.className} suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <GoogleAnalytics />
        <MicrosoftClarity />
        <FeedThemeProvider>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </FeedThemeProvider>
      </body>
    </html>
  );
}
