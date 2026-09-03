import type { FamilyCenterChild } from "@/lib/guardian/family-center";

/** Private zone label for guardian overview only (spec §3). */
export function zoneLabelForAge(age: number | null): string | null {
  if (age == null) return null;
  if (age >= 8 && age <= 12) return "Kids Zone";
  if (age >= 13 && age <= 15) return "Teens Zone";
  if (age >= 16 && age <= 17) return "Mature Teens Zone";
  return null;
}

export type ControlHealthStatus = "ok" | "watch";

export type ControlHealthItem = {
  label: string;
  value: string;
  status: ControlHealthStatus;
  info: string;
};

export function buildControlHealthForChild(child: FamilyCenterChild) {
  return {
    childId: child.id,
    childName: child.firstName,
    zone: zoneLabelForAge(child.age),
    tier: child.protectionLevelLabel,
    items: [
      {
        label: "Discoverability",
        value: "Private",
        status: "ok" as const,
        info: "Controls who can find this account in search, suggestions, and public listings.",
      },
      {
        label: "Direct messaging",
        value: child.protectionLevel === "strict" ? "Off" : "Restricted",
        status: "ok" as const,
        info: "Limits who can send or receive private messages with this account.",
      },
      {
        label: "Safety alerts",
        value: "On",
        status: "ok" as const,
        info: "Notifies you when a qualifying safety event needs your attention.",
      },
      {
        label: "Location sharing",
        value: "Off",
        status: child.protectionLevel === "relaxed" ? ("watch" as const) : ("ok" as const),
        info: "Controls whether location can appear in posts, stories, or on the profile.",
      },
    ] satisfies ControlHealthItem[],
  };
}

/** Static prototype content — not wired to backend yet. */
export function staticDashboardExtras(children: FamilyCenterChild[]) {
  const primaryChild = children[0];
  const childName = primaryChild?.firstName ?? "your child";

  return {
    unresolvedAlerts: children.length > 0 ? 1 : 0,
    pendingRequests: children.length > 0 ? 1 : 0,
    controlsHealthyCount: children.length,
    controlsTotal: children.length,
    alerts:
      children.length > 0
        ? [
            {
              id: "alert-demo-1",
              priority: "high" as const,
              priorityLabel: "High priority",
              childName: primaryChild?.fullName ?? "Linked account",
              category: "Wellbeing safety concern",
              actionTaken: "Content was not shared and is under review.",
              timeAgo: "2h ago",
              status: "Awaiting acknowledgement",
            },
          ]
        : [],
    requests:
      children.length > 0
        ? [
            {
              id: "req-demo-1",
              childName: primaryChild?.fullName ?? "Linked account",
              setting: "Direct messaging",
              detail: `${childName} asked to allow DMs from approved contacts.`,
              submittedAgo: "Yesterday",
            },
          ]
        : [],
    controlHealth: children.map((child) => buildControlHealthForChild(child)),
  };
}

export type FamilyActivityItem = {
  id: string;
  childId: string | null;
  type: "safety" | "control" | "account" | "request";
  childName: string;
  title: string;
  detail: string;
  timeAgo: string;
  dayLabel: string;
};

function activityForChild(
  child: FamilyCenterChild,
  item: Omit<FamilyActivityItem, "childId" | "childName">,
): FamilyActivityItem {
  return {
    ...item,
    childId: child.id,
    childName: child.fullName,
  };
}

export function filterFamilyActivityForChild(
  items: FamilyActivityItem[],
  childId: string,
): FamilyActivityItem[] {
  return items.filter((item) => item.childId === childId);
}

