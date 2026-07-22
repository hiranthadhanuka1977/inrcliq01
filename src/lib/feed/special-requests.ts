export type RequestServiceDetails = {
  about: string;
  onOffer: string[];
  booking: string[];
  licensing: string[];
  termsHref?: string;
};

export type RequestServiceMedia =
  | {
      kind: "video";
      poster: string;
      caption: string;
    }
  | {
      kind: "audio";
      src: string;
      title: string;
      duration: string;
    };

export type RequestService = {
  id: string;
  label: string;
  blurb: string;
  details: RequestServiceDetails;
  media: RequestServiceMedia;
  priceMin: number;
  priceMax: number;
  popular?: boolean;
};

export type RequestCategory = {
  id: string;
  title: string;
  intent: string;
  blurb: string;
  icon: "gift" | "coach" | "stage";
  image: string;
  imageAlt: string;
  popular?: boolean;
  examples: string[];
  formats: string[];
  services: RequestService[];
};

export type RequestGalleryItem = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  categoryId: string;
  serviceId?: string;
  teaser?: string;
  quote?: string;
  quoteBy?: string;
  quoteRating?: number;
  hasPlay?: boolean;
};

export type CreatorRequestsContent = {
  intro: string[];
  gallery: RequestGalleryItem[];
  categories: RequestCategory[];
  howItWorks: { title: string; copy: string }[];
  startingRange: string;
  responseTime: string;
  nextAvailable: string;
  guarantee: string;
  guaranteePoints: { title: string; copy: string }[];
};

const SAMPLE_AUDIOS = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
] as const;

const MEDIA_POSTERS = [
  "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=640&h=360&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=640&h=360&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=640&h=360&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=640&h=360&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&h=360&fit=crop&q=80&auto=format",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=640&h=360&fit=crop&q=80&auto=format",
] as const;

function buildVideoMedia(index: number, caption: string): RequestServiceMedia {
  return {
    kind: "video",
    poster: MEDIA_POSTERS[index % MEDIA_POSTERS.length],
    caption,
  };
}

function buildAudioMedia(index: number, title: string, duration = "0:42"): RequestServiceMedia {
  return {
    kind: "audio",
    src: SAMPLE_AUDIOS[index % SAMPLE_AUDIOS.length],
    title,
    duration,
  };
}

const SHARED_BOOKING = [
  "Direct booking: Pay in full to confirm your request instantly.",
  "No approval needed: Your booking is auto-confirmed upon payment.",
  "Delivery: The creator will send the completed message by your selected date.",
] as const;

const SHARED_LICENSING = [
  "You can download & share your delivery for personal use.",
  "You cannot alter, remix or use it in defamatory/illegal ways.",
  "The Creator retains rights of integrity and attribution.",
] as const;

function buildServiceDetails(
  about: string,
  onOffer: string[],
  options?: {
    booking?: string[];
    licensing?: string[];
  },
): RequestServiceDetails {
  return {
    about,
    onOffer,
    booking: options?.booking ?? [...SHARED_BOOKING],
    licensing: options?.licensing ?? [...SHARED_LICENSING],
    termsHref: "#",
  };
}

