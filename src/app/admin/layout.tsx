import type { Metadata } from "next";
import "@/styles/admin/admin-portal.css";

export const metadata: Metadata = {
  title: "InrCliq Admin",
  description: "Onboarding and user administration",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
