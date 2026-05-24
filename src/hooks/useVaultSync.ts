/**
 * נועה הבנקאית - useVaultSync React Hook
 * 
 * =========================================================================
 * סקירת חלופות לאימות מול Google Apps Script API (Authentication Alternatives)
 * =========================================================================
 * 
 * חלופה 1: אסימון אבטחה מובנה בגוף הפניה (Simple Token in JSON Payload) - נבחרה למימוש!
 * -------------------------------------------------------------------------
 * ● יתרונות: פשוט מאוד להטמעה, חוסך את הצורך בטיפול בסיבוכי CORS (מכיוון ש-Google Apps Script
 *   מבצע הפניית 302 קבועה שקשה לנהל תחת כותרי Authorization מותאמים אישית), מאפשר חיבור ישיר ורציף
 *   בין צד הלקוח (React) לשרת ה-GAS ללא צורך בהתקנת ספריות OAuth מורכבות או פיתוח שרת מתווך נוסף,
 *   ופועל בצורה מושלמת בתוך iFrame (כמו ה-Preview של AI Studio).
 * ● חסרונות: אבטחה התלויה כולה בסודיות ה-Token. חשיפת קוד הלקוח עלולה לחשוף את האסימון. כיוון
 *   שהגישה ל-Web App מוגדרת ל-"Anyone", כל מי שיש לו את ה-Token והקישור יכול לפנות ל-API.
 * 
 * חלופה 2: אימות באמצעות Google OAuth 2.0 / Service Account
 * -------------------------------------------------------------------------
 * ● יתרונות: רמת אבטחה גבוהה במיוחד, תמיכה בהרשאות מבוססות תפקידים (IAM), ניהול גישה פרטני לכל
 *   משתמש קצה וניהול אסימונים פגי תוקף (Token Expiration).
 * ● חסרונות: סיבוכיות גבוהה מאוד. דורש הגדרת Google Cloud Console, יצירת מסכי הסכמה, ניהול
 *   Redirect URIs (שכושלים לעיתים קרובות בדפדפנים תחת iFrames מטעמי אבטחת Cookies), ודורש מהמשתמש
 *   לבצע פעולת התחברות (Login) מעיקה ומסורבלת לפני כל פנייה קלה לכספת.
 * 
 * לכן, החלופה שנבחרה ליישום מיידי ויעיל היא חלופה 1 (אסימון מאובטח בגוף ה-Payload) - המציעה
 * את החוויה הזורמת, המהירה והיציבה ביותר לעבודה תחת סביבת ה-AI Studio.
 */

import { useState, useCallback } from 'react';

export interface VaultRecord {
  keyName: string;
  username?: string;
  password?: string;
  bankAccount?: string;
  contactInfo?: string;
  lastContactDate?: string;
  lastAmountUpdated?: string;
}

export function useVaultSync() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // שליפת הגדרות קישור ה-GAS מתוך משתנה הסביבה או ה-localStorage כגיבוי
  const getGasConfig = useCallback(() => {
    const url = (import.meta as any).env.VITE_API_URL || localStorage.getItem('NOA_GAS_URL') || '';
    const token = localStorage.getItem('NOA_GAS_TOKEN') || 'NOA_SECURE_VAULT_TOKEN_2026';
    return { url, token };
  }, []);

  // שמירת הגדרות קישור לשימוש עתידי
  const saveGasConfig = useCallback((url: string, token: string) => {
    if (url) {
      localStorage.setItem('NOA_GAS_URL', url.trim());
    }
    localStorage.setItem('NOA_GAS_TOKEN', token.trim());
  }, []);

  /**
   * פעולה 1: תיעוד שיחה ועדכון המצב (Context) של המכשיר בגליון
   */
  const logChatInteraction = useCallback(async (
    deviceId: string,
    userMessage: string,
    aiResponse: string,
    activeContext: string
  ) => {
    const { url, token } = getGasConfig();
    if (!url) return null;

    setLoading(true);
    setError(null);

    try {
      // שימוש ב-Content-Type text/plain מונע Cors Preflight כושל מול שרתי Google Apps Script
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          token,
          action: 'logChat',
          deviceId,
          userMessage,
          aiResponse,
          activeContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      return result;
    } catch (err: any) {
      console.error('Failed to log chat to Google Sheets:', err);
      setError(err?.message || 'שגיאת חיבור לשרת זיכרון Google Sheets');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  /**
   * פעולה 2: חיפוש רשומות רגישות בכספת המאובטחת (UserVault) לפי שאילתת מפתח
   */
  const searchVault = useCallback(async (keyQuery: string): Promise<VaultRecord[] | null> => {
    const { url, token } = getGasConfig();
    if (!url) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          token,
          action: 'searchVault',
          keyQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (result.success && result.data && result.data.records) {
        return result.data.records as VaultRecord[];
      }
      return [];
    } catch (err: any) {
      console.error('Failed to search vault in Google Sheets:', err);
      setError(err?.message || 'שגיאת חיפוש בכספת הנתונים');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  /**
   * פעולה 2.5: שליפת נתוני כספת רגישים ומאובטחים בעזרת סיסמה (getSecureVault)
   */
  const searchVaultSecure = useCallback(async (keyQuery: string, vaultPassword: string): Promise<VaultRecord[] | null> => {
    const { url, token } = getGasConfig();
    if (!url) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          token,
          action: 'getSecureVault',
          keyQuery,
          vaultPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (result.success && result.data && result.data.records) {
        return result.data.records as VaultRecord[];
      }
      if (result.statusCode === 401) {
        throw new Error('סיסמת כספת שגויה! הגישה נחסמה.');
      }
      return [];
    } catch (err: any) {
      console.error('Failed to search secure vault in Google Sheets:', err);
      setError(err?.message || 'שגיאת שליפת נתוני כספת מאובטחת');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  /**
   * פעולה 3: הוספה או עדכון של רשומה בכספת המשתמש (UserVault)
   */
  const saveVaultRecord = useCallback(async (
    keyName: string,
    fields: {
      username?: string;
      password?: string;
      bankAccount?: string;
      contactInfo?: string;
      amountUpdated?: string;
    }
  ) => {
    const { url, token } = getGasConfig();
    if (!url) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          token,
          action: 'saveVault',
          keyName,
          ...fields,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      return result;
    } catch (err: any) {
      console.error('Failed to save record to vault in Google Sheets:', err);
      setError(err?.message || 'שגיאת שמירה בכספת הנתונים');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  return {
    isConfigured: !!getGasConfig().url,
    gasUrl: getGasConfig().url,
    gasToken: getGasConfig().token,
    saveGasConfig,
    logChatInteraction,
    searchVault,
    searchVaultSecure,
    saveVaultRecord,
    loading,
    error,
  };
}
