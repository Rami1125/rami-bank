/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PiggyBank, 
  MessageSquareCode, 
  LayoutDashboard, 
  LineChart, 
  Settings2, 
  HelpCircle,
  Database,
  CloudLightning,
  Coins,
  ShieldCheck,
  Building
} from 'lucide-react';
import { UserProfile, Transaction, Budget, RecoveryPlan } from './types';
import { 
  fetchUserProfile, 
  fetchTransactions, 
  fetchBudgets, 
  fetchRecoveryPlans,
  addTransaction,
  deleteTransaction,
  saveBudgetsList,
  saveRecoveryPlan,
  updateUserProfile,
  authService
} from './firebase';

import Dashboard from './components/Dashboard';
import AIChat from './components/AIChat';
import BudgetManager from './components/BudgetManager';
import RecoveryPlanView from './components/RecoveryPlanView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'budget' | 'plan'>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Settings update fields
  const [newStartingBalance, setNewStartingBalance] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('NOA_GAS_URL') || '');
  const [gasToken, setGasToken] = useState(localStorage.getItem('NOA_GAS_TOKEN') || 'NOA_SECURE_VAULT_TOKEN_2026');

  // Setup initial content sync inside simple useEffect on layout mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const testUid = 'guest-123';
        const profile = await fetchUserProfile(testUid);
        const txList = await fetchTransactions(testUid);
        const budgetList = await fetchBudgets(testUid);
        const planList = await fetchRecoveryPlans(testUid);

        setUser(profile);
        setTransactions(txList);
        setBudgets(budgetList);
        setPlans(planList);

        // Prepopulate editing form
        setNewStartingBalance(profile.startingBalance.toString());
        setNewDisplayName(profile.displayName);
      } catch (err) {
        console.error("Critical error building initial data streams:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleCreateTransaction = async (txData: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user) return;
    const item: Transaction = {
      ...txData,
      userId: user.uid
    };
    const created = await addTransaction(item);
    setTransactions(prev => [created, ...prev]);

    // Force re-running budgets fetching to sync budget limits visually in progress bars!
    const updatedBudgets = await fetchBudgets(user.uid);
    setBudgets(updatedBudgets);
  };

  const handleDeleteTransactionItem = async (txId: string) => {
    if (!user) return;
    await deleteTransaction(user.uid, txId);
    setTransactions(prev => prev.filter(t => t.id !== txId));

    // Force re-running budgets fetching to synch progression bars
    const updatedBudgets = await fetchBudgets(user.uid);
    setBudgets(updatedBudgets);
  };

  const handleUpdateBudgets = async (newBudgetsList: Budget[]) => {
    if (!user) return;
    await saveBudgetsList(user.uid, newBudgetsList);
    setBudgets(newBudgetsList);
  };

  const handleUpdateRecoveryPlan = async (updatedPlan: RecoveryPlan) => {
    await saveRecoveryPlan(updatedPlan);
    setPlans([updatedPlan]);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatedProfile: UserProfile = {
      ...user,
      displayName: newDisplayName.trim() || user.displayName,
      startingBalance: isNaN(parseFloat(newStartingBalance)) ? user.startingBalance : parseFloat(newStartingBalance)
    };

    localStorage.setItem('NOA_GAS_URL', gasUrl.trim());
    localStorage.setItem('NOA_GAS_TOKEN', gasToken.trim());

    await updateUserProfile(updatedProfile);
    setUser(updatedProfile);
    setShowSettings(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6 gap-4">
        <PiggyBank className="w-16 h-16 text-emerald-400 animate-bounce" />
        <h2 className="text-xl font-bold font-sans">נועה הבנקאית - בונה עולם פיננסי מעצים...</h2>
        <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-2/3 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Calculated overall metrics
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentOverallCash = user.startingBalance + totalIncome - totalExpense;

  return (
    <div className="bg-slate-50 min-h-screen flex justify-center items-start lg:py-8 font-sans">
      
      {/* Container wrapper mimicking high-end mobile phone/tablet centered device flow */}
      <div className="w-full max-w-md bg-white min-h-screen lg:min-h-[850px] lg:rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200/50">
        
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-3.5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">נועה הבנקאית</h1>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">סוכנת פיננסית אישית</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors"
              title="הגדרות חשבון"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic settings overlay */}
        {showSettings && (
          <div className="absolute inset-0 bg-black/60 z-50 animate-fadeIn flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 animate-slideUp border-t border-gray-200">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">הגדרות ועוזר התקנה</h3>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="p-1 px-3 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg text-xs font-bold transition-all"
                >
                  סגור
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 font-sans text-xs font-semibold text-gray-700">
                <div>
                  <label className="block mb-1 text-gray-600">שם תצוגה עברי</label>
                  <input 
                    type="text" 
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-600">יתרת פתיחה בעו"ש (שקל)</label>
                  <input 
                    type="number" 
                    value={newStartingBalance}
                    onChange={(e) => setNewStartingBalance(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-mono"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1">
                    <span>חיבור זיכרון וכספת (Google Sheets API)</span>
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block mb-1 text-slate-500 font-medium">כתובת ה-Web App של Google Apps Script</label>
                      <input 
                        type="url" 
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={gasUrl}
                        onChange={(e) => setGasUrl(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-500 font-medium">אסימון אבטחה (Secure Token)</label>
                      <input 
                        type="text" 
                        value={gasToken}
                        onChange={(e) => setGasToken(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3 text-emerald-900">
                  <Database className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs">מצב מסד נתונים פסיבי</h5>
                    <p className="text-[10px] text-emerald-850 leading-relaxed mt-1">
                      האפליקציה פועלת במצב היברידי מאובטח. כל השינויים נשמרים בדפדפן באופן מיידי. ניתן לסנכרן עם Firebase החיצוני על ידי הוספת מפתח תקני ל-firebase-applet-config.json.
                    </p>
                  </div>
                </div>

                <button type="submit" className="w-full primary-btn py-3 mt-2 text-sm leading-none font-sans font-extrabold shadow-sm">
                  שמירת שינויים ועדכון פנקס
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Navigation Content Switchboard */}
        <main className="flex-1 overflow-y-auto px-5 pt-5 pb-24 bg-gray-50/40">
          {activeTab === 'dashboard' && (
            <Dashboard 
              user={user} 
              transactions={transactions} 
              budgets={budgets} 
              onAddTransaction={handleCreateTransaction} 
              onDeleteTransaction={handleDeleteTransactionItem} 
              onNavigateToChat={() => setActiveTab('chat')}
            />
          )}

          {activeTab === 'chat' && (
            <AIChat 
              user={user} 
              onAddTransaction={handleCreateTransaction} 
              currentBalance={currentOverallCash}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetManager 
              user={user} 
              budgets={budgets} 
              onSaveBudgets={handleUpdateBudgets}
            />
          )}

          {activeTab === 'plan' && (
            <RecoveryPlanView 
              user={user} 
              plans={plans} 
              onSavePlan={handleUpdateRecoveryPlan} 
              onNavigateToChat={() => setActiveTab('chat')}
            />
          )}
        </main>

        {/* Sticky Mobile bottom Tab Nav Bar */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex justify-around items-center shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">לוח בקרה</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'chat' ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <MessageSquareCode className="w-5 h-5" />
              <span className="absolute -top-1 -left-1.5 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
            </div>
            <span className="text-[10px]">הצ׳אט של נועה</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'budget' ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LineChart className="w-5 h-5" />
            <span className="text-[10px]">תקציבים</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'plan' ? 'text-emerald-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Coins className="w-5 h-5" />
            <span className="text-[10px]">תוכנית הבראה</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
