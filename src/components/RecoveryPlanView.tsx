/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Milestone, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Calendar, 
  Activity, 
  PlusCircle, 
  TrendingUp,
  X
} from 'lucide-react';
import { RecoveryPlan, UserProfile } from '../types';

interface RecoveryPlanViewProps {
  user: UserProfile;
  plans: RecoveryPlan[];
  onSavePlan: (plan: RecoveryPlan) => Promise<void>;
  onNavigateToChat: () => void;
}

export default function RecoveryPlanView({ user, plans, onSavePlan, onNavigateToChat }: RecoveryPlanViewProps) {
  const activePlan = plans[0] || {
    id: 'primary-plan-123',
    userId: user.uid,
    targetGoals: 'הבראה כללית ויציאה מחובות',
    timeline: '3 חודשים הקרובים',
    status: 'active' as const,
    milestones: []
  };

  const [newCheckpointText, setNewCheckpointText] = useState('');
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false);

  // Toggle milestone completion state
  const handleToggleMilestone = async (mId: string) => {
    const updatedMilestones = activePlan.milestones.map(m => {
      if (m.id === mId) {
        return { ...m, completed: !m.completed };
      }
      return m;
    });

    await onSavePlan({
      ...activePlan,
      milestones: updatedMilestones
    });
  };

  // Create a brand new milestone
  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointText.trim()) return;

    const newMilestone = {
      id: Math.random().toString(36).substring(2, 9),
      title: newCheckpointText.trim(),
      completed: false,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 weeks out
    };

    await onSavePlan({
      ...activePlan,
      milestones: [...activePlan.milestones, newMilestone]
    });

    setNewCheckpointText('');
    setShowAddCheckpoint(false);
  };

  // Delete milestone
  const handleDeleteMilestone = async (mId: string) => {
    const updatedMilestones = activePlan.milestones.filter(m => m.id !== mId);
    await onSavePlan({
      ...activePlan,
      milestones: updatedMilestones
    });
  };

  // Statistics
  const totalMilestones = activePlan.milestones.length;
  const completedMilestones = activePlan.milestones.filter(m => m.completed).length;
  const progressPercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      {/* Page Title */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600 animate-pulse" />
            תוכנית הבראה פיננסית צמודה
          </h2>
          <span className="text-xs text-gray-500 block mt-1">תוכנית משימות שבועית שנבנתה בשיתוף נועה הבנקאית</span>
        </div>
      </div>

      {/* Main Goal Banner Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-850">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-2xl opacity-15 -mr-6 -mt-6"></div>
        <div className="flex gap-2.5 items-center text-slate-400 text-xs font-semibold">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>יעד הבראה ראשי:</span>
        </div>
        <h3 className="text-base font-extrabold mt-2 leading-relaxed text-white">{activePlan.targetGoals}</h3>
        
        <div className="flex gap-2 items-center text-xs text-slate-300 mt-4 bg-slate-850 w-fit px-3 py-1.5 rounded-xl border border-slate-700/80 font-semibold font-sans">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>טווח זמנים: {activePlan.timeline}</span>
        </div>

        {/* Dynamic Progression bar metric */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-300 font-bold">
            <span>שלבים שהושלמו</span>
            <span className="font-mono text-emerald-400">{completedMilestones} / {totalMilestones}</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 block text-left font-mono">{progressPercent.toFixed(0)}% הושלם</span>
        </div>
      </div>

      {/* Sparks dynamic update notification */}
      <div className="bg-emerald-50/40 border border-emerald-200/60 p-4 rounded-2xl flex gap-3.5 items-start">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
        <div>
          <h4 className="text-sm font-bold text-slate-900">זקוקים למשימות חדשות?</h4>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed">
            נועה יכולה לערוך ולשדרג את תוכנית המשימות שלכם בכל רגע בצ׳אט! כתבו לה "נועה, בואי נעדכן את משימות החיסכון שלי" והמשימות ישתנו בהתאם לצרכים שלכם.
          </p>
          <button
            onClick={onNavigateToChat}
            className="text-xs font-bold text-emerald-600 underline mt-2 bg-transparent border-0 cursor-pointer block p-0"
          >
            פנייה ישירה לנועה בצ׳אט ישר מהשירות ←
          </button>
        </div>
      </div>

      {/* Milestone Checkpoint Timeline header */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Milestone className="w-5 h-5 text-gray-500" />
          אבני דרך ומשימות אקטיביות
        </h3>
        <button
          onClick={() => setShowAddCheckpoint(!showAddCheckpoint)}
          className="text-xs font-semibold text-skin-primary text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3 rounded-xl transition-all flex items-center gap-1"
        >
          <PlusCircle className="w-4 h-4" />
          הוספת משימה
        </button>
      </div>

      {/* Checkpoint add form */}
      {showAddCheckpoint && (
        <form onSubmit={handleAddCheckpoint} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md space-y-3 animate-fadeIn">
          <div>
            <label className="text-xs text-gray-500 block mb-1">כותרת המשימה / היעד</label>
            <input
              type="text"
              required
              placeholder="למשל: לא להוציא שקל על מסעדות השבוע"
              value={newCheckpointText}
              onChange={(e) => setNewCheckpointText(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-emerald-500 font-sans"
            />
          </div>
          <button type="submit" className="w-full primary-btn py-2 text-xs">
            שמור והוסף לתור המשימות
          </button>
        </form>
      )}

      {/* Chronological Milestone timeline list */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm relative space-y-1">
        
        {/* Visual connecting vertical line */}
        <div className="absolute top-8 bottom-8 right-7.5 w-0.5 bg-gray-100 pointer-events-none"></div>

        {activePlan.milestones.length === 0 ? (
          <p className="text-xs text-gray-400 p-6 text-center font-sans">אין עדיין אבני דרך בתור המשימות. פנו לנועה בצ׳אט!</p>
        ) : (
          activePlan.milestones.map((milestone) => (
            <div 
              key={milestone.id} 
              className="relative pr-9 pl-2 py-3.5 flex justify-between items-center group"
            >
              {/* Timeline dot button */}
              <button 
                onClick={() => handleToggleMilestone(milestone.id)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7.5 h-7.5 bg-white rounded-full flex items-center justify-center border-2 border-slate-100 hover:border-slate-300 transition-all text-slate-400 focus:outline-none"
              >
                {milestone.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50 rounded-full animate-scaleUp" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                )}
              </button>

              <div className="flex-1">
                <h4 className={`text-xs font-bold transition-all ${
                  milestone.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                }`}>
                  {milestone.title}
                </h4>
                {milestone.dueDate && (
                  <span className="text-[10px] text-gray-400 block mt-1 font-mono">תאריך יעד: {milestone.dueDate}</span>
                )}
              </div>

              {/* Delete milestone action */}
              <button
                onClick={() => handleDeleteMilestone(milestone.id)}
                className="text-gray-300 hover:text-rose-500 p-1 rounded hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                title="מחק משימה"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
