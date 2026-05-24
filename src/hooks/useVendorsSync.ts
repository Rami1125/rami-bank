/**
 * נועה הבנקאית - useVendorsSync React Hook
 * לחיבור וסנכרון רשימת הספקים בזמן אמת מול גיליון Google Sheets
 */

import { useState, useCallback } from 'react';

export interface Vendor {
  vendorId: string;
  category: string;
  vendorName: string;
  logoUrl: string;
  lastUpdated?: string;
}

export function useVendorsSync() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // שליפת הגדרות קישור ה-GAS מתוך משתנה הסביבה או ה-localStorage כגיבוי
  const getGasConfig = useCallback(() => {
    const url = (import.meta as any).env.VITE_API_URL || localStorage.getItem('NOA_GAS_URL') || '';
    const token = localStorage.getItem('NOA_GAS_TOKEN') || 'NOA_SECURE_VAULT_TOKEN_2026';
    return { url, token };
  }, []);

  /**
   * טעינת כל הספקים מהשרת
   */
  const fetchVendors = useCallback(async (): Promise<Vendor[] | null> => {
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
          action: 'getVendors',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      
      if (result.success && result.data && result.data.vendors) {
        return result.data.vendors as Vendor[];
      }
      return [];
    } catch (err: any) {
      console.error('Failed to fetch vendors from Google Sheets:', err);
      setError(err?.message || 'שגיאת שליפת רשימת ספקים');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  /**
   * הוספה או עדכון ספק קיים
   */
  const saveVendor = useCallback(async (vendor: Omit<Vendor, 'lastUpdated'> & { vendorId?: string }): Promise<Vendor | null> => {
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
          action: 'saveVendor',
          ...vendor,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);

      if (result.success) {
        return {
          vendorId: result.data.vendorId,
          category: vendor.category,
          vendorName: vendor.vendorName,
          logoUrl: vendor.logoUrl,
          lastUpdated: result.data.timestamp
        };
      }
      return null;
    } catch (err: any) {
      console.error('Failed to save vendor in Google Sheets:', err);
      setError(err?.message || 'שגיאת שמירת ספק');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  /**
   * מחיקת ספק מהרשימה
   */
  const deleteVendor = useCallback(async (vendorId: string): Promise<boolean> => {
    const { url, token } = getGasConfig();
    if (!url) return false;

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
          action: 'deleteVendor',
          vendorId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      return !!result.success;
    } catch (err: any) {
      console.error('Failed to delete vendor in Google Sheets:', err);
      setError(err?.message || 'שגיאת מחיקת ספק');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  /**
   * אתחול/הזנת נתוני ספקים לדוגמה ב-Sheets
   */
  const seedVendors = useCallback(async (): Promise<boolean> => {
    const { url, token } = getGasConfig();
    if (!url) return false;

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
          action: 'seedVendors',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const result = JSON.parse(responseText);
      return !!result.success;
    } catch (err: any) {
      console.error('Failed to seed vendors in Google Sheets:', err);
      setError(err?.message || 'שגיאת הזנת ספקים');
      return false;
    } finally {
      setLoading(false);
    }
  }, [getGasConfig]);

  return {
    isConfigured: !!getGasConfig().url,
    fetchVendors,
    saveVendor,
    deleteVendor,
    seedVendors,
    loading,
    error,
  };
}
