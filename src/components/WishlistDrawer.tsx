// src/components/WishlistDrawer.tsx
'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  X,
  Plus,
  Search,
  MapPin,
  ExternalLink,
  Trash2,
  ShoppingBag,
  Check,
  BookmarkCheck,
  Sparkles,
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';
import {
  ShoppingBagItem,
  ShoppingItemCategory,
  ShoppingItemStatus,
  SHOPPING_CATEGORY_META,
  getShoppingBag,
  addShoppingBagItem,
  updateShoppingBagItem,
  deleteShoppingBagItem,
  subscribeShoppingBag,
  getShoppingBagSummary,
} from '@/lib/shoppingBag';

export type FacetTagId =
  | 'rainy-day'
  | 'luggage-storage'
  | 'near-station'
  | 'wheelchair'
  | 'no-pork'
  | 'tax-free';

export interface WishlistItem {
  id: string;
  title: string;
  japaneseTitle?: string;
  category: 'food' | 'shopping' | 'sight' | 'cafe';
  district: string;
  costEstimate: string;
  highlight: string;
  isCurated?: boolean;
  facets?: FacetTagId[];
}

const FACET_FILTER_OPTIONS: Array<{ id: FacetTagId; label: string }> = [
  { id: 'rainy-day', label: '☔ วันฝนตก/ในร่ม' },
  { id: 'near-station', label: '🚉 ติดสถานีรถไฟ' },
  { id: 'luggage-storage', label: '🧳 มีตู้ฝากกระเป๋า' },
  { id: 'wheelchair', label: '♿ ทางราบ/เดินน้อย' },
  { id: 'no-pork', label: '🚫🐷 ไม่ทานหมู/เนื้อวัว/ปลา' },
  { id: 'tax-free', label: '🛍️ Tax-Free 10%' },
];

