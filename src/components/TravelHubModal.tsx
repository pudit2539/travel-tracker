// src/components/TravelHubModal.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { 
  X, Sparkles, Languages, MapPin, QrCode, Share2, 
  Download, Volume2, Copy, Check, ExternalLink, 
  Smartphone, Plus, Trash2, Camera, ShieldCheck, 
  Compass, Search, ArrowRight, Eye, Store, DollarSign,
  Utensils, Train, ShoppingBag, AlertTriangle, Building,
  FileCheck, Sparkle, RefreshCw, Calculator, PhoneCall,
  Percent, ArrowUpDown, ChevronRight, CheckCircle2,
  Luggage, Info, Maximize2, ShieldAlert
} from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';
import { saveLocalReceiptPhoto, getLocalReceiptPhoto, deleteLocalReceiptPhoto } from '@/lib/localReceipts';

interface TravelHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  expenses?: any[];
  itinerary?: any[];
  members?: any[];
  userDisplayName?: string;
  fxRate?: number;
  onOpenScrapbook?: () => void;
  onOpenPacking?: () => void;
}

// 1. Japanese Survival Phrases Data
interface PhraseItem {
  id: string;
  category: 'food' | 'shopping' | 'transport' | 'emergency';
  japanese: string;
  romaji: string;
  thai: string;
  context: string;
}

const JAPANESE_PHRASES: PhraseItem[] = [
  // Food
  { id: 'f1', category: 'food', japanese: '英語のメニューはありますか？', romaji: 'Eigo no menyū wa arimasu ka?', thai: 'มีเมนูภาษาอังกฤษไหมครับ/ค่ะ?', context: 'ใช้ถามพนักงานเมื่อเข้าร้านอาหาร' },
  { id: 'f2', category: 'food', japanese: 'おすすめは何ですか？', romaji: 'Osusume wa nan desu ka?', thai: 'มีเมนูแนะนำอะไรบ้างครับ/ค่ะ?', context: 'ให้พนักงานแนะนำจานเด็ด' },
  { id: 'f3', category: 'food', japanese: 'お会計は別々でお願いします。', romaji: 'Okaikei wa betsubetsu de onegaishimasu.', thai: 'ขอเช็คบิลแยกกันครับ/ค่ะ (หารกัน)', context: 'ขอจ่ายเงินแยกรายคน' },
  { id: 'f4', category: 'food', japanese: 'わさび抜きでお願いします。', romaji: 'Wasabi nuki de onegaishimasu.', thai: 'ขอไม่ใส่วาซาบิครับ/ค่ะ', context: 'สั่งซูชิ/อาหารแบบไม่เอาวาซาบิ' },
  { id: 'f5', category: 'food', japanese: 'お水をください。', romaji: 'Omizu o kudasai.', thai: 'ขอน้ำดื่มหน่อยครับ/ค่ะ', context: 'ขอน้ำดื่มฟรีในร้านอาหาร' },
  { id: 'f6', category: 'food', japanese: 'ごちそうさまでした！', romaji: 'Gochisōsama deshita!', thai: 'ขอบคุณสำหรับอาหาร (อร่อยมากครับ/ค่ะ)', context: 'พูดกับเชฟ/พนักงานตอนทานเสร็จ' },

  // Shopping & Tax Free
  { id: 's1', category: 'shopping', japanese: '免税（Tax Free）できますか？', romaji: 'Menzei dekimasu ka?', thai: 'ทำเรื่องคืนภาษี (Tax Free) ได้ไหมครับ/ค่ะ?', context: 'ถามตอนจ่ายเงินในห้างหรือร้านค้า' },
  { id: 's2', category: 'shopping', japanese: 'これの新しいものはありますか？', romaji: 'Kore no atarashii mono wa arimasu ka?', thai: 'มีของชิ้นใหม่ในสต็อกไหมครับ/ค่ะ?', context: 'ขอของใหม่ที่ไม่ใช่ตัวโชว์หน้าร้าน' },
  { id: 's3', category: 'shopping', japanese: '試着してもいいですか？', romaji: 'Shichaku shitemo ii desu ka?', thai: 'ขอลองสวมชุดนี้ได้ไหมครับ/ค่ะ?', context: 'ขอลองเสื้อผ้าก่อนตัดสินใจซื้อ' },
  { id: 's4', category: 'shopping', japanese: 'クレジットカードは使えますか？', romaji: 'Kurejitto kādo wa tsukaemasu ka?', thai: 'รับบัตรเครดิต / Travel Card ไหมครับ/ค่ะ?', context: 'ถามช่องทางชำระเงิน' },
  { id: 's5', category: 'shopping', japanese: '袋は要りません。', romaji: 'Fukuro wa irimasen.', thai: 'ไม่รับถุงพลาสติกครับ/ค่ะ', context: 'ปฏิเสธถุงเพื่อประหยัดเงิน' },

  // Transport & Station
  { id: 't1', category: 'transport', japanese: 'この電車は空港へ行きますか？', romaji: 'Kono densha wa kūkō e ikimasu ka?', thai: 'รถไฟขบวนนี้ไปสนามบินไหมครับ/ค่ะ?', context: 'ถามเพื่อความแน่ใจก่อนขึ้นชานชาลา' },
  { id: 't2', category: 'transport', japanese: 'コインロッカーはどこですか？', romaji: 'Koin rokkā wa doko desu ka?', thai: 'ตู้ฝากกระเป๋า (Coin Locker) อยู่ตรงไหน?', context: 'ถามหาสถานที่ฝากกระเป๋าในสถานี' },
  { id: 't3', category: 'transport', japanese: '切符売り場はどこですか？', romaji: 'Kippu uriba wa doko desu ka?', thai: 'เคาน์เตอร์ขายตั๋วรถไฟอยู่ทางไหนครับ/ค่ะ?', context: 'หาตู้ซื้อตั๋วหรือจุดออกตั๋ว JR' },
  { id: 't4', category: 'transport', japanese: 'トイレはどこですか？', romaji: 'Toire wa doko desu ka?', thai: 'ห้องน้ำอยู่ที่ไหนครับ/ค่ะ?', context: 'ถามหาห้องน้ำสาธารณะ' },

  // Emergency & Assistance
  { id: 'e1', category: 'emergency', japanese: 'すみません、助けてください。', romaji: 'Sumimasen, tasukete kudasai.', thai: 'ขอโทษนะครับ/ค่ะ ช่วยฉันหน่อยได้ไหม?', context: 'ขอความช่วยเหลือเร่งด่วน' },
  { id: 'e2', category: 'emergency', japanese: '日本語が分かりません。', romaji: 'Nihongo ga wakarimasen.', thai: 'ฉันพูดภาษาญี่ปุ่นไม่ได้ครับ/ค่ะ', context: 'บอกเมื่อฟังไม่เข้าใจ' },
  { id: 'e3', category: 'emergency', japanese: 'Wi-Fiのパスワードは何ですか？', romaji: 'Waifai no pasuwādo wa nan desu ka?', thai: 'รหัสผ่าน Wi-Fi คืออะไรครับ/ค่ะ?', context: 'ขอรหัสเชื่อมต่ออินเทอร์เน็ต' },
  { id: 'e4', category: 'emergency', japanese: '病院はどこですか？', romaji: 'Byōin wa doko desu ka?', thai: 'โรงพยาบาล/คลินิกที่ใกล้ที่สุดอยู่ที่ไหน?', context: 'เจ็บป่วยฉุกเฉิน' },
];

