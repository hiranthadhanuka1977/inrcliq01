import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const feedPath = join(__dirname, "..", "my_feed.json");
const livefeedPath = join(__dirname, "..", "..", "livefeed", "data", "my_feed.json");

const categories = [
  "sports",
  "technology",
  "personal",
  "food",
  "hotels",
  "animals",
  "discovery",
  "cars",
  "travel",
  "science",
  "movies",
];

const avatarColors = [
  "#2563eb", "#7c3aed", "#0d9488", "#dc2626", "#b45309", "#059669",
  "#0369a1", "#1e293b", "#c026d3", "#be185d", "#a21caf", "#4f46e5",
  "#ef4444", "#f97316", "#166534", "#4338ca",
];

const verifiedImages = {
  sports: [
    ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&auto=format&fit=crop", "Runner at sunrise"],
    ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop", "Athletes training in a gym"],
    ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80&auto=format&fit=crop", "Football on a green pitch"],
    ["https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&q=80&auto=format&fit=crop", "Cyclists on a road"],
    ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format&fit=crop", "Gym workout session"],
  ],
  technology: [
    ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop", "Circuit board close-up"],
    ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80&auto=format&fit=crop", "Developer at a laptop"],
    ["https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80&auto=format&fit=crop", "Cybersecurity concept"],
    ["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80&auto=format&fit=crop", "Matrix-style code screen"],
    ["https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=80&auto=format&fit=crop", "Code on a laptop screen"],
  ],
  food: [
    ["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80&auto=format&fit=crop", "Steaming pot of biryani"],
    ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop", "Fresh spices on a board"],
    ["https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80&auto=format&fit=crop", "Indian curry in a bowl"],
    ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop", "Gourmet plated dish"],
    ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80&auto=format&fit=crop", "Healthy breakfast bowl"],
  ],
  hotels: [
    ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80&auto=format&fit=crop", "Luxury hotel pool at dusk"],
    ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80&auto=format&fit=crop", "Resort swimming pool"],
    ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&auto=format&fit=crop", "Beachfront resort"],
    ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80&auto=format&fit=crop", "Boutique hotel lobby"],
    ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80&auto=format&fit=crop", "Hotel suite interior"],
  ],
  animals: [
    ["https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800&q=80&auto=format&fit=crop", "Bengal tiger in the wild"],
    ["https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80&auto=format&fit=crop", "Playful dogs outdoors"],
    ["https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80&auto=format&fit=crop", "Turtle swimming underwater"],
    ["https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=800&q=80&auto=format&fit=crop", "Colorful parrot close-up"],
    ["https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop", "Cat resting by a window"],
  ],
  discovery: [
    ["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80&auto=format&fit=crop", "Underwater marine scene"],
    ["https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&q=80&auto=format&fit=crop", "Ocean waves at golden hour"],
    ["https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80&auto=format&fit=crop", "Foggy mountain valley"],
    ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop", "Snow-capped mountain range"],
    ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop", "Sunlight through a forest"],
  ],
  cars: [
    ["https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80&auto=format&fit=crop", "Electric sedan on a coastal road"],
    ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80&auto=format&fit=crop", "Sports car detail"],
    ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80&auto=format&fit=crop", "Classic car on a city street"],
    ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80&auto=format&fit=crop", "SUV on a desert highway"],
    ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80&auto=format&fit=crop", "Car on a mountain road"],
  ],
  travel: [
    ["https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80&auto=format&fit=crop", "European city streetscape"],
    ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80&auto=format&fit=crop", "Tokyo city skyline at night"],
    ["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80&auto=format&fit=crop", "Paris city view"],
    ["https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80&auto=format&fit=crop", "London urban scene"],
    ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80&auto=format&fit=crop", "Decorative tile wall"],
  ],
  science: [
    ["https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80&auto=format&fit=crop", "Earth from space"],
    ["https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80&auto=format&fit=crop", "Laboratory microscope"],
    ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80&auto=format&fit=crop", "Physics equations on a board"],
    ["https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80&auto=format&fit=crop", "Scientist working in a lab"],
    ["https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80&auto=format&fit=crop", "Nebula in deep space"],
  ],
  movies: [
    ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&auto=format&fit=crop", "Cinema auditorium with red seats"],
    ["https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80&auto=format&fit=crop", "Film projector beam"],
    ["https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80&auto=format&fit=crop", "Movie clapperboard on set"],
    ["https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80&auto=format&fit=crop", "Cinema audience silhouettes"],
    ["https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80&auto=format&fit=crop", "Popcorn in a cinema cup"],
  ],
  personal: [
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
  ],
};

