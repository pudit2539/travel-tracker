'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Plane,
  Building2,
  Coins,
  CloudSun,
  QrCode,
  Utensils,
  Dices,
  ShoppingBag,
  Sparkles,
  Luggage,
  Camera,
  Bot,
  Compass,
  FileText,
  Wrench,
  Stamp,
  Languages,
  Star,
  Film,
} from 'lucide-react';
import { ModalPortal } from '@/components/ModalPortal';
import { triggerHaptic } from '@/lib/haptics';

interface TripToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  staysCount: number;
  shoppingBoughtCount: number;
  shoppingTotalCount: number;
  canSeeMoney: boolean;
  spentSummaryText?: string;
  showFlights: boolean;
  showHotels: boolean;
  showBudget: boolean;
  showWeather: boolean;
  onToggleFlights: () => void;
  onToggleHotels: () => void;
  onToggleBudget: () => void;
  onToggleWeather: () => void;
  onOpenTicketLocker?: () => void;
  onOpenGourmetRadar?: () => void;
  onOpenDiningDecision?: () => void;
  onOpenShoppingBag: () => void;
  onOpenWishlist: () => void;
  onOpenPacking?: () => void;
  onOpenScrapbook?: () => void;
  onOpenAIAssistant?: () => void;
  onOpenTravelHub: () => void;
  onOpenPrintable: () => void;
  onOpenPassport?: (tab?: 'passport' | 'wrapped') => void;
  onOpenPhrasebook?: () => void;
  onOpenStarredPlaces?: () => void;
  onOpenTripReel?: () => void;
  starredCount?: number;
}

interface ToolTile {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
}

