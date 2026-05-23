/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where,
  getDocFromServer
} from 'firebase/firestore';
import { UserProfile, Transaction, Budget, Vendor, RecoveryPlan } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Detect if we have real configured keys vs placeholder values
const isRealConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'dummy-api-key' && firebaseConfig.projectId !== 'dummy-project';

let app;
let db: any = null;
let auth: any = null;
let isFirebaseConnected = false;

if (isRealConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseConnected = true;
    console.log("Firebase initialized successfully with premium cloud workspace credentials.");
  } catch (err) {
    console.error("Firebase failed to initialize:", err);
  }
}

// Validation function as per Firestore rules guidelines
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

// Connection test on load as recommended
async function testConnection() {
  if (db) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn("Please check your Firebase configuration or network status.");
      }
    }
  }
}
testConnection();

// Initialize initial local storage data if empty, so the app is instantly rich with data
const DEFAULT_USER: UserProfile = {
  uid: 'guest-123',
  displayName: 'רוי פרידמן',
  email: 'roy.fridman@gmail.com',
  startingBalance: 12500,
  currency: '₪'
};

const DEFAULT_BUDGETS: Budget[] = [
  { userId: 'guest-123', category: 'מזון וסופרמרקט', month: 5, year: 2026, allocatedAmount: 2500, currentAmount: 1850 },
  { userId: 'guest-123', category: 'דיור וחשבונות', month: 5, year: 2026, allocatedAmount: 4500, currentAmount: 4500 },
  { userId: 'guest-123', category: 'תחבורה ודלק', month: 5, year: 2026, allocatedAmount: 1200, currentAmount: 950 },
  { userId: 'guest-123', category: 'פנאי ובידור', month: 5, year: 2026, allocatedAmount: 1500, currentAmount: 1650 }, // Overspent!
  { userId: 'guest-123', category: 'קניות וביגוד', month: 5, year: 2026, allocatedAmount: 1000, currentAmount: 400 },
  { userId: 'guest-123', category: 'אחר', month: 5, year: 2026, allocatedAmount: 800, currentAmount: 120 }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { userId: 'guest-123', type: 'income', amount: 14500, date: '2026-05-01', category: 'משכורת', vendorName: 'הייטק בע"מ', freeText: 'משכורת חודשית' },
  { userId: 'guest-123', type: 'expense', amount: 4500, date: '2026-05-02', category: 'דיור וחשבונות', vendorName: 'בעל הבית - שכירות', freeText: 'שכירות דירה' },
  { userId: 'guest-123', type: 'expense', amount: 620, date: '2026-05-10', category: 'מזון וסופרמרקט', vendorName: 'שופרסל דיל', freeText: 'קניות שבועיות לבית' },
  { userId: 'guest-123', type: 'expense', amount: 1230, date: '2026-05-12', category: 'מזון וסופרמרקט', vendorName: 'טיב טעם', freeText: 'קניית השלמות ואירוח' },
  { userId: 'guest-123', type: 'expense', amount: 350, date: '2026-05-14', category: 'תחבורה ודלק', vendorName: 'פז', freeText: 'תדלוק מלא של הרכב' },
  { userId: 'guest-123', type: 'expense', amount: 600, date: '2026-05-16', category: 'תחבורה ודלק', vendorName: 'רכבת ישראל', freeText: 'טעינת רב קו חופשי חודשי' },
  { userId: 'guest-123', type: 'expense', amount: 950, date: '2026-05-18', category: 'פנאי ובידור', vendorName: 'מסעדת שגב', freeText: 'ארוחת יום הולדת משפחתית' },
  { userId: 'guest-123', type: 'expense', amount: 700, date: '2026-05-19', category: 'פנאי ובידור', vendorName: 'סינמה סיטי', freeText: 'כרטיסים ופופקורן לסרט' },
  { userId: 'guest-123', type: 'expense', amount: 400, date: '2026-05-20', category: 'קניות וביגוד', vendorName: 'זארה קניון', freeText: 'בגדים לקיץ' },
  
  // Previous month (April 2026) historical seed data
  { userId: 'guest-123', type: 'expense', amount: 4500, date: '2026-04-02', category: 'דיור וחשבונות', vendorName: 'בעל הבית - שכירות', freeText: 'שכירות דירה חודש קודם' },
  { userId: 'guest-123', type: 'expense', amount: 1550, date: '2026-04-10', category: 'מזון וסופרמרקט', vendorName: 'שופרסל דיל', freeText: 'קניות סופר' },
  { userId: 'guest-123', type: 'expense', amount: 300, date: '2026-04-12', category: 'מזון וסופרמרקט', vendorName: 'מכולת שכונתית', freeText: 'קניות קטנות' },
  { userId: 'guest-123', type: 'expense', amount: 450, date: '2026-04-14', category: 'תחבורה ודלק', vendorName: 'פז', freeText: 'דלק' },
  { userId: 'guest-123', type: 'expense', amount: 550, date: '2026-04-16', category: 'תחבורה ודלק', vendorName: 'רכבת ישראל', freeText: 'נסיעות עבודה' },
  { userId: 'guest-123', type: 'expense', amount: 400, date: '2026-04-18', category: 'פנאי ובידור', vendorName: 'קפה קפה', freeText: 'בילוי עם חברים' },
  { userId: 'guest-123', type: 'expense', amount: 900, date: '2026-04-19', category: 'פנאי ובידור', vendorName: 'הופעה זאפה', freeText: 'כרטיסים להופעה' },
  { userId: 'guest-123', type: 'expense', amount: 800, date: '2026-04-22', category: 'קניות וביגוד', vendorName: 'קניון עזריאלי', freeText: 'נעלי ריצה' },
  { userId: 'guest-123', type: 'expense', amount: 200, date: '2026-04-25', category: 'אחר', vendorName: 'בית מרקחת', freeText: 'תרופות' }
];