const firstNames = [
  "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Meera", "Arjun", "Kavya",
  "Noah", "Emma", "Liam", "Sofia", "Ethan", "Maya", "Lucas", "Zara",
  "Kenji", "Yuki", "Hassan", "Fatima", "Omar", "Leila", "Chen", "Mei",
];

const lastNames = [
  "Sharma", "Patel", "Iyer", "Kapoor", "Nair", "Reddy", "Singh", "Das",
  "Brooks", "Turner", "Reed", "Hayes", "Cole", "West", "Lane", "Fox",
  "Nakamura", "Ali", "Khan", "Wu", "Fernandez", "Costa", "Martin", "Dubois",
];

const brandNames = {
  sports: ["FitTrack", "Endurance Daily", "Playbook", "Arena Pulse", "Stride Co"],
  technology: ["Dev Weekly", "Chip Notes", "Cloud Native", "Byte Review", "Stack Log"],
  food: ["Spice Route", "Table Tales", "Slow Simmer", "Street Bites", "Farm to Fork"],
  hotels: ["Stay Curated", "Suite Life", "Check-In", "Roamer Rest", "Pillow Talk"],
  animals: ["Wildlife Lens", "Creature Watch", "Paw & Claw", "Habitat", "Safari Log"],
  discovery: ["Planet Unfolded", "Horizon", "Deep Field", "Curiosity", "Expedition"],
  cars: ["Torque India", "Motor Desk", "Drive Mode", "EV Chronicle", "Garage 24"],
  travel: ["Nomad Notes", "Waypoint", "Open Road", "Passport Pages", "Roam Free"],
  science: ["Lab Ledger", "Cosmos Brief", "Hypothesis", "Quantum Post", "Data Drift"],
  movies: ["Celluloid Club", "Frame Rate", "Reel Talk", "Silver Screen", "Indie Lens"],
  personal: null,
};