const MIA_CHEN_REQUESTS: CreatorRequestsContent = {
  intro: [
    "A finish-line shout-out, birthday pep talk, coaching session, or club appearance — personalized by Mia Chen for the moments that matter.",
  ],
  gallery: [
    {
      id: "g1",
      src: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=960&h=600&fit=crop&q=80&auto=format",
      alt: "Mia running at sunrise",
      caption: "Race-day energy",
      teaser: "A pre-race pep talk they can replay at the start line.",
      quote: "Booked a race-day pep talk before Mumbai Marathon — exactly the boost I needed at the start line.",
      quoteBy: "Rohan Silva",
      quoteRating: 5,
      categoryId: "shout-outs",
      serviceId: "race-pep",
      hasPlay: true,
    },
    {
      id: "g2",
      src: "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=960&h=600&fit=crop&q=80&auto=format",
      alt: "Runner crossing finish line",
      caption: "Finish-line shout-outs",
      teaser: "Celebrate the PR, the finish, or just showing up.",
      quote: "Finish-line congratulations video was the highlight of my race weekend album.",
      quoteBy: "James Cole",
      quoteRating: 5,
      categoryId: "shout-outs",
      serviceId: "finish-congrats",
      hasPlay: true,
    },
    {
      id: "g3",
      src: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=960&h=600&fit=crop&q=80&auto=format",
      alt: "Group training session",
      caption: "Club appearances",
      teaser: "Bring Mia to your run club for a live guest moment.",
      quote: "She joined our run club as a guest and stayed to chat with everyone. Absolute pro.",
      quoteBy: "Kavish Fernando",
      quoteRating: 5,
      categoryId: "appearances",
      serviceId: "club-guest",
      hasPlay: true,
    },
    {
      id: "g4",
      src: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=960&h=600&fit=crop&q=80&auto=format",
      alt: "Trail running through hills",
      caption: "Trail stories",
      teaser: "A personal message with trail-tested heart.",
      quote: "Message for my fiancé after his first 10K was perfect — funny, warm, and on-brand Mia.",
      quoteBy: "Nina Okoye",
      quoteRating: 5,
      categoryId: "shout-outs",
      serviceId: "loved-one",
    },
    {
      id: "g5",
      src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=960&h=600&fit=crop&q=80&auto=format",
      alt: "Athlete recovering after a run",
      caption: "Recovery coaching",
      teaser: "Practical habits to bounce back after hard weeks.",
      quote: "Recovery tips after my ultra were clear and easy to follow. Worth every rupee.",
      quoteBy: "Sara Malik",
      quoteRating: 4,
      categoryId: "training",
      serviceId: "recovery",
    },
    {
      id: "g6",
      src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=960&h=600&fit=crop&q=80&auto=format",
      alt: "Runner training outdoors",
      caption: "Event hosting",
      teaser: "Stage energy for your next community event.",
      quote: "Panel appearance at our charity expo was inspiring. Crowd loved her stories.",
      quoteBy: "Priya Nair",
      quoteRating: 5,
      categoryId: "appearances",
      serviceId: "mc",
      hasPlay: true,
    },
  ],
  categories: [
    {
      id: "shout-outs",
      title: "Special occasion shout outs",
      intent: "Celebrate someone",
      blurb: "A personal message for birthdays, race days, and the people you love.",
      icon: "gift",
      image:
        "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=480&h=480&fit=crop&q=80&auto=format",
      imageAlt: "Celebration moment with confetti and lights",
      popular: true,
      examples: ["Birthday", "Race day", "Loved one"],
      formats: ["Video", "Audio", "Text"],
      services: [
        {
          id: "birthday",
          label: "Birthday greeting",
          blurb: "A warm, high-energy video they can replay all day.",
          details: buildServiceDetails(
            "Celebrate their birthday with a custom message — short, fun, and personal — to make the day unforgettable. Add names, notes, or inside jokes so it feels uniquely theirs.",
            [
              "Personalized birthday video with the recipient’s name and vibe.",
              "Choose Text, Audio, or Video delivery.",
              "Add a short message, nickname, or personal note.",
              "Option to feature the shoutout on Mia’s profile for an extra fee.",
            ],
          ),
          media: buildVideoMedia(0, "Watch a sample birthday greeting"),
          priceMin: 80,
          priceMax: 120,
          popular: true,
        },
        {
          id: "race-pep",
          label: "Race-day pep talk",
          blurb: "Motivation delivered before the gun goes off.",
          details: buildServiceDetails(
            "Get a focused pre-race pep talk tailored to the distance, course, and nerves. Mia keeps it short, personal, and easy to replay while you’re pinning your bib or lining up in the corral.",
            [
              "Custom pep talk for your race distance and goal.",
              "Video or audio format you can replay on race morning.",
              "Add course notes, splits, or a mantra you want included.",
              "Option to feature the pep talk on Mia’s profile for an extra fee.",
            ],
          ),
          media: buildVideoMedia(1, "See a race-day pep talk example"),
          priceMin: 90,
          priceMax: 140,
        },
        {
          id: "finish-congrats",
          label: "Finish-line congratulations",
          blurb: "Celebrate the PR, the finish, or just showing up.",
          details: buildServiceDetails(
            "Celebrate the finish — PR, first race, or tough course conquered. Mia calls out the achievement and the story behind it so the video feels like a keepsake, not a generic congrats.",
            [
              "Congrats message built around the race and result you share.",
              "Downloadable video ready for chat, parties, or race albums.",
              "Add finishing time, course name, or a personal shout-out.",
              "Option to feature the congrats video on Mia’s profile for an extra fee.",
            ],
          ),
          media: buildVideoMedia(2, "Watch a finish-line congrats sample"),
          priceMin: 80,
          priceMax: 130,
        },
        {
          id: "loved-one",
          label: "Message for a loved one",
          blurb: "Make it personal with names, inside jokes, and heart.",
          details: buildServiceDetails(
            "Send something thoughtful for a partner, parent, teammate, or friend. Share names, nicknames, and the moment you want honored — Mia weaves them into a warm, shareable message.",
            [
              "Custom message for anniversaries, milestones, or just-because moments.",
              "Choose Text, Audio, or Video formats.",
              "Add recipient’s name, short message, or personal note.",
              "Option to feature the shoutout on Mia’s profile for an extra fee.",
            ],
          ),
          media: buildVideoMedia(3, "Watch a loved-one message sample"),
          priceMin: 85,
          priceMax: 135,
        },
      ],
    },
    {
      id: "training",
      title: "Training & coaching",
      intent: "Train with Mia",
      blurb: "One-to-one guidance for plans, pacing, recovery, and race strategy.",
      icon: "coach",
      image:
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=480&h=480&fit=crop&q=80&auto=format",
      imageAlt: "Athlete training outdoors with a coach",
      examples: ["Plan review", "Coached run", "Recovery"],
      formats: ["Live", "Audio", "Written"],
      services: [
        {
          id: "plan-review",
          label: "Training plan review",
          blurb: "Honest feedback on your current plan and where to adjust.",
          details: buildServiceDetails(
            "Share your current plan, recent workouts, and goal race. Mia reviews volume, intensity, and recovery gaps, then sends clear notes on what to keep, cut, or reshape before peak weeks.",
            [
              "Written review of your current training plan and recent weeks.",
              "Clear notes on volume, intensity, and recovery adjustments.",
              "Share workouts, goal race, and schedule constraints.",
              "Optional follow-up clarification after you receive the review.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Mia sends the review notes by your selected date.",
              ],
              licensing: [
                "You can download & keep the review notes for personal use.",
                "You cannot alter, remix or use materials in defamatory/illegal ways.",
                "The Creator retains rights of integrity and attribution.",
              ],
            },
          ),
          media: buildVideoMedia(4, "See how a plan review works"),
          priceMin: 120,
          priceMax: 200,
          popular: true,
        },
        {
          id: "virtual-run",
          label: "Virtual coached run",
          blurb: "Live session energy — cues, pacing, and accountability.",
          details: buildServiceDetails(
            "Join Mia for a live coached run with pacing cues, form reminders, and real-time encouragement. Ideal when you want accountability and trail-tested guidance without waiting for race week.",
            [
              "Live virtual coached run with pacing and form cues.",
              "Session tailored to your distance and effort target.",
              "Share recent training load and any niggles before you start.",
              "Short post-run notes you can keep for the next week.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Live session on the date and time you select.",
              ],
            },
          ),
          media: buildVideoMedia(5, "Preview a virtual coached run"),
          priceMin: 100,
          priceMax: 180,
        },
        {
          id: "recovery",
          label: "Recovery & nutrition tips",
          blurb: "Practical habits to bounce back stronger after hard weeks.",
          details: buildServiceDetails(
            "Get practical recovery and fueling guidance after hard weeks or long races. Mia focuses on habits you can actually keep — sleep, easy days, snacks, and what to watch before your next block.",
            [
              "Personalized recovery and nutrition guidance for your training load.",
              "Audio or written tips you can revisit after hard sessions.",
              "Share recent races, fatigue signals, and dietary preferences.",
              "Simple habit checklist for the week after delivery.",
            ],
          ),
          media: buildAudioMedia(0, "Listen to recovery advice", "0:46"),
          priceMin: 90,
          priceMax: 160,
        },
        {
          id: "pre-race",
          label: "Pre-race strategy call",
          blurb: "Fueling, splits, and mindset locked in before race week.",
          details: buildServiceDetails(
            "A one-to-one strategy call covering splits, fueling, weather contingencies, and mindset. You’ll leave race week with a simple plan you can execute under pressure.",
            [
              "Live strategy call focused on your goal race.",
              "Splits, fueling, and weather contingencies covered.",
              "Share course profile, goal time, and open questions.",
              "Summary notes after the call so nothing gets lost.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Live call on the date and time you select.",
              ],
            },
          ),
          media: buildAudioMedia(1, "Hear a strategy sample", "0:50"),
          priceMin: 110,
          priceMax: 190,
        },
        {
          id: "weekly-checkin",
          label: "Weekly check-in session",
          blurb: "Stay accountable through peak training with regular touchpoints.",
          details: buildServiceDetails(
            "Stay accountable through peak training with a recurring check-in. Review the week, adjust the next one, and keep momentum without overthinking every workout.",
            [
              "Weekly check-in to review training and set the next week.",
              "Adjustments for fatigue, schedule changes, and goal races.",
              "Share the week’s workouts and how you felt completing them.",
              "Short written plan for the following seven days.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Session and notes delivered on your selected cadence.",
              ],
            },
          ),
          media: buildAudioMedia(2, "Listen to a check-in clip", "0:43"),
          priceMin: 140,
          priceMax: 220,
        },
      ],
    },
    {
      id: "appearances",
      title: "Appearances & events",
      intent: "Book an appearance",
      blurb: "Bring Mia to your club, stage, expo, or podcast.",
      icon: "stage",
      image:
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=480&h=480&fit=crop&q=80&auto=format",
      imageAlt: "Group training session and community event energy",
      examples: ["Run club", "Panel", "Podcast"],
      formats: ["Live", "In person", "Remote"],
      services: [
        {
          id: "club-guest",
          label: "Guest at your run club",
          blurb: "Join a group run and stick around to chat with members.",
          details: buildServiceDetails(
            "Mia joins your club run, brings energy to the group, and stays to chat with members afterward. Great for community nights, milestone runs, or kicking off a new training season.",
            [
              "Guest appearance at your run club meet-up.",
              "Group run energy plus post-run conversation time.",
              "Share club size, route, and any special occasion notes.",
              "Optional social mention after the appearance for an extra fee.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Mia appears on the agreed date and format you selected.",
              ],
              licensing: [
                "You can share photos or clips from the appearance for personal and event use.",
                "You cannot alter, remix or use materials in defamatory/illegal ways.",
                "The Creator retains rights of integrity and attribution.",
              ],
            },
          ),
          media: buildVideoMedia(3, "See a run-club guest appearance"),
          priceMin: 180,
          priceMax: 320,
          popular: true,
        },
        {
          id: "panel",
          label: "Panel appearance",
          blurb: "Trail stories and Q&A that keep an audience leaning in.",
          details: buildServiceDetails(
            "A panel appearance built around trail stories, endurance lessons, and audience Q&A. Mia keeps the conversation grounded, practical, and engaging for runners at every level.",
            [
              "Live panel segment with stories and audience Q&A.",
              "In-person or remote format depending on your event.",
              "Share themes, co-panelists, and audience profile in advance.",
              "Optional highlight clip for your event channels for an extra fee.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Mia appears on the agreed date and format you selected.",
              ],
            },
          ),
          media: buildVideoMedia(4, "Watch a panel appearance sample"),
          priceMin: 160,
          priceMax: 280,
        },
        {
          id: "speech",
          label: "Inspirational speech",
          blurb: "A keynote-style talk built around grit, community, and finishing.",
          details: buildServiceDetails(
            "A keynote-style talk on grit, community, and finishing strong. Share your event theme and audience, and Mia shapes a speech that fits the room — from club nights to brand activations.",
            [
              "Custom inspirational speech matched to your event theme.",
              "Keynote-style delivery for clubs, brands, or community nights.",
              "Share audience details, runtime, and preferred talking points.",
              "Optional recording rights for internal event use for an extra fee.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Mia appears on the agreed date and format you selected.",
              ],
            },
          ),
          media: buildAudioMedia(0, "Hear a speech excerpt", "0:52"),
          priceMin: 200,
          priceMax: 360,
        },
        {
          id: "mc",
          label: "MC a race expo",
          blurb: "Stage presence that keeps the expo floor energized.",
          details: buildServiceDetails(
            "Mia MCs your race expo with clear stage presence, athlete intros, and crowd energy that keeps the floor moving. Includes timing coordination notes so the program stays on track.",
            [
              "Full MC coverage for your race expo stage program.",
              "Athlete intros, announcements, and crowd engagement.",
              "Share run-of-show, brand partners, and key timings.",
              "Optional post-event highlight clip for an extra fee.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Mia appears on the agreed date and format you selected.",
              ],
            },
          ),
          media: buildVideoMedia(0, "See race-expo MC energy"),
          priceMin: 220,
          priceMax: 400,
        },
        {
          id: "charity",
          label: "Charity run appearance",
          blurb: "Show up for a cause and help rally participants.",
          details: buildServiceDetails(
            "Book Mia for a charity run appearance to rally participants, support your cause message, and help the day feel memorable for volunteers and runners alike.",
            [
              "On-site appearance for your charity run or fundraiser.",
              "Participant rally moments and cause-aligned messaging.",
              "Share cause details, schedule, and any speaking notes.",
              "Optional social shoutout supporting the charity for an extra fee.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Mia appears on the agreed date and format you selected.",
              ],
            },
          ),
          media: buildVideoMedia(1, "Watch a charity appearance sample"),
          priceMin: 150,
          priceMax: 300,
        },
        {
          id: "podcast",
          label: "Podcast guest spot",
          blurb: "An engaging conversation for your listeners and community.",
          details: buildServiceDetails(
            "Invite Mia as a podcast guest for an engaging conversation on training, mindset, and community. Share your episode angle in advance so the talk fits your audience and format.",
            [
              "Remote or in-studio podcast guest appearance.",
              "Conversation tailored to your show’s audience and episode angle.",
              "Share questions, runtime, and preferred topics in advance.",
              "You keep standard episode distribution rights for the show.",
            ],
            {
              booking: [
                "Direct booking: Pay in full to confirm your request instantly.",
                "No approval needed: Your booking is auto-confirmed upon payment.",
                "Delivery: Recording session on the date and format you selected.",
              ],
              licensing: [
                "You can publish the episode across your usual podcast channels.",
                "You cannot alter, remix or use materials in defamatory/illegal ways.",
                "The Creator retains rights of integrity and attribution.",
              ],
            },
          ),
          media: buildAudioMedia(2, "Listen to a podcast sample", "0:55"),
          priceMin: 100,
          priceMax: 180,
        },
      ],
    },
  ],
  howItWorks: [
    {
      title: "Select & Secure",
      copy: "Choose the service that fits your occasion and lock in Mia’s availability.",
    },
    {
      title: "Personalize & Confirm",
      copy: "Share names, race details, or talking points so the request feels truly yours.",
    },
    {
      title: "Pay & Enjoy",
      copy: "Complete payment once Mia accepts — then sit back and enjoy the moment.",
    },
  ],
  startingRange: "$80 – $240",
  responseTime: "24 hours",
  nextAvailable: "Jul 22, 2026",
  guarantee:
    "You won’t be charged until Mia accepts your request. If she can’t fulfill it, you get a full refund — no questions asked.",
  guaranteePoints: [
    {
      title: "Pay only when accepted",
      copy: "You won’t be charged until Mia accepts your request.",
    },
    {
      title: "Full refund if unfulfilled",
      copy: "If she can’t deliver, you get a full refund — no questions asked.",
    },
  ],
};