// 2. Nearby Radar Presets
interface NearbyPreset {
  id: string;
  name: string;
  icon: string;
  query: string;
  description: string;
  badge: string;
}

const NEARBY_PRESETS: NearbyPreset[] = [
  { id: 'conv-711', name: '7-Eleven & 7-Bank ATM', icon: '🏪', query: '7-Eleven', description: 'ร้านสะดวกซื้อ & ตู้กดเงินเยนฉุกเฉินรับบัตรไทย', badge: 'สะดวกซื้อ & ATM' },
  { id: 'conv-lawson', name: 'Lawson / FamilyMart', icon: '🥪', query: 'Lawson, FamilyMart', description: 'ไก่ทอด Karaage-kun ขนมหวาน และของใช้ด่วน', badge: 'ของกิน & อาหาร' },
  { id: 'donki', name: 'Don Quijote (ดองกิ)', icon: '🐧', query: 'Don Quijote', description: 'ของฝาก ขนม เครื่องสำอาง 24 ชม. Tax-Free', badge: 'Tax-Free 24h' },
  { id: 'drugstore', name: 'ร้านขายยา Matsumoto Kiyoshi', icon: '💊', query: 'Matsumoto Kiyoshi, Sundrug, Daikoku Drug', description: 'แผ่นแปะแก้ปวด ยาหยอดตา สกินแคร์ & เวชภัณฑ์', badge: 'ยา & เวชสำอาง' },
  { id: 'toilet', name: 'ห้องน้ำสาธารณะ (Restroom)', icon: '🚻', query: 'Public Restroom, Public Toilet', description: 'จุดห้องน้ำสะอาดใกล้ตัวคุณ', badge: 'ด่วน' },
  { id: 'locker', name: 'ตู้ฝากกระเป๋า (Coin Locker)', icon: '🛅', query: 'Coin Locker, Luggage Storage', description: 'จุดฝากสัมภาระรอบสถานีรถไฟ', badge: 'ฝากสัมภาระ' },
  { id: 'mcdonald', name: 'Starbucks / McDonald\'s', icon: '☕', query: 'Starbucks, McDonald\'s', description: 'จุดนั่งพักชาร์จแบตเตอรี่ & Wi-Fi ฟรี', badge: 'คาเฟ่ & จุดชาร์จ' },
  { id: 'supermarket', name: 'ซูเปอร์มาร์เก็ตลดราคาดึก', icon: '🍱', query: 'Supermarket, Life Supermarket', description: 'ซูชิและเบนโตะลดราคา 50% หลัง 2 ทุ่ม', badge: 'ของสด & ลดราคา' },
];