/** Static prototype activity feed — not wired to backend yet. */
export function staticFamilyActivityHistory(children: FamilyCenterChild[]): FamilyActivityItem[] {
  if (children.length === 0) return [];

  const primaryChild = children[0]!;
  const secondaryChild = children[1];
  const childName = primaryChild.fullName;
  const firstName = primaryChild.firstName;

  const base: FamilyActivityItem[] = [
    activityForChild(primaryChild, {
      id: "activity-1",
      type: "safety",
      title: "Safety alert raised",
      detail: "Wellbeing safety concern detected. Content was not shared and is under review.",
      timeAgo: "2h ago",
      dayLabel: "Today",
    }),
    activityForChild(primaryChild, {
      id: "activity-2",
      type: "request",
      title: "Control request submitted",
      detail: `${firstName} asked to change direct messaging to allow approved contacts.`,
      timeAgo: "5h ago",
      dayLabel: "Today",
    }),
    activityForChild(primaryChild, {
      id: "activity-3",
      type: "control",
      title: "Protection settings reviewed",
      detail: "Recommended safety defaults confirmed for discoverability and direct messaging.",
      timeAgo: "Yesterday",
      dayLabel: "Yesterday",
    }),
    activityForChild(primaryChild, {
      id: "activity-4",
      type: "request",
      title: "Control request declined",
      detail: "Location sharing request was reviewed and kept off for this account.",
      timeAgo: "Yesterday",
      dayLabel: "Yesterday",
    }),
    activityForChild(primaryChild, {
      id: "activity-5",
      type: "account",
      title: "Account linked",
      detail: `${childName} was approved and linked to your guardian profile.`,
      timeAgo: "3 days ago",
      dayLabel: "Earlier this week",
    }),
    activityForChild(primaryChild, {
      id: "activity-6",
      type: "control",
      title: "Discoverability set to private",
      detail: "Account visibility was updated to private as part of recommended defaults.",
      timeAgo: "4 days ago",
      dayLabel: "Earlier this week",
    }),
    activityForChild(primaryChild, {
      id: "activity-7",
      type: "safety",
      title: "Safety alert acknowledged",
      detail: "You reviewed a prior wellbeing alert and marked it as acknowledged.",
      timeAgo: "5 days ago",
      dayLabel: "Earlier this week",
    }),
    activityForChild(primaryChild, {
      id: "activity-8",
      type: "control",
      title: "Direct messaging restricted",
      detail: "DMs limited to approved contacts under strict protection settings.",
      timeAgo: "1 week ago",
      dayLabel: "Last week",
    }),
    activityForChild(primaryChild, {
      id: "activity-9",
      type: "request",
      title: "Control request approved",
      detail: "Screen time extension request was approved for one hour on Saturday.",
      timeAgo: "1 week ago",
      dayLabel: "Last week",
    }),
    {
      id: "activity-10",
      childId: null,
      type: "account",
      childName: "Family Circle",
      title: "Guardian email verified",
      detail: "Your guardian contact email was confirmed for safety notifications.",
      timeAgo: "2 weeks ago",
      dayLabel: "Last month",
    },
    activityForChild(primaryChild, {
      id: "activity-11",
      type: "safety",
      title: "Routine safety scan completed",
      detail: "No new high-priority safety events were detected for this account.",
      timeAgo: "2 weeks ago",
      dayLabel: "Last month",
    }),
    activityForChild(primaryChild, {
      id: "activity-12",
      type: "control",
      title: "Safety alerts enabled",
      detail: "Guardian safety alerts were turned on for this linked account.",
      timeAgo: "3 weeks ago",
      dayLabel: "Last month",
    }),
  ];

  if (secondaryChild) {
    base.splice(5, 0, activityForChild(secondaryChild, {
      id: "activity-5b",
      type: "account",
      title: "Account linked",
      detail: `${secondaryChild.fullName} was approved and linked to your guardian profile.`,
      timeAgo: "2 days ago",
      dayLabel: "Earlier this week",
    }));
    base.splice(1, 0, activityForChild(secondaryChild, {
      id: "activity-2b",
      type: "safety",
      title: "Safety alert raised",
      detail: "Wellbeing safety concern detected. Content was not shared and is under review.",
      timeAgo: "3h ago",
      dayLabel: "Today",
    }));
    base.splice(4, 0, activityForChild(secondaryChild, {
      id: "activity-4b",
      type: "control",
      title: "Strict protection applied",
      detail: "Direct messaging was turned off and discoverability set to private.",
      timeAgo: "Yesterday",
      dayLabel: "Yesterday",
    }));
  }

  return base;
}

export function hasUnreadFamilyActivity(children: FamilyCenterChild[]) {
  return children.length > 0;
}
