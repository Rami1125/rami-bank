/**
 * נועה הבנקאית - VendorsList Component (VendorsList.tsx)
 * תצוגה מלאה לניהול ועדכון ספקים ישראליים אמיתיים בזמן אמת
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  RefreshCw, 
  Database,
  Search,
  Settings,
  Grid,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  Smartphone,
  Landmark,
  ShieldAlert,
  ShoppingCart,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useVendorsSync, Vendor } from '../hooks/useVendorsSync';
import { motion, AnimatePresence } from 'motion/react';
import SecureVendorModal from './SecureVendorModal';

// מיפוי קטגוריות לאיקונים ועיצובים ייחודיים בעברית לקוהרנטיות עיצובית מושלמת
const categoryMetadata: Record<string, { icon: React.ComponentType<any>; colorClass: string; bgClass: string; borderClass: string }> = {
  'תקשורת': {
    icon: Smartphone,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50/70',
    borderClass: 'border-indigo-100',
  },
  'ממשלתי': {
    icon: Building,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50/70',
    borderClass: 'border-red-100',
  },
  'בנקים ופיננסים': {
    icon: Landmark,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-100',
  },
  'סופרמרקטים': {
    icon: ShoppingCart,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50/70',
    borderClass: 'border-amber-100',
  },
  'ביטוח': {
    icon: ShieldCheck,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50/70',
    borderClass: 'border-blue-100',
  },
  'אחר': {
    icon: HelpCircle,
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50/70',
    borderClass: 'border-slate-200',
  }
};

export default function VendorsList() {
  const { isConfigured, fetchVendors, saveVendor, deleteVendor, seedVendors, loading, error } = useVendorsSync();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedSecureVendor, setSelectedSecureVendor] = useState<Vendor | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'סופרמרקטים': true, // expandable standard starter category
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // מדינת טופס להוספה או עריכה
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formVendorName, setFormVendorName] = useState('');
  const [formCategory, setFormCategory] = useState('סופרמרקטים');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formLogoDomain, setFormLogoDomain] = useState('');
  const [formVendorId, setFormVendorId] = useState('');
  
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // טעינת רשימת הספקים בטעינת העמוד
  const loadVendors = async () => {
    if (!isConfigured) return;
    const list = await fetchVendors();
    if (list) {
      setVendors(list);
      // פתיחת כל הקטגוריות כברירת מחדל בעת טעינה מוצלחת ראשונה
      const initialExpanded: Record<string, boolean> = {};
      list.forEach(v => {
        initialExpanded[v.category] = true;
      });
      setExpandedCategories(initialExpanded);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [isConfigured]);

  // סינון ספקים לפי שאילתת חיפוש
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vendorId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  // קיבוץ ספקים בצורה דינמית על פי קטגוריה
  const groupedVendors = useMemo(() => {
    const groups: Record<string, Vendor[]> = {};
    filteredVendors.forEach(v => {
      const cat = v.category || 'אחר';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(v);
    });
    return groups;
  }, [filteredVendors]);

  // שליפת מטא דאטה עבור קטגוריות שונות
  const getCategoryMeta = (categoryName: string) => {
    return categoryMetadata[categoryName] || categoryMetadata['אחר'];
  };

  // פתיחה או סגירה של קטגוריה באקורדיון
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // פתיחת מודל עבור הוספת ספק חדש
  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormVendorName('');
    setFormCategory('סופרמרקטים');
    setFormCustomCategory('');
    setFormLogoUrl('');
    setFormLogoDomain('');
    setFormVendorId('');
    setIsModalOpen(true);
  };

  // פתיחת מודל עבור עריכת ספק קיים
  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormVendorName(vendor.vendorName);
    setFormVendorId(vendor.vendorId);
    
    const predefined = ['תקשורת', 'ממשלתי', 'בנקים ופיננסים', 'סופרמרקטים', 'ביטוח'];
    if (predefined.includes(vendor.category)) {
      setFormCategory(vendor.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('אחר');
      setFormCustomCategory(vendor.category);
    }

    if (vendor.logoUrl.includes('logo.clearbit.com/')) {
      const parts = vendor.logoUrl.split('logo.clearbit.com/');
      setFormLogoDomain(parts[1] || '');
      setFormLogoUrl('');
    } else {
      setFormLogoUrl(vendor.logoUrl);
      setFormLogoDomain('');
    }
    
    setIsModalOpen(true);
  };

  // שליחת הטופס לשינוי/הוספת ספק (Upsert)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVendorName.trim()) return;

    setIsFormSubmitting(true);
    
    const categoryToSave = formCategory === 'אחר' 
      ? (formCustomCategory.trim() || 'אחר') 
      : formCategory;

    let finalLogoUrl = formLogoUrl.trim();
    if (formLogoDomain.trim()) {
      // נשיק דומיין קלירביט נקי
      let domain = formLogoDomain.trim().replace(/^(https?:\/\/)?(www\.)?/, '');
      finalLogoUrl = `https://logo.clearbit.com/${domain}`;
    }

    if (!finalLogoUrl) {
      finalLogoUrl = `https://logo.clearbit.com/${encodeURIComponent(formVendorName.trim())}.co.il`;
    }

    const itemPayload = {
      vendorId: formVendorId || undefined,
      category: categoryToSave,
      vendorName: formVendorName.trim(),
      logoUrl: finalLogoUrl
    };

    const result = await saveVendor(itemPayload);
    
    if (result) {
      // עדכון ה-state המקומי ללא צורך בריענון דף מלא
      if (formVendorId) {
        // עריכה
        setVendors(prev => prev.map(v => v.vendorId === formVendorId ? result : v));
        triggerToast('הספק עודכן בהצלחה בגליונות Google Sheets!');
      } else {
        // הוספה חדשה
        setVendors(prev => [result, ...prev]);
        triggerToast('הספק התווסף בהצלחה למסד הנתונים ברשת!');
        // ודא שהקטגוריה החדשה פתוחה באקורדיון
        setExpandedCategories(prev => ({ ...prev, [categoryToSave]: true }));
      }
      setIsModalOpen(false);
    } else {
      alert('שגיאה בשמירת הספק, ודא תדר חשמל והגדרות Google Apps Script תקינות.');
    }
    setIsFormSubmitting(false);
  };

  // מחיקת ספק מהרשימה
  const handleDeleteVendor = async (id: string) => {
    setIsDeletingId(id);
    const success = await deleteVendor(id);
    if (success) {
      setVendors(prev => prev.filter(v => v.vendorId !== id));
      triggerToast('הספק נמחק לצמיתות מגיליון ה-Spreadsheet!');
    } else {
      alert('מחיקת הספק נכשלה, נסה שוב מאוחר יותר.');
    }
    setIsDeletingId(null);
  };

  // הזנת נתונים ראשונית (seeding)
  const handleSeedData = async () => {
    setIsSeeding(true);
    const success = await seedVendors();
    if (success) {
      triggerToast('הוזנו בהצלחה 20 ספקים פיננסיים ישראליים אמיתיים!');
      await loadVendors();
    } else {
      alert('שגיאה בעת הזנת הנתונים, אנא ודא שחיברת את כתובת ה-Web App הנכונה בהגדרות');
    }
    setIsSeeding(false);
  };

  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-6 pb-24 font-sans text-right" dir="rtl">
      
      {/* כותרת הדף */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100/80">
        <div>
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ניהול ספקי בית</span>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
            <Building className="w-5 h-5 text-emerald-500 shrink-0" />
            ספר ספקים וקשרי כספים
          </h2>
        </div>
        
        {isConfigured && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="primary-btn py-2 px-3.5 text-xs text-white rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-1 font-bold cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            הוסף ספק
          </button>
        )}
      </div>

      {/* יולידיציית הגדרות לאתר - תצוגת השגיאה אם חסר URL של של Google Sheets */}
      {!isConfigured ? (
        <div className="bg-amber-50/70 border border-amber-200 p-6 rounded-3xl flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
            <Settings className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-amber-900">חיבור זיכרון Google Sheets אינו מוגדר</h4>
            <p className="text-xs text-amber-700 leading-relaxed mt-2 max-w-sm">
              דף ניהול הספקים מחייב קישור פעיל לגיליונות Google Sheets על מנת לקרוא ולכתוב מידע בזמן אמת.
            </p>
          </div>
          <div className="p-3 bg-white border border-amber-100 rounded-xl space-y-2 text-right text-xs text-slate-600 w-full max-w-xs shadow-sm">
            <div className="font-bold text-slate-800 border-b border-slate-100 pb-1">3 שלבים פשוטים לחיבור:</div>
            <div className="flex gap-2">
              <span className="w-4 h-4 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5">1</span>
              <span>פתחו את ה<b>הגדרות</b> (לחיצה על גלגל השיניים בראש העמוד).</span>
            </div>
            <div className="flex gap-2">
              <span className="w-4 h-4 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5">2</span>
              <span>הזינו את הכתובת (Web App URL) מהפריסה של Google Apps Script.</span>
            </div>
            <div className="flex gap-2">
              <span className="w-4 h-4 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5">3</span>
              <span>לחצו על <b>שמירת שינויים</b> ודף זה יתעדכן ויפתח לסנכרון מיידי!</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* סרגל חיפוש ועדכון */}
          <div className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש ספק, מפתח או קטגוריה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 pr-9 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50/50"
              />
            </div>
            <button
              onClick={loadVendors}
              disabled={loading}
              className="p-2.5 text-slate-500 border border-slate-200 hover:text-emerald-500 hover:bg-emerald-50/50 rounded-xl transition-all font-bold flex items-center justify-center"
              title="רענן רשימה"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>

          {/* הודעת הצלחה צפה */}
          <AnimatePresence>
            {actionSuccessMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold shadow-sm"
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* מצב ריק (Empty State) עם הצעת Seeding */}
          {vendors.length === 0 && !loading && (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-5 shadow-sm">
              <div className="p-3.5 bg-slate-50 text-slate-400 rounded-3xl w-14 h-14 mx-auto flex items-center justify-center border border-slate-100">
                <Database className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-800">אין עדיין ספקים בגיליון Google Sheets</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  אנחנו מחוברים בצורה תקינה אך הגיליון "Vendors" ריק כרגע. תוכלו ליצור ספק חדש ידנית או לייבא את רשימת 20 החברות הישראליות המוכרות בקליק אחד.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedData}
                disabled={isSeeding}
                className="px-5 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-extrabold hover:bg-emerald-100 hover:text-emerald-900 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto shadow-sm"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                    יוצר 20 ספקים בגיליון...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-emerald-600" />
                    הזן ספקים לדוגמה לגיליון (שופרסל, בזק...)
                  </>
                )}
              </button>
            </div>
          )}

          {/* שלב טעינה פסיבית ראשונית */}
          {loading && vendors.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3.5 animate-pulse shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="w-1/3 h-4 bg-slate-100 rounded-lg"></div>
                    <div className="w-6 h-6 bg-slate-100 rounded-full"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-11/12 h-10 bg-slate-50 rounded-xl"></div>
                    <div className="w-full h-10 bg-slate-50 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* הצגת רשימת האקורדיון (Accordion Grouped View) */}
          <div className="space-y-4">
            {Object.keys(groupedVendors).map(categoryName => {
              const categoryMeta = getCategoryMeta(categoryName);
              const CategoryIconComponent = categoryMeta.icon;
              const isExpanded = !!expandedCategories[categoryName];
              const categoryItems = groupedVendors[categoryName];

              return (
                <div 
                  key={categoryName}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all"
                >
                  {/* ראש האקורדיון של הקטגוריה */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(categoryName)}
                    className="w-full p-4 flex justify-between items-center hover:bg-slate-50/50 active:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 border ${categoryMeta.bgClass} ${categoryMeta.colorClass} ${categoryMeta.borderClass}`}>
                        <CategoryIconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800">{categoryName}</h4>
                        <span className="text-[10px] text-slate-400 font-bold block">{categoryItems.length} ספקים בסינדיקט</span>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* ספקי הקטגוריה באקורדיון מותנה */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100/70"
                      >
                        <div className="p-4 pt-1.5 space-y-3 divide-y divide-slate-100/65">
                          {categoryItems.map((vendor, idx) => (
                            <div 
                              key={vendor.vendorId} 
                              className={`flex justify-between items-center py-3.5 ${idx === 0 ? '' : 'border-t border-slate-100/65'}`}
                            >
                              {/* פרטי הספק */}
                              <button 
                                type="button"
                                onClick={() => setSelectedSecureVendor(vendor)}
                                className="flex gap-3.5 items-center cursor-pointer text-right hover:opacity-75 active:scale-[0.98] transition-all select-none"
                              >
                                {/* לוגו הדומיין מ-Clearbit */}
                                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-sm relative group">
                                  <img
                                    src={vendor.logoUrl}
                                    alt={vendor.vendorName}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      // Fallback איקון אם הלוגו לא נטען
                                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.vendorName)}&background=f1f5f9&color=475569&bold=true&font-size=0.45&length=2`;
                                    }}
                                    className="w-full h-full object-contain rounded"
                                  />
                                  <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                    <Lock className="w-3.5 h-3.5 text-emerald-600 fill-white" />
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                                    {vendor.vendorName}
                                    <Lock className="w-3 h-3 text-emerald-500 fill-emerald-50 shrink-0" />
                                  </h5>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-semibold">
                                    <span>מזהה ספק: {vendor.vendorId}</span>
                                    {vendor.lastUpdated && (
                                      <>
                                        <span>•</span>
                                        <span>עודכן: {new Date(vendor.lastUpdated).toLocaleDateString('he-IL')}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* פעולות עבור ספק */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(vendor)}
                                  className="p-1 px-2.5 border border-slate-200 rounded-lg hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/40 text-slate-400 transition-colors flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
                                  title="ערוך ספק"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>ערוך</span>
                                </button>
                                
                                <button
                                  type="button"
                                  disabled={isDeletingId === vendor.vendorId}
                                  onClick={() => {
                                    if(confirm(`האם אתה בטוח שברצונך למחוק את הספק "${vendor.vendorName}"?`)) {
                                      handleDeleteVendor(vendor.vendorId);
                                    }
                                  }}
                                  className="p-1 px-2 text-slate-400 border border-slate-200 rounded-lg hover:border-red-300 hover:text-red-600 hover:bg-red-50/50 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-40"
                                  title="מחק ספק"
                                >
                                  {isDeletingId === vendor.vendorId ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* מודל להוספה או עריכה של ספק */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-right" dir="rtl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col relative space-y-4 animate-slideUp font-sans"
            >
              {/* כותרת מודל */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingVendor ? `עריכת ספק: ${editingVendor.vendorName}` : 'הוספת ספק פיננסי חדש'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* טופס */}
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block mb-1 text-slate-500 font-bold">שם הספק (עברית)</label>
                  <input
                    type="text"
                    required
                    value={formVendorName}
                    onChange={(e) => setFormVendorName(e.target.value)}
                    placeholder="למשל: סלקום"
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50/50 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block mb-1 text-slate-500 font-bold">מזהה ספק (ID)</label>
                    <input
                      type="text"
                      disabled={!!editingVendor}
                      value={formVendorId}
                      onChange={(e) => setFormVendorId(e.target.value)}
                      placeholder="מיוצר אוטומטית"
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 font-mono bg-slate-100 text-right disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-500 font-bold">קטגוריית על</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-white"
                    >
                      <option value="סופרמרקטים">סופרמרקטים</option>
                      <option value="תקשורת">תקשורת</option>
                      <option value="ממשלתי">ממשלתי</option>
                      <option value="בנקים ופיננסים">בנקים ופיננסים</option>
                      <option value="ביטוח">ביטוח</option>
                      <option value="אחר">אחר (מותאם ידנית)</option>
                    </select>
                  </div>
                </div>

                {/* שדה מזהה קטגוריה בהתאמה אישית */}
                {formCategory === 'אחר' && (
                  <div>
                    <label className="block mb-1 text-slate-500 font-bold">קטגוריה מותאמת אישית</label>
                    <input
                      type="text"
                      required
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="למשל: בריאות, פנאי..."
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50/50 text-right"
                    />
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-slate-500 font-bold">לוגו בית עסק (שלב 2 דרכים)</label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block mb-0.5">אופציה א׳: הזן שם דומיין (אינטרקום למשיכה מ-Clearbit)</span>
                      <input
                        type="text"
                        value={formLogoDomain}
                        onChange={(e) => {
                          setFormLogoDomain(e.target.value);
                          setFormLogoUrl(''); // נקה אופציה ב׳
                        }}
                        placeholder="shufersal.co.il"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50/50 text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-slate-400 block mb-0.5">אופציה ב׳: הזן כתובת תמונה מלאה (URL)</span>
                      <input
                        type="url"
                        value={formLogoUrl}
                        onChange={(e) => {
                          setFormLogoUrl(e.target.value);
                          setFormLogoDomain(''); // נקה אופציה א׳
                        }}
                        placeholder="https://example.com/logo.png"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:outline-emerald-500 bg-slate-50/50 text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className="w-full primary-btn py-3 mt-4 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isFormSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      שומר שינויים בשרת...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingVendor ? 'שמור שינויי ספק' : 'הוסף ספק חדש ל-Sheets'}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* מודל כספת ספק מאובטחת */}
        <AnimatePresence>
          {selectedSecureVendor && (
            <SecureVendorModal 
              vendor={selectedSecureVendor} 
              onClose={() => setSelectedSecureVendor(null)} 
            />
          )}
        </AnimatePresence>
      
    </div>
  );
}
