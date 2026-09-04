// src/components/TravelHubModal.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { 
  X, Sparkles, Languages, MapPin, QrCode, Share2, 
  Download, Volume2, Copy, Check, ExternalLink, 
  Smartphone, Plus, Trash2, Camera, ShieldCheck, 
  Compass, Search, ArrowRight, Eye, Store, DollarSign,
  Utensils, Train, ShoppingBag, AlertTriangle, Building,
  FileCheck, Sparkle, RefreshCw
} from 'lucide-react';
import { getCatAvatar } from '@/lib/avatars';
import { triggerConfetti } from '@/lib/confetti';
import { saveLocalReceiptPhoto, getLocalReceiptPhoto, deleteLocalReceiptPhoto } from '@/lib/localReceipts';

interface TravelHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  expenses: any[];
  itinerary: any[];
  members: any[];
  userDisplayName?: string;
  fxRate?: number;
  onOpenScrapbook?: () => void;
  onOpenPacking?: () => void;
}

// 1. Japanese Phrases Data
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
  { id: 'f2', category: 'food', japanese: 'おすすめは何ですか？', romaji: 'Osusume wa nan desu ka?', thai: 'มีเมนูแนะนำอะไรบ้างครับ/ค่ะ?', context: 'ให้พนักงานแนะนำของอร่อย' },
  { id: 'f3', category: 'food', japanese: 'お会計は別々でお願いします。', romaji: 'Okaikei wa betsubetsu de onegaishimasu.', thai: 'ขอคิดเงิน/เช็คบิลแยกกันครับ/ค่ะ', context: 'ขอจ่ายเงินแยกรายคน' },
  { id: 'f4', category: 'food', japanese: 'わさび抜きでお願いします。', romaji: 'Wasabi nuki de onegaishimasu.', thai: 'ขอไม่ใส่วาซาบิครับ/ค่ะ', context: 'สั่งซูชิแบบไม่เอาวาซาบิ' },
  { id: 'f5', category: 'food', japanese: 'お水をください。', romaji: 'Omizu o kudasai.', thai: 'ขอน้ำเปล่าหน่อยครับ/ค่ะ', context: 'ขอน้ำดื่มฟรีในร้าน' },
  { id: 'f6', category: 'food', japanese: 'ごちそうさまでした！', romaji: 'Gochisōsama deshita!', thai: 'ขอบคุณสำหรับอาหาร (อร่อยมาก)', context: 'พูดตอนทานเสร็จและออกจากร้าน' },

  // Shopping & Tax Free
  { id: 's1', category: 'shopping', japanese: '免税（Tax Free）できますか？', romaji: 'Menzei dekimasu ka?', thai: 'ทำเรื่องคืนภาษี (Tax Free) ได้ไหมครับ/ค่ะ?', context: 'ถามตอนจ่ายเงินในห้างหรือร้านค้า' },
  { id: 's2', category: 'shopping', japanese: 'これの新しいものはありますか？', romaji: 'Kore no atarashii mono wa arimasu ka?', thai: 'มีของชิ้นใหม่ในสต็อกไหมครับ/ค่ะ?', context: 'ขอของใหม่ที่ไม่ใช่ตัวโชว์' },
  { id: 's3', category: 'shopping', japanese: '試着してもいいですか？', romaji: 'Shichaku shitemo ii desu ka?', thai: 'ขอลองสวมชุดนี้ได้ไหมครับ/ค่ะ?', context: 'ขอลองเสื้อผ้าก่อนซื้อ' },
  { id: 's4', category: 'shopping', japanese: 'クレジットカードは使えますか？', romaji: 'Kurejitto kādo wa tsukaemasu ka?', thai: 'รับบัตรเครดิตไหมครับ/ค่ะ?', context: 'ถามก่อนชำระเงิน' },
  { id: 's5', category: 'shopping', japanese: '袋は要りません。', romaji: 'Fukuro wa irimasen.', thai: 'ไม่รับถุงพลาสติกครับ/ค่ะ', context: 'ปฏิเสธถุงเพื่อประหยัดเงิน' },

  // Transport
  { id: 't1', category: 'transport', japanese: 'この電車は空港へ行きますか？', romaji: 'Kono densha wa kūkō e ikimasu ka?', thai: 'รถไฟขบวนนี้ไปสนามบินไหมครับ/ค่ะ?', context: 'ถามเพื่อความแน่ใจก่อนขึ้นรถไฟ' },
  { id: 't2', category: 'transport', japanese: 'コインロッカーはどこですか？', romaji: 'Koin rokkā wa doko desu ka?', thai: 'ตู้ฝากกระเป๋า (Coin Locker) อยู่ตรงไหน?', context: 'ถามหาสถานที่ฝากกระเป๋าในสถานี' },
  { id: 't3', category: 'transport', japanese: '切符売り場はどこですか？', romaji: 'Kippu uriba wa doko desu ka?', thai: 'ที่ขายตั๋วรถไฟอยู่ทางไหนครับ/ค่ะ?', context: 'หาตู้ซื้อตั๋วหรือเคาน์เตอร์' },
  { id: 't4', category: 'transport', japanese: 'トイレはどこですか？', romaji: 'Toire wa doko desu ka?', thai: 'ห้องน้ำอยู่ที่ไหนครับ/ค่ะ?', context: 'ถามหาห้องน้ำ' },

  // Emergency & General
  { id: 'e1', category: 'emergency', japanese: 'すみません、助けてください。', romaji: 'Sumimasen, tasukete kudasai.', thai: 'ขอโทษนะครับ/ค่ะ ช่วยฉันหน่อยได้ไหม?', context: 'ขอความช่วยเหลือฉุกเฉิน' },
  { id: 'e2', category: 'emergency', japanese: '日本語が分かりません。', romaji: 'Nihongo ga wakarimasen.', thai: 'ฉันไม่เข้าใจภาษาญี่ปุ่นครับ/ค่ะ', context: 'บอกเมื่อฟังไม่รู้เรื่อง' },
  { id: 'e3', category: 'emergency', japanese: 'Wi-Fiのパスワードは何ですか？', romaji: 'Waifai no pasuwādo wa nan desu ka?', thai: 'รหัสผ่าน Wi-Fi คืออะไรครับ/ค่ะ?', context: 'ขอรหัสอินเทอร์เน็ต' },
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
  { id: 'conv-711', name: '7-Eleven / 7-Bank ATM', icon: '🏪', query: '7-Eleven', description: 'ร้านสะดวกซื้อ & ตู้กดเงินเยนฉุกเฉิน', badge: 'สะดวกซื้อ & ATM' },
  { id: 'conv-lawson', name: 'Lawson / FamilyMart', icon: '🥪', query: 'Lawson, FamilyMart', description: 'ไก่ทอด Karaage-kun & ขนมหวาน', badge: 'ของกิน & ขนม' },
  { id: 'donki', name: 'Don Quijote (ดองกิ)', icon: '🐧', query: 'Don Quijote', description: 'ของฝาก ขนม เครื่องสำอาง 24 ชม.', badge: 'Tax-Free ยอดฮิต' },
  { id: 'drugstore', name: 'ร้านขายยา Matsumoto Kiyoshi', icon: '💊', query: 'Matsumoto Kiyoshi, Sundrug, Daikoku Drug', description: 'แผ่นแปะแก้ปวด ยาหยอดตา สกินแคร์', badge: 'ยา & เวชสำอาง' },
  { id: 'toilet', name: 'ห้องน้ำสาธารณะ (Restroom)', icon: '🚻', query: 'Public Restroom, Public Toilet', description: 'ห้องน้ำสะอาดใกล้ตัวคุณ', badge: 'ด่วน' },
  { id: 'locker', name: 'ตู้ฝากกระเป๋า (Coin Locker)', icon: '🛅', query: 'Coin Locker, Luggage Storage', description: 'จุดฝากกระเป๋าเดินทางรอบสถานี', badge: 'ฝากสัมภาระ' },
  { id: 'mcdonald', name: 'McDonald\'s / Starbucks', icon: '☕', query: 'Starbucks, McDonald\'s', description: 'ที่นั่งพักชาร์จแบต & Wi-Fi ฟรี', badge: 'คาเฟ่ & ที่นั่งพัก' },
  { id: 'supermarket', name: 'ซูเปอร์มาร์เก็ตลดราคาดึก', icon: '🍱', query: 'Supermarket, Life Supermarket', description: 'ซูชิและเบนโตะลดราคา 50% หลัง 2 ทุ่ม', badge: 'ของสด & ลดราคา' },
];

