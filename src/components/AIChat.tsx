/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  Zap
} from 'lucide-react';
import { ChatMessage, Transaction, UserProfile } from '../types';

interface AIChatProps {
  user: UserProfile;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  currentBalance: number;
}

export default function AIChat({ user, onAddTransaction, currentBalance }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `היי ${user.displayName}! אני נועה, היועצת הפיננסית האישית שלך. 💼✨\n\nבצ׳אט הזה אתם יכולים לכתוב לי פשוט הכל בעברית רגילה! למשל:\n• "הוצאתי 120 שקל על פיצה"\n• "קיבלתי משכורת 12500 שקלים מהעבודה"\n• "קניתי בסופרמרקט שופרסל ב-420 שקל"\n\nאני אנתח את המשפט מיד, ארשום את העסקה ואציע דרכי התייעלות מותאמות אישית. במה נתחיל היום?`,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
      // Step 1: Check if the text is asking for transaction parsing
      const isParsingIntent = /הוצאתי|קניתי|שילמתי|נכנס|קיבלתי|הפקדתי|עלה לי|שקל|סופר|שופרסל|\d+/.test(textToSend);

      if (isParsingIntent) {
        const response = await fetch('/api/gemini/parse-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSend })
        });

        if (!response.ok) throw new Error('Failed parsing transaction');

        const parsedData = await response.json();

        const assistantMsg: ChatMessage = {
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
      } else {
        // Step 2: Handle standard financial query or advisory
        const currentContext = {
          userName: user.displayName,
          balance: currentBalance,
          date: new Date().toISOString()
        };

        const response = await fetch('/api/gemini/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            currentStatus: currentContext
          })
        });

        if (!response.ok) throw new Error('Advisor request failing');

        const advData = await response.json();

        const assistantMsg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          text: advData.text,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      console.error(e);
      // Friendly Hebrew error fallback
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

      // Update message structure to marked approved visually
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
    'קיבלתי מענק חג בסך 1000 שקלים מהעבודה',
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
            <span className="text-[10px] text-emerald-400 block font-medium">פעילה כעת | Gemini AI Engine</span>
          </div>
        </div>
        <div className="bg-slate-800 text-xs text-emerald-400 py-1.5 px-3 rounded-full flex items-center gap-1 font-mono border border-slate-700/80">
          <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0" />
          <span>חיבור AI פעיל</span>
        </div>
      </div>

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
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs text-slate-500 font-medium font-sans">נועה מנתחת את המשפט...</span>
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
              className="text-xs shrink-0 bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-600 hover:text-emerald-800 transition-all font-sans px-3 py-2 rounded-xl"
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
          placeholder="כתוב משהו כמו: הוצאתי 50 שקל על פלאפל..."
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
