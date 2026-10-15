import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";
import { getSection } from "@/lib/admin-portal/sections";

type PageProps = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section: slug } = await params;
  const section = getSection(slug);
  return { title: section ? `${section.label} · InrCliq Admin` : "InrCliq Admin" };
}

export default async function AdminSectionDashboardPage({ params }: PageProps) {
  const { section: slug } = await params;
  const section = getSection(slug);
  if (!section) notFound();

  return <AdminPlaceholder kicker={section.label} title="Dashboard" summary={section.summary} />;
}
