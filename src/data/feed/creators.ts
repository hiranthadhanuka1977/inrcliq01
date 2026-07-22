export interface Creator {
  id: string;
  name: string;
  handle: string;
  followers: string;
  verified?: boolean;
  image?: string;
  initials?: string;
  color?: string;
}

export const creatorsToFollow: Creator[] = [
  {
    id: "bruno",
    name: "Bruno Mars",
    handle: "@brunomars",
    followers: "89.4M followers",
    verified: true,
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80&auto=format&fit=crop",
  },
  {
    id: "jlo",
    name: "Jennifer Lopez",
    handle: "@jlo",
    followers: "48.2M followers",
    verified: true,
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=80&auto=format&fit=crop",
  },
  {
    id: "ed",
    name: "Ed Sheeran",
    handle: "@edsheeran",
    followers: "64.1M followers",
    initials: "ED",
    color: "#166534",
  },
  {
    id: "ariana",
    name: "Ariana Grande",
    handle: "@arianagrande",
    followers: "89.4M followers",
    verified: true,
    initials: "AG",
    color: "#f97316",
  },
  {
    id: "dua",
    name: "Dua Lipa",
    handle: "@dualipa",
    followers: "88.1M followers",
    verified: true,
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80&auto=format&fit=crop",
  },
  {
    id: "billie",
    name: "Billie Eilish",
    handle: "@billieeilish",
    followers: "72.6M followers",
    verified: true,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80&auto=format&fit=crop",
  },
];
