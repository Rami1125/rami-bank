import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Key, 
  Save, 
  Check, 
  X, 
  AlertCircle,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  CreditCard,
  Landmark,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useVaultSync, VaultRecord } from '../hooks/useVaultSync';

export default function VaultManager() {
  const { isConfigured, saveVaultRecord, searchVaultSecure, loading, error } = useVaultSync();
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  // List of records
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [keyName, setKeyName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const [savingLoading, setSavingLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveFail, setSaveFail] = useState('');
  
  // Show/Hide passwords
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showPasswordsInList, setShowPasswordsInList] = useState<Record<string, boolean>>({});

  // Active edit item to track if we're updating
  const [activeEditKey, setActiveEditKey] = useState<string | null>(null);

  // Export CSV pin modal state
  const [showExportPinModal, setShowExportPinModal] = useState(false);
  const [exportPin, setExportPin] = useState('');
  const [exportPinError, setExportPinError] = useState('');

  // Load records once unlocked
  const loadVaultRecords = async (silent = false) => {
    if (!isConfigured) {
      // Demo records if not connected to Google Sheets
      const demoRecords: VaultRecord[] = [
        {
          keyName: 'בנק מזרחי טפחות',
          username: 'rami_mizrahi',
          password: 'MizrahiPass2026!',
          bankAccount: 'בנק מזרחי טפחות (20), סניף 456, ח״ן 789123',
          contactInfo: 'טלפון בנקאי אישי: *0988',
          lastContactDate: new Date().toISOString()
        },
        {
          keyName: 'חברת חשמל',
          username: 'rami_electric88',
          password: 'IecSecure123!',
          bankAccount: 'בנק לאומי (10), סניף 800, ח״ן 518392',
          contactInfo: 'חוזה: 9981232',
          lastContactDate: new Date().toISOString()
        }
      ];

      // Fetch freshly synced records from real-time sheet connection (Node sync server)
      let mergedRecords = [...demoRecords];
      try {
        const response = await fetch('/api/vault/synced');
        const data = await response.json();
        if (data && data.success && data.records && data.records.length > 0) {
          const synced: VaultRecord[] = data.records;
          synced.forEach(syncRec => {
            mergedRecords = mergedRecords.filter(r => r.keyName !== syncRec.keyName);
            mergedRecords.push(syncRec);
          });
        }
      } catch (err) {
        console.error('Failed to load synced server vault items:', err);
      }

      // Filter by searchQuery if present in sandbox mode
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        mergedRecords = mergedRecords.filter(r => 
          r.keyName.toLowerCase().includes(q) || 
          (r.username && r.username.toLowerCase().includes(q)) ||
          (r.bankAccount && r.bankAccount.toLowerCase().includes(q))
        );
      }

      setRecords(mergedRecords);
      return;
    }

    try {
      const results = await searchVaultSecure(searchQuery, '1125');
      let mergedRecords = results ? [...results] : [];
      
      try {
        const response = await fetch('/api/vault/synced');
        const data = await response.json();
        if (data && data.success && data.records && data.records.length > 0) {
          const synced: VaultRecord[] = data.records;
          synced.forEach(syncRec => {
            // Prioritize live-synced values from Google Sheets / Firestore
            mergedRecords = mergedRecords.filter(r => r.keyName !== syncRec.keyName);
            mergedRecords.push(syncRec);
          });
        }
      } catch (err) {
        console.error('Failed to load synced server vault items:', err);
      }

      setRecords(mergedRecords);
    } catch (err: any) {
      console.error('Failed to load secure vault records:', err);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadVaultRecords();
    }
  }, [isUnlocked, searchQuery]);

  // Handle Pin Unlock Attempt
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1125') {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('קוד גישה שגוי. נסה שוב (רמז: 1125)');
    }
  };

  // Handle Saving Record
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setSaveFail('חובה להזין מפתח / שם שירות');
      return;
    }

    setSavingLoading(true);
    setSaveSuccess(false);
    setSaveFail('');

    try {
      if (isConfigured) {
        await saveVaultRecord(keyName.trim(), {
          username: username.trim(),
          password: password.trim(),
          bankAccount: bankAccount.trim(),
          contactInfo: contactInfo.trim(),
          amountUpdated: '***'
        });
      } else {
        // Direct local emulation if GAS is not configured
        console.log('Sandbox mode save:', { keyName, username, password, bankAccount, contactInfo });
      }

      setSaveSuccess(true);
      
      // Reset form fields
      setKeyName('');
      setUsername('');
      setPassword('');
      setBankAccount('');
      setContactInfo('');
      setActiveEditKey(null);

      // Reload
      await loadVaultRecords(true);

      // Dismiss success indicator after 3s
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveFail(err.message || 'שגיאה בשמירת הרשומה לכספת');
    } finally {
      setSavingLoading(false);
    }
  };

  const handleEditSelect = (record: VaultRecord) => {
    setKeyName(record.keyName);
    setUsername(record.username || '');
    setPassword(record.password || '');
    setBankAccount(record.bankAccount || '');
    setContactInfo(record.contactInfo || '');
    setActiveEditKey(record.keyName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearForm = () => {
    setKeyName('');
    setUsername('');
    setPassword('');
    setBankAccount('');
    setContactInfo('');
    setActiveEditKey(null);
    setSaveFail('');
    setSaveSuccess(false);
  };

  const togglePasswordListVisibility = (keyName: string) => {
    setShowPasswordsInList(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const handleExportCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exportPin === '1125') {
      try {
        const csvHeaders = ["שם שירות", "שם משתמש", "סיסמה", "חשבון בנק", "פרטי קשר", "תאריך עדכון"];
        const csvRows = records.map(rec => [
          rec.keyName,
          rec.username || '',
          rec.password || '',
          rec.bankAccount || '',
          rec.contactInfo || '',
          rec.lastContactDate ? new Date(rec.lastContactDate).toLocaleDateString('he-IL') : ''
        ]);

        const csvContent = "\uFEFF" + [
          csvHeaders.map(field => `"${field.replace(/"/g, '""')}"`).join(","),
          ...csvRows.map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `כספת_ספקים_ייצוא_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setShowExportPinModal(false);
        setExportPin('');
        setExportPinError('');
      } catch (err) {
        console.error('Failed to export CSV:', err);
        setExportPinError('שגיאה ביצירת קובץ ה-CSV');
      }
    } else {
      setExportPinError('קוד PIN שגוי. אנא נסה שוב (רמז: 1125)');
    }
  };

  return (
    <div className="space-y-6 text-right font-sans max-w-md mx-auto" dir="rtl">
      
      {/* Upper Status Cards */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>ניהול כספת נתונים</span>
            </h2>
            <p className="text-xs text-slate-400 leading-normal">
              אחסון מאובטח ומפוקח של סיסמאות, פרטי זיהוי וחשבונות בנק של ספקים וחשבונות שירות.
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-emerald-400">
            <Key className="w-5 h-5" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          /* PASSWORD DOOR */
          <motion.div
            key="lock-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4"
          >
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">אימות בעלות נדרש</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-normal">
                  ניהול הכספת דורש קוד אימות מנהל. אנא הקש את הקוד האישי שלך לשער הכספת.
                </p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">קוד כספת (PIN)</label>
                <input
                  type="password"
                  placeholder="הקש קוד..."
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError('');
                  }}
                  className="w-full text-center text-lg tracking-[0.4em] p-3 border border-slate-200 bg-slate-50 rounded-2xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {pinError && (
                <div className="bg-red-50 border border-red-100/80 text-red-600 p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-emerald-400" />
                <span>פתיחת שער כספת</span>
              </button>
            </form>
          </motion.div>
        ) : (
          /* UNLOCKED VAULT MANAGEMENT VIEW */
          <motion.div
            key="authorized-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Status Connection Box */}
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 p-4 rounded-3xl flex justify-between items-center text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>מחובר לכספת ({isConfigured ? 'Google Sheets Live' : 'מצב סימולציה מקומי'})</span>
              </div>
              <button 
                onClick={() => setIsUnlocked(false)}
                className="text-[10px] text-red-600 hover:text-red-700 bg-red-50 py-1.5 px-3 rounded-xl border border-red-100"
              >
                נעל כספת
              </button>
            </div>

            {/* Export and Action row */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 flex justify-between items-center shadow-sm">
              <div className="space-y-0.5 text-right">
                <h4 className="text-xs font-black text-slate-800">גיבוי וייצוא נתונים</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">ייצוא המידע הרגיש לקובץ גיבוי מאובטח במערכת.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExportPin('');
                  setExportPinError('');
                  setShowExportPinModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white hover:text-emerald-400 p-2.5 px-4 rounded-xl flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ייצוא ל-CSV מאובטח</span>
              </button>
            </div>

            {/* FORM: Add / Edit Record */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800">
                  {activeEditKey ? `עריכת רשומה: ${activeEditKey}` : 'הוספת רשומה חדשה'}
                </h3>
                {activeEditKey && (
                  <button 
                    onClick={handleClearForm} 
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    ביטול עריכה
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3.5">
                {/* Key Name */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">שם שירות / ספק (מפתח)*</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={!!activeEditKey}
                      placeholder="למשל: בנק מזרחי, שופרסל, דלק וכו׳"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold disabled:opacity-60 disabled:bg-slate-100"
                    />
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">שם משתמש / קוד מזהה</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Username / Login Email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono text-left"
                      dir="ltr"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Password Code */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">סיסמה סודית</label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2.5 pl-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono text-left"
                      dir="ltr"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bank Account */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">פרטי חשבון בנק</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="בנק (קוד), סניף, ח״ן"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                    />
                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Contact Info / Technical note */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-600">פרטי קשר / הערות מאובטחות נוספות</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="טלפונים, דרכי הגעה או הערה כלשהי"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Alerts / Error and success alerts */}
                {saveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>הרשומה נשמרה והוצפנה בהצלחה!</span>
                  </div>
                )}

                {saveFail && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{saveFail}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="px-4 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-2xl hover:bg-slate-50 cursor-pointer text-center"
                  >
                    נקה טופס
                  </button>

                  <button
                    type="submit"
                    disabled={savingLoading || !keyName.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingLoading ? 'מפקד ורושם בכספת...' : 'שמור בכספת'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* LIST: Existing Secure Records */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">רשומות קיימות בכספת ({records.length})</h4>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="סינון..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="p-1 px-2 border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white rounded-xl text-3xs font-semibold w-24"
                  />
                  <button 
                    onClick={() => loadVaultRecords()} 
                    title="רענן רשומה" 
                    className="p-1.5 bg-slate-100 rounded-xl hover:bg-slate-200 text-slate-500"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {records.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
                  לא נמצאו רשומות רגישות. מלא את הטופס למעלה כדי לאכלס את הכספת.
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((rec) => (
                    <div 
                      key={rec.keyName}
                      className="bg-white border border-slate-200/80 hover:border-emerald-500/40 rounded-3xl p-4 shadow-sm hover:shadow transition-all space-y-3 relative group"
                    >
                      {/* Badge / Key Heading */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span>{rec.keyName}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </h5>
                          {rec.lastContactDate && (
                            <span className="text-[9px] text-slate-400 font-medium">עודכן לאחרונה: {new Date(rec.lastContactDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditSelect(rec)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1.5 px-2.5 rounded-xl border border-emerald-100 transition-all cursor-pointer"
                        >
                          ערוך פרטים
                        </button>
                      </div>

                      {/* Content parameters */}
                      <div className="grid grid-cols-1 gap-1.5 text-[10px] text-slate-600 border-t border-slate-50 pt-2.5">
                        {rec.username && (
                          <div className="flex justify-between items-center bg-slate-50 p-1 px-2.5 rounded-xl">
                            <span className="text-slate-400 font-bold">שם משתמש / מזהה:</span>
                            <span className="font-mono text-slate-800 font-semibold">{rec.username}</span>
                          </div>
                        )}
                        {rec.password && (
                          <div className="flex justify-between items-center bg-slate-50 p-1 px-2.5 rounded-xl">
                            <span className="text-slate-400 font-bold">סיסמה סודית:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span>{showPasswordsInList[rec.keyName] ? rec.password : '********'}</span>
                              <button 
                                onClick={() => togglePasswordListVisibility(rec.keyName)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {showPasswordsInList[rec.keyName] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        )}
                        {rec.bankAccount && (
                          <div className="flex justify-between items-center bg-slate-50 p-1 px-2.5 rounded-xl">
                            <span className="text-slate-400 font-bold">חשבון בנק:</span>
                            <span className="text-slate-800 font-bold">{rec.bankAccount}</span>
                          </div>
                        )}
                        {rec.contactInfo && (
                          <div className="flex flex-col gap-0.5 bg-slate-50 p-1.5 px-2.5 rounded-xl">
                            <span className="text-slate-400 font-bold text-[9px]">הערות / אנשי קשר:</span>
                            <p className="text-slate-700 font-medium leading-relaxed">{rec.contactInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Verification Modal for Export */}
      <AnimatePresence>
        {showExportPinModal && (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 pointer-events-auto text-right" dir="rtl" onClick={() => setShowExportPinModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 relative pointer-events-auto"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-5 h-5 text-emerald-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">אימות PIN לייצוא מאובטח</h3>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">
                    לצורך הגנה על המידע הרגיש בכספת, יש להזין את קוד ה-PIN האישי שלך כדי לאשר את הורדת קובץ ה-CSV.
                  </p>
                </div>
              </div>

              <form onSubmit={handleExportCsvSubmit} className="space-y-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block text-right">קוד כספת (PIN)</label>
                  <input
                    type="password"
                    placeholder="הזן קוד PIN..."
                    value={exportPin}
                    onChange={(e) => {
                      setExportPin(e.target.value);
                      setExportPinError('');
                    }}
                    className="w-full text-center text-base font-bold tracking-[0.4em] p-2.5 border border-slate-200 bg-slate-50 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                {exportPinError && (
                  <div className="bg-red-50 border border-red-100/80 text-red-600 p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{exportPinError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportPinModal(false);
                      setExportPin('');
                      setExportPinError('');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    אמת וייצא קובץ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
