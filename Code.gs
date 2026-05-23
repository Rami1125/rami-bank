/**
 * נועה הבנקאית - Google Apps Script Backend API (Code.gs)
 * מדריך זה מהווה פתרון קצה לקצה המשמש כמסד נתונים וזיכרון זמן אמת עבור נועה
 */

// אסימון אבטחה קשיח להגנה על הקריאות ל-API. יש לעדכן אסימון זה גם בקוד הלקוח ב-React.
const API_TOKEN = "NOA_SECURE_VAULT_TOKEN_2026";

/**
 * פונקציה ראשונית לאתחול והבטחת קיום הגליונות במבנה המדויק הנדרש
 */
function initSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. אתחול יומן שיחות (ChatLogs)
  let chatLogsSheet = ss.getSheetByName("ChatLogs");
  if (!chatLogsSheet) {
    chatLogsSheet = ss.insertSheet("ChatLogs");
    chatLogsSheet.appendRow(["Timestamp", "Device_ID", "User_Message", "AI_Response"]);
    chatLogsSheet.getRange("A1:D1").setFontWeight("bold").setBackground("#d1fae5");
  }
  
  // 2. אתחול כספת משתמש (UserVault)
  let userVaultSheet = ss.getSheetByName("UserVault");
  if (!userVaultSheet) {
    userVaultSheet = ss.insertSheet("UserVault");
    userVaultSheet.appendRow([
      "Key_Name", 
      "Username", 
      "Password", 
      "Bank_Account", 
      "Contact_Info", 
      "Last_Contact_Date", 
      "Last_Amount_Updated"
    ]);
    userVaultSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#fee2e2");
  }
  
  // 3. אתחול זיכרון קשר (ContextMemory)
  let contextMemorySheet = ss.getSheetByName("ContextMemory");
  if (!contextMemorySheet) {
    contextMemorySheet = ss.insertSheet("ContextMemory");
    contextMemorySheet.appendRow(["Device_ID", "Active_Context", "Last_Interaction_Time"]);
    contextMemorySheet.getRange("A1:C1").setFontWeight("bold").setBackground("#dbeafe");
  }
  
  // 4. אתחול גיליון ספקים (Vendors)
  let vendorsSheet = ss.getSheetByName("Vendors");
  if (!vendorsSheet) {
    vendorsSheet = ss.insertSheet("Vendors");
    vendorsSheet.appendRow(["Vendor_ID", "Category", "Vendor_Name", "Logo_URL", "Last_Updated"]);
    vendorsSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#fef08a");
  }
}

/**
 * טיפול בבקשות GET - משמש בעיקר לצורך בדיקת בריאות (Health Check)
 */
function doGet(e) {
  initSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Noa AI Memory API is responding correctly.",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * טיפול בבקשות POST - ליבת התקשורת וכתיבה/קריאה מאובטחת של מידע
 */
function doPost(e) {
  initSpreadsheet();
  
  try {
    // שלב א': פענוח הבקשה והמידע
    if (!e.postData || !e.postData.contents) {
      return buildResponse(false, "Missing request body payload", 400);
    }
    
    const payload = JSON.parse(e.postData.contents);
    
    // שלב ב': אימות אסימון אבטחה
    if (payload.token !== API_TOKEN) {
      return buildResponse(false, "Unauthorized: Invalid security token", 401);
    }
    
    const action = payload.action;
    if (!action) {
      return buildResponse(false, "Missing 'action' parameter in payload", 400);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // שלב ג': ניתוב לפי סוג הפעולה המבוקשת (Routing)
    switch (action) {
      case "logChat":
        return handleLogChat(ss, payload);
      case "searchVault":
        return handleSearchVault(ss, payload);
      case "saveVault":
        return handleSaveVault(ss, payload);
      default:
        return buildResponse(false, "Unknown action: " + action, 400);
    }
    
  } catch (err) {
    return buildResponse(false, "Internal Server Error: " + err.toString(), 500);
  }
}

/**
 * 1. שמירת יומן שיחות ועדכון זיכרון הקונטקסט של המכשיר
 */
function handleLogChat(ss, payload) {
  const deviceId = payload.deviceId || "UNKNOWN_DEVICE";
  const userMessage = payload.userMessage || "";
  const aiResponse = payload.aiResponse || "";
  const activeContext = payload.activeContext || "";
  
  const timestamp = new Date().toISOString();
  
  // א. הוספה לגיליון יומן שיחות
  const chatLogsSheet = ss.getSheetByName("ChatLogs");
  chatLogsSheet.appendRow([timestamp, deviceId, userMessage, aiResponse]);
  
  // ב. עדכון קונטקסט קיים או יצירת חדש בגיליון ContextMemory
  const contextSheet = ss.getSheetByName("ContextMemory");
  const data = contextSheet.getDataRange().getValues();
  let foundRowIdx = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === deviceId) {
      foundRowIdx = i + 1; // 1-indexed for sheets
      break;
    }
  }
  
  if (foundRowIdx !== -1) {
    contextSheet.getRange(foundRowIdx, 2).setValue(activeContext);
    contextSheet.getRange(foundRowIdx, 3).setValue(timestamp);
  } else {
    contextSheet.appendRow([deviceId, activeContext, timestamp]);
  }
  
  return buildResponse(true, "Chat logged and context updated successfully", 200, {
    timestamp: timestamp,
    deviceId: deviceId
  });
}

