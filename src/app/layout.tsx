import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import { PrototypeControls } from "@/components/prototype/PrototypeControls";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en">
      <body className={plusJakarta.className}>
        <MicrosoftClarity />
        <PrototypeControls />
        {children}
      </body>
    </html>
  );
}