interface TicketPass {
  id: string;
  title: string;
  category: 'flight' | 'train' | 'vjw' | 'attraction' | 'other';
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
  const [activeTab, setActiveTab] = useState<'bento' | 'phrases' | 'radar' | 'tickets' | 'story' | 'install'>('bento');
  
  // Phrases State
  const [phraseCategory, setPhraseCategory] = useState<'all' | 'food' | 'shopping' | 'transport' | 'emergency'>('all');
  const [phraseSearch, setPhraseSearch] = useState('');
  const deferredPhraseSearch = useDeferredValue(phraseSearch);
  const [bigCardPhrase, setBigCardPhrase] = useState<PhraseItem | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedPhraseId, setCopiedPhraseId] = useState<string | null>(null);

  // Tickets & Passes State
  const [tickets, setTickets] = useState<TicketPass[]>([]);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<TicketPass['category']>('vjw');
  const [ticketNote, setTicketNote] = useState('');
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [previewPassImage, setPreviewPassImage] = useState<string | null>(null);

  // Story Generator State
  const [storyBgColor, setStoryBgColor] = useState<'midnight' | 'sakura' | 'sunset' | 'fuji'>('midnight');
  const storyCanvasRef = useRef<HTMLDivElement>(null);

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
        // Load image data URLs
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
        const newTicket: TicketPass = {
          id: storageKey,
          title: ticketTitle.trim() || (ticketCategory === 'vjw' ? 'Visit Japan Web QR' : ticketCategory === 'flight' ? 'Boarding Pass' : 'ตั๋วเดินทาง'),
          category: ticketCategory,
          imageStorageKey: storageKey,
          imageUrl: dataUrl,
          note: ticketNote.trim() || undefined,
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
        setTicketNote('');
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

  // Pronounce Japanese Phrase using Web Speech API
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

  // Launch Google Maps for Nearby Queries
  const openNearbyGoogleMaps = (query: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
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

  const totalSpent = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [expenses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#1a182d] shadow-2xl border border-slate-200/90 dark:border-purple-800/60 glow-pink-purple max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-purple-900/40 bg-slate-50/50 dark:bg-[#11101d]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white text-base shadow-sm shrink-0">
              🧰
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Travel Command Center
                </h2>
                <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                  5-in-1 Hub
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                กล่องเครื่องมืออัจฉริยะสำหรับนักเดินทางท่องเที่ยว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeTab !== 'bento' && (
              <button
                onClick={() => setActiveTab('bento')}
                className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[11px] font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                🏠 เมนูหลัก
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* ==================== VIEW 1: BENTO COMMAND DASHBOARD ==================== */}
          {activeTab === 'bento' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-600/10 to-indigo-600/10 border border-pink-200/80 dark:border-purple-800/60 flex items-center justify-between gap-3">
                <div className="text-left">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    <span>ทริป: {trip?.name || trip?.title || 'Japan Adventure'}</span>
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-purple-300/80 font-medium mt-0.5">
                    รวมทุกเครื่องมือเดินทางที่จำเป็นไว้ในที่เดียว ไม่รกหน้าจอ
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-pink-600 dark:text-pink-400 block">
                    {expenses.length} รายจ่าย • {itinerary.length} กิจกรรม
                  </span>
                </div>
              </div>

              {/* Bento Grid Action Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                
                {/* 1. Japanese Survival Phrasebook */}
                <div
                  onClick={() => setActiveTab('phrases')}
                  className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-purple-950/20 hover:border-pink-500 hover:bg-pink-50/40 dark:hover:bg-purple-950/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                      🇯🇵
                    </div>
                    <span className="text-[9px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100/80 dark:bg-pink-950 px-1.5 py-0.2 rounded-md">
                      พูดได้
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      ประโยคญี่ปุ่นเอาตัวรอด
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium mt-0.5">
                      พร้อมเสียงอ่าน & โหมดโชว์หน้าจอใหญ่
                    </p>
                  </div>
                </div>

                {/* 2. 1-Tap Nearby Essentials Radar */}
                <div
                  onClick={() => setActiveTab('radar')}
                  className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-purple-950/20 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-purple-950/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                      🏪
                    </div>
                    <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-950 px-1.5 py-0.2 rounded-md">
                      1-Tap GPS
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      เรดาร์หาจุดสำคัญรอบตัว
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium mt-0.5">
                      7-11, Donki, ตู้ ATM, ห้องน้ำ, ล็อกเกอร์
                    </p>
                  </div>
                </div>

                {/* 3. Travel Passes & QR Locker */}
                <div
                  onClick={() => setActiveTab('tickets')}
                  className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-purple-950/20 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                      🎫
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-950 px-1.5 py-0.2 rounded-md">
                      {tickets.length} ตั๋ว
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      กล่องเซฟตั๋ว & QR Code
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium mt-0.5">
                      Visit Japan Web, Shinkansen, บัตรผ่าน
                    </p>
                  </div>
                </div>

                {/* 4. IG Story Trip Card Generator */}
                <div
                  onClick={() => setActiveTab('story')}
                  className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-purple-950/20 hover:border-pink-500 hover:bg-pink-50/40 dark:hover:bg-purple-950/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                      🎨
                    </div>
                    <span className="text-[9px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100/80 dark:bg-pink-950 px-1.5 py-0.2 rounded-md">
                      9:16 Story
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      สร้างการ์ด IG Story สรุปทริป
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium mt-0.5">
                      รวมรูปและสถิติดาวน์โหลดลงสตอรี่ 1-คลิก
                    </p>
                  </div>
                </div>

                {/* 5. Install iOS PWA App */}
                <div
                  onClick={() => setActiveTab('install')}
                  className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-purple-950/20 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                      📲
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950 px-1.5 py-0.2 rounded-md">
                      PWA
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      ติดตั้งลงเครื่อง iPhone/iPad
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium mt-0.5">
                      เปิดเต็มจอ ไร้แถบ Safari ทำงานออฟไลน์
                    </p>
                  </div>
                </div>

                {/* 6. Quick Shortcut to Packing & Scrapbook */}
                <div
                  onClick={() => {
                    onClose();
                    if (onOpenPacking) onOpenPacking();
                  }}
                  className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-purple-900/50 bg-slate-50/70 dark:bg-purple-950/20 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-purple-950/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                      🧳
                    </div>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950 px-1.5 py-0.2 rounded-md">
                      Checklist
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      เช็คลิสต์จัดกระเป๋า & เอกสาร
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-300/70 font-medium mt-0.5">
                      พาสปอร์ต, eSIM, ฮีทเทค, พาวเวอร์แบงก์
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== VIEW 2: JAPANESE PHRASEBOOK ==================== */}
          {activeTab === 'phrases' && (
            <div className="space-y-3.5">
              
              {/* Category Filter Pills & Search */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  <button
                    onClick={() => setPhraseCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      phraseCategory === 'all'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-purple-950 text-slate-700 dark:text-purple-300'
                    }`}
                  >
                    ทั้งหมด ({JAPANESE_PHRASES.length})
                  </button>
                  <button
                    onClick={() => setPhraseCategory('food')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      phraseCategory === 'food'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-purple-950 text-slate-700 dark:text-purple-300'
                    }`}
                  >
                    🍜 ร้านอาหาร
                  </button>
                  <button
                    onClick={() => setPhraseCategory('shopping')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      phraseCategory === 'shopping'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-purple-950 text-slate-700 dark:text-purple-300'
                    }`}
                  >
                    🛍️ ช้อปปิ้ง & Tax Free
                  </button>
                  <button
                    onClick={() => setPhraseCategory('transport')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      phraseCategory === 'transport'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-purple-950 text-slate-700 dark:text-purple-300'
                    }`}
                  >
                    🚅 รถไฟ & สถานี
                  </button>
                  <button
                    onClick={() => setPhraseCategory('emergency')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      phraseCategory === 'emergency'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-purple-950 text-slate-700 dark:text-purple-300'
                    }`}
                  >
                    🚨 ขอความช่วยเหลือ
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาประโยค เช่น วาซาบิ, คืนภาษี, แยกบิล, ห้องน้ำ..."
                    value={phraseSearch}
                    onChange={(e) => setPhraseSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-purple-800/60 bg-slate-50/50 dark:bg-[#11101d]/60 text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                  />
                </div>
              </div>

              {/* Phrase Cards List */}
              <div className="space-y-2.5 max-h-[58vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredPhrases.map((p) => {
                  const isSpeaking = speakingId === p.id;
                  const isCopied = copiedPhraseId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-[#11101d] space-y-2 hover:border-pink-300 transition-all shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wide">
                            {p.japanese}
                          </h4>
                          <p className="text-[11px] font-mono font-semibold text-pink-600 dark:text-pink-400">
                            {p.romaji}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => speakJapanese(p)}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              isSpeaking
                                ? 'bg-pink-500 text-white border-pink-600 animate-pulse'
                                : 'border-slate-200 dark:border-purple-800 hover:border-pink-500 text-slate-600 dark:text-purple-300'
                            }`}
                            title="ฟังเสียงพูดภาษาญี่ปุ่น"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setBigCardPhrase(p)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-purple-800 hover:border-purple-500 text-slate-600 dark:text-purple-300 hover:text-purple-600 transition-all cursor-pointer"
                            title="เปิดโหมดโชว์หน้าจอใหญ่ (ยื่นให้คนญี่ปุ่นดู)"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => copyPhraseText(p)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-purple-800 hover:border-pink-500 text-slate-400 hover:text-pink-600 transition-all cursor-pointer"
                            title="คัดลอกข้อความ"
                          >
                            {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 dark:border-purple-900/30 pt-1.5 text-xs">
                        <span className="font-bold text-slate-800 dark:text-purple-200">
                          🇹🇭 {p.thai}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-purple-400/80 font-medium">
                          💡 {p.context}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ==================== VIEW 3: 1-TAP NEARBY RADAR ==================== */}
          {activeTab === 'radar' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-slate-700 dark:text-purple-300 flex items-center gap-2">
                <Compass className="h-5 w-5 text-purple-600 shrink-0 animate-spin-slow" />
                <span>แตะ 1 ครั้งเพื่อเปิด Google Maps นำทางไปยังสถานที่ใกล้เคียงรอบตัวคุณทันที</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[58vh] overflow-y-auto custom-scrollbar pr-1">
                {NEARBY_PRESETS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openNearbyGoogleMaps(item.query)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-[#11101d] hover:border-pink-500 hover:bg-pink-50/30 dark:hover:bg-purple-950/30 transition-all cursor-pointer group shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-purple-950 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-purple-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== VIEW 4: TRAVEL PASSES & QR VAULT ==================== */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              
              {/* Upload Pass Card */}
              <div className="p-3.5 rounded-2xl border border-dashed border-pink-400/80 dark:border-pink-600/80 bg-pink-50/30 dark:bg-[#11101d]/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-pink-500" />
                    <span>เพิ่มตั๋ว / QR Code ประจำทริป</span>
                  </span>
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400">
                    เก็บในเครื่อง ปลอดภัย ดูได้แม้ออฟไลน์
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อตั๋ว (เช่น Visit Japan QR)"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="sm:col-span-2 p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1a182d] text-xs outline-none font-bold"
                  />
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as any)}
                    className="p-2 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1a182d] text-xs font-bold cursor-pointer"
                  >
                    <option value="vjw">🇯🇵 Visit Japan Web</option>
                    <option value="flight">✈️ ตั๋วเครื่องบิน</option>
                    <option value="train">🚅 Shinkansen / JR</option>
                    <option value="attraction">🎟️ USJ / บัตรสวนสนุก</option>
                    <option value="other">📄 เอกสารอื่นๆ</option>
                  </select>
                </div>

                <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer">
                  <Camera className="h-4 w-4" />
                  <span>{uploadingTicket ? 'กำลังบันทึกรูปตั๋ว...' : 'ถ่ายรูป หรือ เลือกรูปตั๋ว/QR Code'}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingTicket} onChange={handleUploadPass} />
                </label>
              </div>

              {/* Tickets List */}
              <div className="space-y-2.5 max-h-[46vh] overflow-y-auto custom-scrollbar pr-1">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-purple-900/40 rounded-2xl">
                    <QrCode className="h-8 w-8 text-slate-300 dark:text-purple-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-white">ยังไม่มีตั๋วหรือ QR Code ในทริปนี้</p>
                    <p className="text-[10px] text-slate-400 dark:text-purple-400 mt-0.5">
                      เซฟ QR Code ของ Visit Japan Web หรือตั๋วรถไฟไว้ที่นี่เพื่อเปิดสแกนได้เร็วทันใจ
                    </p>
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-[#11101d] flex items-center justify-between gap-3 shadow-2xs hover:border-pink-300 transition-all"
                    >
                      <div
                        onClick={() => t.imageUrl && setPreviewPassImage(t.imageUrl)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-purple-950 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-purple-800 shrink-0">
                          {t.imageUrl ? (
                            <img src={t.imageUrl} alt={t.title} className="w-full h-full object-cover" />
                          ) : (
                            <QrCode className="h-6 w-6 text-pink-500" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {t.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 dark:text-pink-400">
                            <span>แตะเพื่อขยายดูเต็มจอ 🔍</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => t.imageUrl && setPreviewPassImage(t.imageUrl)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer"
                          title="ดูรูปเต็มจอ"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePass(t.id, t.imageStorageKey)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
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

          {/* ==================== VIEW 5: IG STORY CARD GENERATOR ==================== */}
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
                      storyBgColor === 'midnight' ? 'border-pink-500 scale-110' : 'border-slate-300'
                    }`}
                    title="Midnight Theme"
                  />
                  <button
                    onClick={() => setStoryBgColor('sakura')}
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-pink-400 to-rose-400 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'sakura' ? 'border-pink-500 scale-110' : 'border-slate-300'
                    }`}
                    title="Sakura Theme"
                  />
                  <button
                    onClick={() => setStoryBgColor('sunset')}
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'sunset' ? 'border-pink-500 scale-110' : 'border-slate-300'
                    }`}
                    title="Sunset Theme"
                  />
                  <button
                    onClick={() => setStoryBgColor('fuji')}
                    className={`w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 border-2 transition-all cursor-pointer ${
                      storyBgColor === 'fuji' ? 'border-pink-500 scale-110' : 'border-slate-300'
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
                    {trip?.name || trip?.title || 'Japan Trip'}
                  </h3>

                  <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
                    <span>📍 {itinerary[0]?.city || 'Osaka'} & {itinerary[itinerary.length - 1]?.city || 'Kyoto'}</span>
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
                    <span className="font-black text-pink-300">
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
                onClick={() => {
                  triggerConfetti();
                  alert('🎉 แคปหน้าจอการ์ดใบนี้เพื่อนำไปโพสต์ลง Instagram Story หรือแชร์เข้ากลุ่ม LINE ได้ทันที!');
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-pink-500/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>แชร์ลง Instagram Story / Line</span>
              </button>
            </div>
          )}

          {/* ==================== VIEW 6: INSTALL PWA ON IPHONE/IPAD ==================== */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#11101d] border border-slate-200 dark:border-purple-900/40 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-6 w-6 text-pink-500 shrink-0" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      วิธีติดตั้ง Travel Tracker ลงบน iPhone / iPad
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-purple-400">
                      เปิดใช้งานแบบแอปจริง เต็มหน้าจอ ไร้แถบ URL และเปิดได้รวดเร็วทันใจ
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-200/80 dark:border-purple-900/30 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                    <p className="text-slate-700 dark:text-purple-200">
                      เปิดเว็บนี้ในเบราว์เซอร์ <b>Safari</b> บน iPhone หรือ iPad ของคุณ
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                    <p className="text-slate-700 dark:text-purple-200">
                      กดที่ปุ่ม <b>แชร์ (Share Icon 📤)</b> ที่แถบด้านล่างของ Safari
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                    <p className="text-slate-700 dark:text-purple-200">
                      เลื่อนลงมาแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen ➕)</b>
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">4</span>
                    <p className="text-slate-700 dark:text-purple-200">
                      กดปุ่ม <b>"เพิ่ม" (Add)</b> มุมขวาบน เป็นอันเสร็จสิ้น! 🎉
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Big Screen Display Popup for Japanese Phrase */}
      {bigCardPhrase && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
          onClick={() => setBigCardPhrase(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#11101d] rounded-3xl p-6 sm:p-8 text-center space-y-6 border border-pink-500/50 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950 px-3 py-1 rounded-full">
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
              <p className="text-base sm:text-lg font-mono font-bold text-pink-600 dark:text-pink-400">
                {bigCardPhrase.romaji}
              </p>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-purple-950/60 text-sm sm:text-base font-bold text-slate-800 dark:text-purple-200">
                🇹🇭 {bigCardPhrase.thai}
              </div>
            </div>

            <button
              onClick={() => speakJapanese(bigCardPhrase)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Volume2 className="h-5 w-5" />
              <span>กดเพื่อออกเสียงภาษาญี่ปุ่น</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview Fullscreen Pass / Ticket Image */}
      {previewPassImage && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
          onClick={() => setPreviewPassImage(null)}
        >
          <div 
            className="relative max-w-md w-full bg-white dark:bg-[#1a182d] p-4 rounded-3xl border border-slate-200 dark:border-purple-800/60 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-purple-900/40">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-pink-500" />
                <span>ตั๋วเดินทาง / QR Code</span>
              </span>
              <button
                onClick={() => setPreviewPassImage(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-white flex items-center justify-center max-h-[70vh] p-2">
              <img src={previewPassImage} alt="Pass Preview" className="max-h-[65vh] w-auto object-contain rounded-xl" />
            </div>

            <button
              onClick={() => setPreviewPassImage(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
