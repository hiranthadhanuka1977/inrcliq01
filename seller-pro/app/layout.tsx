import type { Metadata } from "next";
import { cookies } from "next/headers";
import ProSplash from "../components/ProSplash";
import { SELLER_PRO_SPLASH_COOKIE } from "../lib/splash";
import "./globals.css";

export const metadata: Metadata = {
  title: "InrCliq Seller Tools",
  description: "Advanced seller tools for Collection and Service requests.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const showSplash = (await cookies()).get(SELLER_PRO_SPLASH_COOKIE)?.value === "1";

  return (
    <html lang="en">
      <body>
        {showSplash ? <ProSplash /> : null}
        {children}
      </body>
    </html>
  );
}