const REQUESTS_BY_SLUG: Record<string, CreatorRequestsContent> = {
  "mia-chen": MIA_CHEN_REQUESTS,
};

export type SpecialRequestReview = {
  id: string;
  name: string;
  avatar_initials: string;
  rating: number;
  ago: string;
  daysAgo: number;
  variant: string;
  text: string;
};

export type SpecialRequestReviewsBlock = {
  average: number;
  count: number;
  attributes: { label: string; score: number }[];
  reviews: SpecialRequestReview[];
};

const REQUEST_REVIEWERS = [
  { name: "Ananya Perera", initials: "AP" },
  { name: "Rohan Silva", initials: "RS" },
  { name: "Meera Jay", initials: "MJ" },
  { name: "Kavish Fernando", initials: "KF" },
  { name: "Sara Malik", initials: "SM" },
  { name: "Dev Patel", initials: "DP" },
  { name: "Nina Okoye", initials: "NO" },
  { name: "Luis Ortega", initials: "LO" },
  { name: "Priya Nair", initials: "PN" },
  { name: "James Cole", initials: "JC" },
  { name: "Hana Wijesinghe", initials: "HW" },
  { name: "Omar Hassan", initials: "OH" },
] as const;

const REQUEST_REVIEW_TEXTS = [
  "Mia’s birthday greeting made my sister cry happy tears. Felt personal and full of energy.",
  "Booked a race-day pep talk before Mumbai Marathon — exactly the boost I needed at the start line.",
  "The training plan review was honest, practical, and tailored to my busy schedule.",
  "She joined our run club as a guest and stayed to chat with everyone. Absolute pro.",
  "Recovery tips after my ultra were clear and easy to follow. Worth every rupee.",
  "Pre-race strategy call helped me pace smarter. Finished stronger than last year.",
  "Message for my fiancé after his first 10K was perfect — funny, warm, and on-brand Mia.",
  "Virtual coached run felt like having a friend on the trail. Highly recommend.",
  "Responded fast, asked great questions, and delivered ahead of the promised date.",
  "Panel appearance at our charity expo was inspiring. Crowd loved her stories.",
  "Weekly check-ins kept me accountable through peak training. Soft-spoken but firm.",
  "Finish-line congratulations video was the highlight of my race weekend album.",
] as const;