/**
 * 2. חיפוש נתונים רגישים בכספת המאובטחת (UserVault) לפי מפתח הגדרה
 */
function handleSearchVault(ss, payload) {
  const keyQuery = (payload.keyQuery || "").trim().toLowerCase();
  if (!keyQuery) {
    return buildResponse(false, "Missing 'keyQuery' parameter", 400);
  }
  
  const vaultSheet = ss.getSheetByName("UserVault");
  const data = vaultSheet.getDataRange().getValues();
  const results = [];
  
  // סריקת שורות הנתונים (דילוג על הכותרת הראשונה)
  for (let i = 1; i < data.length; i++) {
    const keyName = String(data[i][0]).toLowerCase();
    if (keyName.includes(keyQuery) || keyQuery.includes(keyName)) {
      results.push({
        keyName: data[i][0],
        username: data[i][1],
        password: data[i][2], // הערה: מיועד לתצוגה בונה ועדכון, מומלץ להצפין סיסמאות קריטיות
        bankAccount: data[i][3],
        contactInfo: data[i][4],
        lastContactDate: data[i][5],
        lastAmountUpdated: data[i][6]
      });
    }
  }
  
  return buildResponse(true, "Vault search completed", 200, {
    query: keyQuery,
    matchesFound: results.length,
    records: results
  });
}

/**
 * 3. הוספת או עדכון רשומה קיימת בכספת המשתמש (UserVault)
 */
function handleSaveVault(ss, payload) {
  const keyName = (payload.keyName || "").trim();
  if (!keyName) {
    return buildResponse(false, "Missing 'keyName' parameter to identify vault item", 400);
  }
  
  const vaultSheet = ss.getSheetByName("UserVault");
  const data = vaultSheet.getDataRange().getValues();
  let foundRowIdx = -1;
  
  // חיפוש האם המפתח כבר קיים כדי לבצע דריסה (Upsert)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === keyName.toLowerCase()) {
      foundRowIdx = i + 1;
      break;
    }
  }
  
  const nowStr = new Date().toISOString();
  const username = payload.username !== undefined ? payload.username : "";
  const password = payload.password !== undefined ? payload.password : "";
  const bankAccount = payload.bankAccount !== undefined ? payload.bankAccount : "";
  const contactInfo = payload.contactInfo !== undefined ? payload.contactInfo : "";
  const amountUpdated = payload.amountUpdated !== undefined ? payload.amountUpdated : "";
  
  if (foundRowIdx !== -1) {
    // עדכון רשומה קיימת בהתאם לשדות שהועברו
    if (payload.username !== undefined) vaultSheet.getRange(foundRowIdx, 2).setValue(username);
    if (payload.password !== undefined) vaultSheet.getRange(foundRowIdx, 3).setValue(password);
    if (payload.bankAccount !== undefined) vaultSheet.getRange(foundRowIdx, 4).setValue(bankAccount);
    if (payload.contactInfo !== undefined) vaultSheet.getRange(foundRowIdx, 5).setValue(contactInfo);
    vaultSheet.getRange(foundRowIdx, 6).setValue(nowStr); // Last Contact Date
    if (payload.amountUpdated !== undefined) vaultSheet.getRange(foundRowIdx, 7).setValue(amountUpdated);
  } else {
    // הוספת רשומה חדשה לגמרי
    vaultSheet.appendRow([
      keyName,
      username,
      password,
      bankAccount,
      contactInfo,
      nowStr,
      amountUpdated
    ]);
  }
  
  return buildResponse(true, "Vault record saved successfully", 200, {
    keyName: keyName,
    updatedAt: nowStr
  });
}

/**
 * פונקציית עזר ליצירת תגובת JSON אחידה וקריאה
 */
function buildResponse(success, message, statusCode, data) {
  const responseObj = {
    success: success,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    responseObj.data = data;
  }
  
  return ContentService.createTextOutput(JSON.stringify(responseObj))
                       .setMimeType(ContentService.MimeType.JSON);
}

