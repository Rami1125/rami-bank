/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  Edit3, 
  Check, 
  X, 
  AlertCircle,
  PiggyBank
} from 'lucide-react';
import { Budget, UserProfile } from '../types';
import CategoryIcon from './CategoryIcon';

interface BudgetManagerProps {
  user: UserProfile;
  budgets: Budget[];
  onSaveBudgets: (budgets: Budget[]) => Promise<void>;
}

export default function BudgetManager({ user, budgets, onSaveBudgets }: BudgetManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCat, setNewCat] = useState('פנאי ובידור');
  const [newAllocated, setNewAllocated] = useState('');

  const handleStartEdit = (b: Budget, id: string) => {
    setEditingId(id);
    setTempAmount(b.allocatedAmount.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempAmount('');
  };

  const handleSaveEdit = async (idxToSave: number) => {
    if (isNaN(parseFloat(tempAmount)) || parseFloat(tempAmount) < 0) return;
    const copy = [...budgets];
    copy[idxToSave] = {
      ...copy[idxToSave],
      allocatedAmount: parseFloat(tempAmount)
    };
    await onSaveBudgets(copy);
    setEditingId(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllocated || isNaN(parseFloat(newAllocated))) return;

    // Check if category already exists
    const exists = budgets.some(b => b.category === newCat);
    if (exists) {
      alert("קטגוריה זו כבר קיימת בתקציב החודשי!");
      return;
    }

    const newBudget: Budget = {
      userId: user.uid,
      month: 5,
      year: 2026,
      category: newCat,
      allocatedAmount: parseFloat(newAllocated),
      currentAmount: 0
    };

    await onSaveBudgets([...budgets, newBudget]);
    setNewAllocated('');
    setShowAddForm(false);
  };

  const handleDeleteBudget = async (idxToDelete: number) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק קטגוריית תקציב זו?")) {
      const copy = budgets.filter((_, i) => i !== idxToDelete);
      await onSaveBudgets(copy);
    }
  };

  // Calculations
  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.currentAmount, 0);
  const totalPercentage = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <PiggyBank className="w-6 h-6 text-emerald-600" />
          ניהול תקציב מתוכנן מול בפועל
        </h2>
        <span className="text-xs text-gray-500 block mt-1">מאי 2026 • הגדרות והקצאות יעד פיננסי תקופתי</span>
      </div>

      {/* Global Progress Bar Card */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center text-sm font-bold text-gray-700">
          <span>ניצול תקציב כולל החודש</span>
          <span className="font-mono">{totalActual.toLocaleString()} ₪ / {totalAllocated.toLocaleString()} ₪</span>
        </div>

        <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalPercentage > 100 
                ? 'bg-rose-500' 
                : totalPercentage > 85 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, totalPercentage)}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center pt-2">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span className="text-[10px] text-gray-400 block">סה"כ מתוכנן</span>
            <span className="text-xs font-bold font-mono text-gray-700">{totalAllocated.toLocaleString()} ₪</span>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span className="text-[10px] text-gray-400 block">ניצול בפועל</span>
            <span className="text-xs font-bold font-mono text-gray-700">{totalActual.toLocaleString()} ₪</span>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span className="text-[10px] text-gray-400 block">נותר פנוי</span>
            <span className={`text-xs font-bold font-mono ${totalAllocated - totalActual < 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600'}`}>
              {(totalAllocated - totalActual).toLocaleString()} ₪
            </span>
          </div>
        </div>
      </div>

      {/* Create Dynamic Custom Category */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold text-gray-800">קטגוריות מוקצות</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          קטגוריה חדשה
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleCreateCategory} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md space-y-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs text-gray-500 block mb-1">קטגוריה</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white"
              >
                <option value="מזון וסופרמרקט">מזון וסופרמרקט</option>
                <option value="דיור וחשבונות">דיור וחשבונות</option>
                <option value="תחבורה ודלק">תחבורה ודלק</option>
                <option value="פנאי ובידור">פנאי ובידור</option>
                <option value="חינוך וילדים">חינוך וילדים</option>
                <option value="קניות וביגוד">קניות וביגוד</option>
                <option value="אחר">אחר</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">סכום תקציב (₪)</label>
              <input
                type="number"
                placeholder="סכום מוצע"
                required
                value={newAllocated}
                onChange={(e) => setNewAllocated(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500 font-mono"
              />
            </div>
          </div>
          <button type="submit" className="w-full primary-btn py-2 text-xs mt-1">
            הוסף והקצה תקציב לפעילות
          </button>
        </form>
      )}

      {/* Budgets List Loop */}
      <div className="space-y-4">
        {budgets.map((b, idx) => {
          const spent = b.currentAmount;
          const pct = b.allocatedAmount > 0 ? (spent / b.allocatedAmount) * 100 : 0;
          const isOver = spent > b.allocatedAmount;
          const isWarning = spent > b.allocatedAmount * 0.85 && spent <= b.allocatedAmount;
          const isEditing = editingId === b.category;

          return (
            <div key={b.category} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3.5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={b.category} className="w-4 h-4" containerClassName="p-2 rounded-xl shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{b.category}</h4>
                    <span className="text-[10px] text-gray-400 block mt-0.5 font-sans">
                      ניצול: <span className="font-mono text-gray-600 font-semibold">{spent.toLocaleString()} ₪</span> בפועל
                    </span>
                  </div>
                </div>
                
                {/* Editing view */}
                {isEditing ? (
                  <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <input
                      type="number"
                      value={tempAmount}
                      onChange={(e) => setTempAmount(e.target.value)}
                      className="w-20 p-1 text-xs text-center border border-gray-300 rounded focus:outline-emerald-500 font-mono"
                    />
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-sans">תקציב:</span>
                    <span className="text-xs font-bold font-mono text-gray-800">
                      {b.allocatedAmount.toLocaleString()} ₪
                    </span>
                    <button
                      onClick={() => handleStartEdit(b, b.category)}
                      className="text-gray-400 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(idx)}
                      className="text-gray-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Individual Progress visualizer bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver 
                        ? 'bg-rose-500' 
                        : isWarning 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-sans">
                  <span className={isOver ? 'text-rose-600 font-bold' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>
                    {pct.toFixed(0)}% ניצול
                  </span>
                  
                  {isOver && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      חריגה של {(spent - b.allocatedAmount).toLocaleString()} ₪!
                    </span>
                  )}
                  {!isOver && (
                    <span className="text-gray-400">
                      נותרו {(b.allocatedAmount - spent).toLocaleString()} ₪ פנויים
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
