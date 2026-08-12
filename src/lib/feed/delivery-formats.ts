import type {
  RequestDeliveryFormatConfig,
  RequestDeliveryFormatKind,
  RequestFormatLengthOption,
  RequestService,
  RequestServiceDeliveryFormats,
} from "@/lib/feed/special-requests";

export const DEFAULT_TEXT_LENGTH_OPTIONS: RequestFormatLengthOption[] = [
  { id: "text-short", label: "Short note", priceAddon: 0 },
  { id: "text-medium", label: "Medium message", priceAddon: 5 },
  { id: "text-long", label: "Long message", priceAddon: 10 },
];

export const DEFAULT_MEDIA_LENGTH_OPTIONS: RequestFormatLengthOption[] = [
  { id: "dur-15", label: "15 seconds", priceAddon: 0 },
  { id: "dur-30", label: "30 seconds", priceAddon: 10 },
  { id: "dur-60", label: "60 seconds", priceAddon: 20 },
  { id: "dur-90", label: "90 seconds", priceAddon: 30 },
  { id: "dur-120", label: "2 minutes", priceAddon: 40 },
];

export const DEFAULT_TONE_OPTIONS = ["Heartfelt", "Funny", "Motivational", "Casual"] as const;
export const DEFAULT_FRAMING_OPTIONS = [
  "Talking head",
  "On the move / outdoor",
  "Lifestyle setting",
] as const;
export const DEFAULT_CAPTION_OPTIONS = [
  "No captions",
  "Burned-in captions",
  "Captions optional",
] as const;

function cloneLengthOptions(options: RequestFormatLengthOption[]): RequestFormatLengthOption[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    priceAddon: Math.max(0, Number(option.priceAddon) || 0),
  }));
}

export function defaultDeliveryFormatConfig(
  kind: RequestDeliveryFormatKind,
  enabled = true,
): RequestDeliveryFormatConfig {
  return {
    enabled,
    lengthEnabled: true,
    toneEnabled: true,
    framingEnabled: kind === "video",
    captionsEnabled: kind === "video",
    lengthOptions: cloneLengthOptions(
      kind === "text" ? DEFAULT_TEXT_LENGTH_OPTIONS : DEFAULT_MEDIA_LENGTH_OPTIONS,
    ),
  };
}

export function createDefaultDeliveryFormats(
  enabledKinds: RequestDeliveryFormatKind[] = ["text", "audio", "video"],
): RequestServiceDeliveryFormats {
  const enabled = new Set(enabledKinds);
  return {
    text: defaultDeliveryFormatConfig("text", enabled.has("text")),
    audio: defaultDeliveryFormatConfig("audio", enabled.has("audio")),
    video: defaultDeliveryFormatConfig("video", enabled.has("video")),
  };
}

function normalizeLengthOptions(
  kind: RequestDeliveryFormatKind,
  options: RequestFormatLengthOption[] | undefined,
): RequestFormatLengthOption[] {
  if (!options?.length) {
    return cloneLengthOptions(
      kind === "text" ? DEFAULT_TEXT_LENGTH_OPTIONS : DEFAULT_MEDIA_LENGTH_OPTIONS,
    );
  }
  return options
    .map((option, index) => ({
      id: option.id?.trim() || `${kind}-len-${index + 1}`,
      label: option.label?.trim() || `Option ${index + 1}`,
      priceAddon: Math.max(0, Number(option.priceAddon) || 0),
    }))
    .filter((option) => Boolean(option.label));
}

function normalizeFormatConfig(
  kind: RequestDeliveryFormatKind,
  value: Partial<RequestDeliveryFormatConfig> | undefined,
  fallbackEnabled: boolean,
): RequestDeliveryFormatConfig {
  const base = defaultDeliveryFormatConfig(kind, fallbackEnabled);
  if (!value) return base;
  return {
    enabled: value.enabled ?? base.enabled,
    lengthEnabled: value.lengthEnabled ?? base.lengthEnabled,
    toneEnabled: value.toneEnabled ?? base.toneEnabled,
    framingEnabled: value.framingEnabled ?? base.framingEnabled,
    captionsEnabled: value.captionsEnabled ?? base.captionsEnabled,
    lengthOptions: normalizeLengthOptions(kind, value.lengthOptions),
  };
}

/** Legacy offerings without deliveryFormats keep all formats available. */
export function resolveServiceDeliveryFormats(
  service: RequestService | null | undefined,
): RequestServiceDeliveryFormats {
  const raw = service?.deliveryFormats;
  if (!raw) return createDefaultDeliveryFormats();
  return {
    text: normalizeFormatConfig("text", raw.text, false),
    audio: normalizeFormatConfig("audio", raw.audio, false),
    video: normalizeFormatConfig("video", raw.video, false),
  };
}

export function enabledDeliveryFormatKinds(
  formats: RequestServiceDeliveryFormats,
): RequestDeliveryFormatKind[] {
  return (["text", "audio", "video"] as const).filter((kind) => formats[kind].enabled);
}

export function lengthAddonForLabel(
  config: RequestDeliveryFormatConfig,
  label: string,
): number {
  if (!config.enabled || !config.lengthEnabled || !label.trim()) return 0;
  const match = config.lengthOptions.find(
    (option) => option.label.toLowerCase() === label.trim().toLowerCase(),
  );
  return match ? Math.max(0, Number(match.priceAddon) || 0) : 0;
}

export function formatLengthOptionLabel(option: RequestFormatLengthOption): string {
  const addon = Math.max(0, Number(option.priceAddon) || 0);
  if (addon <= 0) return option.label;
  return `${option.label} (+$${addon})`;
}

export function newLengthOption(
  kind: RequestDeliveryFormatKind,
  index: number,
): RequestFormatLengthOption {
  return {
    id: `${kind}-custom-${Date.now()}-${index}`,
    label: kind === "text" ? "Custom length" : "Custom duration",
    priceAddon: 0,
  };
}