const REQUEST_SERVICE_LABELS = [
  "Birthday greeting",
  "Race-day pep talk",
  "Training plan review",
  "Guest at your run club",
  "Recovery & nutrition tips",
  "Pre-race strategy call",
  "Message for a loved one",
  "Virtual coached run",
  "Panel appearance",
  "Weekly check-in session",
  "Finish-line congratulations",
  "Podcast guest spot",
] as const;

const REQUEST_AGOS = [
  { label: "1 day ago", days: 1 },
  { label: "3 days ago", days: 3 },
  { label: "1 week ago", days: 7 },
  { label: "2 weeks ago", days: 14 },
  { label: "3 weeks ago", days: 21 },
  { label: "1 month ago", days: 30 },
] as const;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length];
}

function scoreFromSeed(seed: number, offset: number, base = 4.5): number {
  const bump = ((seed >> offset) & 7) / 20;
  return Math.min(5, Math.round((base + bump) * 10) / 10);
}

export function getCreatorRequests(slug: string): CreatorRequestsContent | null {
  return REQUESTS_BY_SLUG[slug] ?? null;
}

export function formatRequestPriceRange(min: number, max: number): string {
  return `$${min} – $${max}`;
}

export function resolveSpecialRequestReviews(slug: string): SpecialRequestReviewsBlock {
  const seed = hashString(`requests:${slug}`);
  const count = 24 + (seed % 12);
  const average = scoreFromSeed(seed, 2, 4.6);
  const attributes = [
    { label: "Response Speed", score: scoreFromSeed(seed, 1, 4.7) },
    { label: "Personalization", score: scoreFromSeed(seed, 4, 4.8) },
    { label: "Value for Money", score: scoreFromSeed(seed, 8, 4.5) },
    { label: "Performance standards", score: scoreFromSeed(seed, 3, 4.6) },
    { label: "Ease of booking", score: scoreFromSeed(seed, 6, 4.7) },
    { label: "Professionalism", score: scoreFromSeed(seed, 9, 4.8) },
  ];

  const reviews: SpecialRequestReview[] = Array.from({ length: count }, (_, index) => {
    const reviewer = pick(REQUEST_REVIEWERS, seed, index * 3);
    const ago = pick(REQUEST_AGOS, seed, index * 2);
    const storyIndex = (seed + index * 7) % REQUEST_REVIEW_TEXTS.length;
    return {
      id: `${slug}-request-review-${index + 1}`,
      name: reviewer.name,
      avatar_initials: reviewer.initials,
      rating: 3 + ((seed + index * 5) % 3),
      ago: ago.label,
      daysAgo: ago.days,
      variant: REQUEST_SERVICE_LABELS[storyIndex % REQUEST_SERVICE_LABELS.length],
      text: REQUEST_REVIEW_TEXTS[storyIndex],
    };
  });

  return { average, count, attributes, reviews };
}
