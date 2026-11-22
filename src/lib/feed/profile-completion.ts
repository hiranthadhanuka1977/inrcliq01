export type ProfileCompletionAccountType = "ADULT" | "GUARDIAN" | "MINOR";

export type ProfileCompletionInput = {
  hasPassword: boolean;
  handle: string | null;
  postCount: number;
  avatarUrl: string | null;
  identityVerified: boolean;
  accountType: ProfileCompletionAccountType;
};

/** Synthetic hashes such as the seller bridge are not a password the member chose. */
export function isChosenPassword(passwordHash: string | null | undefined) {
  const hash = passwordHash?.trim();
  return Boolean(hash && !hash.startsWith("!"));
}

export type ProfileCompletionItem = {
  id: "password" | "handle" | "post" | "photo" | "adult";
  label: string;
  intro: string;
  done: boolean;
  /** Shown only while the item is still open. */
  actionLabel: string | null;
  href: string | null;
};

export function buildProfileCompletion(input: ProfileCompletionInput) {
  const allItems: ProfileCompletionItem[] = [
    {
      id: "password",
      label: "Password setup",
      intro: "Sign in without an email code.",
      done: input.hasPassword,
      actionLabel: "Set a password",
      href: "/feed/me/password",
    },
    {
      id: "handle",
      label: "Handle setup",
      intro: "Your public @name on InrCliq.",
      done: Boolean(input.handle?.trim().replace(/^@/, "")),
      actionLabel: "Set handle",
      href: "/feed/me/edit/handle",
    },
    {
      id: "post",
      label: "Shared your first post",
      intro: "Give people something to find.",
      done: input.postCount > 0,
      actionLabel: "Create post",
      href: null,
    },
    {
      id: "photo",
      label: "Profile photo",
      intro: "A picture instead of an initial.",
      done: Boolean(input.avatarUrl?.trim()),
      actionLabel: "Add photo",
      href: null,
    },
    {
      id: "adult",
      label: "Confirm you are an adult",
      intro: "Show this account is 18 or older.",
      done: input.identityVerified,
      actionLabel: "Confirm",
      href: "/feed/me/adult",
    },
  ];
  const items = allItems.filter((item) => item.id !== "adult" || input.accountType !== "MINOR");

  const doneCount = items.filter((item) => item.done).length;
  const percent = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  return { items, doneCount, total: items.length, percent };
}