// 3. Emergency Contacts Data
interface EmergencyContact {
  id: string;
  title: string;
  tel: string;
  detail: string;
  icon: string;
  badge: string;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: 'police', title: 'ตำรวจญี่ปุ่น (Police Emergency)', tel: '110', detail: 'แจ้งเหตุด่วนเหตุร้าย ของหาย อุบัติเหตุ', icon: '👮', badge: 'โทรฟรี 24 ชม.' },
  { id: 'ambulance', title: 'กู้ภัย / รถพยาบาล (Ambulance & Fire)', tel: '119', detail: 'เจ็บป่วยฉุกเฉิน เรียกรถพยาบาล ไฟไหม้', icon: '🚑', badge: 'โทรฟรี 24 ชม.' },
  { id: 'jnto', title: 'Japan Visitor Hotline (JNTO)', tel: '050-3816-2787', detail: 'ศูนย์ช่วยเหลือนักท่องเที่ยวต่างชาติ 24 ชม. (มีบริการภาษาอังกฤษ/ไทย)', icon: '🌐', badge: 'ศูนย์ท่องเที่ยว' },
  { id: 'thai-embassy-tokyo', title: 'สถานเอกอัครราชทูตไทย ณ กรุงโตเกียว', tel: '090-4435-7812', detail: 'เบอร์ฉุกเฉินคนไทยกรณีหนังสือเดินทางหาย หรือประสบภัยพิบัติ', icon: '🇹🇭', badge: 'สายด่วนคนไทย' },
  { id: 'thai-consulate-osaka', title: 'สถานกงสุลใหญ่ ณ นครโอซาก้า', tel: '090-1895-0987', detail: 'สายด่วนฉุกเฉินสำหรับผู้พำนัก/ท่องเที่ยวแถบคันไซ', icon: '🏯', badge: 'สายด่วนคันไซ' },
];

interface TicketPass {
  id: string;
  title: string;
  category: 'vjw' | 'flight' | 'train' | 'hotel' | 'attraction' | 'other';
  imageStorageKey: string;
  imageUrl?: string;
  note?: string;
  createdAt: number;
}

