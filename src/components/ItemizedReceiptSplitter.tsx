// src/components/ItemizedReceiptSplitter.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { getCatAvatar } from '@/lib/avatars';
import { 
  Plus, Trash2, Users, Check, AlertCircle, Sparkles, 
  Utensils, Calculator, ChevronRight, UserCheck
} from 'lucide-react';

export interface ItemizedDish {
  id: string;
  name: string;
  amount: number;
  qty: number;
  assignedMemberIds: string[]; // member name or user_id
}

export interface MemberOption {
  id: string;
  name: string;
  avatar: string;
}

interface ItemizedReceiptSplitterProps {
  items: ItemizedDish[];
  onChangeItems: (items: ItemizedDish[]) => void;
  members: MemberOption[];
  currency: string;
  totalReceiptAmount: number;
  onUpdateTotalAmount?: (newTotal: number) => void;
}

export default function ItemizedReceiptSplitter({
  items,
  onChangeItems,
  members,
  currency = 'JPY',
  totalReceiptAmount,
  onUpdateTotalAmount,
}: ItemizedReceiptSplitterProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  // 1. Calculate sum of items
  const sumOfItems = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [items]);

  const diffAmount = totalReceiptAmount - sumOfItems;
  const isBalanced = Math.abs(diffAmount) < 1;

  // 2. Calculate breakdown per member
  const memberBreakdown = useMemo(() => {
    const breakdown: Record<string, { member: MemberOption; total: number; itemCount: number }> = {};
    
    // Initialize all members
    members.forEach((m) => {
      breakdown[m.id] = { member: m, total: 0, itemCount: 0 };
    });

    // Distribute each item
    items.forEach((item) => {
      const price = Number(item.amount || 0);
      const assigned = item.assignedMemberIds && item.assignedMemberIds.length > 0 
        ? item.assignedMemberIds 
        : members.map((m) => m.id); // Default to all if none selected

      const splitPrice = assigned.length > 0 ? price / assigned.length : 0;

      assigned.forEach((memberId) => {
        if (breakdown[memberId]) {
          breakdown[memberId].total += splitPrice;
          breakdown[memberId].itemCount += 1;
        }
      });
    });

    return Object.values(breakdown);
  }, [items, members]);

  // Handle adding new item manually
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount) return;

    const newItem: ItemizedDish = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newItemName.trim(),
      amount: Number(newItemAmount),
      qty: 1,
      assignedMemberIds: members.map((m) => m.id), // default to all
    };

    onChangeItems([...items, newItem]);
    setNewItemName('');
    setNewItemAmount('');
  };

  // Handle removing item
  const handleRemoveItem = (id: string) => {
    onChangeItems(items.filter((item) => item.id !== id));
  };

  // Handle toggling member on an item
  const handleToggleMember = (itemId: string, memberId: string) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId) return item;

        const currentAssigned = item.assignedMemberIds || [];
        const isAssigned = currentAssigned.includes(memberId);

        let updatedAssigned: string[];
        if (isAssigned) {
          updatedAssigned = currentAssigned.filter((id) => id !== memberId);
        } else {
          updatedAssigned = [...currentAssigned, memberId];
        }

        return { ...item, assignedMemberIds: updatedAssigned };
      })
    );
  };

  // Handle selecting all members for an item
  const handleSelectAllForDish = (itemId: string) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const allIds = members.map((m) => m.id);
        const isAllSelected = item.assignedMemberIds?.length === allIds.length;
        return {
          ...item,
          assignedMemberIds: isAllSelected ? [] : allIds,
        };
      })
    );
  };

  // Handle inline price or name change
  const handleUpdateItemField = (itemId: string, field: 'name' | 'amount', value: string | number) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          [field]: field === 'amount' ? Number(value) || 0 : value,
        };
      })
    );
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Header Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-[#1c2438] border border-blue-100 dark:border-[#222c42] flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>แยกรายการสินค้า/เมนู & เลือกลูกทีมที่ร่วมหาร</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                {items.length} รายการ
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 font-medium">
              แตะไอคอนสมาชิกใต้แต่ละรายการ เพื่อระบุคนหาร
            </p>
          </div>
        </div>

        {onUpdateTotalAmount && !isBalanced && (
          <button
            type="button"
            onClick={() => onUpdateTotalAmount(sumOfItems)}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
            title="ปรับยอดรวมบิลให้ตรงกับผลรวมของทุกรายการ"
          >
            ตั้งยอดบิล = {sumOfItems.toLocaleString()} {currency}
          </button>
        )}
      </div>

      {/* Item List */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {items.map((item, idx) => {
          const isAllSelected = item.assignedMemberIds?.length === members.length;
          const assignedCount = item.assignedMemberIds?.length || 0;
          const splitPrice = assignedCount > 0 ? Math.round(Number(item.amount || 0) / assignedCount) : 0;

          return (
            <div
              key={item.id || idx}
              className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-[#222c42] bg-white dark:bg-[#151b2b] space-y-2.5 shadow-2xs hover:border-blue-400 transition-all"
            >
              {/* Row 1: Item Name, Price & Delete */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-[#1c2438] text-blue-600 dark:text-blue-400 text-[10px] font-black flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-[#222c42]">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                    placeholder="ชื่อเมนู/สินค้า"
                    className="flex-1 min-w-0 text-xs sm:text-sm font-black text-slate-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-blue-600 px-1 py-0.5 truncate"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#1c2438] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-[#222c42]">
                    <span className="text-[10px] font-bold text-slate-400">{currency}</span>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleUpdateItemField(item.id, 'amount', e.target.value)}
                      placeholder="0"
                      className="w-16 sm:w-20 text-xs sm:text-sm font-black text-slate-900 dark:text-white bg-transparent outline-none text-right"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-[#1c2438] transition-colors cursor-pointer"
                    title="ลบเมนูนี้"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Member Selector Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-dashed border-slate-200/70 dark:border-[#222c42]">
                <button
                  type="button"
                  onClick={() => handleSelectAllForDish(item.id)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    isAllSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-[#1c2438] dark:text-slate-300 hover:bg-blue-50'
                  }`}
                  title="หารเท่าทุกคนในทริป"
                >
                  <Users className="h-3 w-3" />
                  <span>หารทุกคน</span>
                </button>

                {members.map((member) => {
                  const isAssigned = item.assignedMemberIds?.includes(member.id);
                  const cat = getCatAvatar(member.avatar);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleMember(item.id, member.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                        isAssigned
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800 scale-[1.02]'
                          : 'bg-slate-50 text-slate-500 dark:bg-[#1c2438]/50 dark:text-slate-400 border-slate-200/60 dark:border-[#222c42] opacity-60 hover:opacity-100'
                      }`}
                      title={`${member.name} ${isAssigned ? '(เลือกหารรายการนี้)' : '(ไม่ได้หารรายการนี้)'}`}
                    >
                      <span>{cat.emoji}</span>
                      <span className="truncate max-w-[80px] sm:max-w-none">{member.name}</span>
                      {isAssigned && <Check className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}

                {assignedCount > 0 && (
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-auto whitespace-nowrap">
                    (คนละ ≈ {splitPrice.toLocaleString()} {currency})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form: Add New Item Manually */}
      <form onSubmit={handleAddItem} className="flex gap-2 pt-1">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="+ เพิ่มเมนู/รายการเอง..."
          className="flex-1 min-w-0 p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
        />
        <input
          type="number"
          value={newItemAmount}
          onChange={(e) => setNewItemAmount(e.target.value)}
          placeholder="ราคา"
          className="w-24 p-2.5 rounded-xl border border-slate-200 dark:border-[#222c42] bg-slate-50 dark:bg-[#1c2438] text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold text-right"
        />
        <button
          type="submit"
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-[#1c2438] dark:text-slate-200 dark:hover:bg-blue-600 dark:hover:text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>เพิ่ม</span>
        </button>
      </form>

      {/* Summary Box: Live Share per Member */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#1c2438] border border-slate-200 dark:border-[#222c42] space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs font-black">
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
            <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>สรุปยอดที่แต่ละคนต้องจ่ายจากบิลนี้:</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-300">
            รวม {sumOfItems.toLocaleString()} {currency}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {memberBreakdown.map(({ member, total, itemCount }) => {
            const cat = getCatAvatar(member.avatar);
            const percentage = sumOfItems > 0 ? Math.round((total / sumOfItems) * 100) : 0;

            return (
              <div
                key={member.id}
                className="p-2.5 rounded-xl bg-white/95 dark:bg-[#151b2b] border border-slate-200 dark:border-[#222c42] flex flex-col justify-between gap-1 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {member.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {percentage}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5 border-t border-slate-100 dark:border-[#222c42]">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {itemCount} รายการ
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {Math.round(total).toLocaleString()} <span className="text-[9px] font-normal text-slate-400">{currency}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {!isBalanced && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              ยอดรวมของรายการ ({sumOfItems.toLocaleString()}) ต่างจากยอดบิลหลัก ({totalReceiptAmount.toLocaleString()}) อยู่ {Math.abs(diffAmount).toLocaleString()} {currency}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
