import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { PrototypeControls } from "@/components/prototype/PrototypeControls";
import { FeedThemeProvider } from "@/context/feed/FeedThemeContext";
import { FEED_THEME_BOOTSTRAP } from "@/lib/feed/theme";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-family-sans",
});

export const metadata: Metadata = {
  title: "InrCliq",
  description: "Discover premium content from top creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FEED_THEME_BOOTSTRAP }} />
      </head>
      <body className={plusJakarta.className} suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <GoogleAnalytics />
        <MicrosoftClarity />
        <PrototypeControls />
        <FeedThemeProvider>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </FeedThemeProvider>
      </body>
    </html>
  );
}
