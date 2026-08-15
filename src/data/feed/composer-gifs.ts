export type ComposerGif = {
  id: string;
  url: string;
  alt: string;
  tags: string[];
};

export const COMPOSER_GIFS: ComposerGif[] = [
  {
    id: "thumbs-up",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    alt: "Thumbs up",
    tags: ["yes", "ok", "thumb", "agree"],
  },
  {
    id: "happy-dance",
    url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif",
    alt: "Happy dance",
    tags: ["happy", "dance", "excited", "joy"],
  },
  {
    id: "mind-blown",
    url: "https://media.giphy.com/media/xT0xeJpnBsV6A14rsa/giphy.gif",
    alt: "Mind blown",
    tags: ["wow", "mind", "blown", "amazed"],
  },
  {
    id: "clap",
    url: "https://media.giphy.com/media/7rj2ZgssfdbpS/giphy.gif",
    alt: "Applause",
    tags: ["clap", "applause", "bravo"],
  },
  {
    id: "lol",
    url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
    alt: "Laughing",
    tags: ["lol", "laugh", "funny", "haha"],
  },
  {
    id: "love",
    url: "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif",
    alt: "Sending love",
    tags: ["love", "heart", "like"],
  },
  {
    id: "wave",
    url: "https://media.giphy.com/media/ASd0Ukj0yXZsY/giphy.gif",
    alt: "Hello wave",
    tags: ["hi", "hello", "wave", "hey"],
  },
  {
    id: "party",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    alt: "Celebration",
    tags: ["party", "celebrate", "confetti", "fire"],
  },
  {
    id: "coffee",
    url: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
    alt: "Coffee time",
    tags: ["coffee", "drink", "morning"],
  },
  {
    id: "sad",
    url: "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif",
    alt: "Sad",
    tags: ["sad", "cry", "down"],
  },
  {
    id: "thanks",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    alt: "Thank you",
    tags: ["thanks", "thank", "grateful"],
  },
  {
    id: "wow",
    url: "https://media.giphy.com/media/3oEjI6SIIHBaNjAo9G/giphy.gif",
    alt: "Wow",
    tags: ["wow", "omg", "surprised"],
  },
];

export function searchComposerGifs(query: string): ComposerGif[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMPOSER_GIFS;
  return COMPOSER_GIFS.filter((gif) =>
    `${gif.alt} ${gif.tags.join(" ")}`.toLowerCase().includes(q),
  );
}