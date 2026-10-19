// src/hooks/useTripModals.ts
'use client';

import { useState, useCallback } from 'react';
import type { TripMemberWithProfile } from '@/types/database.types';

export interface UseTripModalsReturn {
  // Navigation / Utility Modals
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  showSettlementModal: boolean;
  setShowSettlementModal: (show: boolean) => void;
  showAIAssistantModal: boolean;
  setShowAIAssistantModal: (show: boolean) => void;
  showBudgetCategoryModal: boolean;
  setShowBudgetCategoryModal: (show: boolean) => void;
  budgetModalInitialTab: 'budget' | 'members' | 'categories' | 'custom';
  setBudgetModalInitialTab: (tab: 'budget' | 'members' | 'categories' | 'custom') => void;
  showPrintableModal: boolean;
  setShowPrintableModal: (show: boolean) => void;
  showScrapbookModal: boolean;
  setShowScrapbookModal: (show: boolean) => void;
  showRollbackModal: boolean;
  setShowRollbackModal: (show: boolean) => void;
  showPackingModal: boolean;
  setShowPackingModal: (show: boolean) => void;
  showCurrencyCalculator: boolean;
  setShowCurrencyCalculator: (show: boolean) => void;
  showTravelHubModal: boolean;
  setShowTravelHubModal: (show: boolean) => void;
  showGourmetRadarModal: boolean;
  setShowGourmetRadarModal: (show: boolean) => void;
  showDiningDecisionModal: boolean;
  setShowDiningDecisionModal: (show: boolean) => void;
  showTicketPassLockerModal: boolean;
  setShowTicketPassLockerModal: (show: boolean) => void;
  diningPickerDefaultCity: string | undefined;
  setDiningPickerDefaultCity: (city: string | undefined) => void;

  // Expense Modals
  showScanModal: boolean;
  setShowScanModal: (show: boolean) => void;
  scanning: boolean;
  setScanning: (s: boolean) => void;
  savingExpense: boolean;
  setSavingExpense: (s: boolean) => void;
  ocrSuccessToast: string | null;
  setOcrSuccessToast: (msg: string | null) => void;
  ocrErrorToast: string | null;
  setOcrErrorToast: (msg: string | null) => void;
  showAiKeyModal: boolean;
  setShowAiKeyModal: (show: boolean) => void;
  splitAsSeparateExpenses: boolean;
  setSplitAsSeparateExpenses: (s: boolean) => void;
  selectedExpenseForDetail: any | null;
  setSelectedExpenseForDetail: (exp: any | null) => void;
  startInExpenseEditMode: boolean;
  setStartInExpenseEditMode: (b: boolean) => void;

  // Activity & Member Modals
  showActivityModal: boolean;
  setShowActivityModal: (show: boolean) => void;
  editingActivity: any | null;
  setEditingActivity: (item: any | null) => void;
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  showTransferModal: boolean;
  setShowTransferModal: (show: boolean) => void;
  transferTargetMember: TripMemberWithProfile | null;
  setTransferTargetMember: (member: TripMemberWithProfile | null) => void;
  showAddMemberModal: boolean;
  setShowAddMemberModal: (show: boolean) => void;

  // Image Preview Modal
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  previewLoading: boolean;
  setPreviewLoading: (l: boolean) => void;

  // Clipboard Copied Flags
  copiedLink: boolean;
  setCopiedLink: (c: boolean) => void;
  copiedAuthLink: boolean;
  setCopiedAuthLink: (c: boolean) => void;
  copiedCode: boolean;
  setCopiedCode: (c: boolean) => void;

  // Helper to open dining decision modal with pre-selected city
  openDiningPickerForCity: (city?: string) => void;
}

export function useTripModals(): UseTripModalsReturn {
  // Navigation / Feature Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showAIAssistantModal, setShowAIAssistantModal] = useState(false);
  const [showBudgetCategoryModal, setShowBudgetCategoryModal] = useState(false);
  const [budgetModalInitialTab, setBudgetModalInitialTab] = useState<'budget' | 'members' | 'categories' | 'custom'>('budget');
  const [showPrintableModal, setShowPrintableModal] = useState(false);
  const [showScrapbookModal, setShowScrapbookModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [showCurrencyCalculator, setShowCurrencyCalculator] = useState(false);
  const [showTravelHubModal, setShowTravelHubModal] = useState(false);
  const [showGourmetRadarModal, setShowGourmetRadarModal] = useState(false);
  const [showDiningDecisionModal, setShowDiningDecisionModal] = useState(false);
  const [showTicketPassLockerModal, setShowTicketPassLockerModal] = useState(false);
  const [diningPickerDefaultCity, setDiningPickerDefaultCity] = useState<string | undefined>(undefined);

  // Expense Modals
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [ocrSuccessToast, setOcrSuccessToast] = useState<string | null>(null);
  const [ocrErrorToast, setOcrErrorToast] = useState<string | null>(null);
  const [showAiKeyModal, setShowAiKeyModal] = useState(false);
  const [splitAsSeparateExpenses, setSplitAsSeparateExpenses] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<any | null>(null);
  const [startInExpenseEditMode, setStartInExpenseEditMode] = useState<boolean>(false);

  // Activity & Member Modals
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetMember, setTransferTargetMember] = useState<TripMemberWithProfile | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Image Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Copied Badges
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const openDiningPickerForCity = useCallback((city?: string) => {
    setDiningPickerDefaultCity(city);
    setShowDiningDecisionModal(true);
  }, []);

  return {
    showProfileModal,
    setShowProfileModal,
    showSettlementModal,
    setShowSettlementModal,
    showAIAssistantModal,
    setShowAIAssistantModal,
    showBudgetCategoryModal,
    setShowBudgetCategoryModal,
    budgetModalInitialTab,
    setBudgetModalInitialTab,
    showPrintableModal,
    setShowPrintableModal,
    showScrapbookModal,
    setShowScrapbookModal,
    showRollbackModal,
    setShowRollbackModal,
    showPackingModal,
    setShowPackingModal,
    showCurrencyCalculator,
    setShowCurrencyCalculator,
    showTravelHubModal,
    setShowTravelHubModal,
    showGourmetRadarModal,
    setShowGourmetRadarModal,
    showDiningDecisionModal,
    setShowDiningDecisionModal,
    showTicketPassLockerModal,
    setShowTicketPassLockerModal,
    diningPickerDefaultCity,
    setDiningPickerDefaultCity,
    showScanModal,
    setShowScanModal,
    scanning,
    setScanning,
    savingExpense,
    setSavingExpense,
    ocrSuccessToast,
    setOcrSuccessToast,
    ocrErrorToast,
    setOcrErrorToast,
    showAiKeyModal,
    setShowAiKeyModal,
    splitAsSeparateExpenses,
    setSplitAsSeparateExpenses,
    selectedExpenseForDetail,
    setSelectedExpenseForDetail,
    startInExpenseEditMode,
    setStartInExpenseEditMode,
    showActivityModal,
    setShowActivityModal,
    editingActivity,
    setEditingActivity,
    showShareModal,
    setShowShareModal,
    showTransferModal,
    setShowTransferModal,
    transferTargetMember,
    setTransferTargetMember,
    showAddMemberModal,
    setShowAddMemberModal,
    previewImage,
    setPreviewImage,
    previewLoading,
    setPreviewLoading,
    copiedLink,
    setCopiedLink,
    copiedAuthLink,
    setCopiedAuthLink,
    copiedCode,
    setCopiedCode,
    openDiningPickerForCity,
  };
}
