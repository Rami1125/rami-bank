/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp as initializeServerApp, getApps as getServerApps, getApp as getServerApp } from 'firebase/app';
import { getFirestore as getServerFirestore, doc as serverDoc, setDoc as serverSetDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Read firebase configuration dynamically via fs to prevent compilation/module import type errors
const firebaseConfig = (() => {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading firebase-applet-config.json in backend:', err);
  }
  return {};
})();

let serverFirestoreDb: any = null;
function getServerFirestoreDb() {
  if (!serverFirestoreDb) {
    const isRealConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'dummy-api-key' && firebaseConfig.projectId !== 'dummy-project';
    if (isRealConfig) {
      try {
        const app = getServerApps().length === 0 ? initializeServerApp(firebaseConfig) : getServerApp();
        serverFirestoreDb = getServerFirestore(app);
      } catch (err) {
        console.error("Failed to initialize Firestore on server:", err);
      }
    }
  }
  return serverFirestoreDb;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Lazy-initialize Gemini AI client to prevent startup crash if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Hebrew expense parser endpoint
app.post('/api/gemini/parse-expense', async (req, res) => {
  const { text, mockResponse } = req.body;
  
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Elegant fallback simulation when API key is missing
    console.log("No GEMINI_API_KEY found, simulating Hebrew parser response locally.");
    
    // Quick heuristic rules-based parser for testing without API keys
    const amountMatch = text.match(/\d+(\.\d+)?/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 50;
    
    let isIncome = text.includes('קיבלתי') || text.includes('משכורת') || text.includes('הפקדתי') || text.includes('נכנס');
    let category = 'אחר';
    let vendor = 'כללי';
    let reply = `זיהיתי עסקה כללית בסך ${amount} ש"ח.`;

    if (text.includes('שופרסל') || text.includes('סופר') || text.includes('אוכל') || text.includes('מכולת')) {
      category = 'מזון וסופרמרקט';
      vendor = text.includes('שופרסל') ? 'שופרסל' : 'סופרמרקט';
      reply = `הבנתי, רשמתי הוצאה בסופרמרקט של ${amount} ש"ח.`;
    } else if (text.includes('דלק') || text.includes('תחבורה') || text.includes('אוטובוס' ) || text.includes('מונית')) {
      category = 'תחבורה ודלק';
      vendor = text.includes('דלק') ? 'תחנת דלק' : 'תחבורה ציבורית';
      reply = `הבנתי, רשמתי הוצאה על תחבורה בסך ${amount} ש"ח.`;
    } else if (text.includes('חשמל') || text.includes('ארנונה') || text.includes('סלקום') || text.includes('מים')) {
      category = 'דיור וחשבונות';
      vendor = 'תשלום חשבונות';
      reply = `הבנתי, נוסף תשלום חשבונות בסך ${amount} ש"ח.`;
    } else if (text.includes('משכורת') || text.includes('בונוס')) {
      category = 'משכורת';
      vendor = 'מעסיק';
      isIncome = true;
      reply = `איזה כיף! נכנסה משכורת של ${amount} ש"ח!`;
    }

    return res.json({
      type: isIncome ? 'income' : 'expense',
      amount,
      category,
      vendorName: vendor,
      explanation: `${reply} (מצב הדגמה - ללא מפתח API)`
    });
  }

  try {
    // Rich Hebrew context formulation for Gemini
    const systemInstruction = `אתה "נועה הבנקאית", יועצת פיננסית אישית מתקדמת ואמפתית.
התפקיד שלך הוא לקבל משפט בעברית המתאר הוצאה או הכנסה כספית, ולתרגם אותו לאובייקט JSON מדויק.
הקומפוננטות החיוניות לשדות הן:
- type: חייב להיות בדיוק "expense" (הוצאה) או "income" (הכנסה).
- amount: מספר בלבד (למשל 300 או 12.5). אם יש מילים כמו "שקל" או "ש"ח", חלץ את המספר בלבד.
- category: קטגוריה פיננסית מתאימה מתוך הרשימה הבאה בלבד:
  'מזון וסופרמרקט', 'דיור וחשבונות', 'תחבורה ודלק', 'פנאי ובידור', 'בריאות ורפואה', 'חינוך וילדים', 'קניות וביגוד', 'משכורת', 'הכנסה נוספת', 'אחר'.
- vendorName: שם העסק/הספק בעברית (למשל "שופרסל", "פז", "זארה", "חברת החשמל", "רב קו"). אם לא מצוין, רשום "אחר".
- explanation: משפט קצר ומעודד בעברית שמאשר את קליטת העסקה (למשל: "רשמתי את הקנייה שלכם בשופרסל בסך 300 שקלים למזון וסופרמרקט!").`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `תרגם את המשפט הבא ל-JSON: "${text}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['income', 'expense'] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            vendorName: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ['type', 'amount', 'category', 'vendorName', 'explanation']
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error('Error parsing transaction via Gemini:', error);
    return res.status(500).json({ error: 'שגיאה בעיבוד הנתונים מול סוכנת ה-AI.' });
  }
});

// Advisor chat assistant endpoint
app.post('/api/gemini/advisor', async (req, res) => {
  const { messages, currentStatus } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages history is required.' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Simulated advisory feedback when GEMINI_API_KEY is not configured
    const userMsg = messages[messages.length - 1]?.text || '';
    let simReply = "שלום! אני כאן לעזור לך לנהל את התקציב שלך, לייעל את ההוצאות ולבנות תוכנית הבראה פיננסית מותאמת אישית.";
    
    if (userMsg.includes('תוכנית') || userMsg.includes('איך לחסוך') || userMsg.includes('הבראה')) {
      simReply = "מומלץ להתחיל בצמצום של 10% מהוצאות ה'פנאי והבידור' שלך החודש. העברתי את החיסכון הזה ישירות ליעד הבראה לרכישת ביטחון פיננסי. רוצה שנבנה משימות שבועיות?";
    } else if (userMsg.includes('חורג') || userMsg.includes('מינוס')) {
      simReply = "ראיתי שהוצאות המזון והסופרמרקט השבוע היו גבוהות מעט מהממוצע. קנייה חכמה עם רשימה מוכנה מראש יכולה לחסוך לך כ-150 שקלים כבר השבוע!";
    }

    return res.json({
      text: `${simReply} (מצב הדגמה פעיל - להפעלה מלאה חבר מפתח API ביומן Secrets)`
    });
  }

  try {
    const formattedHistory = messages.map(m => {
      return `${m.role === 'user' ? 'המשתמש' : 'נועה הבנקאית'}: ${m.text}`;
    }).join('\n');

    const systemInstruction = `אתה "נועה הבנקאית" - יועצת פיננסית אישית, חכמה, חמה ומעודדת.
המטרה שלך היא לעזור למשתמשים ישראלים להשתלט על הכסף שלהם, לצאת מהמינוס ולבנות תוכניות חיסכון והבראה ריאליות.
השתמש בשפה עברית חיובית, מקרבת, לא שיפוטית ומעשית.
השתמש במונחים ישראלים מוכרים וידידותיים (למשל ש"ח, מינוס, שופרסל, הוצאות בלתי צפויות).
יש לך גישה לפרטים הפיננסיים הנוכחיים של המשתמש: ${JSON.stringify(currentStatus || {})}.
ענה ישירות למשתמש בצורה מסודרת, לפעמים עם נקודות ברורות שיעזרו לו לנקוט פעולה מיידית.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `להלן היסטוריית השיחה:\n${formattedHistory}\n\nאנא השב בשם נועה הבנקאית:`,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ text: response.text });
  } catch (error) {
    console.error('Error generating advice via Gemini:', error);
    return res.status(500).json({ error: 'שגיאה בתקשורת מול יועצת ה-AI.' });
  }
});