const DEFAULT_RECOVERY_PLANS: RecoveryPlan[] = [
  {
    userId: 'guest-123',
    targetGoals: 'סגירת המינוס והגעה לחיסכון של 5,000 ש"ח ב-3 חודשים',
    timeline: 'מאי 2026 - אוגוסט 2026',
    status: 'active',
    milestones: [
      { id: 'm1', title: 'הרכבת תקציב הדוק עם נועה והפחתת 15% מההוצאות המשתנות', completed: true },
      { id: 'm2', title: 'שבוע שלם ללא קניות מיותרות (No-Spend Challenge)', completed: false, dueDate: '2026-05-30' },
      { id: 'm3', title: 'ביטול 3 מנויים דיגיטליים לא פעילים בסך 120 ש"ח בחודש', completed: true },
      { id: 'm4', title: 'הפרשת 1,500 ש"ח ראשונים לפיקדון חיסכון המניב ריבית', completed: false, dueDate: '2026-06-15' }
    ]
  }
];

// Helper to initialize LocalStorage if empty
function initializeLocalStorageIfEmpty() {
  if (!localStorage.getItem('noa_user')) {
    localStorage.setItem('noa_user', JSON.stringify(DEFAULT_USER));
  }
  if (!localStorage.getItem('noa_budgets')) {
    localStorage.setItem('noa_budgets', JSON.stringify(DEFAULT_BUDGETS));
  }
  if (!localStorage.getItem('noa_transactions')) {
    localStorage.setItem('noa_transactions', JSON.stringify(DEFAULT_TRANSACTIONS));
  }
  if (!localStorage.getItem('noa_plans')) {
    localStorage.setItem('noa_plans', JSON.stringify(DEFAULT_RECOVERY_PLANS));
  }
}
if (typeof window !== 'undefined') {
  initializeLocalStorageIfEmpty();
}

// --- DUAL MODE CRUD REPOSITORY ADAPTERS ---

// 1. User Profile Management
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (db && isRealConfig) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
    } catch (e) {
      console.warn("Firestore error reading user, using fallback", e);
    }
  }
  const cached = localStorage.getItem('noa_user');
  return cached ? JSON.parse(cached) : DEFAULT_USER;
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  if (db && isRealConfig) {
    try {
      await setDoc(doc(db, 'users', profile.uid), profile);
    } catch (e) {
      console.warn("Firestore writing error, falling back to storage", e);
    }
  }
  localStorage.setItem('noa_user', JSON.stringify(profile));
}

// 2. Transactions Management
export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  if (db && isRealConfig) {
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const items: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      if (items.length > 0) return items;
    } catch (e) {
      console.warn("Firestore error getting transactions, using storage", e);
    }
  }
  const cached = localStorage.getItem('noa_transactions');
  return cached ? JSON.parse(cached) : DEFAULT_TRANSACTIONS;
}

