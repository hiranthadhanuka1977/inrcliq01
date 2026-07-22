export interface SnapItem {
  id: string;
  image: string;
  duration: string;
  views: string;
  handle: string;
  avatar: string;
  tag: string;
}

const snapImage = (id: string) =>
  `https://images.unsplash.com/${id}?w=480&h=720&fit=crop&q=85&auto=format`;

const snapAvatar = (id: string) =>
  `https://images.unsplash.com/${id}?w=120&h=120&fit=crop&q=85&auto=format&crop=faces`;

export const homeSnaps: SnapItem[] = [
  {
    id: "streetbeats",
    image: snapImage("photo-1724003450383-4016597e31e3"),
    duration: "0:41",
    views: "4.1M views",
    handle: "@streetbeats",
    avatar: snapAvatar("photo-1560250097-0b93528c311a"),
    tag: "viral",
  },
  {
    id: "nomadlens",
    image: snapImage("photo-1622386010273-646e12d1c02f"),
    duration: "0:36",
    views: "2.8M views",
    handle: "@nomadlens",
    avatar: snapAvatar("photo-1539571690953-7b60c5c4c2b6"),
    tag: "viral",
  },
  {
    id: "daydream",
    image: snapImage("photo-1760092189954-5b2f6eb3ca88"),
    duration: "0:48",
    views: "1.9M views",
    handle: "@daydream",
    avatar: snapAvatar("photo-1524504388940-b1c1722653e1"),
    tag: "rising",
  },
  {
    id: "loudmind",
    image: snapImage("photo-1755152825416-a7b660d3bf1c"),
    duration: "0:29",
    views: "3.4M views",
    handle: "@loudmind",
    avatar: snapAvatar("photo-1500648767791-00dcc994a43e"),
    tag: "viral",
  },
  {
    id: "soulfood",
    image: snapImage("photo-1511795409834-ef04bbd61622"),
    duration: "0:52",
    views: "890K views",
    handle: "@soulfood",
    avatar: snapAvatar("photo-1544005313-94ddf0286df2"),
    tag: "new",
  },
  {
    id: "nightshift",
    image: snapImage("photo-1768053919038-4340b9333e00"),
    duration: "0:33",
    views: "1.2M views",
    handle: "@nightshift",
    avatar: snapAvatar("photo-1580489944761-15a19d654956"),
    tag: "trending",
  },
];
