/**
 * נועה הבנקאית - geminiService Integration (geminiService.ts)
 * מימוש קצה לקצה של מודל השפה הגדול על גבי הדפדפן (Client-Side Interface)
 * כדי לעקוף 404 בהעלאה סטטית לפלטפורמות כמו Vercel
 */

import { GoogleGenAI, Type } from '@google/genai';

// אתחול עצל (Lazy Initialization) למניעת קריסה משורת קוד ראשונה בלעדי מפתח
let aiClient: any = null;

export function getGeminiKey(): string {
  return localStorage.getItem('VITE_GEMINI_API_KEY') || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
}

export function saveGeminiKey(key: string) {
  localStorage.setItem('VITE_GEMINI_API_KEY', key.trim());
}

function getClient(): any {
  const key = getGeminiKey();
  if (!key || key.trim() === '') return null;
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
    });
  }
  return aiClient;
}

/**
 * מפענח הוצאה/הכנסה ממשפט בעברית חופשית
 */
export async function parseExpenseDetails(text: string): Promise<any> {
  const ai = getClient();
  
  // פתרון אלטרנטיבי והחלמה אוטומטית בהיעדר מפתח לצורך הדגמה
  if (!ai) {
    console.log("No GEMINI_API_KEY found on client. Simulating parser response locally.");
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
    } else if (text.includes('דלק') || text.includes('תחבורה') || text.includes('אוטובוס') || text.includes('מונית')) {
      category = 'תחבורה ודלק';
      vendor = text.includes('דלק') ? 'תחנת דלק' : 'תחבורה ציבורית';
      reply = `הבנתי, רשמתי הוצאה על תחבורה בסך ${amount} ש"ח.`;
    } else if (text.includes('חשמל') || text.includes('ארנונה') || text.includes('סלקום') || text.includes('מים')) {
      category = 'דיור וחשבונות';
      vendor = text.includes('סלקום') ? 'סלקום' : 'תשלום חשבונות';
      reply = `הבנתי, נוסף תשלום חשבונות בסך ${amount} ש"ח.`;
    } else if (text.includes('משכורת') || text.includes('בונוס')) {
      category = 'משכורת';
      vendor = 'מעסיק';
      isIncome = true;
      reply = `איזה כיף! נכנסה משכורת של ${amount} ש"ח!`;
    }

    return {
      type: isIncome ? 'income' : 'expense',
      amount,
      category,
      vendorName: vendor,
      explanation: `${reply} (מצב דמו - אנא הזינו מפתח API בצ׳אט של נועה)`
    };
  }

  try {
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

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error('Error parsing transaction via client-side Gemini:', error);
    throw error;
  }
}

/**
 * מחזיר תשובת ייעוץ אינטראקטיבית
 */
export async function getAdvisorAdvice(messages: any[], currentStatus: any): Promise<string> {
  const ai = getClient();

  if (!ai) {
    console.log("No GEMINI_API_KEY found on client. Simulating advisor feedback locally.");
    const userMsg = messages[messages.length - 1]?.text || '';
    let simReply = "שלום! אני כאן לעזור לך לנהל את התקציב שלך, לייעל את ההוצאות ולבנות תוכנית הבראה פיננסית מותאמת אישית.";
    
    if (userMsg.includes('תוכנית') || userMsg.includes('איך לחסוך') || userMsg.includes('הבראה')) {
      simReply = "מומלץ להתחיל בצמצום של 10% מהוצאות ה'פנאי והבידור' שלך החודש. העברתי את החיסכון הזה ישירות ליעד הבראה לרכישת ביטחון פיננסי. רוצה שנבנה משימות שבועיות?";
    } else if (userMsg.includes('חורג') || userMsg.includes('מינוס')) {
      simReply = "ראיתי שהוצאות המזון והסופרמרקט השבוע היו גבוהות מעט מהממוצע. קנייה חכמה עם רשימה מוכנה מראש יכולה לחסוך לך כ-150 שקלים כבר השבוע!";
    }

    return `${simReply} (מצב סימולציה מקומי - להפעלה מלאה הזינו מפתח Gemini API בקוביית ה-API מטה)`;
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

    return response.text || '';
  } catch (error) {
    console.error('Error generating advice via client-side Gemini:', error);
    return 'שגיאה בתקשורת מול מערכת העזר של נועה. אנא בדוק את מפתח ה-API שהוזן.';
  }
}
