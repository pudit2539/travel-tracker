'use client';

import React, { useEffect } from 'react';
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
}: TripToolsSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

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
            accent: 'bg-rose-500/10 text-[#C83E2D] dark:text-rose-400',
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
  ];

  const planAndMemoryTools: ToolTile[] = [
    ...(onOpenPassport
      ? [
          {
            id: 'passport',
            label: 'สมุดตราปั๊ม & Wrapped',
            subtitle: 'Goshuin + การ์ดแชร์ Story',
            icon: <Stamp className="h-4 w-4" />,
            accent: 'bg-rose-500/10 text-[#C83E2D] dark:text-rose-400',
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

  return (
    <ModalPortal lockScroll>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto overscroll-contain modal-safe-overlay animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="ศูนย์รวมเครื่องมือทริป"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#FDFBF7] dark:bg-[#181a20] border-t sm:border border-[#DFD7C7] dark:border-[#262932] shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 modal-safe-card"
        >
          {/* Mobile Pull Handle + Header */}
          <div className="pt-2.5 px-4 pb-3 border-b border-[#EAE2D3] dark:border-[#262932] shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2.5 sm:hidden" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#1C2630] dark:bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    เครื่องมือทริปทั้งหมด
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    รวมทุกฟีเจอร์ไว้เป็นหมวดหมู่ เลือกใช้งานได้ใน 1 แตะ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดหน้าต่างเครื่องมือ"
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#22252E] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Categorized Tool Tiles */}
          <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain space-y-4 custom-scrollbar">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8C8275] dark:text-slate-400 px-0.5">
                  {section.title}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {section.items.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={tool.onClick}
                      className={`min-h-[64px] p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] flex flex-col justify-between gap-1.5 ${
                        tool.active
                          ? 'bg-[#1C2630] dark:bg-blue-600/20 border-[#1C2630] dark:border-blue-500 text-white dark:text-blue-200 shadow-sm'
                          : 'bg-white dark:bg-[#121316] border-[#E5DEC9] dark:border-[#262932] hover:border-[#C83E2D] dark:hover:border-blue-500/60 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tool.active ? 'bg-white/15 text-white' : tool.accent
                          }`}
                        >
                          {tool.icon}
                        </span>
                        {tool.badge && (
                          <span
                            className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                              tool.active
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-[#1e2027] text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black truncate">{tool.label}</div>
                        <div
                          className={`text-[10px] font-medium truncate ${
                            tool.active
                              ? 'text-white/75'
                              : 'text-slate-500 dark:text-slate-400'
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
