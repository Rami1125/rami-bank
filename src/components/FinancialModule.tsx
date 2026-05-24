/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Clock, 
  Percent, 
  Users, 
  Landmark, 
  History, 
  X,
  Play,
  Pause,
  AlertCircle,
  PiggyBank,
  Check,
  ChevronRight,
  Sparkles,
  Calculator,
  TrendingDown,
  Edit2
} from 'lucide-react';
import { StandingOrder, Loan, UserProfile, Vendor } from '../types';
import { 
  fetchStandingOrders, 
  saveStandingOrder, 
  deleteStandingOrder,
  fetchLoans, 
  saveLoan, 
  deleteLoan,
  db,
  isRealConfig,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useVendorsSync, Vendor as SheetsVendor } from '../hooks/useVendorsSync';
import { motion, AnimatePresence } from 'motion/react';

// For DialogTitle & DialogDescription local validation compatibility
const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={className}>{children}</h2>
);
const DialogDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={className}>{children}</p>
);

interface FinancialModuleProps {
  user: UserProfile;
  currentBalance?: number;
}

export default function FinancialModule({ user, currentBalance = 0 }: FinancialModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'standingOrders' | 'loans'>('standingOrders');
  
  // Data lists
  const [standingOrders, setStandingOrders] = useState<StandingOrder[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Standing Order for Payment History analysis view
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<StandingOrder | null>(null);

  // New Standing Order creation state
  const [isSoModalOpen, setIsSoModalOpen] = useState(false);
  const [soVendorName, setSoVendorName] = useState('');
  const [soCategory, setSoCategory] = useState('דיור וחשבונות');
  const [soAmount, setSoAmount] = useState('');
  const [soFrequency, setSoFrequency] = useState<'weekly' | 'bimonthly' | 'monthly' | 'yearly'>('monthly');
  const [soStartDate, setSoStartDate] = useState(new Date().toISOString().split('T')[0]);

  // New Loan creation state
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanSource, setLoanSource] = useState<'bank' | 'private'>('bank');
  const [loanLender, setLoanLender] = useState('');
  const [loanOriginalAmount, setLoanOriginalAmount] = useState('');
  const [loanRemainingAmount, setLoanRemainingAmount] = useState('');
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState('');
  const [loanInterestRate, setLoanInterestRate] = useState('');
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Success indicator inside forms
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Early payoff / Loan Simulation states
  const [simulatingLoanId, setSimulatingLoanId] = useState<string | null>(null);
  const [extraOneTime, setExtraOneTime] = useState<string>('5000');
  const [extraMonthly, setExtraMonthly] = useState<string>('200');

  // Standing Order View & Calendar states
  const [soViewMode, setSoViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDaysLimit, setCalendarDaysLimit] = useState<number>(90);
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState<string>('all');
  const [calendarSearchQuery, setCalendarSearchQuery] = useState<string>('');

  // Editing standing order states
  const [editingSo, setEditingSo] = useState<StandingOrder | null>(null);
  const [isEditSoModalOpen, setIsEditSoModalOpen] = useState(false);
  const [editSoVendorName, setEditSoVendorName] = useState('');
  const [editSoCategory, setEditSoCategory] = useState('דיור וחשבונות');
  const [editSoAmount, setEditSoAmount] = useState('');
  const [editSoFrequency, setEditSoFrequency] = useState<'weekly' | 'bimonthly' | 'monthly' | 'yearly'>('monthly');
  const [editSoNextPaymentDate, setEditSoNextPaymentDate] = useState('');

  // Custom Confirmation Dialog structures
  const [soToDelete, setSoToDelete] = useState<string | null>(null);

  // Load vendors list for dynamic logo join matching
  const { fetchVendors } = useVendorsSync();
  const [vendors, setVendors] = useState<SheetsVendor[]>([]);

  // Lookup function to marry standing order vendorNames to logos
  const getVendorLogoUrl = (name: string, vendorsList: SheetsVendor[]) => {
    const match = vendorsList.find(v => v.vendorName.trim().toLowerCase() === name.trim().toLowerCase());
    if (match && match.logoUrl) return match.logoUrl;
    
    // Fallback predefined patterns for popular Hebrew vendors
    const lowerName = name.toLowerCase();
    if (lowerName.includes('שופרסל')) return 'https://logo.clearbit.com/shufersal.co.il';
    if (lowerName.includes('סלקום')) return 'https://logo.clearbit.com/cellcom.co.il';
    if (lowerName.includes('בזק')) return 'https://logo.clearbit.com/bezeq.co.il';
    if (lowerName.includes('פרטנר')) return 'https://logo.clearbit.com/partner.co.il';
    if (lowerName.includes('הוט')) return 'https://logo.clearbit.com/hot.net.il';
    if (lowerName.includes('פז')) return 'https://logo.clearbit.com/paz.co.il';
    if (lowerName.includes('מקס') || lowerName.includes('max')) return 'https://logo.clearbit.com/max.co.il';
    if (lowerName.includes('ישראכרט')) return 'https://logo.clearbit.com/isracard.co.il';
    if (lowerName.includes('כאל')) return 'https://logo.clearbit.com/cal-online.co.il';
    if (lowerName.includes('ביטוח')) return 'https://logo.clearbit.com/harel-group.co.il';
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=475569&bold=true&font-size=0.45&length=2`;
  };

  useEffect(() => {
    async function loadVendorsList() {
      try {
        const list = await fetchVendors();
        if (list) {
          setVendors(list);
        }
      } catch (err) {
        console.warn("Could not fetch vendors list:", err);
      }
    }
    loadVendorsList();
  }, [fetchVendors]);

  // Real-time synchronization
  useEffect(() => {
    let unsubscribeSO: (() => void) | null = null;
    let unsubscribeLoans: (() => void) | null = null;

    if (db && isRealConfig) {
      setLoading(true);
      try {
        const qSO = query(collection(db, 'standing_orders'), where('userId', '==', user.uid));
        unsubscribeSO = onSnapshot(qSO, (snapshot) => {
          const items: StandingOrder[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() } as StandingOrder);
          });
          setStandingOrders(items);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'standing_orders');
        });

        const qLoans = query(collection(db, 'loans'), where('userId', '==', user.uid));
        unsubscribeLoans = onSnapshot(qLoans, (snapshot) => {
          const items: Loan[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() } as Loan);
          });
          setLoans(items);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'loans');
        });
      } catch (err) {
        console.error("Firestore live subscription setup failed, using offline mode:", err);
        loadManual();
      }
    } else {
      loadManual();
    }

    async function loadManual() {
      try {
        setLoading(true);
        const soData = await fetchStandingOrders(user.uid);
        const loanData = await fetchLoans(user.uid);
        setStandingOrders(soData);
        setLoans(loanData);
      } catch (err: any) {
        console.error("Failed to fetch commitments:", err);
        setError("שגיאה בטעינת נתוני התחייבויות פיננסיות");
      } finally {
        setLoading(false);
      }
    }

    return () => {
      if (unsubscribeSO) unsubscribeSO();
      if (unsubscribeLoans) unsubscribeLoans();
    };
  }, [user.uid]);

  // Triggering success message flash helper
  const triggerSuccessAlert = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Standing Order: Add
  const handleAddStandingOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soVendorName || !soAmount || isNaN(parseFloat(soAmount))) return;

    try {
      const amountVal = parseFloat(soAmount);
      // Auto calculate next payment date based on frequency (adds 1 month by default for starter)
      const nextDate = new Date(soStartDate);
      if (soFrequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (soFrequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (soFrequency === 'bimonthly') nextDate.setMonth(nextDate.getMonth() + 2);
      else if (soFrequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

      const newSoItem: Omit<StandingOrder, 'id'> = {
        userId: user.uid,
        vendorName: soVendorName.trim(),
        category: soCategory,
        amount: amountVal,
        frequency: soFrequency,
        startDate: soStartDate,
        nextPaymentDate: nextDate.toISOString().split('T')[0],
        status: 'active',
        paymentHistory: [
          {
            id: 'ph-' + Math.random().toString(36).substring(2, 5),
            date: soStartDate,
            amount: amountVal,
            status: 'paid'
          }
        ]
      };

      const result = await saveStandingOrder(newSoItem as StandingOrder);
      setStandingOrders(prev => [result, ...prev]);
      setIsSoModalOpen(false);

      // Clean inputs
      setSoVendorName('');
      setSoAmount('');
      setSoStartDate(new Date().toISOString().split('T')[0]);

      triggerSuccessAlert(`הוראת קבע עבור ${result.vendorName} הוגדרה בהצלחה!`);
    } catch (err) {
      console.error(err);
      setError("שיבוש ברישום הוראת קבע");
    }
  };

  // Standing Order: Toggle Status
  const handleToggleSoStatus = async (so: StandingOrder) => {
    const updated: StandingOrder = {
      ...so,
      status: so.status === 'active' ? 'paused' : 'active'
    };
    try {
      await saveStandingOrder(updated);
      setStandingOrders(prev => prev.map(item => item.id === so.id ? updated : item));
      triggerSuccessAlert(`הוראת הקבע של ${so.vendorName} ${updated.status === 'active' ? 'הופעלה מחדש' : 'הוקפאה זמנית'}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Standing Order: Open Edit Modal
  const handleOpenEditSoModal = (so: StandingOrder) => {
    setEditingSo(so);
    setEditSoVendorName(so.vendorName);
    setEditSoCategory(so.category);
    setEditSoAmount(so.amount.toString());
    setEditSoFrequency(so.frequency);
    setEditSoNextPaymentDate(so.nextPaymentDate || so.startDate);
    setIsEditSoModalOpen(true);
  };

  // Standing Order: Save Edit
  const handleSaveEditStandingOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSo || !editSoVendorName.trim() || !editSoAmount || isNaN(parseFloat(editSoAmount))) return;

    try {
      const updated: StandingOrder = {
        ...editingSo,
        vendorName: editSoVendorName.trim(),
        category: editSoCategory,
        amount: parseFloat(editSoAmount),
        frequency: editSoFrequency,
        nextPaymentDate: editSoNextPaymentDate
      };

      await saveStandingOrder(updated);
      setStandingOrders(prev => prev.map(item => item.id === editingSo.id ? updated : item));
      setIsEditSoModalOpen(false);
      setEditingSo(null);
      triggerSuccessAlert(`הוראת קבע של ${updated.vendorName} עודכנה בהצלחה!`);
    } catch (err) {
      console.error("Failed to update standing order:", err);
      setError("שגיאה בעדכון הוראת קבע");
    }
  };

  // Standing Order: Delete Trigger
  const handleDeleteStandingOrderClick = (soId: string) => {
    setSoToDelete(soId);
  };

  // Standing Order: Delete Confirm Action
  const handleConfirmDeleteSO = async () => {
    if (!soToDelete) return;
    try {
      const target = standingOrders.find(item => item.id === soToDelete);
      await deleteStandingOrder(user.uid, soToDelete);
      setStandingOrders(prev => prev.filter(item => item.id !== soToDelete));
      if (selectedOrderHistory?.id === soToDelete) {
        setSelectedOrderHistory(null);
      }
      if (target) {
        triggerSuccessAlert(`הוראת קבע עבור ${target.vendorName} נמחקה מהמערכת`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSoToDelete(null);
    }
  };

  // Standing Order: Pay standing order manually as a fast mock triggers validation
  const handleSimulateStandingOrderPayment = async (so: StandingOrder) => {
    const amountVal = so.amount;
    const today = new Date().toISOString().split('T')[0];
    
    // Create new payment history row
    const newRecord = {
      id: 'ph-' + Math.random().toString(36).substring(2, 5),
      date: today,
      amount: amountVal,
      status: 'paid' as const
    };

    // calculate next payment
    const nextDate = new Date();
    if (so.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (so.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (so.frequency === 'bimonthly') nextDate.setMonth(nextDate.getMonth() + 2);
    else if (so.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

    const updated: StandingOrder = {
      ...so,
      nextPaymentDate: nextDate.toISOString().split('T')[0],
      paymentHistory: [newRecord, ...so.paymentHistory]
    };

    try {
      await saveStandingOrder(updated);
      setStandingOrders(prev => prev.map(item => item.id === so.id ? updated : item));
      if (selectedOrderHistory?.id === so.id) {
        setSelectedOrderHistory(updated);
      }
      triggerSuccessAlert(`אישור תשלום מדומה עבור ${so.vendorName} עבר בהצלחה`);
    } catch (err) {
      console.error(err);
    }
  };

  // Loan: Add
  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanLender || !loanOriginalAmount || !loanRemainingAmount || !loanMonthlyPayment) return;

    try {
      const orig = parseFloat(loanOriginalAmount);
      const rem = parseFloat(loanRemainingAmount);
      const pay = parseFloat(loanMonthlyPayment);
      const interest = loanInterestRate ? parseFloat(loanInterestRate) : 0;

      const newLoanItem: Omit<Loan, 'id'> = {
        userId: user.uid,
        source: loanSource,
        lenderName: loanLender.trim(),
        originalAmount: orig,
        remainingAmount: Math.min(orig, rem), // balance shouldn't exceed original
        monthlyPayment: pay,
        interestRate: interest,
        startDate: loanStartDate
      };

      const result = await saveLoan(newLoanItem as Loan);
      setLoans(prev => [result, ...prev]);
      setIsLoanModalOpen(false);

      // Clean inputs
      setLoanLender('');
      setLoanOriginalAmount('');
      setLoanRemainingAmount('');
      setLoanMonthlyPayment('');
      setLoanInterestRate('');
      setLoanStartDate(new Date().toISOString().split('T')[0]);

      triggerSuccessAlert(`מעקב הלוואה מול ${result.lenderName} נוסף בהצלחה!`);
    } catch (err) {
      console.error(err);
      setError("שיבוש ברישום ההלוואה");
    }
  };

  // Loan: Pay-off or deduct amount manually
  const handleSimulateMonthlyRepayment = async (loan: Loan) => {
    // Subtract one monthly payment
    const newRemaining = Math.max(0, loan.remainingAmount - loan.monthlyPayment);
    const updated: Loan = {
      ...loan,
      remainingAmount: newRemaining
    };

    try {
      await saveLoan(updated);
      setLoans(prev => prev.map(item => item.id === loan.id ? updated : item));
      if (newRemaining === 0) {
        triggerSuccessAlert(`מזל טוב! ההלוואה מול ${loan.lenderName} נסגרה במלואה! 🎉`);
      } else {
        triggerSuccessAlert(`עדכון בוצע: המעטת יתרה עבור ${loan.lenderName} ב-${loan.monthlyPayment} ₪`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Loan: Delete
  const handleDeleteLoan = async (loanId: string) => {
    try {
      const target = loans.find(item => item.id === loanId);
      await deleteLoan(user.uid, loanId);
      setLoans(prev => prev.filter(item => item.id !== loanId));
      if (target) {
        triggerSuccessAlert(`ההלוואה מול ${target.lenderName} נמחקה בהצלחה`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Early payoff simulation helper
  const getSimulationResult = (loan: Loan) => {
    const oneTime = parseFloat(extraOneTime) || 0;
    const monthlyExtra = parseFloat(extraMonthly) || 0;
    
    // Monthly interest calculation
    const r = (loan.interestRate || 0) / 100 / 12;
    const remaining = loan.remainingAmount;
    const baseMonthly = loan.monthlyPayment;
    
    if (baseMonthly <= 0) {
      return null;
    }
    
    // 1. Baseline calculation
    let baseBalance = remaining;
    let baseMonths = 0;
    let baseTotalInterest = 0;
    
    while (baseBalance > 0.01 && baseMonths < 480) {
      const interest = baseBalance * r;
      if (interest >= baseMonthly && r > 0) {
        baseMonths = 999;
        break;
      }
      const principalPaid = Math.min(baseBalance, baseMonthly - interest);
      baseTotalInterest += interest;
      baseBalance -= principalPaid;
      baseMonths++;
    }
    
    // 2. Simulated repayment (with extra one-time and extra monthly payments)
    let simBalance = Math.max(0, remaining - oneTime);
    let simMonths = 0;
    let simTotalInterest = 0;
    const simulatedMonthly = baseMonthly + monthlyExtra;
    
    while (simBalance > 0.01 && simMonths < 480) {
      const interest = simBalance * r;
      if (interest >= simulatedMonthly && r > 0) {
        simMonths = 999;
        break;
      }
      const principalPaid = Math.min(simBalance, simulatedMonthly - interest);
      simTotalInterest += interest;
      simBalance -= principalPaid;
      simMonths++;
    }
    
    const interestSaved = Math.max(0, baseTotalInterest - simTotalInterest);
    const monthsSaved = Math.max(0, baseMonths - simMonths);
    
    // Calculate estimated end dates
    const estBaseEndDate = new Date();
    estBaseEndDate.setMonth(estBaseEndDate.getMonth() + (baseMonths === 999 ? 120 : baseMonths));
    
    const estSimEndDate = new Date();
    estSimEndDate.setMonth(estSimEndDate.getMonth() + (simMonths === 999 ? 120 : simMonths));
    
    return {
      baseMonths,
      baseTotalInterest,
      simMonths,
      simTotalInterest,
      interestSaved,
      monthsSaved,
      baseEndDateStr: estBaseEndDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' }),
      simEndDateStr: estSimEndDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' }),
      neverEnds: baseMonths === 999 || simMonths === 999
    };
  };

  // Upcoming payments projection for Payment Calendar
  const getUpcomingPayments = (daysLimit: number) => {
    const occurrences: {
      id: string;
      vendorName: string;
      category: string;
      amount: number;
      frequency: string;
      date: Date;
      dateStr: string;
      formattedDate: string;
      dayName: string;
      isSoon: boolean;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + daysLimit);
    limitDate.setHours(23, 59, 59, 999);

    standingOrders
      .filter(so => so.status === 'active')
      .forEach(so => {
        if (!so.nextPaymentDate) return;

        let current = new Date(so.nextPaymentDate);
        current.setHours(0, 0, 0, 0);

        if (isNaN(current.getTime())) return;

        let iterations = 0;
        while (current <= limitDate && iterations < 30) {
          iterations++;
          if (current >= today) {
            const dateStr = current.toISOString().split('T')[0];
            const daysFromNow = Math.round((current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Check category filter
            const matchesCategory = calendarCategoryFilter === 'all' || so.category === calendarCategoryFilter;
            // Check search query
            const matchesSearch = so.vendorName.toLowerCase().includes(calendarSearchQuery.toLowerCase().trim());

            if (matchesCategory && matchesSearch) {
              occurrences.push({
                id: `${so.id}-${dateStr}`,
                vendorName: so.vendorName,
                category: so.category,
                amount: so.amount,
                frequency: so.frequency,
                date: new Date(current),
                dateStr: dateStr,
                formattedDate: current.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
                dayName: current.toLocaleDateString('he-IL', { weekday: 'long' }),
                isSoon: daysFromNow <= 7
              });
            }
          }

          // Advance based on frequency
          if (so.frequency === 'weekly') {
            current.setDate(current.getDate() + 7);
          } else if (so.frequency === 'monthly') {
            current.setMonth(current.getMonth() + 1);
          } else if (so.frequency === 'bimonthly') {
            current.setMonth(current.getMonth() + 2);
          } else if (so.frequency === 'yearly') {
            current.setFullYear(current.getFullYear() + 1);
          } else {
            current.setMonth(current.getMonth() + 1);
          }
        }
      });

    // Sort occurrences chronologically
    return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Overall Financial Calculations
  const activeStandingOrdersSum = standingOrders
    .filter(so => so.status === 'active')
    .reduce((sum, so) => sum + so.amount, 0);

  const totalLoansRemaining = loans.reduce((sum, l) => sum + l.remainingAmount, 0);
  const totalLoansMonthlyCost = loans.reduce((sum, l) => sum + l.monthlyPayment, 0);

  const translateFrequency = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'שבועי';
      case 'bimonthly': return 'דו-חודשי';
      case 'monthly': return 'חודשי';
      case 'yearly': return 'שנתי';
      default: return 'חודשי';
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      
      {/* Banner Top Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-28 h-28 text-white" />
        </div>
        <div className="relative z-10 space-y-3.5">
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold uppercase py-1 px-3 rounded-full border border-emerald-500/30">
            התחייבויות קבועות ומנופים
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">ניהול פיננסי מעצים</h2>
          
          <div className="grid grid-cols-2 gap-4 border-t border-slate-705/40 pt-4 mt-1 font-mono">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">סך הוראות קבע פעילות</p>
              <p className="text-lg font-bold text-emerald-400">
                {activeStandingOrdersSum.toLocaleString()} ₪ <span className="text-xs font-sans font-medium text-slate-300">/חודש</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">יתרת הלוואות מצטברת</p>
              <p className="text-lg font-bold text-amber-400">
                {totalLoansRemaining.toLocaleString()} ₪ <span className="text-xs font-sans font-medium text-slate-300">({totalLoansMonthlyCost.toLocaleString()} ₪ בחודש)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveSubTab('standingOrders')}
          className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeSubTab === 'standingOrders' 
              ? 'bg-white text-emerald-700 shadow-md shadow-emerald-700/5' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>הוראות קבע ({standingOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('loans')}
          className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeSubTab === 'loans' 
              ? 'bg-white text-emerald-700 shadow-md shadow-emerald-700/5' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4 shrink-0" />
          <span>ניהול הלוואות ({loans.length})</span>
        </button>
      </div>

      {/* Success alert message toast */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeSubTab === 'standingOrders' ? (
          <motion.div
            key="standingOrdersPanel"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            className="space-y-4"
          >
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">הוראות קבע ומנויים</h3>
                <p className="text-[10px] text-slate-500 font-medium">הוצאות קבועות היורדות בשיוך ישיר מחשבון העו"ש</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSoModalOpen(true)}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 px-3 rounded-xl transition-all flex items-center gap-1 shadow-md shadow-emerald-600/15"
              >
                <Plus className="w-3.5 h-3.5" />
                הקמת קבע
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start min-w-[240px] border border-slate-200/50">
              <button
                type="button"
                onClick={() => setSoViewMode('list')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  soViewMode === 'list'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 font-bold'
                }`}
              >
                שיוך וניהול
              </button>
              <button
                type="button"
                onClick={() => setSoViewMode('calendar')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  soViewMode === 'calendar'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 font-bold'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                לוח תשלומים מתוזמן
              </button>
            </div>

            {soViewMode === 'list' && (
              <>
                {/* List */}
                {standingOrders.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl space-y-2">
                    <p className="text-slate-400 text-xs font-medium">אין הוראות קבע מעודכנות כרגע.</p>
                    <p className="text-[10px] text-slate-350">קבע הוראת קבע ראשונה לניטור הוצאות שוטפות וקשיחות.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {standingOrders.map((so) => {
                      const isUpcomingSoon = (() => {
                        if (so.status !== 'active' || !so.nextPaymentDate) return false;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const payDate = new Date(so.nextPaymentDate);
                        payDate.setHours(0, 0, 0, 0);
                        if (isNaN(payDate.getTime())) return false;
                        const diffTime = payDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 3;
                      })();

                      return (
                        <div 
                          key={so.id}
                          className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-md ${
                            so.status === 'paused' 
                              ? 'border-slate-100 opacity-65 bg-slate-50/50' 
                              : isUpcomingSoon
                                ? 'border-rose-150 bg-rose-50/10'
                                : 'border-slate-100 shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex gap-3">
                              {/* Dynamic Logo avatar with placeholder */}
                              <div className="w-10 h-10 rounded-full border border-slate-100 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center relative shadow-sm">
                                <img 
                                  src={getVendorLogoUrl(so.vendorName, vendors)} 
                                  alt={so.vendorName} 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(so.vendorName)}&background=f1f5f9&color=475569&bold=true&font-size=0.45&length=2`;
                                  }}
                                  className="w-10 h-10 rounded-full object-contain"
                                />
                                {isUpcomingSoon && (
                                  <span className="absolute -top-0.5 -left-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                  {so.vendorName}
                                  {so.status === 'paused' && (
                                    <span className="text-[8px] bg-slate-250 text-slate-650 px-1.5 py-0.5 rounded-md font-sans">
                                      מושהה
                                    </span>
                                  )}
                                  {isUpcomingSoon && (
                                    <span className="inline-flex items-center gap-1 text-[8.5px] bg-rose-50 border border-rose-205 text-rose-600 px-2 py-0.5 rounded-full font-sans font-extrabold animate-pulse">
                                      <span className="w-1 h-1 bg-rose-500 rounded-full"></span>
                                      בתוך 3 ימים ⚠️
                                    </span>
                                  )}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    {so.category}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    תדירות: {translateFrequency(so.frequency)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-left font-mono">
                              <p className="text-sm font-bold text-slate-900">{so.amount.toLocaleString()} ₪</p>
                              <p className={`text-[8px] font-sans mt-0.5 ${isUpcomingSoon ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>הבא: {so.nextPaymentDate}</p>
                            </div>
                          </div>

                        {/* Bottom Action Tray */}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100/75 mt-3">
                          <div className="flex items-center gap-2">
                            {/* Status Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSoStatus(so)}
                              className={`text-[10px] font-bold py-1 px-2.5 rounded-lg transition-all flex items-center gap-1 ${
                                so.status === 'active'
                                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                  : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              {so.status === 'active' ? (
                                <>
                                  <Pause className="w-3 h-3" />
                                  עצור תשלום
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" />
                                  הפעל מחדש
                                </>
                              )}
                            </button>

                            {/* History View Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderHistory(so)}
                              className="text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-lg transition-all flex items-center gap-1"
                            >
                              <History className="w-3 h-3 text-slate-400" />
                              היסטוריית תשלומים
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Simulation Quick Pay-off */}
                            {so.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleSimulateStandingOrderPayment(so)}
                                className="text-[10px] font-bold text-emerald-750 hover:text-emerald-850 transition-colors"
                                title="סמלץ ביצוע תשלום נוסף בהיסטוריה"
                              >
                                סמלץ תשלום
                              </button>
                            )}

                            {/* Edit Action Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditSoModal(so)}
                              className="p-1.5 px-2 border border-slate-200 rounded-lg text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                              title="ערוך הוראת קבע"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>ערוך</span>
                            </button>
                            
                            {/* Delete Trigger Button (Requires confirmation modal) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStandingOrderClick(so.id)}
                              className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center cursor-pointer"
                              title="מחיקת הוראת קבע"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}

                {/* Selected standing order history list section */}
                {selectedOrderHistory && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm animate-fadeIn space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-emerald-600" />
                        היסטוריית תשלומים: {selectedOrderHistory.vendorName}
                      </h4>
                      <button 
                        onClick={() => setSelectedOrderHistory(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedOrderHistory.paymentHistory.map((h, i) => (
                        <div key={h.id || i} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span className="text-slate-600 font-sans">{h.date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-800 font-bold">{h.amount.toLocaleString()} ₪</span>
                            <span className="text-[10px] font-sans font-extrabold text-emerald-600 bg-emerald-50/70 py-0.5 px-1.5 rounded-md">
                              עבר בהצלחה
                            </span>
                          </div>
                        </div>
                      ))}
                      {selectedOrderHistory.paymentHistory.length === 0 && (
                        <p className="text-slate-400 text-center text-[11px] font-medium py-3">טרם בוצעו משיכות תקופתיות מתועדות במערכת.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {soViewMode === 'calendar' && (() => {
              const upcomingPayments = getUpcomingPayments(calendarDaysLimit);
              const totalAmount = upcomingPayments.reduce((sum, item) => sum + item.amount, 0);
              const projectedBalance = (currentBalance ?? 0) - totalAmount;
              const isBalanceWarning = projectedBalance < 0;

              // Group upcoming payments by Month Year
              const groupedPayments: Record<string, typeof upcomingPayments> = {};
              upcomingPayments.forEach(p => {
                const key = p.date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
                if (!groupedPayments[key]) {
                  groupedPayments[key] = [];
                }
                groupedPayments[key].push(p);
              });

              return (
                <div className="space-y-4 animate-fadeIn">
                  {/* Calendar Controls & Filters */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      {/* Perspective Toggle Buttons */}
                      <div className="space-y-1 w-full md:w-auto">
                        <label className="block text-[10px] text-slate-500 font-bold">טווח תחזית מתוכנן</label>
                        <div className="flex bg-slate-50 border border-slate-150 p-0.5 rounded-xl gap-0.5 w-full md:w-auto">
                          {[
                            { label: '30 ימים', value: 30 },
                            { label: '90 ימים', value: 90 },
                            { label: '180 ימים', value: 180 }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setCalendarDaysLimit(option.value)}
                              className={`flex-1 md:flex-none py-1.5 px-3.5 text-[10.5px] font-extrabold rounded-lg transition-all ${
                                calendarDaysLimit === option.value
                                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search and Category Filter ROW */}
                      <div className="grid grid-cols-2 gap-2.5 w-full md:w-auto">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-500 font-bold">סינון קטגוריה</label>
                          <select
                            value={calendarCategoryFilter}
                            onChange={(e) => setCalendarCategoryFilter(e.target.value)}
                            className="text-[10.5px] p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                          >
                            <option value="all">כל הקטגוריות</option>
                            <option value="דיור וחשבונות">דיור וחשבונות</option>
                            <option value="מזון וסופרמרקט">מזון וסופרמרקט</option>
                            <option value="תחבורה ודלק">תחבורה ודלק</option>
                            <option value="פנאי ובידור">פנאי ובידור</option>
                            <option value="קניות וביגוד">קניות וביגוד</option>
                            <option value="אחר">אחר</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-500 font-bold">חיפוש ספק / הוראה</label>
                          <input
                            type="text"
                            placeholder="חיפוש לפי שם..."
                            value={calendarSearchQuery}
                            onChange={(e) => setCalendarSearchQuery(e.target.value)}
                            className="text-[10.5px] p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none w-full font-sans font-semibold placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Integrated Financial Impact Calculator Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 border-t border-dashed border-slate-100">
                      <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-slate-500 font-bold">סך משיכות מתוכננות בתקופה</p>
                        <p className="text-base font-extrabold text-slate-850 font-mono mt-0.5">
                          {totalAmount.toLocaleString()} ₪
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">{upcomingPayments.length} מועדי חיוב משוערכים</p>
                      </div>

                      <div className="bg-emerald-50/40 border border-emerald-100/40 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-emerald-800 font-bold">יתרה נוכחית בחשבון העו"ש</p>
                        <p className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                          {currentBalance.toLocaleString()} ₪
                        </p>
                        <p className="text-[8.5px] text-emerald-500 font-bold mt-0.5">נכון להצפה כעת</p>
                      </div>

                      <div className={`border rounded-xl p-3 text-center transition-colors ${
                        isBalanceWarning 
                          ? 'bg-rose-50 border-rose-100/60 text-rose-800' 
                          : 'bg-emerald-50 border-emerald-100/60 text-emerald-800'
                      }`}>
                        <p className="text-[10px] font-bold">יתרה חזויה לסוף תקופה</p>
                        <p className={`text-base font-extrabold font-mono mt-0.5 ${isBalanceWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {projectedBalance.toLocaleString()} ₪
                        </p>
                        <span className="text-[8.5px] font-bold block mt-0.5">
                          {isBalanceWarning 
                            ? '⚠️ חריגה צפויה! מומלץ להפקיד כספים' 
                            : '✓ יתרת עודפים בטוחה בתקופה'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Visual Timeline */}
                  {upcomingPayments.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-slate-400 text-xs font-medium">אין תשלומים מתוזמנים להצגה.</p>
                      <p className="text-[9.5px] text-slate-350">שנה את טווח הסינון או את קטגוריית החיפוש.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedPayments).map(([monthYear, items]) => (
                        <div key={monthYear} className="space-y-2.5">
                          {/* Month Heading */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50 capitalize">
                              {monthYear}
                            </span>
                            <div className="h-px bg-slate-150 flex-1" />
                            <span className="text-[9.5px] text-slate-400 font-bold font-mono">
                              תקציב מצטבר: {items.reduce((sum, o) => sum + o.amount, 0).toLocaleString()} ₪
                            </span>
                          </div>

                          {/* Items in that month */}
                          <div className="space-y-2.5 relative border-r-2 border-slate-100 mr-2.5 pr-4">
                            {items.map((occ) => (
                              <div
                                key={occ.id}
                                className={`relative group bg-white border rounded-xl p-3.5 transition-all hover:border-emerald-200 hover:shadow-sm ${
                                  occ.isSoon 
                                    ? 'border-amber-205 bg-gradient-to-l from-amber-50/15 to-white' 
                                    : 'border-slate-100 shadow-sm'
                                }`}
                              >
                                {/* Timeline Dot indicator overlay */}
                                <div className={`absolute top-5 -right-[23px] w-2.5 h-2.5 rounded-full border-2 border-white transition-transform group-hover:scale-125 ${
                                  occ.isSoon ? 'bg-amber-500 ring-2 ring-amber-50' : 'bg-slate-300'
                                }`} />

                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex gap-3 items-center">
                                    {/* Date display circle */}
                                    <div className={`w-11 h-11 rounded-xl shrink-0 flex flex-col items-center justify-center border font-mono ${
                                      occ.isSoon
                                        ? 'bg-amber-500 border-amber-400 text-white shadow-sm shadow-amber-500/10'
                                        : 'bg-slate-50 border-slate-100 text-slate-700'
                                    }`}>
                                      <span className="text-[8.5px] font-bold leading-none opacity-90">{occ.dayName.replace('יום ', '')}</span>
                                      <span className="text-xs font-extrabold leading-tight mt-0.5">{occ.formattedDate.split(' ')[0]}</span>
                                    </div>

                                    <div>
                                      <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 leading-none">
                                        {occ.vendorName}
                                        {occ.isSoon && (
                                          <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-sans font-bold">
                                            קרוב ביותר 🕒
                                          </span>
                                        )}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[8.5px] text-slate-500 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                          {occ.category}
                                        </span>
                                        <span className="text-[8.5px] text-slate-400 font-bold font-mono">
                                          {occ.dateStr}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-left font-mono">
                                    <p className="text-xs font-extrabold text-rose-600 font-mono">
                                      - {occ.amount.toLocaleString()} ₪
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-bold font-sans mt-0.5 text-right">
                                      {translateFrequency(occ.frequency)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Footer speech bubble info */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 text-[11px] leading-relaxed relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <Calendar className="w-16 h-16 text-white" />
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-extrabold text-emerald-400">המלצת תזמון מנועה 🧠</p>
                        <p className="text-slate-300 font-medium">
                          תוכנת התזרים שלי זיהתה מועדי משיכה מצטברים בתקופה. כדי למנוע חריגה זמנית בעו"ש, כדאי לשקול לשנות את תאריכי החיוב של הספקים מול חברות האשראי או פשוט ליצור מרווח בטחון פיננסי שוות ערך בקופה של {totalAmount.toLocaleString()} ₪ כדי לחסוך עמלות ולשמור על דירוג אשראי מעולה.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        ) : (
          <motion.div
            key="loansPanel"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-4"
          >
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">הלוואות ומינוף פיננסי</h3>
                <p className="text-[10px] text-slate-500 font-medium">כספים שנלקחו לחיזוק נכסים או הבראה, במעקב קפדני</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoanModalOpen(true)}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 px-3 rounded-xl transition-all flex items-center gap-1 shadow-md shadow-emerald-600/15"
              >
                <Plus className="w-3.5 h-3.5" />
                מעקב הלוואה
              </button>
            </div>

            {/* List */}
            {loans.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-100 rounded-2xl space-y-2">
                <p className="text-slate-400 text-xs font-medium">אין הלוואות תחת מעקב.</p>
                <p className="text-[10px] text-slate-350">הלוואות טובות או הלוואות גישור יסומנו פה להחזר חכם.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => {
                  const percentPaid = Math.max(0, Math.min(100, Math.round(((loan.originalAmount - loan.remainingAmount) / loan.originalAmount) * 100)));
                  return (
                    <div 
                      key={loan.id}
                      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
                    >
                      {/* Top Details */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
                            loan.source === 'bank' 
                              ? 'bg-amber-50 text-amber-600' 
                              : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {loan.source === 'bank' ? (
                              <Landmark className="w-5 h-5" />
                            ) : (
                              <Users className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                              {loan.lenderName}
                              <span className={`text-[8px] px-2 py-0.5 rounded-full font-medium ${
                                loan.source === 'bank' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-indigo-100 text-indigo-850'
                              }`}>
                                {loan.source === 'bank' ? 'מוסדי' : 'פרטי / קרובים'}
                              </span>
                            </h4>
                            <p className="text-[9px] text-slate-400 mt-0.5">סוגר יתרת חובה מיום: {loan.startDate}</p>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <p className="text-xs text-slate-400 font-sans font-semibold">החזר חודשי</p>
                          <p className="text-sm font-extrabold text-amber-600">{loan.monthlyPayment.toLocaleString()} ₪</p>
                        </div>
                      </div>

                      {/* Progress Bar of Payoff */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold font-mono">
                          <span>שולם: {percentPaid}%</span>
                          <span>יתרה: {loan.remainingAmount.toLocaleString()} ₪ מתוך {loan.originalAmount.toLocaleString()} ₪</span>
                        </div>
                        <div className="bg-slate-100 h-2 rounded-full overflow-hidden w-full relative">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentPaid}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Bottom Info Section */}
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-[10px] font-semibold text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5 bg-slate-50 py-1 px-2 rounded-lg">
                            <Percent className="w-3 h-3 text-slate-400" />
                            ריבית: {loan.interestRate}%
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {loan.remainingAmount > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSimulateMonthlyRepayment(loan)}
                                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1 px-3 rounded-lg transition-all flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                סמלץ תשלום חודש
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (simulatingLoanId === loan.id) {
                                    setSimulatingLoanId(null);
                                  } else {
                                    setSimulatingLoanId(loan.id);
                                    setExtraOneTime('5000');
                                    setExtraMonthly('200');
                                  }
                                }}
                                className={`py-1 px-3 rounded-lg transition-all flex items-center gap-1 ${
                                  simulatingLoanId === loan.id
                                    ? 'text-white bg-amber-600 hover:bg-amber-700 font-bold'
                                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold'
                                }`}
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                סימולטור פירעון
                              </button>
                            </>
                          ) : (
                            <span className="text-emerald-600 font-extrabold bg-emerald-50 py-1 px-2.5 rounded-lg flex items-center gap-1">
                              שולם במלואו 🎉
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                            title="מחיקת הלוואה מהמעקב"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Live early payoff simulation block */}
                      <AnimatePresence>
                        {simulatingLoanId === loan.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-4">
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5 font-sans">
                                    <Calculator className="w-4 h-4 text-amber-600" />
                                    <h5 className="text-xs font-extrabold text-slate-800">סימולטור פירעון מוקדם של נועה 💡</h5>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSimulatingLoanId(null)}
                                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                <p className="text-[10.5px] text-slate-500 font-medium">
                                  בוא נבדוק כיצד הזרמת כספים עודפים תפחית לך את עלויות המימון והריבית המצטברות.
                                </p>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                                      פירעון חד-פעמי / Extra Amount (₪)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={loan.remainingAmount}
                                      placeholder="0"
                                      value={extraOneTime}
                                      onChange={(e) => setExtraOneTime(e.target.value)}
                                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-center focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                    />
                                    <span className="text-[8.5px] text-slate-400 font-bold block mt-0.5 text-center">פירעון מיידי ח"פ להקטנת הקרן</span>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                                      החזר חודשי נוסף / Extra Monthly (₪)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={extraMonthly}
                                      onChange={(e) => setExtraMonthly(e.target.value)}
                                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-center focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                    />
                                    <span className="text-[8.5px] text-slate-400 font-bold block mt-0.5 text-center">ביצוע תשלומים גדולים יותר מדי חודש</span>
                                  </div>
                                </div>

                                {/* Live feedback description alert */}
                                <div className="text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-100/60 rounded-xl p-2.5 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>הנתונים מטה מחושבים ומעודכנים אוטומטית ובאופן מיידי בכל שינוי קלט!</span>
                                </div>

                                {/* Calculation Outputs */}
                                {(() => {
                                  const res = getSimulationResult(loan);
                                  if (!res) return null;

                                  return (
                                    <div className="space-y-3.5 pt-2">
                                      {/* Highlight KPI metrics */}
                                      <div className="grid grid-cols-2 gap-2.5">
                                        <div className="bg-emerald-50 border border-emerald-100/70 rounded-xl p-3 text-center">
                                          <p className="text-[9.5px] text-emerald-700 font-extrabold text-center w-full">חיסכון משוער בריבית / Interest Saved</p>
                                          <p className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                                            {loan.interestRate === 0 ? '0 ₪' : `${Math.round(res.interestSaved).toLocaleString()} ₪`}
                                          </p>
                                        </div>

                                        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 text-center">
                                          <p className="text-[9.5px] text-amber-800 font-extrabold text-center w-full">קיצור תקופת ההחזר / Period Saved</p>
                                          <p className="text-base font-extrabold text-amber-600 font-mono mt-0.5">
                                            {res.monthsSaved} חודשים
                                          </p>
                                        </div>
                                      </div>

                                      {/* Target dates info */}
                                      <div className="bg-white rounded-xl p-3 border border-slate-150 space-y-1.5 text-[10px] font-bold text-slate-600 font-sans">
                                        <div className="flex justify-between">
                                          <span>תאריך סיום מקורי מוערך:</span>
                                          <span className="text-slate-500">{res.baseEndDateStr}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600 font-extrabold">
                                          <span className="flex items-center gap-1">
                                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                                            תאריך סיום חדש ומהיר / New End Date:
                                          </span>
                                          <span>{res.simEndDateStr}</span>
                                        </div>
                                      </div>

                                      {/* Noa's advisor advice speech bubble */}
                                      <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white rounded-2xl p-3.5 text-[10.5px] font-medium leading-relaxed shadow-lg">
                                        <div className="flex items-start gap-2">
                                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                          <p className="text-slate-200">
                                            {loan.interestRate > 0 ? (
                                              res.interestSaved > 100 ? (
                                                `מעולה! שילוב של פירעונות אלו יטוס קדימה ויחסוך לך ריביות מצטברות של ${Math.round(res.interestSaved).toLocaleString()} ₪ ויקדים את חופש הבחירה הפיננסי שלך ב-${res.monthsSaved} חודשים שלמים!`
                                              ) : (
                                                `הקדמה זו מייצרת הקלה מיידית של ${res.monthsSaved} חודשים בהתחייבויות שלך. כל שקל נוסף מקצר את משך ההשתעבדות לחוב!`
                                              )
                                            ) : (
                                              `מכיוון שההלוואה הינה ללא ריבית (למשל סיוע בריא ממשפחה/מקרובים), החיסכון הכלכלי הינו בקיצור תקופת ההתחייבות והחזרת השקט הנפשי מהר יותר ב-${res.monthsSaved} חודשים נקיים מחובות!`
                                            )}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Apply Prepayment triggers */}
                                      <div className="flex gap-2 pt-1 font-sans">
                                        {parseFloat(extraOneTime) > 0 && (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              const amt = parseFloat(extraOneTime);
                                              if (isNaN(amt) || amt <= 0) return;
                                              const newRemaining = Math.max(0, loan.remainingAmount - amt);
                                              const updated: Loan = {
                                                ...loan,
                                                remainingAmount: newRemaining
                                              };
                                              try {
                                                await saveLoan(updated);
                                                setLoans(prev => prev.map(item => item.id === loan.id ? updated : item));
                                                setExtraOneTime('5000');
                                                triggerSuccessAlert(`פירעון חד פעמי על סך ${amt.toLocaleString()} ₪ עודכן בהצלחה במערכת!`);
                                                if (newRemaining === 0) {
                                                  setSimulatingLoanId(null);
                                                }
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-center leading-none text-[10.5px] transition-all"
                                          >
                                            בצע פירעון של {parseFloat(extraOneTime).toLocaleString()} ₪ כעת
                                          </button>
                                        )}

                                        {parseFloat(extraMonthly) > 0 && (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              const monthlyAdd = parseFloat(extraMonthly);
                                              if (isNaN(monthlyAdd) || monthlyAdd <= 0) return;
                                              const updated: Loan = {
                                                ...loan,
                                                monthlyPayment: loan.monthlyPayment + monthlyAdd
                                              };
                                              try {
                                                await saveLoan(updated);
                                                setLoans(prev => prev.map(item => item.id === loan.id ? updated : item));
                                                setExtraMonthly('200');
                                                triggerSuccessAlert(`סכום ההחזר החודשי עודכן בהצלחה ל-${updated.monthlyPayment.toLocaleString()} ₪`);
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }}
                                            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-xl text-center leading-none text-[10.5px] transition-all"
                                          >
                                            הגדל החזר חודשי ב-{parseFloat(extraMonthly).toLocaleString()} ₪
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: Create Standing Order Form */}
      <AnimatePresence>
        {isSoModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 animate-fadeIn flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 animate-slideUp border-t border-slate-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <DialogTitle className="text-base font-extrabold text-slate-950">קביעת הוראת קבע חדשה</DialogTitle>
                <button
                  onClick={() => setIsSoModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <DialogDescription className="sr-only">רישום הוראת קבע חדשה, דפוס גבייה, תדירות וסכום שיוזרם לחשבונות המערכת.</DialogDescription>

              <form onSubmit={handleAddStandingOrder} className="space-y-4 font-sans text-xs font-semibold text-slate-700">
                <div>
                  <label className="block mb-1 text-slate-600 font-medium">שם מוטב / ספק</label>
                  <input
                    type="text"
                    required
                    placeholder="לדוג׳: חברת החשמל, סלקום, נטפליקס"
                    value={soVendorName}
                    onChange={(e) => setSoVendorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">סכום חיוב (₪)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="₪ סכום מדויק או ממוצע"
                      value={soAmount}
                      onChange={(e) => setSoAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium font-sans">קטגוריה קבועה</label>
                    <select
                      value={soCategory}
                      onChange={(e) => setSoCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm"
                    >
                      <option value="דיור וחשבונות">דיור וחשבונות</option>
                      <option value="מזון וסופרמרקט">מזון וסופרמרקט</option>
                      <option value="תחבורה ודלק">תחבורה ודלק</option>
                      <option value="פנאי ובידור">פנאי ובידור</option>
                      <option value="קניות וביגוד">קניות וביגוד</option>
                      <option value="אחר">אחר</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">תדירות גבייה</label>
                    <select
                      value={soFrequency}
                      onChange={(e) => setSoFrequency(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                    >
                      <option value="weekly">כל שבוע</option>
                      <option value="bimonthly">דו-חודשי</option>
                      <option value="monthly">חודשי</option>
                      <option value="yearly">שנתי</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">תאריך תחילת ההוראה</label>
                    <input
                      type="date"
                      required
                      value={soStartDate}
                      onChange={(e) => setSoStartDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full text-white bg-emerald-600 hover:bg-emerald-700 py-3.5 mt-2 rounded-xl text-sm leading-none font-bold shadow-md shadow-emerald-600/10 transition-colors"
                >
                  הקמת הוראת קבע תקנית
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Create Loan Track Form */}
      <AnimatePresence>
        {isLoanModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 animate-fadeIn flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 animate-slideUp border-t border-slate-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <DialogTitle className="text-base font-extrabold text-slate-950">הוספת מעקב הלוואה חדשה</DialogTitle>
                <button
                  onClick={() => setIsLoanModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <DialogDescription className="sr-only">מעקב אחר הלוואות גישור, מימון מול מוסד בנקאי או מלווים פרטיים.</DialogDescription>

              <form onSubmit={handleAddLoan} className="space-y-4 font-sans text-xs font-semibold text-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">מקור החוב</label>
                    <select
                      value={loanSource}
                      onChange={(e) => setLoanSource(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm"
                    >
                      <option value="bank">בנקאי / פיננסי עצמאי</option>
                      <option value="private">מלווה פרטי (משפחה/חבר)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">שם המלווה</label>
                    <input
                      type="text"
                      required
                      placeholder="לדוג׳: לאומי, סבתא חנה, בנק מזרחי"
                      value={loanLender}
                      onChange={(e) => setLoanLender(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium font-sans">גובה הלוואה מקורי (₪)</label>
                    <input
                      type="number"
                      required
                      placeholder="₪ סכום מקורי כולל"
                      value={loanOriginalAmount}
                      onChange={(e) => setLoanOriginalAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">יתרה עדכנית (₪)</label>
                    <input
                      type="number"
                      required
                      placeholder="₪ כמה נשאר לשלם"
                      value={loanRemainingAmount}
                      onChange={(e) => setLoanRemainingAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block mb-1 text-slate-600 font-medium">ריבית %</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ריבית לשנה"
                      value={loanInterestRate}
                      onChange={(e) => setLoanInterestRate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block mb-1 text-slate-600 font-medium">החזר חודשי (₪)</label>
                    <input
                      type="number"
                      required
                      placeholder="₪ סכום החזר"
                      value={loanMonthlyPayment}
                      onChange={(e) => setLoanMonthlyPayment(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block mb-1 text-slate-600 font-medium text-[10px]">תאריך התחלה</label>
                    <input
                      type="date"
                      required
                      value={loanStartDate}
                      onChange={(e) => setLoanStartDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[10px] text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full text-white bg-emerald-600 hover:bg-emerald-700 py-3.5 mt-2 rounded-xl text-sm leading-none font-bold shadow-md shadow-emerald-600/10 transition-colors"
                >
                  שמירת הלוואה למעקב
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Edit Standing Order Form */}
      <AnimatePresence>
        {isEditSoModalOpen && editingSo && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 border border-slate-200 shadow-xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <DialogTitle className="text-base font-extrabold text-slate-950">עריכת הוראת קבע</DialogTitle>
                <button
                  onClick={() => setIsEditSoModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <DialogDescription className="sr-only">ערוך מאפייני הוראת קבע קיימת, סכום, תדר ופרטים.</DialogDescription>

              <form onSubmit={handleSaveEditStandingOrder} className="space-y-4 font-sans text-xs font-semibold text-slate-700">
                <div>
                  <label className="block mb-1 text-slate-600 font-medium">שם מוטב / ספק</label>
                  <input
                    type="text"
                    required
                    placeholder="לדוג׳: חברת החשמל, סלקום, נטפליקס"
                    value={editSoVendorName}
                    onChange={(e) => setEditSoVendorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">סכום חיוב (₪)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="₪ סכום מדויק או ממוצע"
                      value={editSoAmount}
                      onChange={(e) => setEditSoAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium font-sans">קטגוריה קבועה</label>
                    <select
                      value={editSoCategory}
                      onChange={(e) => setEditSoCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm"
                    >
                      <option value="דיור וחשבונות">דיור וחשבונות</option>
                      <option value="מזון וסופרמרקט">מזון וסופרמרקט</option>
                      <option value="תחבורה ודלק">תחבורה ודלק</option>
                      <option value="פנאי ובידור">פנאי ובידור</option>
                      <option value="קניות וביגוד">קניות וביגוד</option>
                      <option value="אחר">אחר</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium">תדירות גבייה</label>
                    <select
                      value={editSoFrequency}
                      onChange={(e) => setEditSoFrequency(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                    >
                      <option value="weekly">כל שבוע</option>
                      <option value="bimonthly">דו-חודשי</option>
                      <option value="monthly">חודשי</option>
                      <option value="yearly">שנתי</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600 font-medium font-sans">תאריך חיוב קרוב</label>
                    <input
                      type="date"
                      required
                      value={editSoNextPaymentDate}
                      onChange={(e) => setEditSoNextPaymentDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-center font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full text-white bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-colors cursor-pointer"
                >
                  שמור שינויים בהוראת קבע
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Delete Standing Order Confirmation Dialog */}
      <AnimatePresence>
        {soToDelete && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-100"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-950 font-sans">אישור מחיקת הוראת קבע</h3>
                <p className="text-xs text-slate-500 font-medium">
                  האם אתה בטוח שברצונך למחוק לצמיתות את הוראת קבע זו? פעולה זו היא בלתי הפיכה ותמחק את כל היסטוריית התשלומים המסומלצת.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setSoToDelete(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  בטל מחיקה
                </button>
                <button
                  onClick={handleConfirmDeleteSO}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  כן, מחק לצמיתות
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
