"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { viewerCanWatch } from "@/lib/studio/library";

export async function addStudioComment(formData: FormData) {
  const user = await getSessionUser();
  const projectId = String(formData.get("projectId") ?? "");
  const back = `/feed/videos/${projectId}`;
  if (!user) redirect("/");

  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  if (!body || body.length > 500) redirect(`${back}?comment=invalid`);

  const project = await prisma.studioProject.findUnique({ where: { id: projectId } });
  if (!project || project.status !== "PUBLISHED" || !project.commentsEnabled) redirect(back);

  const allowed = await viewerCanWatch(user.id, project, user.ageZone);
  if (!allowed) redirect(back);

  await prisma.studioComment.create({
    data: { projectId, userId: user.id, body },
  });
  redirect(back);
}
