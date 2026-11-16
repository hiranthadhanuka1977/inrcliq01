import { ensureChatThreadForUserId, sendChatMessage } from "@/lib/feed/chat-service";
import { getDmBlockBetween } from "@/lib/feed/dm-participant-controls";
import { getFeedPostById } from "@/lib/feed/feed";
import { encodePostShare, postSharePayload } from "@/lib/feed/post-share-message";
import { prisma } from "@/lib/prisma";

const MAX_RECIPIENTS = 20;

export type SharePostFailure = {
  userId: string;
  name: string;
  error: string;
};

export type SharePostOutcome =
  | {
      ok: true;
      sent: number;
      sentUserIds: string[];
      confirmation: string;
      failures: SharePostFailure[];
    }
  | { ok: false; status: number; error: string };

export { postSharePayload } from "@/lib/feed/post-share-message";

function nameList(names: string[]) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
}

function sentConfirmation(names: string[], requestNames: string[]) {
  const parts: string[] = [];
  if (names.length > 0) parts.push(`Sent this post to ${nameList(names)}.`);
  if (requestNames.length > 0) {
    parts.push(
      `Message request sent to ${nameList(requestNames)}. They need to accept before this is delivered.`,
    );
  }
  return parts.join(" ");
}

function failureFromSend(result: Awaited<ReturnType<typeof sendChatMessage>>): string | null {
  if (!result) return "Could not send this message.";
  if ("restricted" in result) return result.message;
  if ("moderationRequired" in result) {
    return result.moderation.message || "This post could not be sent.";
  }
  return null;
}

export async function sharePostWithUsers(
  senderUserId: string,
  postId: string,
  userIds: string[],
): Promise<SharePostOutcome> {
  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => id !== senderUserId,
  );
  if (uniqueIds.length === 0) {
    return { ok: false, status: 400, error: "Choose at least one person." };
  }
  if (uniqueIds.length > MAX_RECIPIENTS) {
    return {
      ok: false,
      status: 400,
      error: `You can share with up to ${MAX_RECIPIENTS} people at a time.`,
    };
  }

  const post = await getFeedPostById(postId);
  if (!post) {
    return { ok: false, status: 404, error: "Post not found." };
  }

  const body = encodePostShare(postSharePayload(post));
  const sentUserIds: string[] = [];
  const sentNames: string[] = [];
  const requestNames: string[] = [];
  const failures: SharePostFailure[] = [];

  for (const userId of uniqueIds) {
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        suspendedAt: true,
        firstName: true,
        lastName: true,
        profile: { select: { displayName: true } },
      },
    });
    const name =
      recipient?.profile?.displayName?.trim() ||
      [recipient?.firstName, recipient?.lastName].filter(Boolean).join(" ") ||
      "This person";

    if (!recipient || recipient.suspendedAt) {
      failures.push({ userId, name, error: "That account can't receive messages." });
      continue;
    }

    const block = await getDmBlockBetween(senderUserId, recipient.id);
    if (block.blockedByMe || block.blockedByThem) {
      failures.push({ userId, name, error: "You can't message this person." });
      continue;
    }

    const thread = await ensureChatThreadForUserId(senderUserId, recipient.id);
    if (!thread) {
      failures.push({ userId, name, error: "Could not open a conversation." });
      continue;
    }

    const result = await sendChatMessage(senderUserId, thread.id, body);
    const error = failureFromSend(result);
    if (error) {
      failures.push({ userId, name, error });
      continue;
    }

    sentUserIds.push(recipient.id);
    if (result && "heldAsRequest" in result && result.heldAsRequest) requestNames.push(name);
    else sentNames.push(name);
  }

  if (sentUserIds.length === 0) {
    const detail = failures.map((failure) => `${failure.name}: ${failure.error}`).join(" ");
    return { ok: false, status: 422, error: detail || "Could not send this post." };
  }

  await prisma.feedPost.update({
    where: { id: post.id },
    data: { shares: { increment: sentUserIds.length } },
  });

  return {
    ok: true,
    sent: sentUserIds.length,
    sentUserIds,
    confirmation: sentConfirmation(sentNames, requestNames),
    failures,
  };
}
