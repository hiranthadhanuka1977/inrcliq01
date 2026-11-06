import type { Metadata } from "next";
import { cookies } from "next/headers";
import StudioSplash from "../components/StudioSplash";
import { STUDIO_SPLASH_COOKIE } from "../lib/splash";
import "./admin-portal.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "InrCliq Creator Studio",
  description: "Publish video and audio to InrCliq Videos.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const showSplash = (await cookies()).get(STUDIO_SPLASH_COOKIE)?.value === "1";

  return (
    <html lang="en">
      <body>
        {showSplash ? <StudioSplash /> : null}
        {children}
      </body>
    </html>
  );
}
