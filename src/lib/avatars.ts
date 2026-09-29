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
    name: '3 Musketeers Neko (ไอคอนหลัก 3 แมว)',
    bgGradient: 'from-amber-400 via-orange-500 to-pink-500',
    border: 'border-amber-400 dark:border-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    imgUrl: '/app-logo.png',
  },
  {
    id: 'cat_pink',
    emoji: '🐱',
    name: 'Pink Sakura Cat (ซากุระ)',
    bgGradient: 'from-pink-500 to-rose-600',
    border: 'border-pink-300 dark:border-pink-500',
    badgeBg: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  },
  {
    id: 'cat_purple',
    emoji: '😸',
    name: 'Purple Neon Neko (นีออนม่วง)',
    bgGradient: 'from-purple-600 to-indigo-600',
    border: 'border-purple-300 dark:border-purple-500',
    badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    id: 'cat_black',
    emoji: '🐈‍⬛',
    name: 'Obsidian Midnight (แมวดำเงียบ)',
    bgGradient: 'from-zinc-800 to-zinc-950',
    border: 'border-zinc-500 dark:border-zinc-700',
    badgeBg: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
  },
  {
    id: 'cat_orange',
    emoji: '🐱',
    name: 'Orange Tabby (แมวส้มจอมซน)',
    bgGradient: 'from-amber-500 to-orange-600',
    border: 'border-orange-300 dark:border-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
  {
    id: 'cat_blue',
    emoji: '😻',
    name: 'Cyber Blue Cat (ไซเบอร์บลู)',
    bgGradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-300 dark:border-cyan-500',
    badgeBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  {
    id: 'cat_green',
    emoji: '😽',
    name: 'Matcha Green (มัทฉะกรีน)',
    bgGradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-300 dark:border-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    id: 'cat_gold',
    emoji: '😺',
    name: 'Lucky Gold Cat (แมวกวักทองคำ)',
    bgGradient: 'from-yellow-400 to-amber-500',
    border: 'border-yellow-300 dark:border-yellow-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    id: 'cat_berry',
    emoji: '😻',
    name: 'Berry Galaxy (กาแล็กซี่เบอร์รี่)',
    bgGradient: 'from-fuchsia-500 via-pink-500 to-purple-600',
    border: 'border-fuchsia-300 dark:border-fuchsia-500',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  {
    id: 'cat_calico',
    emoji: '🐾',
    name: 'Calico Tri-Color (แมวสามสีนำโชค)',
    bgGradient: 'from-amber-400 via-rose-300 to-slate-800',
    border: 'border-amber-300 dark:border-amber-600',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    id: 'cat_white',
    emoji: '🤍',
    name: 'Snow White (แมวขาวหิมะฟู)',
    bgGradient: 'from-slate-100 via-slate-200 to-slate-400',
    border: 'border-slate-300 dark:border-slate-500',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    id: 'cat_siamese',
    emoji: '🤎',
    name: 'Siamese (แมววิเชียรมาศ)',
    bgGradient: 'from-amber-100 via-stone-300 to-stone-800',
    border: 'border-stone-400 dark:border-stone-600',
    badgeBg: 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200',
  },
  {
    id: 'cat_sunglasses',
    emoji: '😎',
    name: 'Cool Boss Neko (แมวแว่นดำสุดเท่)',
    bgGradient: 'from-sky-400 via-blue-500 to-indigo-700',
    border: 'border-blue-400 dark:border-blue-600',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    id: 'cat_pilot',
    emoji: '✈️',
    name: 'Captain Pilot Neko (กัปตันนักบิน)',
    bgGradient: 'from-blue-600 via-indigo-600 to-slate-900',
    border: 'border-indigo-400 dark:border-indigo-600',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    id: 'cat_chef',
    emoji: '👨‍🍳',
    name: 'Master Chef (เชฟกระทะเหล็ก)',
    bgGradient: 'from-rose-500 via-orange-500 to-amber-500',
    border: 'border-orange-400 dark:border-orange-600',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  },
  {
    id: 'cat_ninja',
    emoji: '🥷',
    name: 'Ninja Shinobi (นินจาเงาซ่อนตัว)',
    bgGradient: 'from-neutral-700 via-zinc-800 to-black',
    border: 'border-zinc-600 dark:border-zinc-700',
    badgeBg: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
  },
  {
    id: 'cat_space',
    emoji: '🚀',
    name: 'Cosmic Astro (แมวอวกาศ)',
    bgGradient: 'from-indigo-900 via-purple-700 to-pink-600',
    border: 'border-purple-400 dark:border-purple-600',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    id: 'cat_coffee',
    emoji: '☕',
    name: 'Cafe Barista (บาริสต้าคั่วบด)',
    bgGradient: 'from-amber-700 via-amber-800 to-stone-900',
    border: 'border-amber-600 dark:border-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    id: 'cat_sleepy',
    emoji: '😴',
    name: 'Sleepy Mochi (แมวนอนขี้เซา)',
    bgGradient: 'from-sky-300 via-indigo-300 to-purple-300',
    border: 'border-sky-300 dark:border-sky-500',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  },
  {
    id: 'cat_party',
    emoji: '🥳',
    name: 'Party Fiesta (สายปาร์ตี้ฉลอง)',
    bgGradient: 'from-pink-500 via-yellow-400 to-teal-400',
    border: 'border-yellow-400 dark:border-yellow-600',
    badgeBg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  },
  {
    id: 'cat_detective',
    emoji: '🕵️',
    name: 'Detective Holmes (นักสืบจอมวางแผน)',
    bgGradient: 'from-stone-500 via-stone-700 to-stone-900',
    border: 'border-stone-500 dark:border-stone-700',
    badgeBg: 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300',
  },
  {
    id: 'cat_wizard',
    emoji: '🧙',
    name: 'Magic Wizard (พ่อมดแมวเวทมนตร์)',
    bgGradient: 'from-violet-600 via-purple-700 to-indigo-900',
    border: 'border-violet-400 dark:border-violet-600',
    badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  },
  {
    id: 'cat_sakura',
    emoji: '🌸',
    name: 'Sakura Princess (เจ้าหญิงซากุระ)',
    bgGradient: 'from-rose-300 via-pink-400 to-rose-500',
    border: 'border-pink-300 dark:border-pink-500',
    badgeBg: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  },
  {
    id: 'cat_artist',
    emoji: '🎨',
    name: 'Artist Painter (ศิลปินวาดรูป)',
    bgGradient: 'from-rose-400 via-amber-400 to-indigo-500',
    border: 'border-amber-300 dark:border-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
];

export function getCatAvatar(avatarId?: string | null): CatAvatar {
  if (!avatarId) return CAT_AVATARS[0];
  const found = CAT_AVATARS.find((c) => c.id === avatarId);
  return found || CAT_AVATARS[0];
}