const CURATED_JAPAN_WISHLIST: WishlistItem[] = [
  {
    id: 'w-motomura',
    title: 'Gyukatsu Motomura (เนื้อชุบแป้งทอดเตาหิน)',
    japaneseTitle: '牛かつ もと村 難波店',
    category: 'food',
    district: 'Namba / Dotonbori Osaka',
    costEstimate: '¥1,900 - ¥2,800',
    highlight: 'เนื้อวัวพรีเมียมชุบเกล็ดขนมปัง ย่างบนเตาหินร้อนส่วนตัว นุ่มละลายในปาก (ไม่มีหมู)',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'no-pork'],
  },
  {
    id: 'w-kani-doraku',
    title: 'Kani Doraku Honten (ปูยักษ์โดทงโบริ)',
    japaneseTitle: 'かに道楽 道頓堀本店',
    category: 'food',
    district: 'Dotonbori Osaka',
    costEstimate: '¥4,500 - ¥9,000',
    highlight: 'เซ็ตปูซูไวและปูทาราบะครบคอร์ส ชาบู ซาชิมิ ปูย่างถ่านหอมๆ ท่ามกลางวิวคลองโดทงโบริ',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'wheelchair', 'no-pork'],
  },
  {
    id: 'w-nakamura-uji',
    title: 'Nakamura Tokichi Honten (พาเฟ่ต์ชาเขียวอุจิ 170 ปี)',
    japaneseTitle: '中村藤吉本店 宇治',
    category: 'cafe',
    district: 'Uji Kyoto',
    costEstimate: '¥1,500 - ¥2,200',
    highlight: 'พาเฟ่ต์มัทฉะในกระบอกไม้ไผ่และโซบะชาเขียวแท้ กดบัตรคิวหน้าร้านแล้วเดินช้อปผงชา Tax-Free ได้เลย',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'wheelchair', 'no-pork', 'tax-free'],
  },
  {
    id: 'w-ichiran',
    title: 'Ichiran Ramen (ราเมงข้อสอบ 24 ชม.)',
    japaneseTitle: '一蘭 道頓堀店',
    category: 'food',
    district: 'Dotonbori / Umeda / Kyoto',
    costEstimate: '¥1,100 - ¥1,800',
    highlight: 'น้ำซุปทงคัตสึเข้มข้น โต๊ะเดี่ยวมีฉากกั้น เลือกระดับความนุ่มเส้นและความเผ็ดได้ตามใจ',
    isCurated: true,
    facets: ['rainy-day', 'near-station'],
  },
  {
    id: 'w-kura',
    title: 'Kura Sushi Global Flagship (ซูชิสายพาน 100 เยน)',
    japaneseTitle: 'くら寿司 道頓堀・なんばパークス',
    category: 'food',
    district: 'Dotonbori / Namba Parks',
    costEstimate: '¥1,200 - ¥2,500',
    highlight: 'ทานครบทุก 5 จาน หยอดลงช่องรับสิทธิ์หมุนตู้เกมกาชาปอง Bikkura-Pon ลุ้นโมเดลลิมิเต็ด',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'wheelchair', 'no-pork'],
  },
  {
    id: 'w-harbs',
    title: 'HARBS Mille Crepes (เครปเค้กผลไม้สด 6 ชั้น)',
    japaneseTitle: 'ハーブス 大丸心斎橋店',
    category: 'cafe',
    district: 'Daimaru Shinsaibashi / Kyoto Fujii Daimaru',
    costEstimate: '¥1,050 - ¥1,800',
    highlight: 'เค้กเครปผลไม้สด 6 ชั้นในตำนาน เมลอน สตรอว์เบอร์รี กล้วย ครีมสดละมุนไม่หวานเลี่ยน',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'luggage-storage', 'wheelchair', 'no-pork'],
  },
  {
    id: 'w-donki',
    title: 'Mega Don Quijote & ชิงช้าสวรรค์ Ebisu Tower',
    japaneseTitle: 'ドン・キホーテ 道頓堀店',
    category: 'shopping',
    district: 'Dotonbori / Shinsekai',
    costEstimate: '¥3,000 - ¥20,000',
    highlight: 'แหล่งช้อปปิ้งของฝาก ขนมญี่ปุ่น คอสเมติก ยา แผ่นแปะแก้ปวด เปิด 24 ชม. เคาน์เตอร์ Tax-Free ครบ',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'tax-free'],
  },
  {
    id: 'w-pokemon-osaka',
    title: 'Pokemon Center & Nintendo OSAKA',
    japaneseTitle: 'ポケモンセンターオーサカ (大丸梅田 13F)',
    category: 'shopping',
    district: 'Daimaru Umeda / Shinsaibashi Parco',
    costEstimate: '¥1,000 - ¥8,000',
    highlight: 'อยู่ในห้างติดสถานีรถไฟ เดินสบายแม้ฝนตก มีล็อกเกอร์ฝากกระเป๋าและเคาน์เตอร์ Tax-Free',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'luggage-storage', 'wheelchair', 'tax-free'],
  },
  {
    id: 'w-rinku-outlet',
    title: 'Rinku Premium Outlets (เอาท์เล็ทติดทะเลใกล้ KIX)',
    japaneseTitle: 'りんくうプレミアム・アウトレット',
    category: 'shopping',
    district: 'Rinku-Town (1 สถานีจากสนามบิน KIX)',
    costEstimate: '¥5,000 - ¥30,000',
    highlight: 'มากกว่า 250 แบรนด์ดัง มีตู้ Coin Locker ใหญ่สำหรับกระเป๋าเดินทางก่อนบินกลับ',
    isCurated: true,
    facets: ['near-station', 'luggage-storage', 'wheelchair', 'tax-free'],
  },
  {
    id: 'w-kaiyukan',
    title: 'Osaka Aquarium Kaiyukan (พิพิธภัณฑ์สัตว์น้ำฉลามวาฬ)',
    japaneseTitle: '海遊館',
    category: 'sight',
    district: 'Osakako Tempozan',
    costEstimate: '¥2,700',
    highlight: 'อควาเรียมในร่มระดับโลก ชมฉลามวาฬยักษ์แม้วันฝนตกหรือหนาวจัด มีทางลาดวีลแชร์ตลอดอาคาร',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'luggage-storage', 'wheelchair'],
  },
  {
    id: 'w-christmas-tennoji',
    title: 'Osaka Christmas Market 2026 @ สวนเท็นโนจิ (Tenshiba)',
    japaneseTitle: '大阪クリスマスマーケット (てんしば)',
    category: 'sight',
    district: 'Tennoji Osaka',
    costEstimate: 'เข้าฟรี (อาหาร/ไวน์อุ่น ¥800 - ¥2,000)',
    highlight: 'ไฮไลต์เดือนธันวาคม! ต้นคริสต์มาสยักษ์ ตลาดคริสต์มาสสไตล์เยอรมัน ไวน์อุ่น Glühwein และช็อกโกแลตร้อนติดสถานี Tennoji',
    isCurated: true,
    facets: ['near-station', 'luggage-storage', 'wheelchair'],
  },
  {
    id: 'w-midosuji-illumination',
    title: 'Midosuji Illumination & Nakanoshima Festival of Lights',
    japaneseTitle: '御堂筋イルミネーション・OSAKA光のルネサンス',
    category: 'sight',
    district: 'Umeda ➔ Shinsaibashi ➔ Namba',
    costEstimate: 'ชมฟรี',
    highlight: 'อุโมงค์ไฟประดับฤดูหนาวตลอดถนนสายหลักมิโดสึจิยาวกว่า 4 กม. และงานแสดงไฟ 3D Mapping ที่เกาะนากาโนะชิมะ (17:00–23:00 น.)',
    isCurated: true,
    facets: ['near-station', 'wheelchair'],
  },
  {
    id: 'w-katsuoji',
    title: 'วัดคัตสึโอจิ (Katsuo-ji — วัดตุ๊กตาดารุมะแห่งชัยชนะ)',
    japaneseTitle: '勝尾寺 (箕面)',
    category: 'sight',
    district: 'Minoh Osaka',
    costEstimate: '¥500',
    highlight: 'วัดตุ๊กตาดารุมะนับหมื่นตัวกลางหุบเขามิโนะ พร้อมกิจกรรมปั๊มโปสการ์ด 6 จุดรอบวัดจนครบเป็นภาพดารุมะสุดคลาสสิก',
    isCurated: true,
    facets: [],
  },
  {
    id: 'w-teamlab-osaka',
    title: 'teamLab Botanical Garden Osaka (สวนพฤกษศาสตร์เรืองแสง)',
    japaneseTitle: 'チームラボ ボタニカルガーデン 大阪 (長居公園)',
    category: 'sight',
    district: 'Nagai Park (สาย Midosuji)',
    costEstimate: '¥1,800 - ¥2,200',
    highlight: 'นิทรรศการศิลปะดิจิทัลกลางแจ้งยามค่ำคืน ต้นไม้และไข่นกยักษ์เปลี่ยนสีตามการสัมผัส นั่งสายสีแดง Midosuji ตรงจาก Namba',
    isCurated: true,
    facets: ['near-station', 'wheelchair'],
  },
  {
    id: 'w-umeda-sky',
    title: 'Umeda Sky Building (จุดชมวิวลอยฟ้า 360 องศา)',
    japaneseTitle: '梅田スカイビル 空中庭園展望台',
    category: 'sight',
    district: 'Umeda Osaka',
    costEstimate: '¥1,500 - ¥2,000',
    highlight: 'บันไดเลื่อนกระจกลอยฟ้าข้ามตึกคู่และดาดฟ้าเรืองแสงชมวิวเมืองโอซาก้ายามพระอาทิตย์ตกถึงค่ำ',
    isCurated: true,
    facets: ['rainy-day', 'near-station', 'luggage-storage', 'wheelchair'],
  },
  {
    id: 'w-tofukuji-eikando',
    title: 'วัดโทฟุคุจิ & วัดเอคันโด (ใบไม้เปลี่ยนสีช่วงท้ายต้นธันวาคม)',
    japaneseTitle: '東福寺・永観堂 禅林寺',
    category: 'sight',
    district: 'Kyoto (1 สถานีจาก Kyoto Station)',
    costEstimate: '¥600 - ¥1,000',
    highlight: 'จุดชมใบเมเปิ้ลสีแดงสะพานไม้ Tsutenkyo ที่ยังคงมีใบไม้แดงช่วงสัปดาห์แรกของเดือนธันวาคม เดินทางง่ายติดสถานี Tofukuji',
    isCurated: true,
    facets: ['near-station'],
  },
];

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  selectedDay: string;
  availableDays: string[];
  itinerary?: any[];
  initialTab?: 'wishlist' | 'shopping';
  onSyncShoppingExpense?: (
    item: ShoppingBagItem,
    nextStatus: ShoppingItemStatus
  ) => Promise<void> | void;
  onAddToItinerary: (item: {
    title: string;
    category: string;
    location: string;
    budget?: number;
  }) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function WishlistDrawer({
  isOpen,
  onClose,
  tripId,
  selectedDay,
  availableDays = [],
  itinerary = [],
  initialTab = 'wishlist',
  onSyncShoppingExpense,
  onAddToItinerary,
  onShowToast,
}: WishlistDrawerProps) {
  const [activeTab, setActiveTab] = useState<'shopping' | 'wishlist'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // --- Shopping Bag State ---
  const [shoppingItems, setShoppingItems] = useState<ShoppingBagItem[]>([]);
  const [shopStatusFilter, setShopStatusFilter] = useState<'all' | ShoppingItemStatus>('all');
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState<ShoppingItemCategory>('souvenir-food');
  const [shopEstPrice, setShopEstPrice] = useState('1500');
  const [shopQty, setShopQty] = useState('1');
  const [shopStopName, setShopStopName] = useState('');
  const [shopForWhom, setShopForWhom] = useState('');
  const [shopNote, setShopNote] = useState('');
  const [shopTaxFree, setShopTaxFree] = useState(false);

  // --- Curated Explore & Wishlist State ---
  const [items, setItems] = useState<WishlistItem[]>(CURATED_JAPAN_WISHLIST);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'food' | 'shopping' | 'sight' | 'cafe'>('all');
  const [selectedFacets, setSelectedFacets] = useState<FacetTagId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  // New Custom Wishlist Item State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newCategory, setNewCategory] = useState<'food' | 'shopping' | 'sight' | 'cafe'>('food');
  const [newCost, setNewCost] = useState('');
  const [newHighlight, setNewHighlight] = useState('');

  const targetDay = selectedDay === 'all' ? availableDays[0] || 'Day 1' : selectedDay;

  useEffect(() => {
    if (!tripId || typeof window === 'undefined') return;
    const syncShop = () => setShoppingItems(getShoppingBag(tripId));
    syncShop();
    return subscribeShoppingBag(syncShop);
  }, [tripId]);

  useEffect(() => {
    if (tripId && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`trip_wishlist_${tripId}`);
        if (raw) {
          const userItems: WishlistItem[] = JSON.parse(raw);
          setItems([...userItems, ...CURATED_JAPAN_WISHLIST]);
        }
      } catch {
        // ignore
      }
    }
  }, [tripId]);

  const shoppingSummary = useMemo(
    () => getShoppingBagSummary(shoppingItems),
    [shoppingItems]
  );

  const filteredShoppingItems = useMemo(() => {
    return shoppingItems.filter((it) => {
      if (shopStatusFilter !== 'all' && it.status !== shopStatusFilter) return false;
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          (it.store && it.store.toLowerCase().includes(q)) ||
          (it.stopName && it.stopName.toLowerCase().includes(q)) ||
          (it.forWhom && it.forWhom.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [shoppingItems, shopStatusFilter, deferredSearch]);

  const handleCreateShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !tripId) return;
    const matchedStop = itinerary.find((s) => s.main_place === shopStopName);
    addShoppingBagItem(tripId, {
      name: shopName.trim(),
      category: shopCategory,
      estPrice: parseInt(shopEstPrice, 10) || 1000,
      quantity: Math.max(1, parseInt(shopQty, 10) || 1),
      store: shopStopName || undefined,
      dayLabel: matchedStop?.date_label || targetDay,
      stopId: matchedStop?.id,
      stopName: shopStopName || undefined,
      forWhom: shopForWhom.trim() || undefined,
      note: shopNote.trim() || undefined,
      taxFreeEligible: shopTaxFree,
      status: 'planned',
    });
    setShoppingItems(getShoppingBag(tripId));
    triggerConfetti();
    onShowToast?.(`เพิ่ม "${shopName.trim()}" ลงกระเป๋าช้อปปิ้งแล้ว 🛍️`, 'success');
    setShowAddShopModal(false);
    setShopName('');
    setShopNote('');
    setShopForWhom('');
  };

  const handleSetShoppingStatus = async (
    item: ShoppingBagItem,
    nextStatus: ShoppingItemStatus
  ) => {
    if (!tripId) return;
    if (onSyncShoppingExpense) {
      await onSyncShoppingExpense(item, nextStatus);
    } else {
      updateShoppingBagItem(tripId, item.id, {
        status: nextStatus,
        boughtAt: nextStatus === 'bought' ? new Date().toISOString() : undefined,
      });
    }
    setShoppingItems(getShoppingBag(tripId));
    if (nextStatus === 'bought') {
      triggerConfetti();
      onShowToast?.(
        `🎉 ช้อป "${item.name}" แล้ว! ซิงก์เข้าหน้ารายจ่ายและอัปเดตพร็อพตัวละครเรียบร้อย`,
        'success'
      );
    }
  };

  const handleDeleteShopItem = (id: string) => {
    if (!tripId) return;
    deleteShoppingBagItem(tripId, id);
    setShoppingItems(getShoppingBag(tripId));
  };

  const toggleFacet = (facetId: FacetTagId) => {
    setSelectedFacets((prev) =>
      prev.includes(facetId) ? prev.filter((f) => f !== facetId) : [...prev, facetId]
    );
  };

  const isSpotAlreadyInPlan = (title: string): boolean => {
    const firstPart = title.split('(')[0].trim().toLowerCase();
    return itinerary.some((stop) => {
      const text = `${stop.main_place || ''} ${stop.food_recommendation || ''} ${stop.backup_plan || ''}`.toLowerCase();
      return firstPart.length >= 4 && text.includes(firstPart);
    });
  };

  const handleSaveCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: WishlistItem = {
      id: `custom-w-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      district: newDistrict.trim() || 'Japan',
      costEstimate: newCost.trim() || '¥1,000',
      highlight: newHighlight.trim() || 'ร้านเด็ดที่เซฟไว้',
      isCurated: false,
    };

    const updated = [newItem, ...items];
    setItems(updated);

    if (tripId && typeof window !== 'undefined') {
      try {
        const userCustomOnly = updated.filter((i) => !i.isCurated);
        localStorage.setItem(`trip_wishlist_${tripId}`, JSON.stringify(userCustomOnly));
      } catch {
        // ignore
      }
    }

    triggerConfetti();
    if (onShowToast) onShowToast(`บันทึก "${newItem.title}" ลงใน Wishlist แล้ว ✨`, 'success');
    setShowAddModal(false);
    setNewTitle('');
    setNewDistrict('');
    setNewCost('');
    setNewHighlight('');
  };

  const handleDeleteCustomItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    if (tripId && typeof window !== 'undefined') {
      try {
        const userCustomOnly = updated.filter((i) => !i.isCurated);
        localStorage.setItem(`trip_wishlist_${tripId}`, JSON.stringify(userCustomOnly));
      } catch {
        // ignore
      }
    }
  };

  const handleAddDirectlyToDay = (item: WishlistItem) => {
    const categoryMap: Record<string, string> = {
      food: 'meal',
      cafe: 'meal',
      shopping: 'shopping',
      sight: 'sightseeing',
    };

    onAddToItinerary({
      title: item.title,
      category: categoryMap[item.category] || 'other',
      location: item.district,
    });

    triggerConfetti();
    if (onShowToast) onShowToast(`🎉 เพิ่ม "${item.title}" เข้าในแพลน ${targetDay} แล้ว!`, 'success');
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (selectedFacets.length > 0) {
        const itemFacets = item.facets || [];
        if (!selectedFacets.every((f) => itemFacets.includes(f))) return false;
      }
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q) ||
          (item.japaneseTitle && item.japaneseTitle.includes(q)) ||
          item.highlight.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, categoryFilter, selectedFacets, deferredSearch]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overscroll-contain overflow-x-hidden animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white dark:bg-[#181a20] shadow-2xl border border-slate-200/90 dark:border-[#262932] max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-[#262932] bg-white/80 dark:bg-[#181a20]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-amber-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
              🛍️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                กระเป๋าช้อปปิ้ง & คลังพิกัดสำรอง (TabiPlan Smart Bag)
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ผูกของฝากเข้ากับจุดแวะ ติ๊กซื้อแล้วซิงก์เข้าหน้ารายจ่ายอัตโนมัติ + กรองร้านเด็ด 8 มิติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'shopping' ? (
              <button
                type="button"
                onClick={() => setShowAddShopModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>เพิ่มของต้องซื้อ</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>เพิ่มร้านเอง</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262932] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top Segmented Mode Switcher */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-50/70 dark:bg-[#15171e]/70 border-b border-slate-100 dark:border-[#262932] space-y-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-[#121316]">
            <button
              type="button"
              onClick={() => setActiveTab('shopping')}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'shopping'
                  ? 'bg-white dark:bg-[#1e2027] text-fuchsia-600 dark:text-fuchsia-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>
                กระเป๋าช้อปปิ้ง ({shoppingSummary.boughtCount}/{shoppingSummary.totalCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wishlist')}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'wishlist'
                  ? 'bg-white dark:bg-[#1e2027] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>คลังพิกัดสำรอง ({items.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'shopping'
                  ? 'ค้นหาของฝาก เช่น มัทฉะ, เครื่องราง, รองเท้า, ดองกี้...'
                  : 'ค้นหาร้าน เช่น ปูยักษ์, อุจิ, ราเมง, อควาเรียม...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#181a20] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {activeTab === 'shopping' ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                {(
                  [
                    { id: 'all', label: `ทั้งหมด (${shoppingItems.length})` },
                    { id: 'planned', label: `📝 รอซื้อ (${shoppingSummary.plannedCount})` },
                    { id: 'bought', label: `✓ ซื้อแล้ว (${shoppingSummary.boughtCount})` },
                    { id: 'out_of_stock', label: '❌ ของหมด' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setShopStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer transition-all ${
                      shopStatusFilter === st.id
                        ? 'bg-fuchsia-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2b2f3d] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
                <span className="text-slate-600 dark:text-slate-300">
                  งบตั้งไว้: ¥{shoppingSummary.totalEstJpy.toLocaleString()}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ซื้อแล้ว: ¥{shoppingSummary.totalBoughtJpy.toLocaleString()}
                </span>
                {shoppingSummary.taxSavedJpy > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300">
                    คืนภาษี ¥{shoppingSummary.taxSavedJpy.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                {[
                  { id: 'all', label: `ทั้งหมด (${items.length})` },
                  { id: 'food', label: '🍜 ของกิน & ร้านอาหาร' },
                  { id: 'shopping', label: '🛍️ ช้อปปิ้ง & เอาท์เล็ท' },
                  { id: 'sight', label: '⛩️ จุดถ่ายรูป & เที่ยว' },
                  { id: 'cafe', label: '☕ คาเฟ่ & มัทฉะ' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2b2f3d] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* TabiPlan 8-Dimension Smart Faceted Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {FACET_FILTER_OPTIONS.map((f) => {
                  const active = selectedFacets.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFacet(f.id)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold shrink-0 border cursor-pointer transition-all ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-[#1e2027] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain custom-scrollbar flex-1 min-h-0 space-y-3">
          {activeTab === 'shopping' ? (
            filteredShoppingItems.map((shopItem) => {
              const catMeta =
                SHOPPING_CATEGORY_META[shopItem.category] || SHOPPING_CATEGORY_META.other;
              const isBought = shopItem.status === 'bought';
              const isOut = shopItem.status === 'out_of_stock';
              const totalYen =
                (shopItem.actualPrice ?? shopItem.estPrice) * Math.max(1, shopItem.quantity || 1);

              return (
                <div
                  key={shopItem.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2 ${
                    isBought
                      ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/25 dark:bg-emerald-950/20'
                      : isOut
                      ? 'border-dashed border-rose-300 dark:border-rose-800/50 bg-rose-50/15 opacity-75'
                      : 'border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 text-[10px] font-black">
                          {catMeta.emoji} {catMeta.label}
                        </span>
                        {shopItem.dayLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                            📅 {shopItem.dayLabel}
                          </span>
                        )}
                        {shopItem.taxFreeEligible && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-300 text-[10px] font-black">
                            🛍️ Tax-Free 10%
                          </span>
                        )}
                        {shopItem.forWhom && (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            🎁 สำหรับ: {shopItem.forWhom}
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm sm:text-base font-black ${
                          isBought
                            ? 'line-through text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {shopItem.name}
                      </h4>

                      {shopItem.stopName && (
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>จุดแวะ: {shopItem.stopName}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ¥{totalYen.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ¥{(shopItem.actualPrice ?? shopItem.estPrice).toLocaleString()} ×{' '}
                        {shopItem.quantity || 1} ชิ้น
                      </div>
                    </div>
                  </div>

                  {shopItem.note && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#181a20] p-2 rounded-xl border border-slate-100 dark:border-[#2b2f3d] text-left">
                      💡 {shopItem.note}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetShoppingStatus(shopItem, isBought ? 'planned' : 'bought')
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                          isBought
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-xs'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {isBought
                            ? 'ซื้อแล้ว ✓ (ซิงก์รายจ่ายแล้ว)'
                            : 'ติ๊กซื้อแล้ว (ตัดงบอัตโนมัติ)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSetShoppingStatus(
                            shopItem,
                            isOut ? 'planned' : 'out_of_stock'
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                          isOut
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-100 dark:bg-[#181a20] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isOut ? 'ของหมด ❌' : 'ของหมด'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteShopItem(shopItem.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="ลบรายการ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            filteredItems.map((item) => {
              const alreadyInPlan = isSpotAlreadyInPlan(item.title);
              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e] hover:border-blue-500/60 transition-all shadow-2xs group space-y-2.5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          {item.category === 'food'
                            ? '🍜 อาหาร'
                            : item.category === 'shopping'
                            ? '🛍️ ช้อปปิ้ง'
                            : item.category === 'sight'
                            ? '⛩️ ท่องเที่ยว'
                            : '☕ คาเฟ่'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span>{item.district}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.costEstimate}
                        </span>
                        {alreadyInPlan && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                            ✓ มีในแผนแล้ว
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {item.title}
                      </h4>

                      {item.japaneseTitle && (
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                          {item.japaneseTitle}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${item.title} ${item.district}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-[#2b2f3d] rounded-xl transition-colors cursor-pointer"
                        title="เปิดดูใน Google Maps"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>

                      {!item.isCurated && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                          title="ลบออกจาก Wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#181a20] p-2.5 rounded-xl leading-relaxed border border-slate-100 dark:border-[#2b2f3d]">
                    💡 {item.highlight}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAddDirectlyToDay(item)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ เพิ่มเข้าแพลน {targetDay} ทันที</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Shopping Item Modal */}
      {showAddShopModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
          onClick={() => setShowAddShopModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#181a20] rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-[#262932] shadow-2xl animate-in zoom-in-95 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262932]">
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-fuchsia-600" />
                <span>เพิ่มรายการของต้องซื้อเข้ากระเป๋าช้อปปิ้ง</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddShopModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShoppingItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  ชื่อสินค้า / ของฝาก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผงมัทฉะ Nakamura, รองเท้า Onitsuka..."
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    หมวดหมู่
                  </label>
                  <select
                    value={shopCategory}
                    onChange={(e) => setShopCategory(e.target.value as ShoppingItemCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] font-bold text-slate-900 dark:text-white"
                  >
                    {Object.entries(SHOPPING_CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.emoji} {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    ราคาต่อชิ้น (¥)
                  </label>
                  <input
                    type="number"
                    value={shopEstPrice}
                    onChange={(e) => setShopEstPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    จำนวน
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={shopQty}
                    onChange={(e) => setShopQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  ผูกกับจุดแวะในตารางเที่ยว (จะไปโผล่บนการ์ดจุดแวะนั้นอัตโนมัติ)
                </label>
                <select
                  value={shopStopName}
                  onChange={(e) => setShopStopName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- ไม่ระบุจุดแวะเฉพาะเจาะจง --</option>
                  {itinerary.map((stop, idx) => (
                    <option key={stop.id || idx} value={stop.main_place}>
                      {stop.date_label ? `[${stop.date_label}] ` : ''}
                      {stop.main_place}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    ซื้อฝากใคร
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตัวเอง, แม่, ที่ทำงาน"
                    value={shopForWhom}
                    onChange={(e) => setShopForWhom(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopTaxFree}
                      onChange={(e) => setShopTaxFree(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>🛍️ ขอคืนภาษี Tax-Free 10% ได้</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  โน้ตเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น รุ่นสีขาวไซส์ 27cm, เคาน์เตอร์ชั้น 3"
                  value={shopNote}
                  onChange={(e) => setShopNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
              >
                บันทึกลงกระเป๋าช้อปปิ้ง
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Wishlist Item Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#181a20] rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-[#262932] shadow-2xl animate-in zoom-in-95 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262932]">
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>เพิ่มร้านเด็ดในคลังพิกัดสำรอง</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  ชื่อร้านค้า / พิกัด *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ราเมงข้อสอบ Dotonbori, คาเฟ่มัทฉะ"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    หมวดหมู่
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold cursor-pointer text-slate-900 dark:text-white"
                  >
                    <option value="food">🍜 ของกิน / อาหาร</option>
                    <option value="cafe">☕ คาเฟ่ / ขนม</option>
                    <option value="shopping">🛍️ ช้อปปิ้ง</option>
                    <option value="sight">⛩️ ท่องเที่ยว / ถ่ายรูป</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    ย่าน / เมือง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Namba, Kyoto"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  ราคาเฉลี่ยโดยประมาณ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ¥1,500 - ¥2,000"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                  โน้ต / ไฮไลท์เด็ด
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น เมนูแนะนำคือข้าวหน้าเนื้อ, ต้องจองก่อน 1 วัน..."
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#15171e] text-xs font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
              >
                บันทึกลงคลังพิกัดสำรอง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
