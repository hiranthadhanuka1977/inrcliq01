import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const feedPath = join(__dirname, "..", "my_feed.json");
const livefeedPath = join(__dirname, "..", "..", "livefeed", "data", "my_feed.json");

const personalImages = [
  ["https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80&auto=format&fit=crop", "Vintage film camera and reels on a table"],
  ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&auto=format&fit=crop", "Friends laughing together outdoors"],
  ["https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80&auto=format&fit=crop", "Open journal and pen on a cozy desk"],
  ["https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80&auto=format&fit=crop", "Family gathered around a dinner table"],
  ["https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80&auto=format&fit=crop", "Morning coffee by a sunlit window"],
  ["https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80&auto=format&fit=crop", "Quiet forest trail at sunrise"],
  ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80&auto=format&fit=crop", "Laptop and handwritten notes on a desk"],
  ["https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80&auto=format&fit=crop", "City skyline at golden hour"],
  ["https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80&auto=format&fit=crop", "Evening walk along the shoreline"],
  ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80&auto=format&fit=crop", "Person watching a calm sunset"],
];

const textImageMap = [
  { match: /short film/i, index: 0 },
  { match: /friends who tell/i, index: 1 },
  { match: /journaling/i, index: 2 },
  { match: /parents/i, index: 3 },
  { match: /highlight reel/i, index: 9 },
  { match: /building quietly/i, index: 5 },
  { match: /Deleted the draft/i, index: 6 },
];

function pickImageForText(text, fallbackIndex) {
  for (const entry of textImageMap) {
    if (entry.match.test(text)) {
      return personalImages[entry.index];
    }
  }
  return personalImages[fallbackIndex % personalImages.length];
}

function buildPersonalMedia(text, itemIndex, idNum) {
  if (idNum % 19 === 0) {
    const a = pickImageForText(text, itemIndex);
    const b = personalImages[(itemIndex + 2) % personalImages.length];
    return {
      type: "collage",
      images: [
        { url: a[0], alt: a[1] },
        { url: b[0], alt: b[1] },
      ],
    };
  }

  const img = pickImageForText(text, itemIndex);
  return {
    type: "image",
    images: [{ url: img[0], alt: img[1] }],
  };
}

const feed = JSON.parse(readFileSync(feedPath, "utf-8"));
let updated = 0;

feed.items = feed.items.map((item, index) => {
  if (item.category !== "personal" || item.media !== null) return item;

  const idNum = Number.parseInt(item.id.replace("feed-", ""), 10);
  updated += 1;
  return {
    ...item,
    media: buildPersonalMedia(item.text, index, idNum),
  };
});

feed.generated_at = new Date().toISOString();
const json = `${JSON.stringify(feed, null, 2)}\n`;
writeFileSync(feedPath, json, "utf-8");
writeFileSync(livefeedPath, json, "utf-8");

console.log(`Updated ${updated} personal items with media.`);
