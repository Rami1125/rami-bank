/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertTriangle, 
  Sparkles, 
  PlusCircle, 
  Calendar, 
  X, 
  CheckCircle, 
  ChevronLeft 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Transaction, Budget, UserProfile } from '../types';
import CategoryIcon from './CategoryIcon';

interface DashboardProps {
  user: UserProfile;
  transactions: Transaction[];
  budgets: Budget[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onNavigateToChat: () => void;
}

export default function Dashboard({ 
  user, 
  transactions, 
  budgets, 
  onAddTransaction, 
  onDeleteTransaction,
  onNavigateToChat 
}: DashboardProps) {
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('מזון וסופרמרקט');
  const [vendorName, setVendorName] = useState('');
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate current total balance
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = user.startingBalance + totalIncome - totalExpense;

  // Formulate data for charts (grouped by category)
  const categorySummaryMap: { [key: string]: number } = {};
  budgets.forEach(b => {
    categorySummaryMap[b.category] = 0;
  });

  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categorySummaryMap[t.category] = (categorySummaryMap[t.category] || 0) + t.amount;
    });

  const chartData = Object.keys(categorySummaryMap).map(cat => {
    const budget = budgets.find(b => b.category === cat);
    return {
      name: cat,
      הוצאה: categorySummaryMap[cat],
      תקציב: budget ? budget.allocatedAmount : 1000
    };
  });

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;
    setIsSubmitting(true);
    try {
      await onAddTransaction({
        type,
        amount: parseFloat(amount),
        date: new Date().toISOString().split('T')[0],
        category,
        vendorName: vendorName.trim() || 'כללי',
        freeText: freeText.trim() || 'רישום מהיר'
      });
      setAmount('');
      setVendorName('');
      setFreeText('');
      setShowQuickForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate dynamic proactive warnings from Noa Based on parameters
  const getProactiveAlerts = () => {
    const alerts = [];
    
    // Check if any budget category is near or over limit
    budgets.forEach(b => {
      const spent = categorySummaryMap[b.category] || 0;
      if (spent > b.allocatedAmount) {
        alerts.push({
          id: `over-${b.category}`,
          type: 'danger',
          title: `חריגה בתקציב ${b.category}`,
          message: `הוצאת ${spent.toLocaleString()} ₪ מתוך תקציב מתוכנן של ${b.allocatedAmount.toLocaleString()} ₪. מומלץ לצמצם הוצאות קרובות בקטגוריה זו.`
        });
      } else if (spent > b.allocatedAmount * 0.85) {
        alerts.push({
          id: `warn-${b.category}`,
          type: 'warning',
          title: `תקציב ${b.category} בסיכון גבוה`,
          message: `ניצלת כבר ${Math.round((spent / b.allocatedAmount) * 100)}% מתקציב ${b.category}. נותרו לך רק ${(b.allocatedAmount - spent).toLocaleString()} ₪ החודש.`
        });
      }
    });

    if (currentBalance < 1000) {
      alerts.push({
        id: 'low-cash',
        type: 'danger',
        title: 'יתרת עו"ש נמוכה מ-1,000 ₪',
        message: 'העובר ושב שלך צפוף מאוד. מומלץ להפעיל את תוכנית ההבראה ולבחון אילו הוראות קבע ניתן לדחות או לבטל.'
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'all-good',
        type: 'success',
        title: 'סטטוס תקציב תקין ויציב!',
        message: 'כל הכבוד! כל קטגוריות ההוצאה שלך נמצאות מתחת ליעד המקסימלי. המשך כך ותוכל לחסוך מעל 2,000 ₪ החודש.'
      });
    }

    return alerts;
  };

  const activeAlerts = getProactiveAlerts();

  return (
    <div className="space-y-6 pb-24">
      {/* Profile Header & Date */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs text-gray-500 block">ברוך הבא לבית הפיננסי שלך</span>
          <h2 className="text-xl font-bold text-gray-800">שלום, {user.displayName} 👋</h2>
        </div>
        <div className="text-left bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-100 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-800 font-mono">מאי 2026</span>
        </div>
      </div>

      {/* Main Balance and Cash Flow Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-850">
        <div className="absolute top-1/2 right-0 w-48 h-48 bg-emerald-500 rounded-full blur-3xl opacity-15 -mr-12 -mt-24 pointer-events-none"></div>
        <span className="text-xs uppercase tracking-wider opacity-65 block font-medium">יתרה עדכנית משולבת</span>
        <div className="text-3xl font-bold mt-1 font-mono tracking-tight">{currentBalance.toLocaleString()} ₪</div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">הכנסות החודש</span>
              <span className="text-sm font-semibold font-mono text-emerald-400">+{totalIncome.toLocaleString()} ₪</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">הוצאות החודש</span>
              <span className="text-sm font-semibold font-mono text-rose-400">-{totalExpense.toLocaleString()} ₪</span>
            </div>
          </div>
        </div>
      </div>

      {/* Noa AI Spark Adviser Trigger Alert */}
      <div 
        onClick={onNavigateToChat}
        className="bg-emerald-50/40 border border-emerald-200/60 p-4 rounded-2xl cursor-pointer hover:bg-emerald-50 active:scale-[0.99] transition-all flex gap-3.5 items-start shadow-sm"
      >
        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0 mt-0.5 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">מדבר פה נועה הבנקאית...</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            רוצים לרשום קנייה במהירות? או לקבל המלצה חיסכון אישית? לחצו כאן כדי להמשיך את הצ׳אט איתי בעברית חופשית!
          </p>
          <span className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
            מעבר לצ׳אט הפיננסי <ChevronLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Proactive Balance Alerts System */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-500" />
          התראות ותובנות מנועה
        </h3>
        
        {activeAlerts.map(alert => (
          <div 
            key={alert.id}
            className={`p-4 rounded-2xl border flex gap-3.5 items-start ${
              alert.type === 'danger' 
                ? 'bg-rose-50/70 border-rose-200 text-rose-800' 
                : alert.type === 'warning' 
                  ? 'bg-amber-50/40 border-amber-200 text-amber-800' 
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-rose-600' : 'text-amber-600'}`} />
            )}
            <div>
              <h4 className="text-sm font-bold">{alert.title}</h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics Grid / Spending Graph */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-800">הוצאות מול תקציב מתוכנן</h3>
        <div className="h-64 filter drop-shadow-sm font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#888888" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip 
                formatter={(value: any) => [`${value.toLocaleString()} ₪`]}
                contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="הוצאה" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isOver = entry.הוצאה > entry.תקציב;
                  return <Cell key={`cell-${index}`} fill={isOver ? '#f43f5e' : '#10b981'} />;
                })}
              </Bar>
              <Bar dataKey="תקציב" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 justify-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500 rounded"></span>
            <span>הוצאה בפועל (בגבול)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-rose-500 rounded"></span>
            <span>חריגה מהתקציב</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-slate-200 rounded"></span>
            <span>תקציב מוקצב</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Tracker with deletion */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800">עסקאות אחרונות</h3>
          <button 
            type="button"
            onClick={() => setShowQuickForm(!showQuickForm)}
            className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1"
          >
            <PlusCircle className="w-4 h-4" />
            רישום מהיר
          </button>
        </div>

        {/* Quick Add Form modal overlay */}
        {showQuickForm && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-md space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-800">רישום תנועה חדשה בצורה ישירה</h4>
              <button onClick={() => setShowQuickForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">סוג התנועה</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500 bg-white"
                  >
                    <option value="expense">הוצאה</option>
                    <option value="income">הכנסה חיובית</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">סכום (₪)</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0"
                    required
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">קטגוריה</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500 bg-white"
                >
                  <option value="מזון וסופרמרקט">מזון וסופרמרקט</option>
                  <option value="דיור וחשבונות">דיור וחשבונות</option>
                  <option value="תחבורה ודלק">תחבורה ודלק</option>
                  <option value="פנאי ובידור">פנאי ובידור</option>
                  <option value="קניות וביגוד">קניות וביגוד</option>
                  <option value="משכורת">משכורת</option>
                  <option value="הכנסה נוספת">הכנסה נוספת</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">בית עסק</label>
                  <input 
                    type="text" 
                    value={vendorName} 
                    onChange={(e) => setVendorName(e.target.value)} 
                    placeholder="למשל: שופרסל"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">תיאור קצר</label>
                  <input 
                    type="text" 
                    value={freeText} 
                    onChange={(e) => setFreeText(e.target.value)} 
                    placeholder="למשל: סופר שבועי"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full primary-btn py-2.5 mt-2"
              >
                {isSubmitting ? 'מוסיף...' : 'הוסף עסקה לפנקס'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden shadow-sm">
          {transactions.length === 0 ? (
            <p className="text-xs text-gray-400 p-6 text-center">אין עדיין עסקאות מתועדות החודש.</p>
          ) : (
            transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="p-3.5 flex justify-between items-center group hover:bg-gray-50 transition-colors">
                <div className="flex gap-3.5 items-center">
                  <CategoryIcon category={tx.category} type={tx.type} />
                  <div>
                    <h5 className="text-sm font-bold text-gray-800">{tx.vendorName}</h5>
                    <span className="text-[11px] text-gray-400 block">{tx.category} • {tx.date}</span>
                    {tx.freeText && <span className="text-[10px] text-gray-500 italic block">{tx.freeText}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold font-mono ${
                    tx.type === 'income' ? 'text-emerald-600' : 'text-gray-800'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} ₪
                  </span>
                  <button 
                    onClick={() => tx.id && onDeleteTransaction(tx.id)}
                    className="text-gray-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                    title="מחק עסקה"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