export function TripToolsSheet({
  isOpen,
  onClose,
  staysCount,
  shoppingBoughtCount,
  shoppingTotalCount,
  canSeeMoney,
  spentSummaryText,
  showFlights,
  showHotels,
  showBudget,
  showWeather,
  onToggleFlights,
  onToggleHotels,
  onToggleBudget,
  onToggleWeather,
  onOpenTicketLocker,
  onOpenGourmetRadar,
  onOpenDiningDecision,
  onOpenShoppingBag,
  onOpenWishlist,
  onOpenPacking,
  onOpenScrapbook,
  onOpenAIAssistant,
  onOpenTravelHub,
  onOpenPrintable,
  onOpenPassport,
  onOpenPhrasebook,
  onOpenStarredPlaces,
  onOpenTripReel,
  starredCount = 0,
}: TripToolsSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
    setIsDragging(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0]?.clientY ?? touchStartYRef.current;
    const delta = currentY - touchStartYRef.current;
    if (delta > 0) {
      setDragY(Math.min(delta * 0.85, 220));
    }
  };

  const handleSheetTouchEnd = () => {
    setIsDragging(false);
    touchStartYRef.current = null;
    if (dragY > 88) {
      triggerHaptic('light');
      setDragY(0);
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  const runAction = (fn?: () => void) => {
    triggerHaptic('light');
    onClose();
    fn?.();
  };

  const logisticsTools: ToolTile[] = [
    {
      id: 'flights',
      label: 'ตั๋วเครื่องบิน',
      subtitle: 'ไฟลต์, เกต, บุ๊กกิ้ง',
      icon: <Plane className="h-4 w-4" />,
      accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      active: showFlights,
      onClick: () => runAction(onToggleFlights),
    },
    {
      id: 'hotels',
      label: 'ที่พัก / โรงแรม',
      subtitle: 'เช็กอิน & แผนที่โรงแรม',
      icon: <Building2 className="h-4 w-4" />,
      accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      active: showHotels,
      badge: `${staysCount}`,
      onClick: () => runAction(onToggleHotels),
    },
    ...(onOpenTicketLocker
      ? [
          {
            id: 'qr-pass',
            label: 'QR Pass Locker',
            subtitle: 'ตั๋วรถไฟ, USJ, พาส',
            icon: <QrCode className="h-4 w-4" />,
            accent: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            onClick: () => runAction(onOpenTicketLocker),
          },
        ]
      : []),
    {
      id: 'weather',
      label: 'อากาศ & เส้นทาง',
      subtitle: 'พยากรณ์อากาศตามเมือง',
      icon: <CloudSun className="h-4 w-4" />,
      accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      active: showWeather,
      onClick: () => runAction(onToggleWeather),
    },
    ...(onOpenPacking
      ? [
          {
            id: 'packing',
            label: 'จัดกระเป๋า',
            subtitle: 'เช็คลิสต์ของจำเป็น',
            icon: <Luggage className="h-4 w-4" />,
            accent: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
            onClick: () => runAction(onOpenPacking),
          },
        ]
      : []),
  ];

  const foodAndShopTools: ToolTile[] = [
    ...(onOpenGourmetRadar
      ? [
          {
            id: 'gourmet',
            label: 'เรดาร์ร้านอร่อย',
            subtitle: 'ร้านเด็ดในแผน & นอกแผน',
            icon: <Utensils className="h-4 w-4" />,
            accent: 'bg-sky-500/12 text-[#0284c7] dark:bg-[#4cd7f6]/15 dark:text-[#4cd7f6]',
            onClick: () => runAction(onOpenGourmetRadar),
          },
        ]
      : []),
    ...(onOpenDiningDecision
      ? [
          {
            id: 'dice',
            label: 'สุ่มมื้อ / ที่เที่ยว',
            subtitle: 'คิดไม่ออกให้ช่วยสุ่ม',
            icon: <Dices className="h-4 w-4" />,
            accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
            onClick: () => runAction(onOpenDiningDecision),
          },
        ]
      : []),
    {
      id: 'shopping',
      label: 'กระเป๋าช้อปปิ้ง',
      subtitle: 'ของฝากผูกจุดแวะ',
      icon: <ShoppingBag className="h-4 w-4" />,
      accent: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
      badge: `${shoppingBoughtCount}/${shoppingTotalCount}`,
      onClick: () => runAction(onOpenShoppingBag),
    },
    {
      id: 'wishlist',
      label: 'คลังพิกัดสำรอง',
      subtitle: 'ที่เที่ยวแนะนำเพิ่มเติม',
      icon: <Sparkles className="h-4 w-4" />,
      accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      onClick: () => runAction(onOpenWishlist),
    },
    {
      id: 'travel-hub',
      label: 'Travel Hub',
      subtitle: 'แปลภาษา, SOS, เรตเงิน',
      icon: <Compass className="h-4 w-4" />,
      accent: 'bg-slate-900/10 text-slate-800 dark:bg-blue-500/15 dark:text-blue-300',
      onClick: () => runAction(onOpenTravelHub),
    },
    ...(onOpenPhrasebook
      ? [
          {
            id: 'phrasebook',
            label: 'สมุดคำพูดญี่ปุ่น',
            subtitle: 'ฝึกพูด • ฟังเสียง • Flashcard',
            icon: <Languages className="h-4 w-4" />,
            accent: 'bg-blue-500/12 text-[#2563eb] dark:bg-[#4cd7f6]/15 dark:text-[#4cd7f6]',
            onClick: () => runAction(onOpenPhrasebook),
          },
        ]
      : []),
  ];

  const planAndMemoryTools: ToolTile[] = [
    ...(onOpenStarredPlaces
      ? [
          {
            id: 'starred',
            label: 'สถานที่ & ร้านติดดาว',
            subtitle: 'รวมร้านเด็ดและจุดอยากไป',
            icon: <Star className="h-4 w-4 fill-amber-400 text-amber-500" />,
            accent: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
            badge: starredCount > 0 ? `${starredCount}` : undefined,
            onClick: () => runAction(onOpenStarredPlaces),
          },
        ]
      : []),
    ...(onOpenTripReel
      ? [
          {
            id: 'trip-reel',
            label: 'Trip Reel สไลด์โชว์',
            subtitle: 'เล่นภาพไฮไลท์อัตโนมัติ',
            icon: <Film className="h-4 w-4" />,
            accent: 'bg-cyan-500/12 text-cyan-600 dark:text-[#4cd7f6]',
            onClick: () => runAction(onOpenTripReel),
          },
        ]
      : []),
    ...(onOpenPassport
      ? [
          {
            id: 'passport',
            label: 'สมุดตราปั๊ม & Wrapped',
            subtitle: 'Goshuin + การ์ดแชร์ Story',
            icon: <Stamp className="h-4 w-4" />,
            accent: 'bg-indigo-500/12 text-[#2563eb] dark:bg-[#b4c5ff]/15 dark:text-[#b4c5ff]',
            onClick: () => runAction(() => onOpenPassport('passport')),
          },
        ]
      : []),
    ...(onOpenAIAssistant
      ? [
          {
            id: 'ai',
            label: 'ถาม AI ผู้ช่วย',
            subtitle: 'ค้นหาร้าน & ที่เที่ยวลับ',
            icon: <Bot className="h-4 w-4" />,
            accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            onClick: () => runAction(onOpenAIAssistant),
          },
        ]
      : []),
    ...(onOpenScrapbook
      ? [
          {
            id: 'scrapbook',
            label: 'อัลบั้มภาพทริป',
            subtitle: 'Polaroid Scrapbook',
            icon: <Camera className="h-4 w-4" />,
            accent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            onClick: () => runAction(onOpenScrapbook),
          },
        ]
      : []),
    ...(canSeeMoney
      ? [
          {
            id: 'budget',
            label: 'สรุปงบประมาณ',
            subtitle: spentSummaryText || 'ดูยอดใช้จ่ายรวม',
            icon: <Coins className="h-4 w-4" />,
            accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            active: showBudget,
            onClick: () => runAction(onToggleBudget),
          },
        ]
      : []),
    {
      id: 'pdf',
      label: 'พิมพ์ / เซฟ PDF',
      subtitle: 'โปสเตอร์ & Booklet',
      icon: <FileText className="h-4 w-4" />,
      accent: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
      onClick: () => runAction(onOpenPrintable),
    },
  ];

  const sections = [
    { title: 'เอกสาร & การเดินทาง', items: logisticsTools },
    { title: 'ของกิน & ช้อปปิ้ง', items: foodAndShopTools },
    { title: 'วางแผน & ความทรงจำ', items: planAndMemoryTools },
  ].filter((sec) => sec.items.length > 0);

  const totalToolsCount = sections.reduce((sum, sec) => sum + sec.items.length, 0);

  return (
    <ModalPortal lockScroll>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#040914]/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto overscroll-contain modal-safe-overlay animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="ศูนย์รวมเครื่องมือทริป"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
            transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#f8fafd] dark:bg-[#0d131f] border-t sm:border border-[#dbeafe] dark:border-[#4cd7f6]/20 shadow-[0_24px_48px_-12px_rgba(4,9,20,0.6)] max-h-[88dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 modal-safe-card will-change-transform"
        >
          {/* Mobile Pull Handle + Oceanic Header */}
          <div
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            className="pt-2.5 px-4 pb-3.5 border-b border-[#e2e8f0] dark:border-[#24324a] bg-white/90 dark:bg-[#161c27]/90 backdrop-blur-xl shrink-0 touch-none"
          >
            <div
              className={`h-1 rounded-full mx-auto mb-2.5 sm:hidden transition-all duration-150 ${
                isDragging ? 'w-14 bg-[#2563eb] dark:bg-[#4cd7f6]' : 'w-10 bg-slate-300 dark:bg-[#334155]'
              }`}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#0284c7] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(37,99,235,0.35)] shrink-0">
                  <Wrench className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#4cd7f6]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] dark:bg-[#4cd7f6] animate-pulse" />
                      QUICK LAUNCHER · {totalToolsCount} TOOLS
                    </span>
                  </div>
                  <h2 className="font-serif text-base sm:text-lg font-bold text-[#0f172a] dark:text-[#f8fafc] leading-tight">
                    เครื่องมือทริปทั้งหมด
                  </h2>
                  <p className="text-[11px] font-medium text-[#475569] dark:text-[#94a3b8]">
                    รวมทุกฟีเจอร์ไว้เป็นหมวดหมู่ ใช้งานได้ใน 1 แตะ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดหน้าต่างเครื่องมือ"
                className="min-w-[40px] min-h-[40px] rounded-full bg-[#f1f5f9] dark:bg-[#1a202c] border border-[#e2e8f0] dark:border-[#24324a] text-[#475569] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:border-[#2563eb] dark:hover:border-[#4cd7f6]/50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Categorized Tool Tiles */}
          <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain space-y-5 custom-scrollbar">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#0f172a] dark:text-[#dde2f3] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] dark:bg-[#4cd7f6]" />
                    <span>{section.title}</span>
                  </h3>
                  <span className="text-[10px] font-mono font-semibold text-[#64748b] dark:text-[#8d90a0]">
                    {section.items.length} ITEMS
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {section.items.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={tool.onClick}
                      className={`min-h-[72px] p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] flex flex-col justify-between gap-2 ${
                        tool.active
                          ? 'bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] border-[#3b82f6] text-white shadow-[0_6px_18px_rgba(37,99,235,0.32)]'
                          : 'bg-white dark:bg-[#161c27] border-[#e2e8f0] dark:border-[#24324a] hover:border-[#2563eb] dark:hover:border-[#4cd7f6]/50 hover:shadow-[0_6px_18px_-4px_rgba(6,182,212,0.16)] text-[#0f172a] dark:text-[#dde2f3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tool.active ? 'bg-white/20 text-white' : tool.accent
                          }`}
                        >
                          {tool.icon}
                        </span>
                        {tool.badge && (
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              tool.active
                                ? 'bg-white/20 text-white'
                                : 'bg-[#eff6ff] dark:bg-[#080e19] text-[#1d4ed8] dark:text-[#4cd7f6] border border-[#dbeafe] dark:border-[#4cd7f6]/20'
                            }`}
                          >
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{tool.label}</div>
                        <div
                          className={`text-[10px] font-medium truncate ${
                            tool.active
                              ? 'text-blue-100'
                              : 'text-[#64748b] dark:text-[#94a3b8]'
                          }`}
                        >
                          {tool.subtitle}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
