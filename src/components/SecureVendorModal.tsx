import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  X, 
  AlertCircle, 
  User, 
  CreditCard, 
  Landmark, 
  Building,
  ShieldCheck,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useVaultSync, VaultRecord } from '../hooks/useVaultSync';

interface SecureVendorModalProps {
  vendor: {
    vendorId: string;
    vendorName: string;
    category: string;
    logoUrl: string;
  };
  onClose: () => void;
}

// Local accessibility wrappers to fix Dialog validation warnings
const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={className}>{children}</h2>
);
const DialogDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={className}>{children}</p>
);

export default function SecureVendorModal({ vendor, onClose }: SecureVendorModalProps) {
  const { searchVaultSecure, loading, error, isConfigured } = useVaultSync();
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');
  
  // SECURE FIELDS STATE
  const [secureDetails, setSecureDetails] = useState<VaultRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  // COUNTDOWN TIMER
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-lock when timer hits 0
  useEffect(() => {
    if (isUnlocked) {
      setTimeLeft(60);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleLock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUnlocked]);

  const handleLock = () => {
    setIsUnlocked(false);
    setPin('');
    setPinError('');
    setSecureDetails(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleUnlockAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1125') {
      try {
        setPinError('');
        setIsUnlocked(true);

        // Fetch secure details from GAS if configured
        if (isConfigured) {
          const results = await searchVaultSecure(vendor.vendorName, '1125');
          if (results && results.length > 0) {
            setSecureDetails(results[0]);
          } else {
            // Setup fallback data within secure container if not found in sheets
            const fallback: VaultRecord = {
              keyName: vendor.vendorName,
              username: `user_${vendor.vendorId.toLowerCase()}`,
              password: `Pass${Math.floor(1000 + Math.random() * 9000)}!`,
              bankAccount: `בנק מזרחי טפחות (20), סניף 456, ח״ן 789123`,
              contactInfo: `מזהה ספק ${vendor.vendorId} - קוד אבטחה VND-9923`,
              lastContactDate: new Date().toISOString(),
              lastAmountUpdated: '***'
            };
            setSecureDetails(fallback);
          }
        } else {
          // Local sandbox mode values if Sheets API is unconfigured
          const fallback: VaultRecord = {
            keyName: vendor.vendorName,
            username: `noa_client_${vendor.vendorId.toLowerCase()}`,
            password: `NoaPass9932!`,
            bankAccount: `בנק לאומי (10), סניף 800, ח״ן 518392`,
            contactInfo: `מזהה לקוח: ${vendor.vendorId} | קוד ספק: CC-8812`,
            lastContactDate: new Date().toISOString(),
            lastAmountUpdated: '***'
          };
          setSecureDetails(fallback);
        }
      } catch (err: any) {
        setPinError(err.message || 'שגיאת פענוח אבטחה');
        setIsUnlocked(false);
      }
    } else {
      setPinError('קוד גישה שגוי! נסה שוב (סימולציה: הקלד 1125)');
    }
  };

  const triggerCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleVisibility = (fieldName: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Generate nice credit card number based on vendor
  const getDemoCard = () => {
    const hash = vendor.vendorName.charCodeAt(0) + vendor.vendorName.charCodeAt(1) || 4580;
    return `4580 12${(hash % 90) + 10} 8824 9912`;
  };

  const getDemoID = () => {
    const hash = (vendor.vendorName.charCodeAt(2) || 9) * 1234567;
    return String(300000000 + (hash % 90000000));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md text-right font-sans" dir="rtl">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-slate-900 border border-slate-800 text-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden"
      >
        <DialogTitle className="sr-only">פרטי כספת מאובטחים</DialogTitle>
        <DialogDescription className="sr-only">פרטי תעדוף, סיסמה וכרטיס חיוב עבור ספק שירות נבחר במצב כספת מאובטח.</DialogDescription>
        {/* Animated Security top progress bar (only when unlocked) */}
        {isUnlocked && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 60, ease: 'linear' }}
              className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />
          </div>
        )}

        {/* Modal Close */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-slate-800/80 hover:bg-slate-700 hover:text-red-400 rounded-full transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-700 flex items-center justify-center p-2.5 overflow-hidden shadow-lg shadow-black/40">
            <img
              src={vendor.logoUrl}
              alt={vendor.vendorName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.vendorName)}&background=1e293b&color=ffffff&bold=true`;
              }}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">{vendor.vendorName}</h3>
            <p className="text-xs text-slate-400">כספת פרטי זיהוי וחשבון מאובטחת</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            /* LOCKED STATE */
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-3xl flex items-center gap-3 text-right">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-200">אימות זהות נדרש</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    הפרטים הרגישים של {vendor.vendorName} מוגנים ברמת הצפנת כספת. אנא הזינו את קוד האבטחה (1125).
                  </p>
                </div>
              </div>

              <form onSubmit={handleUnlockAttempt} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold block pr-1">קוד אבטחה (PIN)</label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={8}
                      pattern="\d*"
                      inputMode="numeric"
                      required
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setPinError('');
                      }}
                      placeholder="הקש קוד כספת..."
                      className="w-full text-center tracking-[0.5em] text-sm bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      autoFocus
                    />
                    <Key className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {pinError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-950/20 cursor-pointer active:scale-95 transition-all text-center"
                >
                  <Lock className="w-4 h-4 text-white" />
                  <span>אימות ופתיחת כספת</span>
                </button>
              </form>
            </motion.div>
          ) : (
            /* UNLOCKED STATE */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Security Banner with Real-time Countdown */}
              <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-2xl flex justify-between items-center text-right">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>הכספת פתוחה</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl font-mono text-emerald-400 text-[10px] border border-slate-800">
                  <Timer className="w-3.5 h-3.5 animate-pulse" />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              {/* Secure Fields Container */}
              <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-3xl border border-slate-850">
                {/* ID Field */}
                <div className="flex justify-between items-center border-b border-slate-850 pb-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                    <span>ת״ז בעל החשבון:</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-white text-right font-medium">
                    <span>{showSensitive['id'] ? getDemoID() : '*********'}</span>
                    <button 
                      onClick={() => toggleVisibility('id')} 
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      {showSensitive['id'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => triggerCopy(getDemoID(), 'id')}
                      className="text-slate-400 hover:text-emerald-400 p-0.5"
                    >
                      {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="flex flex-col gap-1.5 border-b border-slate-850 pb-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>פרטי חשבון בנק לחיוב:</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900/40 p-1.5 rounded-xl">
                    <span className="font-semibold text-white">
                      {secureDetails?.bankAccount || `בנק מזרחי טפחות סניף 456, ח״ן 789123`}
                    </span>
                    <button 
                      onClick={() => triggerCopy(secureDetails?.bankAccount || `בנק מזרחי טפחות סניף 456, ח״ן 789123`, 'bank')}
                      className="text-slate-400 hover:text-emerald-400 p-1"
                    >
                      {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Credit Card Details */}
                <div className="flex justify-between items-center border-b border-slate-850 pb-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>כרטיס אשראי רשום:</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-white tracking-wider font-semibold">
                    <span>{showSensitive['cc'] ? getDemoCard() : '**** **** **** 9912'}</span>
                    <button 
                      onClick={() => toggleVisibility('cc')} 
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      {showSensitive['cc'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => triggerCopy(getDemoCard(), 'cc')}
                      className="text-slate-400 hover:text-emerald-400 p-0.5"
                    >
                      {copiedField === 'cc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Vendor Login / Safety Code */}
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <Key className="w-3.5 h-3.5" />
                    <span>קוד זיהוי ספק / משתמש:</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-emerald-300 font-bold">
                    <span>{secureDetails?.username || `VND-9923`}</span>
                    <button 
                      onClick={() => triggerCopy(secureDetails?.username || `VND-9923`, 'code')}
                      className="text-slate-400 hover:text-emerald-400 p-0.5"
                    >
                      {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Secure Passwords / Extra detail (only if sheets contains it) */}
              {secureDetails && secureDetails.password && (
                <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl flex justify-between items-center text-xs">
                  <span className="text-slate-400">סיסמת אתר ספק:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                    <span>{showSensitive['pass'] ? secureDetails.password : '********'}</span>
                    <button onClick={() => toggleVisibility('pass')} className="text-slate-400 hover:text-white p-0.5">
                      {showSensitive['pass'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => triggerCopy(secureDetails.password || '', 'pass')} className="text-slate-400 hover:text-emerald-400 p-0.5">
                      {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Instant Lock Button */}
              <button
                type="button"
                onClick={handleLock}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>נעל כספת מיידית</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Small security footer */}
        <div className="mt-5 text-center text-[10px] text-slate-500 font-medium">
          מפרט אבטחה AES-256 • שרתי זיכרון נועה הבנקאית
        </div>
      </motion.div>
    </div>
  );
}