const texts = {
  sports: [
    "PB day. Nothing fancy — just showed up and did the work.",
    "Final whistle and my legs are done. Worth every minute on that pitch.",
    "Early swim set before the city wakes up. 2 km in 38 minutes.",
    "Recovery ride after yesterday's race. Slow miles still count.",
    "Match day energy is unmatched. Crowd was incredible tonight.",
  ],
  technology: [
    "Shipped a feature in production that was just a whiteboard sketch last month.",
    "The best debugging tool is still explaining the bug out loud to someone patient.",
    "Ran benchmarks on three LLM APIs. Latency spread was wider than I expected.",
    "Refactored 400 lines into 90. Same behavior, half the cognitive load.",
    "Your CI pipeline is part of your product. Treat it like one.",
  ],
  personal: [
    "Deleted the draft three times. Posted it anyway.",
    "Grateful for friends who tell you the truth gently.",
    "Some seasons are for building quietly. I'm in one of those.",
    "Called my parents just to hear their voices. Do that more often.",
    "Started journaling again. Ten minutes a day changes the whole week.",
    "Not every day needs a highlight reel. Today was enough.",
  ],
  food: [
    "Weeknight dal with too much garlic. No regrets.",
    "Tried a new sourdough schedule — crust finally cracked the way I wanted.",
    "Street food tour after midnight hits different in monsoon season.",
    "Meal prepped for the week in 90 minutes. Future me says thanks.",
    "First time making mom's recipe without calling her. Close enough.",
  ],
  hotels: [
    "Woke up to mist over the lake and silence except birds.",
    "The kind of lobby that makes you walk slower on purpose.",
    "Infinity pool at golden hour — camera roll is full.",
    "Checked in for one night, extended to three. That kind of place.",
    "Room service at 11 pm after a long travel day. Peak comfort.",
  ],
  animals: [
    "Spent an hour watching otters do absolutely nothing. Best documentary ever.",
    "Rescue shelter volunteer day — every dog had a story.",
    "First time seeing a snow leopard on camera trap footage from our team.",
    "The macaws at dawn sound like the forest is applauding.",
    "Adopted a senior cat. He sleeps on my keyboard within an hour.",
  ],
  discovery: [
    "New episode explores hydrothermal vents 2,400 m below the Pacific.",
    "Filmed bioluminescence for the first time. The crew went silent.",
    "Cave systems this large shouldn't feel peaceful. They do.",
    "Migration patterns shifted earlier this year. Climate data tells the story.",
    "Behind the scenes: six takes to capture the avalanche timelapse.",
  ],
  cars: [
    "0–100 in 4.1 s and a cabin quieter than my apartment.",
    "Drove the coastal highway with the windows down. Range anxiety: zero.",
    "Track day taught me how much I still don't know about braking.",
    "Restored a '98 hatchback over two winters. It starts first try now.",
    "EV charging infrastructure in tier-2 cities improved more than headlines suggest.",
  ],
  travel: [
    "Got lost on purpose in the old quarter. Best decision of the trip.",
    "Sunrise at the temple before the tour buses arrived.",
    "Train window views through the highlands — no filter needed.",
    "Street market breakfast for under ₹100 and better than any hotel buffet.",
    "Already planning a return trip before this one ends.",
  ],
  science: [
    "New spectrum data from 120 light-years away. Water vapour detected.",
    "Lab results finally replicated. Third time's the charm.",
    "Public lecture on CRISPR was packed. Good questions from teenagers.",
    "Climate model update: regional predictions got sharper this quarter.",
    "Published a paper I've been sitting on for two years. Relief.",
  ],
  movies: [
    "No spoilers — just go see it on the biggest screen you can find.",
    "Director commentary changed how I watch the third act entirely.",
    "Indie premiere last night. Budget was tiny, heart was enormous.",
    "Rewatched a 2003 classic. Still holds up frame for frame.",
    "Cinematography so good I forgot to read the subtitles.",
  ],
};

const tagPools = {
  sports: ["#Fitness", "#Training", "#MatchDay", "#Running", "#Cycling"],
  technology: ["#AI", "#DevLife", "#OpenSource", "#Cloud", "#Startup"],
  personal: ["#Life", "#Growth", "#Gratitude", "#Mindset"],
  food: ["#Foodie", "#HomeCooking", "#Recipe", "#StreetFood"],
  hotels: ["#Travel", "#LuxuryStay", "#Weekend", "#Resort"],
  animals: ["#Wildlife", "#Nature", "#Pets", "#Conservation"],
  discovery: ["#Documentary", "#Nature", "#Science", "#Explore"],
  cars: ["#Cars", "#EV", "#Drive", "#Automotive"],
  travel: ["#Travel", "#Wanderlust", "#Adventure", "#Explore"],
  science: ["#Science", "#Space", "#Research", "#STEM"],
  movies: ["#Film", "#Cinema", "#IndieFilm", "#NoSpoilers"],
};

function pick(arr, index) {
  return arr[index % arr.length];
}

function randInt(min, max, seed) {
  return min + (seed * 7919 + 104729) % (max - min + 1);
}

function makeHandle(name, index) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `@${base}${index % 97 === 0 ? "" : index % 50}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function postedAgo(hoursAgo) {
  if (hoursAgo < 1) return `${Math.max(1, Math.round(hoursAgo * 60))}m`;
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h`;
  const days = Math.round(hoursAgo / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return `${Math.round(days / 30)}mo`;
}