export default function TravelHubModal({
  isOpen,
  onClose,
  trip,
  expenses = [],
  itinerary = [],
  members = [],
  userDisplayName = 'ฉัน',
  fxRate = 0.235,
  onOpenScrapbook,
  onOpenPacking,
}: TravelHubModalProps) {
  // Navigation Tabs: 'calculator' | 'tickets' | 'phrases' | 'radar' | 'story'
  const [activeTab, setActiveTab] = useState<'calculator' | 'tickets' | 'phrases' | 'radar' | 'story'>('calculator');

  // ==================== 1. TAX-FREE & CURRENCY CALCULATOR STATE ====================
  const [calcInput, setCalcInput] = useState<string>('5500');
  const [taxRateType, setTaxRateType] = useState<'10' | '8'>('10'); // 10% standard or 8% food/drink
  const [priceMode, setPriceMode] = useState<'tax_included' | 'tax_excluded'>('tax_included');
  const [copiedCalc, setCopiedCalc] = useState(false);

  // Calculations
  const numericInput = useMemo(() => {
    const val = parseFloat(calcInput.replace(/,/g, ''));
    return isNaN(val) ? 0 : val;
  }, [calcInput]);

  const taxRate = taxRateType === '10' ? 0.10 : 0.08;

  // If price is Tax Included:
  // Tax-Free price = Total / (1 + taxRate)
  // Tax savings = Total - Tax-Free price
  // If price is Tax Excluded:
  // Tax-Free price = Total
  // Tax-Included price = Total * (1 + taxRate)
  // Tax savings = Tax-Included price - Total
  const { taxFreePrice, taxIncludedPrice, taxSavedYen, priceInThb, taxSavedThb, isTaxFreeEligible, remainingForTaxFree } = useMemo(() => {
    let tf = 0;
    let ti = 0;
    let saved = 0;

    if (priceMode === 'tax_included') {
      ti = numericInput;
      tf = Math.round(numericInput / (1 + taxRate));
      saved = ti - tf;
    } else {
      tf = numericInput;
      ti = Math.round(numericInput * (1 + taxRate));
      saved = ti - tf;
    }

    const thb = Math.round(tf * fxRate);
    const savedThb = Math.round(saved * fxRate);

    // Japan Tax-Free threshold: Purchases >= 5,000 JPY excluding tax
    const eligible = tf >= 5000;
    const remaining = eligible ? 0 : Math.max(0, 5000 - tf);

    return {
      taxFreePrice: tf,
      taxIncludedPrice: ti,
      taxSavedYen: saved,
      priceInThb: thb,
      taxSavedThb: savedThb,
      isTaxFreeEligible: eligible,
      remainingForTaxFree: remaining,
    };
  }, [numericInput, taxRate, priceMode, fxRate]);

  const handleAddPreset = (amount: number) => {
    const current = numericInput;
    setCalcInput((current + amount).toString());
  };

  const handleCopyCalcSummary = () => {
    if (typeof window !== 'undefined') {
      const summary = `🛍️ ช้อปปิ้ง Tax-Free:\nยอดปลอดภาษี: ¥${taxFreePrice.toLocaleString()} (≈ ฿${priceInThb.toLocaleString()})\nประหยัดภาษี ${taxRateType}% ไปได้: ¥${taxSavedYen.toLocaleString()} (฿${taxSavedThb.toLocaleString()})\nเรท: 1 JPY = ${fxRate} THB`;
      navigator.clipboard.writeText(summary);
      setCopiedCalc(true);
      setTimeout(() => setCopiedCalc(false), 2000);
    }
  };

  // ==================== 2. TICKETS & QR VAULT STATE ====================
  const [tickets, setTickets] = useState<TicketPass[]>([]);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<TicketPass['category']>('vjw');
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [previewPassImage, setPreviewPassImage] = useState<string | null>(null);

  // Load Saved Passes from LocalStorage & LocalReceipt DB
  useEffect(() => {
    if (isOpen && trip?.id) {
      loadTickets();
    }
  }, [isOpen, trip?.id]);

  const loadTickets = async () => {
    try {
      const raw = localStorage.getItem(`travel_hub_tickets_${trip?.id}`);
      if (raw) {
        const parsed: TicketPass[] = JSON.parse(raw);
        const hydrated = await Promise.all(
          parsed.map(async (t) => {
            if (t.imageStorageKey) {
              const dataUrl = await getLocalReceiptPhoto(t.imageStorageKey);
              return { ...t, imageUrl: dataUrl || undefined };
            }
            return t;
          })
        );
        setTickets(hydrated);
      }
    } catch (e) {
      console.warn('Failed to load tickets', e);
    }
  };

  const handleUploadPass = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip?.id) return;

    setUploadingTicket(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const storageKey = `pass_${trip.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      
      try {
        await saveLocalReceiptPhoto(storageKey, dataUrl);
        const defaultTitles: Record<string, string> = {
          vjw: 'Visit Japan Web QR (ตม. & ศุลกากร)',
          flight: 'Boarding Pass ตั๋วเครื่องบิน',
          train: 'Shinkansen / JR Pass Ticket',
          hotel: 'Hotel Voucher ใบจองที่พัก',
          attraction: 'บัตรเข้าสวนสนุก / กิจกรรม',
          other: 'เอกสารสำคัญประจำทริป',
        };

        const newTicket: TicketPass = {
          id: storageKey,
          title: ticketTitle.trim() || defaultTitles[ticketCategory] || 'ตั๋วเดินทาง',
          category: ticketCategory,
          imageStorageKey: storageKey,
          imageUrl: dataUrl,
          createdAt: Date.now(),
        };

        const updated = [newTicket, ...tickets];
        setTickets(updated);
        localStorage.setItem(
          `travel_hub_tickets_${trip.id}`,
          JSON.stringify(updated.map(({ imageUrl, ...rest }) => rest))
        );

        triggerConfetti();
        setTicketTitle('');
      } catch (err) {
        console.error('Save pass err', err);
        alert('ไม่สามารถบันทึกตั๋วได้');
      } finally {
        setUploadingTicket(false);
      }
    };
  };

  const handleDeletePass = async (id: string, storageKey: string) => {
    if (!confirm('คุณต้องการลบตั๋ว/QR นี้ใช่หรือไม่?')) return;
    try {
      await deleteLocalReceiptPhoto(storageKey);
      const updated = tickets.filter((t) => t.id !== id);
      setTickets(updated);
      localStorage.setItem(
        `travel_hub_tickets_${trip?.id}`,
        JSON.stringify(updated.map(({ imageUrl, ...rest }) => rest))
      );
    } catch (e) {
      console.error('Delete pass err', e);
    }
  };

  // ==================== 3. PHRASES & BIG DISPLAY STATE ====================
  const [phraseCategory, setPhraseCategory] = useState<'all' | 'food' | 'shopping' | 'transport' | 'emergency'>('all');
  const [phraseSearch, setPhraseSearch] = useState('');
  const deferredPhraseSearch = useDeferredValue(phraseSearch);
  const [bigCardPhrase, setBigCardPhrase] = useState<PhraseItem | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedPhraseId, setCopiedPhraseId] = useState<string | null>(null);

  const speakJapanese = (phrase: PhraseItem) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับระบบออกเสียง');
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingId(phrase.id);

    const utterance = new SpeechSynthesisUtterance(phrase.japanese);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const copyPhraseText = (phrase: PhraseItem) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${phrase.japanese}\n(${phrase.romaji})\nแปลว่า: ${phrase.thai}`);
      setCopiedPhraseId(phrase.id);
      setTimeout(() => setCopiedPhraseId(null), 2000);
    }
  };

  const filteredPhrases = useMemo(() => {
    return JAPANESE_PHRASES.filter((p) => {
      if (phraseCategory !== 'all' && p.category !== phraseCategory) return false;
      if (deferredPhraseSearch.trim()) {
        const q = deferredPhraseSearch.toLowerCase();
        return p.thai.toLowerCase().includes(q) || p.japanese.includes(q) || p.romaji.toLowerCase().includes(q) || p.context.toLowerCase().includes(q);
      }
      return true;
    });
  }, [phraseCategory, deferredPhraseSearch]);

  // ==================== 4. NEARBY RADAR & SOS ====================
  const openNearbyGoogleMaps = (query: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  // Hotel address helper
  const hotelInfo = useMemo(() => {
    const found = itinerary.find((item) => 
      item.category === 'hotel' || 
      item.title?.toLowerCase().includes('hotel') ||
      item.title?.includes('โรงแรม') ||
      item.title?.includes('ที่พัก')
    );
    return found ? {
      name: found.title,
      address: found.location || found.address || found.city || 'ที่พักประจำทริป',
    } : null;
  }, [itinerary]);

  const [copiedHotel, setCopiedHotel] = useState(false);
  const handleCopyHotel = () => {
    if (hotelInfo && typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${hotelInfo.name} - ${hotelInfo.address}`);
      setCopiedHotel(true);
      setTimeout(() => setCopiedHotel(false), 2000);
    }
  };

  // ==================== 5. STORY CARD GENERATOR STATE ====================
  const [storyBgColor, setStoryBgColor] = useState<'midnight' | 'sakura' | 'sunset' | 'fuji'>('midnight');
  const storyCanvasRef = useRef<HTMLDivElement>(null);

  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [expenses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#181a20] shadow-2xl border border-slate-200/90 dark:border-[#262932] max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Mobile Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-[#262932] bg-white/80 dark:bg-[#181a20]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#e79b71] to-amber-500 text-white flex items-center justify-center text-lg shadow-sm shadow-[#e79b71]/20 shrink-0">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Travel Companion Hub
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#e79b71]/15 text-[#d98254] dark:text-[#f2a278]">
                  {trip?.currency || 'JPY'} • ฿{fxRate}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                กล่องเครื่องมือออนทริปสำหรับนักเดินทางตัวจริง
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262932] transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Super-App Pill Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 border-b border-slate-100 dark:border-[#262932] bg-slate-50/70 dark:bg-[#15171e]/70 overflow-x-auto custom-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-[#e79b71] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#222530]'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Tax-Free & เรทเงิน</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-[#e79b71] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#222530]'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>ตั๋ว & QR Vault</span>
            {tickets.length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'tickets' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                {tickets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('phrases')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeTab === 'phrases'
                ? 'bg-[#e79b71] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#222530]'
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>การ์ดยื่น & วลี</span>
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeTab === 'radar'
                ? 'bg-[#e79b71] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#222530]'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>SOS & เรดาร์</span>
          </button>

          <button
            onClick={() => setActiveTab('story')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              activeTab === 'story'
                ? 'bg-[#e79b71] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#222530]'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Story สรุปทริป</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* ========================================================
              TAB 1: SMART TAX-FREE & CURRENCY SHOPPING CALCULATOR
          ======================================================== */}
          {activeTab === 'calculator' && (
            <div className="space-y-4">
              
              {/* Main Interactive Shopping Calculator Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-[#1f222e] border border-slate-200/90 dark:border-[#262932] space-y-4 shadow-sm">
                
                {/* Mode Selectors */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-[#181a20] p-1 rounded-2xl border border-slate-200 dark:border-[#2b2f3d]">
                    <button
                      type="button"
                      onClick={() => setPriceMode('tax_included')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        priceMode === 'tax_included'
                          ? 'bg-[#e79b71] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ราคาป้ายรวมภาษี (税込)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceMode('tax_excluded')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        priceMode === 'tax_excluded'
                          ? 'bg-[#e79b71] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ราคาป้ายไม่รวมภาษี (税抜)
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-white dark:bg-[#181a20] p-1 rounded-2xl border border-slate-200 dark:border-[#2b2f3d]">
                    <button
                      type="button"
                      onClick={() => setTaxRateType('10')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        taxRateType === '10'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="สินค้าทั่วไป, เสื้อผ้า, เครื่องสำอาง (10%)"
                    >
                      ทั่วไป 10%
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxRateType('8')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        taxRateType === '8'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title="ของกิน, ขนม, เครื่องดื่ม (8%)"
                    >
                      ของกิน 8%
                    </button>
                  </div>
                </div>

                {/* Amount Input Display */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between mb-1.5">
                    <span>ระบุราคาป้ายสินค้า ({trip?.currency || 'JPY'}):</span>
                    <span className="text-[10px] text-slate-400">
                      อัตราแลกเปลี่ยนปัจจุบัน 1 JPY = {fxRate} THB
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-lg font-black text-slate-400">
                      ¥
                    </span>
                    <input
                      type="number"
                      value={calcInput}
                      onChange={(e) => setCalcInput(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white dark:bg-[#181a20] border border-slate-300 dark:border-[#2b2f3d] text-slate-900 dark:text-white font-mono text-xl sm:text-2xl font-black outline-none focus:border-[#e79b71] transition-all shadow-inner"
                    />
                    {calcInput && (
                      <button
                        type="button"
                        onClick={() => setCalcInput('')}
                        className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">ปุ่มด่วน:</span>
                  {[
                    { label: '+1,000¥', val: 1000 },
                    { label: '+5,000¥ (Tax-Free)', val: 5000, highlight: true },
                    { label: '+10,000¥', val: 10000 },
                    { label: '+30,000¥', val: 30000 },
                    { label: '+50,000¥', val: 50000 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleAddPreset(btn.val)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        btn.highlight
                          ? 'bg-[#e79b71]/15 text-[#d98254] dark:text-[#f2a278] border border-[#e79b71]/40 hover:bg-[#e79b71]/25'
                          : 'bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2b2f3d] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCalcInput('0')}
                    className="px-2 py-1 rounded-xl text-[11px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto cursor-pointer"
                  >
                    ล้างค่า
                  </button>
                </div>

                {/* Tax-Free Threshold Status Bar */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  isTaxFreeEligible 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60'
                    : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/60'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      {isTaxFreeEligible ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                      <span className={isTaxFreeEligible ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'}>
                        {isTaxFreeEligible ? 'ได้รับสิทธิ์ทำ Tax-Free ทันที (เกิน 5,000 เยน) 🎉' : `ยังไม่ถึงเกณฑ์ Tax-Free (ขาดอีก ¥${remainingForTaxFree.toLocaleString()})`}
                      </span>
                    </span>
                    <span className="text-[10px] font-black opacity-80">
                      เกณฑ์ขั้นต่ำ ¥5,000
                    </span>
                  </div>

                  {/* Progress bar towards 5,000 JPY */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full transition-all duration-300 ${isTaxFreeEligible ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (taxFreePrice / 5000) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Calculation Result Breakdown Cards */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  
                  {/* Left: Net Tax-Free Price in THB & JPY */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#181a20] border border-slate-200/90 dark:border-[#262932] space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      จ่ายจริงแบบ Tax-Free
                    </span>
                    <div className="flex items-baseline gap-1 text-slate-900 dark:text-white">
                      <span className="text-xl sm:text-2xl font-black font-mono">
                        ฿{priceInThb.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold font-mono text-[#e79b71]">
                      ¥{taxFreePrice.toLocaleString()} JPY
                    </p>
                  </div>

                  {/* Right: Tax Saved (Discount) */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      ประหยัดภาษีคืน ({taxRateType}%)
                    </span>
                    <div className="flex items-baseline gap-1 text-emerald-700 dark:text-emerald-300">
                      <span className="text-xl sm:text-2xl font-black font-mono">
                        ฿{taxSavedThb.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +¥{taxSavedYen.toLocaleString()} JPY
                    </p>
                  </div>

                </div>

                {/* Action Buttons: Copy / Share */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyCalcSummary}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedCalc ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                        <span>คัดลอกสรุปราคาแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>คัดลอกส่งเข้า LINE / โน้ต</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Shopping Tips Box */}
              <div className="p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed text-[11px]">
                  <p className="font-bold">เงื่อนไข Tax-Free ในญี่ปุ่น:</p>
                  <p className="opacity-90">ต้องมียอดซื้อตั้งแต่ 5,000 เยนขึ้นไปต่อวันในร้านเดียวกัน แสดง Passport ตัวจริง และสินค้าจะถูกใส่ถุงซีลปลอดภาษี (ห้ามแกะใช้ในญี่ปุ่นจนกว่าจะผ่าน ตม.)</p>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 2: PASS VAULT & FULLSCREEN QR CODES
          ======================================================== */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              
              {/* Add Ticket / QR Code Card */}
              <div className="p-4 rounded-3xl border border-dashed border-[#e79b71] bg-[#e79b71]/5 dark:bg-[#1f222e] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-[#e79b71]" />
                    <span>เพิ่มตั๋ว / QR Code ประจำทริป</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#e79b71]">
                    🔒 เก็บในเครื่อง ปลอดภัย ดูได้แม้ออฟไลน์
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อตั๋ว เช่น Visit Japan Web QR"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="sm:col-span-2 p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#181a20] text-xs font-bold outline-none focus:border-[#e79b71]"
                  />
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#181a20] text-xs font-bold cursor-pointer"
                  >
                    <option value="vjw">🇯🇵 Visit Japan Web (ตม.)</option>
                    <option value="flight">✈️ ตั๋วเครื่องบิน</option>
                    <option value="train">🚅 Shinkansen / JR Pass</option>
                    <option value="hotel">🏨 ใบจองที่พัก / Voucher</option>
                    <option value="attraction">🎟️ บัตรสวนสนุก / กิจกรรม</option>
                    <option value="other">📄 เอกสารสำคัญอื่นๆ</option>
                  </select>
                </div>

                <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#e79b71] to-amber-500 hover:from-[#d98254] hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-[#e79b71]/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer">
                  <Camera className="h-4 w-4" />
                  <span>{uploadingTicket ? 'กำลังประมวลผลรูปภาพ...' : 'ถ่ายภาพ หรือ เลือกภาพ QR Code / ตั๋ว'}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingTicket} onChange={handleUploadPass} />
                </label>
              </div>

              {/* Tickets List */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-[#262932] rounded-3xl space-y-2">
                    <QrCode className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">ยังไม่มีตั๋วหรือ QR Code ในทริปนี้</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                      เซฟ QR Code ของ Visit Japan Web, ตั๋วเครื่องบิน หรือ Voucher โรงแรมไว้ที่นี่ เพื่อเปิดสแกนผ่านเกตหรือแสดงต่อเจ้าหน้าที่ได้ทันทีแม้ออฟไลน์!
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e] flex items-center justify-between gap-3 shadow-2xs hover:border-[#e79b71] transition-all group"
                    >
                      <div
                        onClick={() => t.imageUrl && setPreviewPassImage(t.imageUrl)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#181a20] flex items-center justify-center overflow-hidden border border-slate-200 dark:border-[#2b2f3d] shrink-0 group-hover:scale-105 transition-transform">
                          {t.imageUrl ? (
                            <img src={t.imageUrl} alt={t.title} className="w-full h-full object-cover" />
                          ) : (
                            <QrCode className="h-6 w-6 text-[#e79b71]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {t.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#e79b71] mt-0.5">
                            <Maximize2 className="h-3 w-3" />
                            <span>แตะเพื่อขยายสแกนเต็มจอ</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => t.imageUrl && setPreviewPassImage(t.imageUrl)}
                          className="p-2 text-slate-600 dark:text-slate-300 hover:text-[#e79b71] hover:bg-slate-100 dark:hover:bg-[#2b2f3d] rounded-xl transition-colors cursor-pointer"
                          title="ดูแบบเต็มจอ"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePass(t.id, t.imageStorageKey)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                          title="ลบตั๋ว"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 3: SURVIVAL FLASHCARDS & FLIP-TO-SHOW
          ======================================================== */}
          {activeTab === 'phrases' && (
            <div className="space-y-3.5">
              
              {/* Category Pills & Search */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {[
                    { id: 'all', label: `ทั้งหมด (${JAPANESE_PHRASES.length})` },
                    { id: 'food', label: '🍜 ร้านอาหาร & สั่งกิน' },
                    { id: 'shopping', label: '🛍️ ช้อปปิ้ง & Tax-Free' },
                    { id: 'transport', label: '🚅 รถไฟ & สถานี' },
                    { id: 'emergency', label: '🚨 ขอความช่วยเหลือ' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPhraseCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        phraseCategory === cat.id
                          ? 'bg-[#e79b71] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#1f222e] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหา เช่น วาซาบิ, แยกบิล, คืนภาษี, ห้องน้ำ, สนามบิน..."
                    value={phraseSearch}
                    onChange={(e) => setPhraseSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#2b2f3d] bg-white dark:bg-[#181a20] text-slate-900 dark:text-white text-xs outline-none focus:border-[#e79b71] font-medium"
                  />
                </div>
              </div>

              {/* Phrase Cards */}
              <div className="space-y-2.5 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredPhrases.map((p) => {
                  const isSpeaking = speakingId === p.id;
                  const isCopied = copiedPhraseId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e] space-y-2 hover:border-[#e79b71] transition-all shadow-2xs group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wide">
                            {p.japanese}
                          </h4>
                          <p className="text-xs font-mono font-bold text-[#e79b71]">
                            {p.romaji}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => speakJapanese(p)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isSpeaking
                                ? 'bg-[#e79b71] text-white border-[#e79b71] animate-pulse'
                                : 'border-slate-200 dark:border-[#2b2f3d] hover:border-[#e79b71] text-slate-600 dark:text-slate-300'
                            }`}
                            title="ฟังเสียงออกเสียงภาษาญี่ปุ่น"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setBigCardPhrase(p)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-[#2b2f3d] hover:border-[#e79b71] text-slate-600 dark:text-slate-300 hover:text-[#e79b71] transition-all cursor-pointer"
                            title="โหมดโชว์หน้าจอใหญ่ (ยื่นให้พนักงานอ่าน)"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => copyPhraseText(p)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-[#2b2f3d] hover:border-[#e79b71] text-slate-400 hover:text-[#e79b71] transition-all cursor-pointer"
                            title="คัดลอกข้อความ"
                          >
                            {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 dark:border-[#2b2f3d] pt-2 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          🇹🇭 {p.thai}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          💡 {p.context}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 4: 1-TAP SOS & ESSENTIALS RADAR
          ======================================================== */}
          {activeTab === 'radar' && (
            <div className="space-y-4">
              
              {/* Hotel / Stay Taxi Card */}
              {hotelInfo && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" />
                      <span>การ์ดยื่นให้คนขับแท็กซี่ (Taxi Hotel Slip)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHotel}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedHotel ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedHotel ? 'คัดลอกแล้ว' : 'คัดลอกที่อยู่'}</span>
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {hotelInfo.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      📍 {hotelInfo.address}
                    </p>
                  </div>
                </div>
              )}

              {/* 1-Tap Emergency Calling Directory */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  <span>เบอร์โทรฉุกเฉินประเทศญี่ปุ่น (1-Tap Call)</span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EMERGENCY_CONTACTS.map((c) => (
                    <a
                      key={c.id}
                      href={`tel:${c.tel.replace(/[^0-9+]/g, '')}`}
                      className="p-3 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e] hover:border-rose-400 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition-all flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                          {c.icon}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {c.title}
                          </h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {c.detail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-mono text-xs font-black shrink-0">
                        <PhoneCall className="h-3 w-3" />
                        <span>{c.tel}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* 1-Tap Google Maps Radar Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#262932]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-blue-600" />
                    <span>เรดาร์ค้นหาสถานที่รอบตัว (เปิด Google Maps 1-Tap)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                  {NEARBY_PRESETS.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openNearbyGoogleMaps(item.query)}
                      className="p-3 rounded-2xl border border-slate-200/90 dark:border-[#262932] bg-white dark:bg-[#1f222e] hover:border-[#e79b71] hover:bg-[#e79b71]/5 transition-all cursor-pointer group shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#262932] text-slate-500 group-hover:text-[#e79b71] group-hover:scale-110 transition-transform shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB 5: IG STORY & TRIP SUMMARY
          ======================================================== */}
          {activeTab === 'story' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  เลือกธีมพื้นหลังการ์ด Story:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStoryBgColor('midnight')}
                    className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'midnight' ? 'border-[#e79b71] scale-110' : 'border-slate-300'
                    }`}
                    title="Midnight Theme"
                  />
                  <button
                    onClick={() => setStoryBgColor('sakura')}
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'sakura' ? 'border-[#e79b71] scale-110' : 'border-slate-300'
                    }`}
                    title="Sakura Theme"
                  />
                  <button
                    onClick={() => setStoryBgColor('sunset')}
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'sunset' ? 'border-[#e79b71] scale-110' : 'border-slate-300'
                    }`}
                    title="Sunset Theme"
                  />
                  <button
                    onClick={() => setStoryBgColor('fuji')}
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'fuji' ? 'border-[#e79b71] scale-110' : 'border-slate-300'
                    }`}
                    title="Mount Fuji Theme"
                  />
                </div>
              </div>

              {/* Story 9:16 Canvas Card Preview */}
              <div
                ref={storyCanvasRef}
                className={`relative mx-auto w-64 sm:w-72 aspect-[9/16] rounded-3xl p-5 shadow-2xl text-white flex flex-col justify-between overflow-hidden border border-white/20 ${
                  storyBgColor === 'midnight'
                    ? 'bg-gradient-to-b from-[#11101d] via-[#1a182d] to-[#2a1b4e]'
                    : storyBgColor === 'sakura'
                    ? 'bg-gradient-to-b from-pink-500 via-rose-500 to-purple-700'
                    : storyBgColor === 'sunset'
                    ? 'bg-gradient-to-b from-amber-500 via-rose-600 to-purple-900'
                    : 'bg-gradient-to-b from-blue-600 via-indigo-700 to-purple-900'
                }`}
              >
                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase opacity-80">
                    <span>✈️ Travel Tracker Story</span>
                    <span>{trip?.currency || 'JPY'}</span>
                  </div>

                  <h3 className="text-lg font-black tracking-tight leading-tight">
                    {trip?.name || trip?.title || 'Japan Adventure'}
                  </h3>

                  <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
                    <span>📍 {itinerary[0]?.city || 'Tokyo'} & {itinerary[itinerary.length - 1]?.city || 'Osaka'}</span>
                  </div>
                </div>

                {/* Center Polaroid Mini Card */}
                <div className="relative z-10 bg-white text-slate-900 p-2 rounded-2xl shadow-xl rotate-[-2deg] my-auto">
                  <div className="aspect-[4/3] bg-gradient-to-tr from-pink-100 to-purple-100 rounded-xl flex items-center justify-center text-3xl overflow-hidden">
                    🍣 ⛩️ 🚅
                  </div>
                  <div className="pt-2 text-center">
                    <p className="font-handwriting text-xs font-black text-slate-800">
                      Memories in Japan ✨
                    </p>
                  </div>
                </div>

                {/* Bottom Metrics Bar */}
                <div className="space-y-2 relative z-10 bg-black/30 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                  <div className="flex justify-between text-xs font-bold">
                    <span>ยอดรวมทริป:</span>
                    <span className="font-black text-[#f2a278]">
                      {totalSpent.toLocaleString()} {trip?.currency || 'JPY'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] opacity-80">
                    <span>สมาชิก {members.length} คน</span>
                    <span>{itinerary.length} สถานที่ท่องเที่ยว</span>
                  </div>
                </div>
              </div>

              {/* Download / Share Story Button */}
              <button
                type="button"
                onClick={() => {
                  triggerConfetti();
                  alert('🎉 แคปหน้าจอการ์ดใบนี้เพื่อนำไปโพสต์ลง Instagram Story หรือแชร์เข้ากลุ่ม LINE ได้ทันที!');
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#e79b71] to-amber-500 hover:from-[#d98254] hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-[#e79b71]/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>แชร์ลง Instagram Story / Line</span>
              </button>

              {/* Packing Shortcut Link */}
              {onOpenPacking && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPacking();
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-[#262932] bg-slate-50 dark:bg-[#1f222e] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 hover:border-[#e79b71] transition-all cursor-pointer"
                >
                  <Luggage className="h-4 w-4 text-[#e79b71]" />
                  <span>เปิดเช็คลิสต์จัดกระเป๋าอัจฉริยะ (AI Packing List)</span>
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ========================================================
          BIG SCREEN DISPLAY MODAL FOR JAPANESE PHRASES
      ======================================================== */}
      {bigCardPhrase && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
          onClick={() => setBigCardPhrase(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#181a20] rounded-3xl p-6 sm:p-8 text-center space-y-6 border border-[#e79b71]/50 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#e79b71] bg-[#e79b71]/15 px-3 py-1 rounded-full">
                โหมดโชว์หน้าจอใหญ่ (ยื่นให้พนักงานอ่าน)
              </span>
              <button
                onClick={() => setBigCardPhrase(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-relaxed tracking-wide">
                {bigCardPhrase.japanese}
              </h1>
              <p className="text-base sm:text-lg font-mono font-bold text-[#e79b71]">
                {bigCardPhrase.romaji}
              </p>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#262932] text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                🇹🇭 {bigCardPhrase.thai}
              </div>
            </div>

            <button
              onClick={() => speakJapanese(bigCardPhrase)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#e79b71] to-amber-500 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Volume2 className="h-5 w-5" />
              <span>กดเพื่อออกเสียงภาษาญี่ปุ่น</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          PREVIEW FULLSCREEN HIGH-CONTRAST PASS / TICKET IMAGE
      ======================================================== */}
      {previewPassImage && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4 animate-in fade-in"
          onClick={() => setPreviewPassImage(null)}
        >
          <div 
            className="relative max-w-md w-full bg-white dark:bg-[#181a20] p-4 rounded-3xl border border-slate-200 dark:border-[#262932] shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#262932]">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-[#e79b71]" />
                <span>โหมดสแกน QR Code / ตั๋วคมชัดสูง</span>
              </span>
              <button
                onClick={() => setPreviewPassImage(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* High Brightness White Container for QR scanners */}
            <div className="rounded-2xl overflow-hidden bg-white flex items-center justify-center max-h-[70vh] p-4 border-2 border-slate-100 shadow-inner">
              <img src={previewPassImage} alt="Pass Preview" className="max-h-[60vh] w-auto object-contain rounded-lg" />
            </div>

            <button
              onClick={() => setPreviewPassImage(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