/**
 * פונקציה להזנת נתוני ספקים ישראליים אמיתיים לגיליון "Vendors"
 * הפונקציה מונעת כפילויות ומבצעת הזנת אצווה (Batch Insertion) אופטימלית
 */
function seedVendorsData() {
  initSpreadsheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vendorsSheet = ss.getSheetByName("Vendors");
  
  if (!vendorsSheet) {
    Logger.log("שגיאה: גיליון Vendors אינו קיים ולא ניתן לפעול.");
    return;
  }
  
  // בדיקה האם קיימים נתונים מעבר לשורת הכותרת
  const lastRow = vendorsSheet.getLastRow();
  if (lastRow > 1) {
    Logger.log("הגיליון כבר מכיל נתונים (" + (lastRow - 1) + " רשומות). הפעולה בוטלה כדי למנוע כפילויות.");
    return;
  }
  
  const timestamp = new Date().toISOString();
  
  // רשימת 20 ספקים ישראליים מובילים המקיפים את כל הקטגוריות הנדרשות
  const vendors = [
    // קטגוריית "תקשורת" (Telecom) - 4 ספקים
    ["V001", "תקשורת", "בזק", "https://logo.clearbit.com/bezeq.co.il", timestamp],
    ["V002", "תקשורת", "סלקום", "https://logo.clearbit.com/cellcom.co.il", timestamp],
    ["V003", "תקשורת", "פרטנר", "https://logo.clearbit.com/partner.co.il", timestamp],
    ["V004", "תקשורת", "יס (yes)", "https://logo.clearbit.com/yes.co.il", timestamp],
    
    // קטגוריית "ממשלתי" (Government/Institutions) - 4 ספקים
    ["V005", "ממשלתי", "חברת החשמל לישראל", "https://logo.clearbit.com/iec.co.il", timestamp],
    ["V006", "ממשלתי", "דואר ישראל", "https://logo.clearbit.com/israelpost.co.il", timestamp],
    ["V007", "ממשלתי", "רשות המיסים בישראל", "https://logo.clearbit.com/gov.il", timestamp],
    ["V008", "ממשלתי", "המוסד לביטוח לאומי", "https://logo.clearbit.com/btl.gov.il", timestamp],
    
    // קטגוריית "בנקים ופיננסים" (Banks & Finance) - 4 ספקים
    ["V009", "בנקים ופיננסים", "בנק הפועלים", "https://logo.clearbit.com/bankhapoalim.co.il", timestamp],
    ["V010", "בנקים ופיננסים", "בנק לאומי", "https://logo.clearbit.com/leumi.co.il", timestamp],
    ["V011", "בנקים ופיננסים", "בנק דיסקונט", "https://logo.clearbit.com/discountbank.co.il", timestamp],
    ["V012", "בנקים ופיננסים", "בנק מזרחי טפחות", "https://logo.clearbit.com/mizrahi-tefahot.co.il", timestamp],
    
    // קטגוריית "סופרמרקטים" (Supermarkets) - 4 ספקים
    ["V013", "סופרמרקטים", "שופרסל", "https://logo.clearbit.com/shufersal.co.il", timestamp],
    ["V014", "סופרמרקטים", "רמי לוי שיווק השקמה", "https://logo.clearbit.com/rami-levy.co.il", timestamp],
    ["V015", "סופרמרקטים", "יוחננוף", "https://logo.clearbit.com/yochananof.co.il", timestamp],
    ["V016", "סופרמרקטים", "ויקטורי", "https://logo.clearbit.com/victory.co.il", timestamp],
    
    // קטגוריית "ביטוח" (Insurance) - 4 ספקים
    ["V017", "ביטוח", "מגדל חברה לביטוח", "https://logo.clearbit.com/migdal.co.il", timestamp],
    ["V018", "ביטוח", "הראל ביטוח ופיננסים", "https://logo.clearbit.com/harel-group.co.il", timestamp],
    ["V019", "ביטוח", "הפניקס חברה לביטוח", "https://logo.clearbit.com/fnx.co.il", timestamp],
    ["V020", "ביטוח", "מנורה מבטחים", "https://logo.clearbit.com/menoramivt.co.il", timestamp]
  ];
  
  // ביצוע הכנסת אצווה מהירה ויעילה
  const range = vendorsSheet.getRange(2, 1, vendors.length, 5);
  range.setValues(vendors);
  
  Logger.log("הזנת הנתונים הסתיימה בהצלחה! הוכנסו " + vendors.length + " ספקים ישראליים לגיליון Vendors.");
}