const CONFIG_PATH = path.join(process.cwd(), 'gas_config.json');

function readGasConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading gas_config.json:', err);
  }
  return { gasUrl: '', gasToken: 'NOA_SECURE_VAULT_TOKEN_2026' };
}

function writeGasConfig(config: { gasUrl: string; gasToken: string }) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing gas_config.json:', err);
  }
}

// App environment details API (so client knows developer preview context)
app.get('/api/config', (req, res) => {
  const saved = readGasConfig();
  res.json({
    hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    gasUrl: saved.gasUrl,
    gasToken: saved.gasToken
  });
});

app.post('/api/config', (req, res) => {
  const { gasUrl, gasToken } = req.body;
  writeGasConfig({
    gasUrl: (gasUrl || '').trim(),
    gasToken: (gasToken || 'NOA_SECURE_VAULT_TOKEN_2026').trim()
  });
  res.json({ success: true });
});

// REAL-TIME SYNCHRONIZATION ENDPOINT FOR GOOGLE SHEETS & FIRESTORE
app.post('/api/vault/sync', async (req, res) => {
  const { token, keyName, username, password, bankAccount, contactInfo, lastContactDate, lastAmountUpdated } = req.body;
  const savedConfig = readGasConfig();
  const validToken = savedConfig.gasToken || 'NOA_SECURE_VAULT_TOKEN_2026';

  // Basic security token verification matching GAS Code.gs API_TOKEN
  if (!token || token !== validToken) {
    console.warn(`Unauthorized vault sync sync attempt rejected. Token: ${token}`);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid security token' });
  }

  if (!keyName || keyName.trim() === '') {
    return res.status(400).json({ success: false, error: 'Bad Request: keyName is required' });
  }

  const record = {
    keyName: keyName.trim(),
    username: (username || '').trim(),
    password: (password || '').trim(),
    bankAccount: (bankAccount || '').trim(),
    contactInfo: (contactInfo || '').trim(),
    lastContactDate: lastContactDate || new Date().toISOString(),
    lastAmountUpdated: (lastAmountUpdated || '').trim()
  };

  try {
    // 1. Synchronize to Firebase Firestore if configured
    const db = getServerFirestoreDb();
    let isDbSynced = false;
    if (db) {
      const docRef = serverDoc(db, 'vault', record.keyName);
      await serverSetDoc(docRef, record, { merge: true });
      isDbSynced = true;
      console.log(`[Firestore] Successfully synchronized secure vault item: '${record.keyName}'`);
    } else {
      console.log(`[Server Memory Only] Firestore was not configured, proceeding with local fallback storage for item: '${record.keyName}'`);
    }

    // 2. Local fallback storage to guarantee immediate rich client visualization in AI Studio
    let localRecords = [];
    const LOCAL_VAULT_PATH = path.join(process.cwd(), 'synced_vault_records.json');
    if (fs.existsSync(LOCAL_VAULT_PATH)) {
      try {
        localRecords = JSON.parse(fs.readFileSync(LOCAL_VAULT_PATH, 'utf8'));
      } catch (err) {
        localRecords = [];
      }
    }

    localRecords = localRecords.filter((r: any) => r.keyName !== record.keyName);
    localRecords.push(record);
    fs.writeFileSync(LOCAL_VAULT_PATH, JSON.stringify(localRecords, null, 2), 'utf8');

    return res.json({
      success: true,
      message: 'Vault record synchronized successfully',
      syncedWithFirestore: isDbSynced,
      record
    });
  } catch (error: any) {
    console.error('[Sync Error] Failed to synchronize vault record:', error);
    return res.status(500).json({ success: false, error: error.message || 'Synchronization exception occurred' });
  }
});

// Read synced records API for real-time frontend integration
app.get('/api/vault/synced', (req, res) => {
  const LOCAL_VAULT_PATH = path.join(process.cwd(), 'synced_vault_records.json');
  if (fs.existsSync(LOCAL_VAULT_PATH)) {
    try {
      const records = JSON.parse(fs.readFileSync(LOCAL_VAULT_PATH, 'utf8'));
      return res.json({ success: true, records });
    } catch (err) {
      return res.json({ success: true, records: [] });
    }
  }
  return res.json({ success: true, records: [] });
});

// Setup Vite & Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
