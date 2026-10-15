import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";
import { getSectionPage } from "@/lib/admin-portal/sections";

type PageProps = { params: Promise<{ section: string; page: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section: slug, page } = await params;
  const match = getSectionPage(slug, page);
  return { title: match ? `${match.item.label} · InrCliq Admin` : "InrCliq Admin" };
}

export default async function AdminSectionPage({ params }: PageProps) {
  const { section: slug, page } = await params;
  const match = getSectionPage(slug, page);
  if (!match) notFound();

  return <AdminPlaceholder kicker={match.section.label} title={match.item.label} summary={match.item.summary} />;
}
