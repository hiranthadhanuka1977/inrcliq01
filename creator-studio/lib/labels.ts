export const FAMILIES = [
  { id: "SHORT", label: "Short", detail: "A video or audio piece that stands completely on its own." },
  { id: "VIDEO", label: "Video", detail: "A film, a series with episodes, a talk, a lesson, a performance, or a music video." },
  { id: "PODCAST", label: "Podcast", detail: "A single show, or a show with episodes." },
  { id: "AUDIOBOOK", label: "Audiobook", detail: "A single book, or a book series." },
  { id: "MUSIC", label: "Music", detail: "A single, an EP, or an album with tracks." },
  { id: "SOUND", label: "Sound", detail: "Meditation, sleep, ASMR, or a soundscape." },
  { id: "PROMO", label: "Promo", detail: "A trailer, clip, sample, or highlight linked to a parent piece." },
] as const;

export type FamilyId = (typeof FAMILIES)[number]["id"];

export const SHAPES = [
  { id: "SHORT_VIDEO", family: "SHORT", label: "Video short", detail: "A video piece on its own.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "short", fileLabel: "Short video" },
  { id: "SHORT_AUDIO", family: "SHORT", label: "Audio short", detail: "An audio piece on its own.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "short", fileLabel: "Short audio" },
  { id: "FILM", family: "VIDEO", label: "Film", detail: "One film.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "film", fileLabel: "Film" },
  { id: "SERIES_EPISODE", family: "VIDEO", label: "Series with episodes", detail: "Create the series, then add each episode.", media: "VIDEO", showKind: "SERIES", shelfNoun: "series", pieceNoun: "episode", fileLabel: "Episode" },
  { id: "TALK", family: "VIDEO", label: "Talk", detail: "An interview, conversation, or talk.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "talk", fileLabel: "Talk" },
  { id: "LESSON", family: "VIDEO", label: "Lesson", detail: "A lesson or tutorial.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "lesson", fileLabel: "Lesson" },
  { id: "PERFORMANCE", family: "VIDEO", label: "Performance", detail: "A concert, stand-up set, dance, or recorded performance.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "performance", fileLabel: "Performance" },
  { id: "MUSIC_VIDEO", family: "VIDEO", label: "Music video", detail: "A video made for a song.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "music video", fileLabel: "Music video" },
  { id: "PODCAST_SINGLE", family: "PODCAST", label: "Single show", detail: "One show, published as a single piece.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "show", fileLabel: "Show audio" },
  { id: "PODCAST_EPISODE", family: "PODCAST", label: "Show with episodes", detail: "Create the show, then add each episode.", media: "AUDIO", showKind: "PODCAST", shelfNoun: "show", pieceNoun: "episode", fileLabel: "Episode" },
  { id: "BOOK", family: "AUDIOBOOK", label: "Single book", detail: "One complete book.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "book", fileLabel: "Book" },
  { id: "BOOK_IN_SERIES", family: "AUDIOBOOK", label: "Book series", detail: "Create the series, then add each book.", media: "AUDIO", showKind: "BOOK_SERIES", shelfNoun: "series", pieceNoun: "book", fileLabel: "Book" },
  { id: "SINGLE", family: "MUSIC", label: "Single", detail: "One track.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "single", fileLabel: "Track" },
  { id: "EP_TRACK", family: "MUSIC", label: "EP", detail: "Create the EP, then add each track.", media: "AUDIO", showKind: "EP", shelfNoun: "EP", pieceNoun: "track", fileLabel: "Track" },
  { id: "ALBUM_TRACK", family: "MUSIC", label: "Album", detail: "Create the album, then add each track.", media: "AUDIO", showKind: "ALBUM", shelfNoun: "album", pieceNoun: "track", fileLabel: "Track" },
  { id: "MEDITATION", family: "SOUND", label: "Meditation", detail: "A guided meditation.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "meditation", fileLabel: "Meditation" },
  { id: "SLEEP", family: "SOUND", label: "Sleep", detail: "A piece made for sleep.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "sleep piece", fileLabel: "Sleep audio" },
  { id: "ASMR", family: "SOUND", label: "ASMR", detail: "An ASMR piece.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "ASMR piece", fileLabel: "ASMR" },
  { id: "SOUNDSCAPE", family: "SOUND", label: "Soundscape", detail: "A soundscape or ambient piece.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "soundscape", fileLabel: "Soundscape" },
  { id: "TRAILER", family: "PROMO", label: "Trailer", detail: "A trailer for a piece you already created.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "trailer", fileLabel: "Trailer" },
  { id: "CLIP", family: "PROMO", label: "Clip", detail: "A short clip from a piece you already created.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "clip", fileLabel: "Clip" },
  { id: "SAMPLE", family: "PROMO", label: "Sample", detail: "A sample of a piece you already created.", media: "AUDIO", showKind: null, shelfNoun: "", pieceNoun: "sample", fileLabel: "Sample" },
  { id: "HIGHLIGHT", family: "PROMO", label: "Highlight", detail: "A highlight from a piece you already created.", media: "VIDEO", showKind: null, shelfNoun: "", pieceNoun: "highlight", fileLabel: "Highlight" },
] as const;

export type ShapeSpec = (typeof SHAPES)[number];
export type ShapeId = ShapeSpec["id"];
export type ShowKindId = "PODCAST" | "AUDIOBOOK" | "SERIES" | "EP" | "ALBUM" | "BOOK_SERIES";

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "si", label: "Sinhala" },
  { id: "ta", label: "Tamil" },
  { id: "hi", label: "Hindi" },
];

export const CATEGORIES = ["entertainment", "education", "music", "comedy", "talk", "stories", "sports", "lifestyle"];

export const AGE_RATINGS = [
  { id: "ALL", label: "All ages" },
  { id: "TEENS", label: "Teens" },
  { id: "MATURE", label: "Mature teens" },
  { id: "ADULT", label: "Adults" },
];

export const AUDIENCES = [
  { id: "PUBLIC", label: "Public" },
  { id: "FOLLOWERS", label: "Followers" },
  { id: "MEMBERS", label: "Members" },
  { id: "UNLISTED", label: "Unlisted" },
];

export const SHOW_KINDS = [
  { id: "PODCAST", label: "Podcast" },
  { id: "SERIES", label: "Video series" },
  { id: "BOOK_SERIES", label: "Book series" },
  { id: "EP", label: "EP" },
  { id: "ALBUM", label: "Album" },
  { id: "AUDIOBOOK", label: "Audiobook" },
];

export function familyById(id: string) {
  return FAMILIES.find((family) => family.id === id);
}

export function shapeById(id: string) {
  return SHAPES.find((shape) => shape.id === id);
}

export function shapesFor(family: string) {
  return SHAPES.filter((shape) => shape.family === family);
}

export function shapeLabel(id: string) {
  return shapeById(id)?.label ?? id;
}

export function showKindLabel(kind: string) {
  return SHOW_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

export function defaultCategory(shape: ShapeSpec) {
  if (shape.family === "MUSIC" || shape.id === "MUSIC_VIDEO") return "music";
  if (shape.id === "LESSON") return "education";
  if (shape.family === "PODCAST" || shape.id === "TALK") return "talk";
  if (shape.family === "AUDIOBOOK") return "stories";
  if (shape.family === "SOUND") return "lifestyle";
  return "entertainment";
}

export function mediaForShape(shape: ShapeSpec, parentKind: "VIDEO" | "AUDIO" | null) {
  if (shape.family === "PROMO" && parentKind) return parentKind;
  return shape.media;
}

export function creationSteps(shape: ShapeSpec) {
  const steps: string[] = [];
  if (shape.showKind) steps.push(`Name the ${shape.shelfNoun}`);
  if (shape.family === "PROMO") steps.push("Choose the parent piece");
  steps.push(`Name this ${shape.pieceNoun}`);
  steps.push(`Upload the ${shape.fileLabel.toLowerCase()}`);
  steps.push(shape.media === "AUDIO" ? "Add cover art if you want one" : "Add a thumbnail");
  steps.push("Choose who can play it, confirm your rights, and publish");
  return steps;
}

export function addPieceHref(kind: string, showId: string) {
  const shape = SHAPES.find((item) => item.showKind === kind);
  if (!shape) return null;
  return `/projects/new?family=${shape.family}&shape=${shape.id}&show=${showId}`;
}
