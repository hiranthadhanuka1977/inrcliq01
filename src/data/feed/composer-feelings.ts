export type ComposerFeeling = {
  kind: "feeling" | "activity";
  emoji: string;
  label: string;
};

export const COMPOSER_FEELINGS: ComposerFeeling[] = [
  { kind: "feeling", emoji: "😊", label: "happy" },
  { kind: "feeling", emoji: "😍", label: "loved" },
  { kind: "feeling", emoji: "🤩", label: "blessed" },
  { kind: "feeling", emoji: "😂", label: "amused" },
  { kind: "feeling", emoji: "🥳", label: "excited" },
  { kind: "feeling", emoji: "😌", label: "thankful" },
  { kind: "feeling", emoji: "😢", label: "sad" },
  { kind: "feeling", emoji: "😤", label: "frustrated" },
  { kind: "feeling", emoji: "😴", label: "tired" },
  { kind: "feeling", emoji: "😎", label: "cool" },
  { kind: "feeling", emoji: "🤔", label: "thoughtful" },
  { kind: "feeling", emoji: "😇", label: "grateful" },
];

export const COMPOSER_ACTIVITIES: ComposerFeeling[] = [
  { kind: "activity", emoji: "🎉", label: "celebrating" },
  { kind: "activity", emoji: "🎧", label: "listening to music" },
  { kind: "activity", emoji: "📺", label: "watching" },
  { kind: "activity", emoji: "🍴", label: "eating" },
  { kind: "activity", emoji: "✈️", label: "traveling" },
  { kind: "activity", emoji: "📚", label: "reading" },
  { kind: "activity", emoji: "🏋️", label: "working out" },
  { kind: "activity", emoji: "☕", label: "drinking coffee" },
];
