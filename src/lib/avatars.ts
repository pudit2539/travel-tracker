// src/lib/avatars.ts

export interface CatAvatar {
  id: string;
  emoji: string;
  name: string;
  bgGradient: string;
  border: string;
  badgeBg: string;
  imgUrl?: string;
}

export const CAT_AVATARS: CatAvatar[] = [
  {
    id: 'cat_trio',
    emoji: '🐾',
    name: '3 Musketeers Neko (ไอคอนหลัก)',
    bgGradient: 'from-amber-400 via-orange-500 to-pink-500',
    border: 'border-amber-400 dark:border-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    imgUrl: '/app-logo.png',
  },
  {
    id: 'cat_pink',
    emoji: '🐱',
    name: 'Pink Sakura Cat',
    bgGradient: 'from-pink-500 to-rose-600',
    border: 'border-pink-300 dark:border-pink-500',
    badgeBg: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  },
  {
    id: 'cat_purple',
    emoji: '😸',
    name: 'Purple Neon Neko',
    bgGradient: 'from-purple-600 to-indigo-600',
    border: 'border-purple-300 dark:border-purple-500',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    id: 'cat_black',
    emoji: '🐈‍⬛',
    name: 'Obsidian Midnight Cat',
    bgGradient: 'from-zinc-800 to-zinc-950',
    border: 'border-zinc-500 dark:border-zinc-700',
    badgeBg: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
  },
  {
    id: 'cat_orange',
    emoji: '🐱',
    name: 'Orange Tabby Neko',
    bgGradient: 'from-amber-500 to-orange-600',
    border: 'border-orange-300 dark:border-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  {
    id: 'cat_blue',
    emoji: '😻',
    name: 'Cyber Blue Cat',
    bgGradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-300 dark:border-cyan-500',
    badgeBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  {
    id: 'cat_green',
    emoji: '😽',
    name: 'Matcha Green Cat',
    bgGradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-300 dark:border-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    id: 'cat_gold',
    emoji: '😺',
    name: 'Lucky Gold Cat',
    bgGradient: 'from-yellow-400 to-amber-500',
    border: 'border-yellow-300 dark:border-yellow-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    id: 'cat_berry',
    emoji: '😻',
    name: 'Berry Galaxy Cat',
    bgGradient: 'from-fuchsia-500 via-pink-500 to-purple-600',
    border: 'border-fuchsia-300 dark:border-fuchsia-500',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
];

export function getCatAvatar(avatarId?: string | null): CatAvatar {
  const found = CAT_AVATARS.find((c) => c.id === avatarId);
  return found || CAT_AVATARS[0];
}
