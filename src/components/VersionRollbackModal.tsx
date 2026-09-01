// src/components/VersionRollbackModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, History, RotateCcw, Download, Upload, 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  Trash2, Plus, Loader2, FileJson, ArrowDownToLine
} from 'lucide-react';
import { 
  TripSnapshot, 
  getTripSnapshots, 
  saveTripSnapshot, 
  deleteTripSnapshot, 
  restoreTripSnapshot, 
  exportFullBackupJSON, 
  parseBackupJSON 
} from '@/lib/versionSnapshot';

interface VersionRollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  trip: any;
  itinerary: any[];
  expenses: any[];
  categories: any[];
  categoryBudgets: any;
  photos?: any[];
  onRestored: () => void;
}

export default function VersionRollbackModal({
  isOpen,
  onClose,
  tripId,
  trip,
  itinerary,
  expenses,
  categories,
  categoryBudgets,
  photos = [],
  onRestored,
}: VersionRollbackModalProps) {
  const [snapshots, setSnapshots] = useState<TripSnapshot[]>([]);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && tripId) {
      loadSnapshots();
    }
  }, [isOpen, tripId]);

  const loadSnapshots = () => {
    const list = getTripSnapshots(tripId);
    setSnapshots(list);
  };

  const handleCreateSnapshot = () => {
    setCreating(true);
    const snap = saveTripSnapshot(
      tripId,
      {
        trip,
        itinerary,
        expenses,
        categories,
        categoryBudgets,
        photos,
      },
      newSnapshotLabel || `บันทึกเวอร์ชัน ${new Date().toLocaleTimeString('th-TH')}`
    );
    setNewSnapshotLabel('');
    setCreating(false);
    loadSnapshots();
    setStatusMessage({ type: 'success', text: `สร้างจุดบันทึกเวอร์ชัน ${snap.version} เรียบร้อยแล้ว` });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRestore = async (snapshot: TripSnapshot) => {
    const confirmMsg = `ยืนยันการถอยเวอร์ชันกลับไปเป็น:\n"${snapshot.label}" (${snapshot.version})\nสร้างเมื่อ: ${new Date(snapshot.created_at).toLocaleString('th-TH')}\n\nข้อมูลปัจจุบันจะถูกเขียนทับด้วยข้อมูลของเวอร์ชันนี้`;
    if (!confirm(confirmMsg)) return;

    setRestoringId(snapshot.id);
    const res = await restoreTripSnapshot(snapshot);
    setRestoringId(null);

    if (res.success) {
      setStatusMessage({ type: 'success', text: `🎉 ย้อนคืนเวอร์ชัน ${snapshot.version} สำเร็จแล้ว!` });
      onRestored();
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } else {
      setStatusMessage({ type: 'error', text: `เกิดข้อผิดพลาดในการย้อนคืน: ${res.error}` });
    }
  };

  const handleDelete = (snapshotId: string) => {
    if (confirm('ต้องการลบประวัติ Snapshot นี้ใช่หรือไม่?')) {
      const updated = deleteTripSnapshot(tripId, snapshotId);
      setSnapshots(updated);
    }
  };

  const handleExportBackup = () => {
    exportFullBackupJSON(
      {
        trip,
        itinerary,
        expenses,
        categories,
        categoryBudgets,
        photos,
      },
      trip?.name || trip?.title || 'Trip'
    );
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseBackupJSON(content);
        if (!parsed) {
          alert('ไฟล์สำรองไม่ถูกต้อง หรือโครงสร้างไม่ตรง');
          return;
        }

        if (confirm('พบข้อมูลสำรองที่ถูกต้อง ต้องการนำเข้าและเขียนทับทริปนี้เลยหรือไม่?')) {
          setCreating(true);
          const snap: TripSnapshot = {
            id: `snap_imported_${Date.now()}`,
            trip_id: tripId,
            label: `Imported Backup (${file.name})`,
            created_at: new Date().toISOString(),
            version: `v-import`,
            data: parsed,
          };
          const res = await restoreTripSnapshot(snap);
          setCreating(false);
          if (res.success) {
            alert('🎉 นำเข้าข้อมูลสำรองสำเร็จเรียบร้อย!');
            onRestored();
            onClose();
          } else {
            alert('เกิดข้อผิดพลาด: ' + res.error);
          }
        }
      } catch (err: any) {
        alert('อ่านไฟล์ล้มเหลว: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#130d22] shadow-2xl border border-slate-200 dark:border-purple-800/60 glow-purple max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-100 dark:border-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-md shadow-purple-500/25">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Version Rollback & Disaster Recovery 🔄
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-purple-300/70 font-medium">
                ระบบจัดการเวอร์ชัน ย้อนสถานะทริปเมื่อเจอบัค และสำรองไฟล์ JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900' 
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Quick Snapshot Creator */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-pink-500" /> บันทึก Snapshot เวอร์ชันปัจจุบัน (Create Restore Point)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ชื่อจุดบันทึก เช่น ก่อนเพิ่มแผนเกียวโต, ก่อนแก้ค่าใช้จ่าย"
                className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#1c1328] text-slate-900 dark:text-white text-xs outline-none focus:border-pink-500 font-medium"
                value={newSnapshotLabel}
                onChange={(e) => setNewSnapshotLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
              />
              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={creating}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-105 transition-all shrink-0"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>บันทึกจุดถอย</span>
              </button>
            </div>
          </div>

          {/* Snapshot History List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                ประวัติ Snapshot ที่สามารถถอยเวอร์ชันกลับได้ ({snapshots.length})
              </span>
              <span className="text-[10px] text-slate-500 dark:text-purple-400">เก็บประวัติล่าสุด 10 จุด</span>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-purple-900/40 rounded-2xl text-xs text-slate-400 dark:text-purple-400">
                ยังไม่มีการบันทึก Snapshot ไว้ (กดบันทึกจุดถอยด้านบนเพื่อสร้าง)
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/60 dark:bg-purple-950/20 flex items-center justify-between gap-3 hover:border-pink-300 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-[10px] font-mono font-bold">
                          {snap.version}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {snap.label}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-purple-400 mt-1 font-medium">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(snap.created_at).toLocaleString('th-TH')}</span>
                        <span>•</span>
                        <span>{snap.data.itinerary?.length || 0} กิจกรรม</span>
                        <span>•</span>
                        <span>{snap.data.expenses?.length || 0} รายจ่าย</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(snap)}
                        disabled={restoringId === snap.id}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer hover:scale-105 transition-all disabled:opacity-50"
                        title="ถอยเวอร์ชันกลับไปจุดนี้"
                      >
                        {restoringId === snap.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span>ถอยกลับ (Rollback)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(snap.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="ลบ Snapshot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disaster Recovery JSON Export & Import */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-purple-900/40 bg-slate-50/50 dark:bg-[#180f28]/80 space-y-2.5">
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileJson className="h-4 w-4 text-indigo-500" /> สำรองข้อมูลทั้งทริปเป็นไฟล์ JSON (Disaster Recovery)
              </span>
              <p className="text-[10px] text-slate-500 dark:text-purple-400">
                ดาวน์โหลดไฟล์ Backup เก็บไว้ในเครื่องคอมพิวเตอร์ หรือนำเข้าไฟล์เดิมเพื่อกู้คืนเมื่อเกิดเหตุฉุกเฉิน
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#120c1e] text-slate-800 dark:text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-pink-500 hover:scale-[1.02] shadow-2xs transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-pink-500" /> ดาวน์โหลด JSON Backup
              </button>

              <label className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-purple-800 bg-white dark:bg-[#120c1e] text-slate-800 dark:text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-pink-500 hover:scale-[1.02] shadow-2xs transition-all cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-indigo-500" /> นำเข้ากู้คืน JSON
                <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-purple-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-purple-800 text-xs font-bold text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