function isoDate(hoursAgo) {
  const d = new Date("2026-07-05T12:00:00Z");
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

function buildMedia(category, index) {
  const pool = verifiedImages[category];
  const img = pick(pool, index);
  const collage = index % 11 === 0 && (category === "food" || category === "personal");
  const travelCollage = index % 13 === 0 && category === "travel";
  const personalCollage = index % 19 === 0 && category === "personal";

  if (collage && category === "food") {
    const a = pick(pool, index);
    const b = pick(pool, index + 1);
    const c = pick(pool, index + 2);
    return {
      type: "collage",
      images: [
        { url: a[0], alt: a[1] },
        { url: b[0], alt: b[1] },
        { url: c[0], alt: c[1] },
      ],
    };
  }

  if (personalCollage) {
    const a = pick(pool, index);
    const b = pick(pool, index + 2);
    return {
      type: "collage",
      images: [
        { url: a[0], alt: a[1] },
        { url: b[0], alt: b[1] },
      ],
    };
  }

  if (travelCollage) {
    const a = pick(pool, index);
    const b = pick(pool, index + 2);
    return {
      type: "collage",
      images: [
        { url: a[0], alt: a[1] },
        { url: b[0], alt: b[1] },
      ],
    };
  }

  return {
    type: "image",
    images: [{ url: img[0], alt: img[1] }],
  };
}

function buildAuthor(category, index) {
  const brands = brandNames[category];
  let name;
  if (category === "personal" || (brands && index % 3 !== 0)) {
    name = `${pick(firstNames, index)} ${pick(lastNames, index + 7)}`;
  } else {
    name = `${pick(brands, index)} ${pick(["Daily", "HQ", "Studio", "Live", "Co"], index)}`;
  }

  const verified = category !== "personal" && index % 7 === 0;
  const avatarUrl = index % 5 === 0
    ? `https://images.unsplash.com/photo-${pick([
        "1507003211169-0a1dd7228f2d",
        "1438761681033-6461ffad8d80",
        "1500648767791-00dcc994a43e",
        "1517694712202-14dd9538aa97",
        "1494790108377-be9c29b29330",
      ], index)}?w=120&q=80&auto=format&fit=crop`
    : null;

  return {
    name,
    handle: makeHandle(name, index),
    avatar_initials: initials(name),
    avatar_color: pick(avatarColors, index),
    avatar_url: avatarUrl,
    verified,
  };
}

function generateItem(idNum, index) {
  const category = pick(categories, index);
  const hoursAgo = randInt(1, 720, index);
  const tagCount = category === "personal" && index % 3 === 0 ? 0 : randInt(1, 3, index + 3);
  const tags = Array.from({ length: tagCount }, (_, i) => pick(tagPools[category], index + i));

  return {
    id: `feed-${String(idNum).padStart(3, "0")}`,
    category,
    author: buildAuthor(category, index),
    text: pick(texts[category], index),
    tags,
    media: buildMedia(category, index),
    engagement: {
      likes: randInt(120, 98500, index + 11),
      comments: randInt(5, 4200, index + 17),
      shares: randInt(2, 2100, index + 23),
    },
    relationship: {
      following: index % 3 === 0,
    },
    posted_at: isoDate(hoursAgo),
    posted_ago: postedAgo(hoursAgo),
  };
}

const feed = JSON.parse(readFileSync(feedPath, "utf-8"));
const startId = feed.items.length + 1;
const newItems = Array.from({ length: 300 }, (_, i) => generateItem(startId + i, startId + i));

feed.items.push(...newItems);
feed.total_items = feed.items.length;
feed.description = `INRCLIQ feed dataset — ${feed.total_items} items`;
feed.generated_at = new Date().toISOString();

const json = JSON.stringify(feed, null, 2) + "\n";
writeFileSync(feedPath, json, "utf-8");
writeFileSync(livefeedPath, json, "utf-8");

console.log(`Added ${newItems.length} items. Total: ${feed.total_items}`);
