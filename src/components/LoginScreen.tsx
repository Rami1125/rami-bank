import React, { useState } from 'react';
import { PiggyBank, Lock, Unlock, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  onUnlock: () => void;
}

export default function LoginScreen({ onUnlock }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1125') {
      onUnlock();
    } else {
      setError('קוד גישה שגוי. אנא נסה שוב או פנה למנהל המערכת.');
      setPin('');
    }
  };

  const handleNumClick = (num: string) => {
    setError('');
    if (pin.length < 8) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="bg-slate-950 min-h-screen flex justify-center items-start lg:py-8 font-sans" dir="rtl">
      {/* Centered screen container resembling a luxurious PWA dashboard portal */}
      <div className="w-full max-w-md bg-slate-900 text-white min-h-screen lg:min-h-[850px] lg:rounded-[40px] shadow-2xl overflow-hidden flex flex-col justify-between p-6 relative border border-slate-800">
        
        {/* Animated ambient decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header containing security seal */}
        <div className="flex justify-between items-center w-full z-10 pt-2">
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 px-3 rounded-2xl border border-slate-800 text-[10px] text-slate-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>סביבה מאובטחת 256-Bit</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Core Splash & Form container */}
        <div className="my-auto space-y-8 z-10 py-6">
          {/* Custom Dicebear Notionist Avatar */}
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-500/40 p-1 shadow-2xl relative"
            >
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Noa&backgroundColor=e2e8f0" 
                alt="נועה הבנקאית" 
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover" 
              />
              <div className="absolute bottom-1 right-1 bg-emerald-500 p-1.5 rounded-full text-slate-950 shadow-md">
                <Lock className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
              </div>
            </motion.div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight">נועה הבנקאית</h1>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                מערכת ה-PWA הפיננסית האישית שלך. אנא הזן קוד אבטחה לפתיחת השער לפרופיל.
              </p>
            </div>
          </div>

          {/* Password Action Area */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xs mx-auto">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  readOnly
                  placeholder="הקלד קוד גישה..."
                  value={pin}
                  className="w-full text-center tracking-[0.4em] text-lg bg-slate-950 border border-slate-800 p-4 rounded-2xl text-emerald-400 font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Indicator dots mapping pin length */}
              <div className="flex justify-center gap-2 py-1">
                {[1, 2, 3, 4].map((dotIndex) => (
                  <div
                    key={dotIndex}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      pin.length >= dotIndex ? 'w-6 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'w-2.5 bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Simulated Numpad for authentic Mobile App feel */}
            <div className="grid grid-cols-3 gap-3 pt-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumClick(digit)}
                  className="bg-slate-950/50 hover:bg-slate-800 border border-slate-850 p-4 rounded-2xl font-black text-base text-slate-200 transition-all select-none active:scale-95 cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="bg-slate-950/20 hover:bg-red-950/20 border border-red-950/30 text-red-400 p-4 rounded-2xl font-bold text-xs transition-all select-none active:scale-95 cursor-pointer"
              >
                נקה
              </button>
              <button
                type="button"
                onClick={() => handleNumClick('0')}
                className="bg-slate-950/50 hover:bg-slate-800 border border-slate-850 p-4 rounded-2xl font-black text-base text-slate-200 transition-all select-none active:scale-95 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="bg-slate-950/50 hover:bg-slate-800 border border-slate-850 p-4 rounded-2xl font-black text-slate-400 hover:text-white transition-all select-none active:scale-95 cursor-pointer flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            {/* Standard submit bypass triggers */}
            <button
              type="submit"
              disabled={pin.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-950/40 text-center"
            >
              <span>כניסה למערכת</span>
            </button>
          </form>
        </div>

        {/* Footer info lock system */}
        <div className="text-center text-[10px] text-slate-500 font-semibold z-10 pt-4 pb-2 border-t border-slate-850">
          מערכת מנהלים נועה הבנקאית • סימולטור פיתוח (1125)
        </div>
      </div>
    </div>
  );
}