export async function addTransaction(transaction: Transaction): Promise<Transaction> {
  const newTx = { ...transaction, id: Math.random().toString(36).substring(2, 9) };
  
  if (db && isRealConfig) {
    try {
      const { id, ...data } = newTx;
      const docRef = await addDoc(collection(db, 'transactions'), data);
      newTx.id = docRef.id;
    } catch (e) {
      console.warn("Firestore transaction creation error, using local database:", e);
    }
  }

  // Add locally to cache
  const current = localStorage.getItem('noa_transactions');
  const items: Transaction[] = current ? JSON.parse(current) : [];
  items.unshift(newTx);
  localStorage.setItem('noa_transactions', JSON.stringify(items));

  // Auto update category budget usage corresponding to the transaction to keep progress bars tightly synced
  await adjustBudgetUsage(newTx.userId, newTx.category, newTx.type, newTx.amount);

  return newTx;
}

export async function deleteTransaction(userId: string, txId: string): Promise<void> {
  // Find transaction to adjust budget
  const cached = localStorage.getItem('noa_transactions');
  let items: Transaction[] = cached ? JSON.parse(cached) : [];
  const target = items.find(i => i.id === txId);
  
  if (target) {
    await adjustBudgetUsage(userId, target.category, target.type, -target.amount);
  }

  if (db && isRealConfig) {
    try {
      await deleteDoc(doc(db, 'transactions', txId));
    } catch (e) {
      console.warn("Firestore deleting transaction error, fallback to local:", e);
    }
  }

  items = items.filter(i => i.id !== txId);
  localStorage.setItem('noa_transactions', JSON.stringify(items));
}

// Helper to auto update category progression limits synchronously
async function adjustBudgetUsage(userId: string, category: string, type: 'income' | 'expense', amount: number) {
  if (type !== 'expense') return; // Income doesn't affect standard expense budgets
  const budgets = await fetchBudgets(userId);
  const updated = budgets.map(b => {
    if (b.category === category) {
      return { ...b, currentAmount: Math.max(0, b.currentAmount + amount) };
    }
    return b;
  });
  localStorage.setItem('noa_budgets', JSON.stringify(updated));
  
  if (db && isRealConfig) {
    try {
      const targetBudget = updated.find(b => b.category === category);
      if (targetBudget && targetBudget.id) {
        await updateDoc(doc(db, 'budgets', targetBudget.id), { currentAmount: targetBudget.currentAmount });
      }
    } catch (e) {
      console.warn("Firestore budget update lookup failure");
    }
  }
}

// 3. Budgets Management
export async function fetchBudgets(userId: string): Promise<Budget[]> {
  if (db && isRealConfig) {
    try {
      const q = query(collection(db, 'budgets'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const items: Budget[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Budget);
      });
      if (items.length > 0) return items;
    } catch (e) {
      console.warn("Firestore budgets lookup failure, using local cache");
    }
  }
  const cached = localStorage.getItem('noa_budgets');
  return cached ? JSON.parse(cached) : DEFAULT_BUDGETS;
}

export async function saveBudgetsList(userId: string, budgets: Budget[]): Promise<void> {
  localStorage.setItem('noa_budgets', JSON.stringify(budgets));
  if (db && isRealConfig) {
    try {
      for (const b of budgets) {
        if (b.id) {
          await setDoc(doc(db, 'budgets', b.id), b);
        } else {
          await addDoc(collection(db, 'budgets'), b);
        }
      }
    } catch (e) {
      console.warn("Firestore batch budgets update failed:", e);
    }
  }
}

// 4. Recovery Plans
export async function fetchRecoveryPlans(userId: string): Promise<RecoveryPlan[]> {
  if (db && isRealConfig) {
    try {
      const q = query(collection(db, 'recovery_plans'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const items: RecoveryPlan[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as RecoveryPlan);
      });
      if (items.length > 0) return items;
    } catch (e) {
      console.warn("Firestore error getting recovery plans, using fallback");
    }
  }
  const cached = localStorage.getItem('noa_plans');
  return cached ? JSON.parse(cached) : DEFAULT_RECOVERY_PLANS;
}

export async function saveRecoveryPlan(plan: RecoveryPlan): Promise<void> {
  const completePlan = { ...plan, id: plan.id || 'primary-plan-123' };
  localStorage.setItem('noa_plans', JSON.stringify([completePlan]));

  if (db && isRealConfig) {
    try {
      await setDoc(doc(db, 'recovery_plans', completePlan.id), completePlan);
    } catch (e) {
      console.warn("Firestore recovery plan write failed:", e);
    }
  }
}

// Export Auth wrappers to protect screens UI
export const authService = {
  isFirebaseActive: () => isRealConfig,
  getCurrentUser: () => {
    return DEFAULT_USER;
  }
};
