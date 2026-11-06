"use server";

import { redirect } from "next/navigation";
import type { StudioAgeRating, StudioAudience, StudioShowKind } from "../generated/prisma/client";
import { getStudioContext } from "./context";
import { AGE_RATINGS, AUDIENCES, CATEGORIES, LANGUAGES, SHOW_KINDS, familyById, shapeById } from "./labels";
import { isStudioMediaUrl } from "./media";
import { prisma } from "./prisma";
import { createGuidedProject, deleteProject, saveProject } from "./store";

async function creator() {
  const ctx = await getStudioContext();
  if (ctx.kind !== "ok") redirect("/");
  return ctx;
}

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

function checked(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function optionalUrl(formData: FormData, key: string) {
  const value = text(formData, key, 2000);
  if (!value) return null;
  return isStudioMediaUrl(value) ? value : null;
}

function clipMs(formData: FormData, key: string) {
  const raw = text(formData, key, 12);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function guideBack(family: string, shape: string, message: string, show?: string): never {
  const query = new URLSearchParams({ family, shape, error: message });
  if (show) query.set("show", show);
  redirect(`/projects/new?${query.toString()}`);
}

export async function startProjectAction(formData: FormData) {
  const ctx = await creator();
  const family = text(formData, "family", 20);
  const shapeId = text(formData, "shape", 40);
  const familySpec = familyById(family);
  const shape = shapeById(shapeId);
  if (!familySpec || !shape || shape.family !== familySpec.id) redirect("/projects/new?error=Choose%20what%20you%20are%20making.");

  const title = text(formData, "title", 140);
  const showChoice = text(formData, "showChoice", 80);
  const lockedShow = shape?.showKind && showChoice && showChoice !== "new" ? showChoice : undefined;
  if (!title) guideBack(family, shape.id, `Name this ${shape.pieceNoun}.`, lockedShow);

  let showId: string | null = null;
  if (shape.showKind) {
    const choice = text(formData, "showChoice", 80);
    if (choice === "new" || !choice) {
      const showTitle = text(formData, "showTitle", 140);
      if (!showTitle) guideBack(family, shape.id, `Name the ${shape.shelfNoun}.`);
      const show = await prisma.studioShow.create({
        data: {
          userId: ctx.user.id,
          creatorId: ctx.creator.id,
          title: showTitle,
          kind: shape.showKind as StudioShowKind,
        },
        select: { id: true },
      });
      showId = show.id;
    } else {
      const show = await prisma.studioShow.findFirst({
        where: { id: choice, userId: ctx.user.id, kind: shape.showKind as StudioShowKind },
        select: { id: true },
      });
      if (!show) guideBack(family, shape.id, `Choose a ${shape.shelfNoun} you already created.`, choice);
      showId = show.id;
    }
  }

  let parentProjectId: string | null = null;
  let parentKind: "VIDEO" | "AUDIO" | null = null;
  if (shape.family === "PROMO") {
    parentProjectId = text(formData, "parentProjectId", 80);
    const parent = parentProjectId
      ? await prisma.studioProject.findFirst({
          where: { id: parentProjectId, userId: ctx.user.id, family: { not: "PROMO" } },
          select: { id: true, mediaKind: true },
        })
      : null;
    if (!parent) guideBack(family, shape.id, "Choose the piece this promo belongs to.");
    parentProjectId = parent.id;
    parentKind = parent.mediaKind;
  }

  const created = await createGuidedProject({
    userId: ctx.user.id,
    creatorId: ctx.creator.id,
    family: shape.family,
    shape: shape.id,
    title,
    showId,
    parentProjectId,
    parentKind,
  });
  redirect(`/projects/${created.id}/edit`);
}

export async function saveProjectAction(formData: FormData) {
  const ctx = await creator();
  const id = text(formData, "id", 80);
  const intentValue = text(formData, "intent", 20);
  const intent = intentValue === "publish" || intentValue === "hide" ? intentValue : "save";
  const language = text(formData, "language", 8);
  const category = text(formData, "category", 40);
  const ageRating = text(formData, "ageRating", 20);
  const audience = text(formData, "audience", 20);
  const attachment = text(formData, "attachment", 120);
  const attachmentType = attachment.startsWith("PRODUCT:")
    ? "PRODUCT"
    : attachment.startsWith("REQUEST:")
      ? "REQUEST"
      : "NONE";
  const attachmentId = attachmentType === "NONE" ? "" : attachment.slice(attachment.indexOf(":") + 1);
  const publishRaw = text(formData, "publishAt", 40);
  const publishAt = publishRaw ? new Date(publishRaw) : null;

  const result = await saveProject(ctx.user.id, ctx.creator.id, id, {
    title: text(formData, "title", 140),
    description: text(formData, "description", 5000),
    language: LANGUAGES.some((item) => item.id === language) ? language : "en",
    category: CATEGORIES.includes(category) ? category : "entertainment",
    ageRating: (AGE_RATINGS.some((item) => item.id === ageRating) ? ageRating : "ALL") as StudioAgeRating,
    showId: text(formData, "showId", 80) || null,
    parentProjectId: text(formData, "parentProjectId", 80) || null,
    audience: (AUDIENCES.some((item) => item.id === audience) ? audience : "PUBLIC") as StudioAudience,
    publishAt: publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt : null,
    pushToFeed: checked(formData, "pushToFeed"),
    commentsEnabled: checked(formData, "commentsEnabled"),
    attachmentType,
    attachmentId: attachmentId || null,
    rightsConfirmed: checked(formData, "rightsConfirmed"),
    mediaUrl: optionalUrl(formData, "mediaUrl"),
    thumbnailUrl: optionalUrl(formData, "thumbnailUrl"),
    trimStartMs: clipMs(formData, "trimStartMs") ?? 0,
    trimEndMs: clipMs(formData, "trimEndMs"),
    durationMs: clipMs(formData, "durationMs") ?? 0,
    intent,
  });

  const next = text(formData, "next", 20) === "edit" ? `/projects/${id}/edit` : `/projects/${id}`;
  if (!result.ok) redirect(`${next}?error=${encodeURIComponent(result.error)}`);
  redirect(`${next}?saved=1`);
}

export async function deleteProjectAction(formData: FormData) {
  const ctx = await creator();
  await deleteProject(ctx.user.id, text(formData, "id", 80));
  redirect("/");
}

export async function createShowAction(formData: FormData) {
  const ctx = await creator();
  const title = text(formData, "title", 140);
  const kind = text(formData, "kind", 20);
  if (!title) redirect("/shows/new?error=Add%20a%20title.");
  if (!SHOW_KINDS.some((item) => item.id === kind)) redirect("/shows/new?error=Choose%20a%20type.");
  const show = await prisma.studioShow.create({
    data: {
      userId: ctx.user.id,
      creatorId: ctx.creator.id,
      title,
      kind: kind as StudioShowKind,
      description: text(formData, "description", 2000),
      coverUrl: optionalUrl(formData, "coverUrl"),
    },
    select: { id: true },
  });
  redirect(`/shows/${show.id}?saved=1`);
}

export async function updateShowAction(formData: FormData) {
  const ctx = await creator();
  const id = text(formData, "id", 80);
  const title = text(formData, "title", 140);
  if (!title) redirect(`/shows/${id}/edit?error=Add%20a%20title.`);
  await prisma.studioShow.updateMany({
    where: { id, userId: ctx.user.id },
    data: {
      title,
      description: text(formData, "description", 2000),
      coverUrl: optionalUrl(formData, "coverUrl"),
    },
  });
  redirect(`/shows/${id}/edit?saved=1`);
}
