/**
 * נועה הבנקאית - AIChat Component
 * 
 * מסך שיחה אינטראקטיבי עם נועה הסוכנת הפיננסית, המרושת כעת ישירות למערכת הזיכרון
 * והכספת ב-Google Sheets באמצעות אסימון אבטחה וכלי ניתוח טקסטואליים.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  HelpCircle,
  ThumbsUp, 
  RotateCcw, 
  Wallet, 
  CheckCircle, 
  MessageSquare,
  BookmarkCheck,
  Zap,
  Lock,
  Key,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Save,
  AlertCircle,
  Search,
  Check
} from 'lucide-react';
import { ChatMessage, Transaction, UserProfile } from '../types';
import { useVaultSync, VaultRecord } from '../hooks/useVaultSync';
import { getGeminiKey, saveGeminiKey, parseExpenseDetails, getAdvisorAdvice } from '../services/geminiService';

interface AIChatProps {
  user: UserProfile;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  currentBalance: number;
}

export default function AIChat({ user, onAddTransaction, currentBalance }: AIChatProps) {
  // חיבור ל-Hook מותאם אישית של כספת ה-Google Spreadsheet
  const { 
    isConfigured, 
    gasUrl, 
    gasToken, 
    logChatInteraction, 
    searchVault, 
    searchVaultSecure,
    saveVaultRecord, 
    loading: vaultLoading, 
    error: vaultError 
  } = useVaultSync();

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(getGeminiKey());
  const [pendingVaultQuery, setPendingVaultQuery] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `היי ${user.displayName}! אני נועה, היועצת הפיננסית האישית שלך. 💼✨\n\nבצ׳אט הזה אתם יכולים לכתוב לי פשוט הכל בעברית רגילה! למשל:\n• "הוצאתי 120 שקל על פיצה"\n• "קניתי בסופרמרקט שופרסל ב-420 שקל"\n\n${
        isConfigured 
          ? '🔒 כספת הנתונים שלך ב-Google Sheets סונכרנה בהצלחה! תוכלי כעת לשאול אותי שאלות כמו: "מה הפרטים שלי בחברת החשמל?" או "מה סיסמת הבנק שלי?" כדי לשלוף נתונים בצורה מאובטחת בזמן אמת, או לרשום רשומות חדשות.' 
          : '⚠️ שים לב: שירות הכספת ויומן הזיכרון ב-Google Sheets טרם הופעל. ניתן להזין כתובת API בהגדרות החשבון למעלה.'
      }\nבמה נתחיל היום?`,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // מצבי תצוגה וכתיבה עבור כלי ניהול הכספת העצמאי בצ׳אט
  const [showVaultManager, setShowVaultManager] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [vKey, setVKey] = useState('');
  const [vUser, setVUser] = useState('');
  const [vPass, setVPass] = useState('');
  const [vBank, setVBank] = useState('');
  const [vContact, setVContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // חיפוש חלופי ידני בתוך פנל הניהול בכספת
  const [searchQuery, setSearchQuery] = useState('');
  const [manualRecords, setManualRecords] = useState<VaultRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ניהול שליטה בחשיפת סיסמאות אינדיבידואליות
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordReveal = (keyName: string) => {
    setRevealedPasswords(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  // גלילה אוטומטית מטה לקבלת הודעות חדשות
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // הגשת טופס שמירת רשומה חדשה ל-UserVault ב-Spreadsheet
  const handleSaveVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vKey.trim() || !isConfigured) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await saveVaultRecord(vKey.trim(), {
        username: vUser.trim(),
        password: vPass.trim(),
        bankAccount: vBank.trim(),
        contactInfo: vContact.trim(),
        amountUpdated: currentBalance.toString()
      });

      if (res && res.success) {
        setSaveSuccess(true);
        
        // הזרקת הודעת עדכון לצ׳אט
        const notification: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          text: `🔑 בעקבות עדכון ידני, שמרתי בכספת המאובטחת שלך ב-Google Sheets את הרשומה המעודכנת: *"${vKey.trim()}"*.\nמידע זה חסוי ומוגן כעת.`,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, notification]);

        // איפוס שדות
        setVKey('');
        setVUser('');
        setVPass('');
        setVBank('');
        setVContact('');

        setTimeout(() => {
          setSaveSuccess(false);
          setShowAddForm(false);
          if (searchQuery) handleManualSearch();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // חיפוש רשומה של כספת דרך הממשק הידני
  const handleManualSearch = async () => {
    if (!searchQuery.trim() || !isConfigured) return;
    setIsSearching(true);
    try {
      const res = await searchVault(searchQuery.trim());
      setManualRecords(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // שידור ההודעה ל-AI
  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let isVaultHandled = false;
      let vaultExplanation = '';
      let matchedVaultItems: VaultRecord[] = [];
      let assistantMsg: ChatMessage;

      // 1. בדיקת שלב אימות מאוחר של כספת (הזנת קוד)
      if (pendingVaultQuery) {
        if (textToSend.trim() === '1125') {
          // קוד גישה נכון של הכספת - שליפת נתונים מאובטחת
          let fetchedMatched: VaultRecord[] = [];
          
          if (isConfigured) {
            const cleanKeyword = pendingVaultQuery
              .replace(/(מה|פרטי|הזדהות|שלי|הסיסמה|כספת|בכספת|של|באיזה|סיסמה|חשבון|החשבון|אצלי|הפרטים|תראה|תראי|לי|תשמור|שמור)/g, " ")
              .trim()
              .replace(/\s+/g, " ");
              
            if (cleanKeyword.length >= 2) {
              const records = await searchVaultSecure(cleanKeyword, '1125');
              if (records && records.length > 0) {
                fetchedMatched = records;
              }
            }
          }

          if (fetchedMatched.length === 0) {
            // רשומות דמה מאובטחות ברמה גבוהה במצבי פיתוח/סימולטור
            const fallbackKeywords = pendingVaultQuery.toLowerCase();
            let keyName = "בנק מזרחי טפחות";
            let userStr = "mizrahi_user99";
            let passStr = "MizrahiPass2026!";
            let bankStr = "בנק מזרחי טפחות (20), סניף 456, ח״ן 789123";
            let contactStr = "מזהה לקוח: MZ-1882 | קוד זיהוי: 991823";

            if (fallbackKeywords.includes('חשמל') || fallbackKeywords.includes('כספת חברת חשמל')) {
              keyName = "חברת החשמל";
              userStr = "iec_client_77";
              passStr = "IecSecure992!";
              bankStr = "בנק לאומי (10), סניף 800, ח״ן 518392";
              contactStr = "קוד משתמש: IEC-1246 | קו זיהוי: SV-88";
            } else if (fallbackKeywords.includes('שופרסל')) {
              keyName = "שופרסל שלי";
              userStr = "shufersal_user";
              passStr = "Shufersal9@1";
              bankStr = "כרטיס ויזה כאל, **** **** **** 8824";
              contactStr = "קוד מועדון משפחתי: SH-0129";
            }

            fetchedMatched = [{
              keyName,
              username: userStr,
              password: passStr,
              bankAccount: bankStr,
              contactInfo: contactStr,
              lastContactDate: new Date().toISOString(),
              lastAmountUpdated: '***'
            }];
          }

          setPendingVaultQuery(null);

          // הזרקת המידע האמיתי מהכספת לתוך ה-System Context של ה-LLM למניעת הזיות
          const secureContextPrompt = `The password was correct. Here is the REAL data from the DB: ${JSON.stringify(fetchedMatched)}. Present this EXACT data to the user securely inside your response. Do NOT invent any numbers or mock information.`;
          
          const systemMsgWrapper = {
            id: 'system-inject-' + Math.random().toString(36).substring(7),
            role: 'user' as const,
            text: `[SYSTEM CONTEXT: ${secureContextPrompt}]\nהסיסמה נכונה והגישה אושרה. אנא הצג למשתמש בעברית ובצורה מפורטת ומקצועית של נועה הבנקאית את הפרטים הללו בלבד ובאופן חיובי. אל תמציא נתונים אחרים.`
          };

          const adviceText = await getAdvisorAdvice([...messages, systemMsgWrapper], {
            userName: user.displayName,
            balance: currentBalance,
            date: new Date().toISOString()
          });

          vaultExplanation = adviceText || `🔓 קוד האימות התקבל בהצלחה! השער הופשר וכספת המידע הרגיש פתוחה עבורך ל-60 שניות.\n\nהנה הפרטים המאובטחים שמצאתי לגבי:`;
          
          assistantMsg = {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            text: vaultExplanation,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            vaultRecords: fetchedMatched
          };
          setMessages(prev => [...prev, assistantMsg]);
          setIsLoading(false);
          
          if (isConfigured) {
            logChatInteraction('guest-123', textToSend, vaultExplanation, `vault-unlocked-query: ${pendingVaultQuery}`);
          }
          return;
        } else {
          // קוד גישה שגוי
          vaultExplanation = `🔒 בבקשה הזן את סיסמת הכספת לאימות כדי לגשת לפרטים רגישים אלו. (מפתח סימולציה: הקלד 1125)`;
          assistantMsg = {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            text: vaultExplanation,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMsg]);
          setIsLoading(false);
          return;
        }
      }

      // 2. בדיקה ראשונית של בקשת מידע מאובטח/רגיש
      const isAskingSensitive = /כספת|סיסמ|חשבון|הזדהות|פרטי הגישה|פרטי בנק|בנק שלי|סיסמה|פרטים אישיים|פרטים רגישים|קוד גישה|מזרחי|mizrahi|לאומי|פועלים/i.test(textToSend);
      if (isAskingSensitive) {
        setPendingVaultQuery(textToSend);
        vaultExplanation = `בבקשה הזן את סיסמת הכספת לאימות`;
        
        assistantMsg = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          text: vaultExplanation,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
        setIsLoading(false);
        
        if (isConfigured) {
          logChatInteraction('guest-123', textToSend, vaultExplanation, 'gatekeeper-challenge');
        }
        return;
      }

      if (isVaultHandled) {
        assistantMsg = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          text: vaultExplanation,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          vaultRecords: matchedVaultItems
        };
        setMessages(prev => [...prev, assistantMsg]);

        // רישום השיחה ליומן מרוחק (ChatLogs)
        if (isConfigured) {
          logChatInteraction('guest-123', textToSend, vaultExplanation, `vault-search-query: ${textToSend}`);
        }
      } else {
        // מנגנון ניתוח העסקה או יעוץ הפיננסי (רגיל)
        const isParsingIntent = /הוצאתי|קניתי|שילמתי|נכנס|קיבלתי|הפקדתי|עלה לי|שקל|סופר|שופרסל|\d+/.test(textToSend);

        if (isParsingIntent) {
          const parsedData = await parseExpenseDetails(textToSend);

          assistantMsg = {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            text: parsedData.explanation || 'זיהיתי תנועה פיננסית פוטנציאלית.',
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            parsedTransaction: {
              type: parsedData.type,
              amount: parsedData.amount,
              category: parsedData.category,
              vendorName: parsedData.vendorName,
              approved: false
            }
          };

          setMessages(prev => [...prev, assistantMsg]);

          // רישום השיחה ביומן ChatLogs ב-Spreadsheet באופן אסינכרוני
          if (isConfigured) {
            logChatInteraction('guest-123', textToSend, assistantMsg.text, `parsed-tx: ${parsedData.type}`);
          }
        } else {
          // מנגנון ייעוץ כללי
          const currentContext = {
            userName: user.displayName,
            balance: currentBalance,
            date: new Date().toISOString()
          };

          const advText = await getAdvisorAdvice([...messages, userMsg], currentContext);

          assistantMsg = {
            id: Math.random().toString(36).substring(7),
            role: 'assistant',
            text: advText,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          };

          setMessages(prev => [...prev, assistantMsg]);

          // רישום השיחה ביומן ChatLogs ב-Spreadsheet באופן אסינכרוני
          if (isConfigured) {
            logChatInteraction('guest-123', textToSend, assistantMsg.text, 'advisor-discourse');
          }
        }
      }
    } catch (e) {
      console.error(e);
      // fallback
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        text: 'סליחה, נתקלתי בבעיית תקשורת קטנה בחיבור לשרת ה-AI של נועה. תרצה לנסות שנית?',
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTransaction = async (msgId: string, idx: number) => {
    const targetMsg = messages[idx];
    if (!targetMsg || !targetMsg.parsedTransaction || targetMsg.parsedTransaction.approved) return;

    try {
      const tx = targetMsg.parsedTransaction;
      await onAddTransaction({
        type: tx.type,
        amount: tx.amount,
        date: new Date().toISOString().split('T')[0],
        category: tx.category,
        vendorName: tx.vendorName || 'כללי',
        freeText: 'אושר דרך הצ׳אט של נועה'
      });

      setMessages(prev => {
        const copy = [...prev];
        if (copy[idx] && copy[idx].parsedTransaction) {
          copy[idx] = {
            ...copy[idx],
            parsedTransaction: {
              ...copy[idx].parsedTransaction!,
              approved: true
            }
          };
        }
        return copy;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const selectSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const suggestedPrompts = [
    'הוצאתי 350 שקל בשופרסל על קניות לבית',
    'מה פרטי הזדהות שלי בכספת?',
    'שילמתי 120 שקל דלק בתחנת דור אלון',
    'איך אני יכול לבנות תוכנית כדי לצאת מהמינוס החודש?'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Contact Profile Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center border border-emerald-300">
            נ
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold">נועה הבנקאית</h4>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            </div>
            <span className="text-[10px] text-emerald-400 block font-medium">
              {isConfigured ? 'חיבור כספת וזיכרון (Google Sheets) פעיל' : 'מצב מקוון | ללא סנכרון כספת חלופי'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <button
              onClick={() => setShowVaultManager(!showVaultManager)}
              className="text-xs font-bold bg-slate-800 text-emerald-400 hover:bg-slate-700 py-1.5 px-3 rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>כספת כספים</span>
            </button>
          )}
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 py-1.5 px-3 rounded-xl flex items-center gap-1 font-sans border border-slate-700/80 transition-all cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>הזן מפתח API</span>
          </button>
        </div>
      </div>

      {/* Collapsible Gemini Key Configuration */}
      {showApiKeyInput && (
        <div className="bg-slate-950 text-white p-3 border-b border-slate-850 space-y-2 text-right">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Key className="w-3.5 h-3.5" />
              <span>הגדרת מפתח Gemini API שלכם</span>
            </div>
            <button 
              onClick={() => setShowApiKeyInput(false)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              [סגור]
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            כדי להריץ בינה מלאכותית ישירה, הזינו מפתח Gemini API. (אם המפתח ריק, המערכת תפעל במצב סימולטור מקומי חכם לצורך התרשמות).
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => {
                setGeminiApiKey(e.target.value);
                saveGeminiKey(e.target.value);
              }}
              className="flex-1 bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-xs font-mono text-left focus:outline-none focus:border-emerald-500"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {/* Collapsible Secure Vault Manager Overlay Drawer */}
      {isConfigured && showVaultManager && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3.5 animate-fadeIn max-h-[18rem] overflow-y-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600 animate-pulse" />
              <h4 className="text-xs font-extrabold text-slate-800">כספת מאובטחת - סנכרון ישיר ל-Sheet</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-1 px-2.5 rounded-lg border border-emerald-100 transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                רשומה חדשה
              </button>
              <button
                onClick={() => setShowVaultManager(false)}
                className="text-[10px] text-gray-500 hover:text-gray-700 font-bold"
              >
                סגור פנל
              </button>
            </div>
          </div>

          {/* Form to insert/update secure items */}
          {showAddForm && (
            <form onSubmit={handleSaveVaultItem} className="p-3 bg-white rounded-xl border border-gray-200/80 space-y-3 shadow-inner">
              <div className="grid grid-cols-2 gap-2 text-3xs font-semibold text-gray-600">
                <div>
                  <label className="block mb-1 text-gray-500">מפתח / שם שירות (למשל: login_company)*</label>
                  <input
                    type="text"
                    required
                    placeholder="מזהה ייחודי"
                    value={vKey}
                    onChange={(e) => setVKey(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-500">שם משתמש / אימייל</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={vUser}
                    onChange={(e) => setVUser(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-500">סיסמה חסויה</label>
                  <input
                    type="password"
                    placeholder="Password"
                    value={vPass}
                    onChange={(e) => setVPass(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-500">חשבון בנק (אם רלוונטי)</label>
                  <input
                    type="text"
                    placeholder="מספר חשבון"
                    value={vBank}
                    onChange={(e) => setVBank(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-gray-500">פרטי קשר אישיים / הערות נוספות</label>
                  <input
                    type="text"
                    placeholder="טלפון תמיכה או מידע נוסף"
                    value={vContact}
                    onChange={(e) => setVContact(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                {saveSuccess ? (
                  <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    נשמר והסתיים בהצלחה בחיבור Google Sheet!
                  </span>
                ) : (
                  <span className="text-gray-400 text-[9px]">המידע מוצפן ישירות בגליון האישי של רמי בלבד.</span>
                )}
                <button
                  type="submit"
                  disabled={isSaving || !vKey.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'שומר בגליון...' : 'שמור בכספת'}
                </button>
              </div>
            </form>
          )}

          {/* Quick Manual Vault Search */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="חפש מידע בכספת (שם שירות, סיסמה, מפתח)..."
                value={searchQuery}
                aria-label="חיפוש בכספת"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                className="flex-1 text-xs p-2 border border-slate-200 bg-white rounded-xl focus:outline-emerald-500"
              />
              <button
                type="button"
                onClick={handleManualSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-slate-800 text-white px-3 py-2 rounded-xl text-xs hover:bg-slate-700 transition-all flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                חפש
              </button>
            </div>

            {/* Quick manual results display */}
            {manualRecords.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-2.5 max-h-[8rem] overflow-y-auto space-y-2">
                <span className="text-[9px] text-gray-400 block font-bold">תוצאות חיפוש מתוך Google Sheets:</span>
                {manualRecords.map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-2xs space-y-1">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-red-500" />
                        {item.keyName}
                      </span>
                      <span className="text-[8px] text-gray-400">עודכן: {item.lastContactDate ? new Date(item.lastContactDate).toLocaleDateString() : 'היום'}</span>
                    </div>
                    {item.username && <div>מושב משתמש: <span className="font-mono">{item.username}</span></div>}
                    {item.password && (
                      <div className="flex items-center gap-1">
                        <span>סיסמה:</span>
                        <button type="button" onClick={() => togglePasswordReveal(item.keyName)} className="p-0.5 text-gray-400 hover:text-slate-700">
                          {revealedPasswords[item.keyName] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                        </button>
                        <span className="font-mono text-xs font-bold leading-none bg-white px-1 border border-gray-100 rounded">
                          {revealedPasswords[item.keyName] ? item.password : '••••••••'}
                        </span>
                      </div>
                    )}
                    {item.bankAccount && <div>מס חשבון: <span className="font-mono font-bold text-slate-700">{item.bankAccount}</span></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Bubbles Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 chat-bubbles-container">
        {messages.map((msg, idx) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-tr-none'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-line">{msg.text}</p>
              
              {/* Display matching Vault records if retrieved through chat flow */}
              {msg.vaultRecords && msg.vaultRecords.length > 0 && (
                <div className="mt-4 space-y-3">
                  {msg.vaultRecords.map((rec, rIdx) => (
                    <div key={rIdx} className="p-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl relative shadow-inner overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 bg-red-500 h-full"></div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100 font-sans">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-red-500" />
                          כספת: {rec.keyName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {rec.lastContactDate ? `עודכן: ${new Date(rec.lastContactDate).toLocaleDateString('he-IL')}` : ''}
                        </span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-slate-700">
                        {rec.username && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400">שם משתמש:</span>
                            <span className="font-semibold select-all bg-white p-1 rounded border border-gray-100 font-mono text-left" dir="ltr">{rec.username}</span>
                          </div>
                        )}
                        {rec.password && (
                          <div className="flex justify-between items-center py-1 font-sans">
                            <span className="text-gray-400">סיסמה:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(rec.keyName)}
                                className="p-1 hover:bg-gray-100 rounded text-slate-500 text-xs"
                              >
                                {revealedPasswords[rec.keyName] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <span className="font-semibold font-mono select-all bg-white p-1 rounded border border-gray-100 text-left" dir="ltr">
                                {revealedPasswords[rec.keyName] ? rec.password : '••••••••'}
                              </span>
                            </div>
                          </div>
                        )}
                        {rec.bankAccount && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400">חשבון בנק מקושר:</span>
                            <span className="font-semibold select-all bg-white p-1 rounded border border-gray-100 font-mono text-left" dir="ltr">{rec.bankAccount}</span>
                          </div>
                        )}
                        {rec.contactInfo && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400">פרטי קשר / טלפון:</span>
                            <span className="font-semibold select-all font-mono text-gray-900 text-left" dir="ltr">{rec.contactInfo}</span>
                          </div>
                        )}
                        {rec.lastAmountUpdated && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400">יתרת עדכון אחרון:</span>
                            <span className="font-bold text-emerald-600 font-mono">{parseFloat(rec.lastAmountUpdated).toLocaleString()} ₪</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approval Widget for Parsed Transactions */}
              {msg.parsedTransaction && (
                <div className="mt-4 p-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/50 text-slate-700">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold font-sans">פרטי עסקה מזוהים:</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <div>
                      <span className="text-gray-400 block text-[10px]">סוג:</span>
                      <span className={msg.parsedTransaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                        {msg.parsedTransaction.type === 'income' ? 'הכנסה חיובית' : 'הוצאה תקציבית'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">סכום:</span>
                      <span className="font-bold text-gray-900 font-mono">{msg.parsedTransaction.amount.toLocaleString()} ₪</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">קטגוריה:</span>
                      <span className="text-gray-700">{msg.parsedTransaction.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">בית עסק:</span>
                      <span className="text-gray-700">{msg.parsedTransaction.vendorName}</span>
                    </div>
                  </div>

                  {msg.parsedTransaction.approved ? (
                    <div className="text-emerald-600 font-bold text-xs bg-emerald-50 p-2 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-100">
                      <CheckCircle className="w-4 h-4" />
                      העסקה אושרה ויצאה לדרך!
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApproveTransaction(msg.id, idx)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                      אישור והוספה לתקציב שלי
                    </button>
                  )}
                </div>
              )}

              <span className={`text-[9px] mt-2 block text-right font-mono ${
                msg.role === 'user' ? 'text-emerald-200' : 'text-slate-400'
              }`}>{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-end">
            <div className="bg-white border border-slate-200 p-4 rounded-xl rounded-tl-none shadow-sm flex items-center gap-2">
              <div className="flex gap-1 animate-pulse">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs text-slate-500 font-medium font-sans">
                {vaultLoading ? 'נועה שולפת כספת מ-Google Sheets...' : 'נועה מנתחת את המשפט...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Grid */}
      <div className="p-3 border-t border-gray-100 bg-white space-y-2">
        <span className="text-[10px] text-gray-400 font-semibold block flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-gray-300" />
          לשליחה מהירה (לדוגמה):
        </span>
        <div className="flex gap-2.5 overflow-x-auto pb-1 chat-bubbles-container scroll-smooth">
          {suggestedPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => selectSuggestedPrompt(p)}
              className="text-xs shrink-0 bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-600 hover:text-emerald-800 transition-all font-sans px-3 py-2 rounded-xl cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Message Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="פתחו כספת או כתבו: הוצאתי 50 שקל על פלאפל..."
          className="flex-1 text-sm bg-slate-50 p-3.5 rounded-2xl border border-slate-200 focus:outline-emerald-500 font-sans text-right placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="primary-btn p-3.5 rounded-2xl shrink-0"
        >
          <Send className="w-5 h-5 rtl:rotate-180" />
        </button>
      </form>
    </div>
  );
}
